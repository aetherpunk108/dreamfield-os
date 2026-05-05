/** Reactive device detection store */

import {
	startDeviceDetection, stopDeviceDetection,
	getConnectedDevices, isVRAvailable, isTouchAvailable,
	getPreferredDevice, type DetectedDevice, type DeviceType
} from '$lib/input/deviceDetector.js';

let devices = $state<DetectedDevice[]>([]);
let preferred = $state<DeviceType>('keyboard');
let vrReady = $state(false);
let initialized = $state(false);

export function getDevices() { return devices; }
export function getPreferred() { return preferred; }
export function getVRReady() { return vrReady; }
export function getInitialized() { return initialized; }

/**
 * Initialize device detection (call from app root).
 * Safe to call multiple times — restarts polling each time.
 * Only runs in browser (guards against SSR).
 */
export function initDevices() {
	if (typeof window === 'undefined') return;
	initialized = true;

	startDeviceDetection({
		pollIntervalMs: 2000,
		onDeviceConnected: (device) => {
			devices = getConnectedDevices();
			preferred = getPreferredDevice();
			vrReady = isVRAvailable();
			console.log(`[DREAMFIELD] Device connected: ${device.name} (${device.type})`);
		},
		onDeviceDisconnected: (device) => {
			devices = getConnectedDevices();
			preferred = getPreferredDevice();
			vrReady = isVRAvailable();
			console.log(`[DREAMFIELD] Device disconnected: ${device.name}`);
		},
		onVRAvailable: (mode) => {
			vrReady = true;
			console.log(`[DREAMFIELD] VR available: ${mode}`);
		},
	});

	// Initial state
	devices = getConnectedDevices();
	preferred = getPreferredDevice();
	vrReady = isVRAvailable();
}

/**
 * Cleanup on destroy.
 */
export function destroyDevices() {
	stopDeviceDetection();
	initialized = false;
}
