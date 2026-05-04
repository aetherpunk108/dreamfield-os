import { applyCurve, createCurve, holdToThrottle, type CurveConfig, type CurveType } from './curves.js';

export type DeviceType = 'desktop' | 'mobile' | 'gamepad' | 'xr';

export interface FlightInput {
	// Normalized -1 to 1
	pitch: number;
	yaw: number;
	roll: number;
	// 0 to 1
	throttle: number;
	boost: boolean;
	brake: boolean;
}

export interface InputState {
	keys: Set<string>;
	keyHoldTime: Map<string, number>;
	mouseX: number;
	mouseY: number;
	mouseDeltaX: number;
	mouseDeltaY: number;
	touchPressure: number;
	gamepadAxes: number[];
	gamepadButtons: number[];
	gripForce: number;
}

export interface FlightConfig {
	device: DeviceType;
	pitchCurve: CurveConfig;
	yawCurve: CurveConfig;
	rollCurve: CurveConfig;
	throttleCurve: CurveConfig;
	mouseSensitivity: number;
	invertY: boolean;
	throttleRampTime: number;
}

const MAX_MOUSE_DELTA = 150; // pixels per frame

/** Default configs per device */
export function getDefaultConfig(device: DeviceType): FlightConfig {
	switch (device) {
		case 'desktop':
			return {
				device,
				pitchCurve: createCurve('SMOOTH_START'),
				yawCurve: createCurve('SMOOTH_START'),
				rollCurve: createCurve('LINEAR'),
				throttleCurve: createCurve('SMOOTH_END'),
				mouseSensitivity: 1.0,
				invertY: false,
				throttleRampTime: 1.0,
			};
		case 'mobile':
			return {
				device,
				pitchCurve: createCurve('S_SHAPE'),
				yawCurve: createCurve('S_SHAPE'),
				rollCurve: createCurve('SMOOTH_END'),
				throttleCurve: createCurve('SMOOTH_END'),
				mouseSensitivity: 1.2,
				invertY: false,
				throttleRampTime: 0.6,
			};
		case 'gamepad':
			return {
				device,
				pitchCurve: createCurve('S_SHAPE'),
				yawCurve: createCurve('S_SHAPE'),
				rollCurve: createCurve('SMOOTH_START'),
				throttleCurve: createCurve('LINEAR', { deadzone: 0.05, ceiling: 0.95 }),
				mouseSensitivity: 1.0,
				invertY: false,
				throttleRampTime: 0.0,
			};
		case 'xr':
			return {
				device,
				pitchCurve: createCurve('SMOOTH_END'),
				yawCurve: createCurve('SMOOTH_END'),
				rollCurve: createCurve('SMOOTH_START'),
				throttleCurve: createCurve('LINEAR'),
				mouseSensitivity: 1.0,
				invertY: false,
				throttleRampTime: 0.0,
			};
	}
}

/**
 * Process raw input state into shaped flight input using configured curves.
 */
export function processInput(raw: InputState, config: FlightConfig, dt: number): FlightInput {
	let pitch = 0;
	let yaw = 0;
	let roll = 0;
	let throttle = 0;
	let boost = false;
	let brake = false;

	switch (config.device) {
		case 'desktop': {
			// Mouse → pitch/yaw
			const rawYaw = Math.max(-1, Math.min(1, raw.mouseDeltaX / MAX_MOUSE_DELTA));
			const rawPitch = Math.max(-1, Math.min(1, raw.mouseDeltaY / MAX_MOUSE_DELTA));
			yaw = applyCurve(rawYaw * config.mouseSensitivity, config.yawCurve);
			pitch = applyCurve(rawPitch * config.mouseSensitivity * (config.invertY ? -1 : 1), config.pitchCurve);

			// Q/E → roll
			if (raw.keys.has('q')) roll -= 1;
			if (raw.keys.has('e')) roll += 1;
			roll = applyCurve(roll, config.rollCurve);

			// W hold → throttle (pressure via duration)
			const wHold = raw.keyHoldTime.get('w') ?? 0;
			const sHold = raw.keyHoldTime.get('s') ?? 0;
			throttle = holdToThrottle(wHold, config.throttleRampTime);
			if (sHold > 0) throttle -= holdToThrottle(sHold, config.throttleRampTime) * 0.5;
			throttle = Math.max(0, Math.min(1, throttle));

			// Shift = boost, Ctrl = brake
			boost = raw.keys.has('shift');
			brake = raw.keys.has('control');
			break;
		}

		case 'mobile': {
			// Touch → pressure-based curves
			const rawYaw = Math.max(-1, Math.min(1, raw.mouseDeltaX / 100));
			const rawPitch = Math.max(-1, Math.min(1, raw.mouseDeltaY / 100));
			const pressure = Math.max(0.2, raw.touchPressure);
			yaw = applyCurve(rawYaw * pressure, config.yawCurve);
			pitch = applyCurve(rawPitch * pressure, config.pitchCurve);

			// Two-finger → throttle
			throttle = applyCurve(raw.touchPressure, config.throttleCurve);
			break;
		}

		case 'gamepad': {
			// Left stick → pitch/yaw, right stick → roll
			if (raw.gamepadAxes.length >= 4) {
				yaw = applyCurve(raw.gamepadAxes[0], config.yawCurve);
				pitch = applyCurve(raw.gamepadAxes[1] * (config.invertY ? -1 : 1), config.pitchCurve);
				roll = applyCurve(raw.gamepadAxes[2], config.rollCurve);
			}
			// Triggers → throttle/brake
			if (raw.gamepadButtons.length >= 8) {
				throttle = applyCurve(raw.gamepadButtons[7], config.throttleCurve); // RT
				brake = raw.gamepadButtons[6] > 0.3; // LT
			}
			boost = raw.gamepadButtons?.[0] > 0.5; // A button
			break;
		}

		case 'xr': {
			// Grip force → turn rate multiplier
			const gripMult = 0.5 + raw.gripForce * 1.5;
			if (raw.gamepadAxes.length >= 4) {
				yaw = applyCurve(raw.gamepadAxes[0], config.yawCurve) * gripMult;
				pitch = applyCurve(raw.gamepadAxes[1], config.pitchCurve) * gripMult;
				roll = applyCurve(raw.gamepadAxes[2], config.rollCurve);
			}
			// Trigger → throttle
			throttle = raw.gamepadButtons?.[0] ?? 0;
			boost = raw.gripForce > 0.8;
			break;
		}
	}

	return { pitch, yaw, roll, throttle, boost, brake };
}

/**
 * Create empty input state.
 */
export function createInputState(): InputState {
	return {
		keys: new Set(),
		keyHoldTime: new Map(),
		mouseX: 0,
		mouseY: 0,
		mouseDeltaX: 0,
		mouseDeltaY: 0,
		touchPressure: 0,
		gamepadAxes: [],
		gamepadButtons: [],
		gripForce: 0,
	};
}
