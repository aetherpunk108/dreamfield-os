/** Shared world state synchronization protocol */

import type { Vec3 } from '$lib/spatial/types.js';
import type { PlayerProfile } from './identity.js';

export type SyncEventType =
	| 'player:join'
	| 'player:leave'
	| 'player:move'
	| 'player:action'
	| 'world:collapse'
	| 'world:entangle'
	| 'world:spawn'
	| 'world:terrain'
	| 'chat:message';

export interface SyncEvent {
	type: SyncEventType;
	senderId: string;
	timestamp: number;
	payload: unknown;
}

export interface PlayerMovePayload {
	position: Vec3;
	rotation: { pitch: number; yaw: number; roll: number };
	speed: number;
	viewMode: string;
}

export interface CollapsePayload {
	observerId: string;
	primitiveId: string;
	position: Vec3;
}

export interface ChatPayload {
	message: string;
	channel: 'global' | 'team' | 'local';
}

/**
 * Create a sync event for transmission.
 */
export function createSyncEvent(type: SyncEventType, senderId: string, payload: unknown): SyncEvent {
	return {
		type,
		senderId,
		timestamp: Date.now(),
		payload,
	};
}

/**
 * Interpolation for remote player positions.
 * Smooths network jitter with lerp toward latest known position.
 */
export function interpolatePosition(
	current: Vec3,
	target: Vec3,
	alpha: number
): Vec3 {
	return [
		current[0] + (target[0] - current[0]) * alpha,
		current[1] + (target[1] - current[1]) * alpha,
		current[2] + (target[2] - current[2]) * alpha,
	];
}

/**
 * Dead reckoning: predict next position from velocity.
 */
export function extrapolatePosition(
	position: Vec3,
	velocity: Vec3,
	dt: number
): Vec3 {
	return [
		position[0] + velocity[0] * dt,
		position[1] + velocity[1] * dt,
		position[2] + velocity[2] * dt,
	];
}

/**
 * Priority system for sync events.
 * High-frequency events (movement) are throttled; low-frequency (collapse) are always sent.
 */
export function getSyncPriority(type: SyncEventType): number {
	switch (type) {
		case 'player:move': return 0; // throttled, 10-20Hz
		case 'player:action': return 1;
		case 'world:collapse': return 2; // always send immediately
		case 'world:entangle': return 2;
		case 'world:spawn': return 2;
		case 'chat:message': return 2;
		default: return 1;
	}
}

/**
 * Simple event throttle for movement sync.
 */
export function createThrottle(intervalMs: number): (fn: () => void) => void {
	let lastCall = 0;
	return (fn) => {
		const now = Date.now();
		if (now - lastCall >= intervalMs) {
			lastCall = now;
			fn();
		}
	};
}
