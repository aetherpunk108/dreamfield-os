/**
 * Auto-detect connected input devices: gamepads, VR headsets, touch capability.
 * Polls on a timer and fires callbacks when devices connect/disconnect.
 */

export type DeviceType = 'keyboard' | 'gamepad' | 'vr' | 'touch';

export interface DetectedDevice {
	type: DeviceType;
	name: string;
	id: string;
	connected: boolean;
	timestamp: number;
	axes?: number;
	buttons?: number;
}

export interface DeviceDetectorConfig {
	pollIntervalMs: number;
	onDeviceConnected?: (device: DetectedDevice) => void;
	onDeviceDisconnected?: (device: DetectedDevice) => void;
	onVRAvailable?: (session: XRSessionMode) => void;
}

type XRSessionMode = 'immersive-vr' | 'immersive-ar' | 'inline';

let pollTimer: ReturnType<typeof setInterval> | null = null;
let connectedDevices: Map<string, DetectedDevice> = new Map();
let vrSupported = false;
let arSupported = false;
let touchSupported = false;
let config: DeviceDetectorConfig = { pollIntervalMs: 2000 };

/**
 * Start device detection polling.
 * Safe to call multiple times — will restart if already running.
 */
export function startDeviceDetection(cfg?: Partial<DeviceDetectorConfig>): void {
	if (typeof window === 'undefined') return;

	// Clear any existing timer (handles HMR restart)
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}

	config = { ...config, ...cfg };

	// Initial checks
	checkTouch();
	checkVR();
	pollGamepads();

	// Listen for gamepad events (remove first to avoid duplicates)
	window.removeEventListener('gamepadconnected', handleGamepadConnected);
	window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
	window.addEventListener('gamepadconnected', handleGamepadConnected);
	window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

	// Poll timer — continuous detection every interval
	pollTimer = setInterval(() => {
		pollGamepads();
		checkVR();
	}, config.pollIntervalMs);
}

/**
 * Stop detection polling.
 */
export function stopDeviceDetection(): void {
	if (pollTimer) {
		clearInterval(pollTimer);
		pollTimer = null;
	}
	window.removeEventListener('gamepadconnected', handleGamepadConnected);
	window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected);
}

/**
 * Get all currently connected devices.
 */
export function getConnectedDevices(): DetectedDevice[] {
	return Array.from(connectedDevices.values());
}

/**
 * Check if a specific device type is connected.
 */
export function isDeviceConnected(type: DeviceType): boolean {
	return Array.from(connectedDevices.values()).some(d => d.type === type && d.connected);
}

/**
 * Is VR headset available?
 */
export function isVRAvailable(): boolean { return vrSupported; }

/**
 * Is AR available?
 */
export function isARAvailable(): boolean { return arSupported; }

/**
 * Is touch input available?
 */
export function isTouchAvailable(): boolean { return touchSupported; }

/**
 * Get the best available input device for flight controls.
 */
export function getPreferredDevice(): DeviceType {
	if (isDeviceConnected('vr')) return 'vr';
	if (isDeviceConnected('gamepad')) return 'gamepad';
	if (touchSupported && 'ontouchstart' in window) return 'touch';
	return 'keyboard';
}

/**
 * Request a VR session (must be called from user gesture).
 */
export async function requestVRSession(): Promise<XRSession | null> {
	if (!navigator.xr || !vrSupported) return null;
	try {
		const session = await navigator.xr.requestSession('immersive-vr', {
			requiredFeatures: ['local-floor'],
			optionalFeatures: ['hand-tracking', 'bounded-floor'],
		});
		return session;
	} catch (e) {
		console.warn('VR session request failed:', e);
		return null;
	}
}

// --- Internal ---

function handleGamepadConnected(e: GamepadEvent) {
	const gp = e.gamepad;
	const device: DetectedDevice = {
		type: 'gamepad',
		name: gp.id,
		id: `gamepad-${gp.index}`,
		connected: true,
		timestamp: Date.now(),
		axes: gp.axes.length,
		buttons: gp.buttons.length,
	};
	connectedDevices.set(device.id, device);
	config.onDeviceConnected?.(device);
}

function handleGamepadDisconnected(e: GamepadEvent) {
	const id = `gamepad-${e.gamepad.index}`;
	const device = connectedDevices.get(id);
	if (device) {
		device.connected = false;
		config.onDeviceDisconnected?.(device);
		connectedDevices.delete(id);
	}
}

function pollGamepads() {
	const gamepads = navigator.getGamepads?.() ?? [];
	for (const gp of gamepads) {
		if (!gp) continue;
		const id = `gamepad-${gp.index}`;
		if (!connectedDevices.has(id)) {
			const device: DetectedDevice = {
				type: 'gamepad',
				name: gp.id,
				id,
				connected: gp.connected,
				timestamp: Date.now(),
				axes: gp.axes.length,
				buttons: gp.buttons.length,
			};
			connectedDevices.set(id, device);
			config.onDeviceConnected?.(device);
		}
	}

	// Remove stale gamepads
	for (const [id, device] of connectedDevices) {
		if (device.type !== 'gamepad') continue;
		const idx = parseInt(id.split('-')[1]);
		const gp = gamepads[idx];
		if (!gp || !gp.connected) {
			device.connected = false;
			config.onDeviceDisconnected?.(device);
			connectedDevices.delete(id);
		}
	}
}

async function checkVR() {
	if (!navigator.xr) {
		vrSupported = false;
		arSupported = false;
		return;
	}
	try {
		vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
		if (vrSupported && !connectedDevices.has('vr-headset')) {
			const device: DetectedDevice = {
				type: 'vr',
				name: 'VR Headset',
				id: 'vr-headset',
				connected: true,
				timestamp: Date.now(),
			};
			connectedDevices.set('vr-headset', device);
			config.onDeviceConnected?.(device);
			config.onVRAvailable?.('immersive-vr');
		} else if (!vrSupported && connectedDevices.has('vr-headset')) {
			const device = connectedDevices.get('vr-headset')!;
			device.connected = false;
			config.onDeviceDisconnected?.(device);
			connectedDevices.delete('vr-headset');
		}
	} catch {
		vrSupported = false;
	}

	try {
		arSupported = await navigator.xr.isSessionSupported('immersive-ar');
	} catch {
		arSupported = false;
	}
}

function checkTouch() {
	touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	if (touchSupported && !connectedDevices.has('touch-screen')) {
		connectedDevices.set('touch-screen', {
			type: 'touch',
			name: 'Touch Screen',
			id: 'touch-screen',
			connected: true,
			timestamp: Date.now(),
		});
	}
}
