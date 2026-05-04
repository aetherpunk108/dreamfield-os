import type { Vec3 } from '$lib/spatial/types.js';
import type { FlightInput } from './input.js';

export interface ShipState {
	position: Vec3;
	velocity: Vec3;
	rotation: { pitch: number; yaw: number; roll: number };
	speed: number;
	throttleLevel: number;
	boostActive: boolean;
	afterburnerFlash: number;
}

export interface ShipConfig {
	maxSpeed: number;
	boostMultiplier: number;
	acceleration: number;
	deceleration: number;
	pitchRate: number;
	yawRate: number;
	rollRate: number;
	drag: number;
	brakeForce: number;
}

export const DEFAULT_SHIP_CONFIG: ShipConfig = {
	maxSpeed: 50,
	boostMultiplier: 2.5,
	acceleration: 20,
	deceleration: 8,
	pitchRate: 2.2,
	yawRate: 2.5,
	rollRate: 3.0,
	drag: 0.98,
	brakeForce: 30,
};

export function createShipState(): ShipState {
	return {
		position: [0, 5, 0],
		velocity: [0, 0, 0],
		rotation: { pitch: 0, yaw: 0, roll: 0 },
		speed: 0,
		throttleLevel: 0,
		boostActive: false,
		afterburnerFlash: 0,
	};
}

/**
 * Update ship physics from flight input.
 */
export function updateShip(ship: ShipState, input: FlightInput, config: ShipConfig, dt: number): ShipState {
	// Rotation
	const newRotation = {
		pitch: ship.rotation.pitch + input.pitch * config.pitchRate * dt,
		yaw: ship.rotation.yaw + input.yaw * config.yawRate * dt,
		roll: ship.rotation.roll + input.roll * config.rollRate * dt,
	};

	// Clamp pitch
	newRotation.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, newRotation.pitch));

	// Dampen roll back to 0 over time
	newRotation.roll *= 0.95;

	// Throttle smoothing
	const targetThrottle = input.throttle;
	const throttleLevel = ship.throttleLevel + (targetThrottle - ship.throttleLevel) * Math.min(1, dt * 5);

	// Speed calculation
	const maxSpd = input.boost ? config.maxSpeed * config.boostMultiplier : config.maxSpeed;
	let speed = ship.speed;

	if (throttleLevel > 0.01) {
		speed += throttleLevel * config.acceleration * dt;
	} else {
		speed -= config.deceleration * dt;
	}

	if (input.brake) {
		speed -= config.brakeForce * dt;
	}

	speed = Math.max(0, Math.min(maxSpd, speed));
	speed *= config.drag;

	// Direction from rotation
	const cosPitch = Math.cos(newRotation.pitch);
	const sinPitch = Math.sin(newRotation.pitch);
	const cosYaw = Math.cos(newRotation.yaw);
	const sinYaw = Math.sin(newRotation.yaw);

	const dirX = cosPitch * sinYaw;
	const dirY = -sinPitch;
	const dirZ = cosPitch * cosYaw;

	const velocity: Vec3 = [
		dirX * speed * dt,
		dirY * speed * dt,
		dirZ * speed * dt,
	];

	const position: Vec3 = [
		ship.position[0] + velocity[0],
		ship.position[1] + velocity[1],
		ship.position[2] + velocity[2],
	];

	// Afterburner flash
	let afterburnerFlash = ship.afterburnerFlash;
	if (input.boost && throttleLevel > 0.5) {
		afterburnerFlash = Math.min(1, afterburnerFlash + dt * 4);
	} else {
		afterburnerFlash = Math.max(0, afterburnerFlash - dt * 2);
	}

	return {
		position,
		velocity,
		rotation: newRotation,
		speed,
		throttleLevel,
		boostActive: input.boost,
		afterburnerFlash,
	};
}
