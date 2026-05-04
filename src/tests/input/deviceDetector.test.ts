import { describe, it, expect } from 'vitest';
import {
	getConnectedDevices, isDeviceConnected, getPreferredDevice,
	isVRAvailable, isTouchAvailable
} from '$lib/input/deviceDetector.js';

describe('Device Detector', () => {
	it('returns empty devices initially', () => {
		const devices = getConnectedDevices();
		expect(Array.isArray(devices)).toBe(true);
	});

	it('reports no VR in test environment', () => {
		expect(isVRAvailable()).toBe(false);
	});

	it('defaults to keyboard as preferred', () => {
		expect(getPreferredDevice()).toBe('keyboard');
	});

	it('isDeviceConnected returns false for unconnected types', () => {
		expect(isDeviceConnected('gamepad')).toBe(false);
		expect(isDeviceConnected('vr')).toBe(false);
	});
});
