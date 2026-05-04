/**
 * Ship Scanner System — detect, scan, and analyze objects.
 */

import type { Vec3 } from '$lib/spatial/types.js';
import type { CelestialBody } from './worldgen.js';

export interface ScanResult {
	body: CelestialBody;
	distance: number;
	bearing: { yaw: number; pitch: number };
	scanProgress: number; // 0-1
	complete: boolean;
	data?: ScanData;
}

export interface ScanData {
	composition: string;
	threat: 'none' | 'low' | 'medium' | 'high' | 'extreme';
	resources: string[];
	signals: string[];
	age?: string;
}

export interface ScannerConfig {
	range: number;
	scanSpeed: number; // progress per second
	maxTargets: number;
}

export const DEFAULT_SCANNER: ScannerConfig = {
	range: 80,
	scanSpeed: 0.4,
	maxTargets: 8,
};

let activeScans: Map<string, ScanResult> = new Map();

/**
 * Start scanning a body.
 */
export function startScan(body: CelestialBody, distance: number, bearing: { yaw: number; pitch: number }): void {
	if (activeScans.has(body.id)) return;
	activeScans.set(body.id, {
		body,
		distance,
		bearing,
		scanProgress: 0,
		complete: false,
	});
}

/**
 * Update all active scans (call per frame).
 */
export function updateScans(dt: number, config: ScannerConfig = DEFAULT_SCANNER): ScanResult[] {
	const completed: ScanResult[] = [];
	for (const [id, scan] of activeScans) {
		if (scan.complete) continue;
		scan.scanProgress = Math.min(1, scan.scanProgress + config.scanSpeed * dt);
		if (scan.scanProgress >= 1) {
			scan.complete = true;
			scan.data = generateScanData(scan.body);
			completed.push(scan);
		}
	}
	return completed;
}

/**
 * Get all active/completed scans.
 */
export function getScans(): ScanResult[] {
	return Array.from(activeScans.values());
}

/**
 * Clear completed scans.
 */
export function clearCompleted(): void {
	for (const [id, scan] of activeScans) {
		if (scan.complete) activeScans.delete(id);
	}
}

/**
 * Reset scanner.
 */
export function resetScanner(): void {
	activeScans = new Map();
}

/**
 * Compute bearing from ship to target.
 */
export function computeBearing(from: Vec3, to: Vec3): { yaw: number; pitch: number; distance: number } {
	const dx = to[0] - from[0];
	const dy = to[1] - from[1];
	const dz = to[2] - from[2];
	const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
	const yaw = Math.atan2(dx, dz);
	const pitch = Math.asin(dy / (dist || 1));
	return { yaw, pitch, distance: dist };
}

// --- Internal ---

function generateScanData(body: CelestialBody): ScanData {
	const compositions: Record<string, string> = {
		star: 'Hydrogen/Helium plasma',
		planet: 'Silicate rock, iron core',
		moon: 'Regolith, subsurface ice',
		station: 'Titanium alloy hull',
		asteroid: 'Carbonaceous chondrite',
		anomaly: 'UNKNOWN — quantum fluctuation',
		gate: 'Exotic matter framework',
		wreck: 'Degraded alloy composite',
		beacon: 'Synthetic polymer shell',
	};

	const threats: Record<string, ScanData['threat']> = {
		star: 'extreme',
		anomaly: 'high',
		planet: 'none',
		moon: 'none',
		station: 'none',
		asteroid: 'low',
		gate: 'medium',
		wreck: 'low',
		beacon: 'none',
	};

	const resourceOptions = ['Titanium', 'Helium-3', 'Dark Matter', 'Quantum Crystals', 'Rare Earth', 'Ice', 'Carbon', 'Iron'];
	const signalOptions = ['Distress beacon', 'Encrypted comm', 'Navigation pulse', 'Gravitational wave', 'EM burst', 'Quantum signature'];

	const resources: string[] = [];
	const signals: string[] = [];

	if (['asteroid', 'wreck', 'moon', 'planet'].includes(body.type)) {
		const count = Math.floor(Math.random() * 3) + 1;
		for (let i = 0; i < count; i++) {
			resources.push(resourceOptions[Math.floor(Math.random() * resourceOptions.length)]);
		}
	}

	if (['station', 'wreck', 'anomaly', 'gate', 'beacon'].includes(body.type)) {
		signals.push(signalOptions[Math.floor(Math.random() * signalOptions.length)]);
	}

	return {
		composition: compositions[body.type] ?? 'Unknown material',
		threat: threats[body.type] ?? 'none',
		resources: [...new Set(resources)],
		signals,
		age: body.type === 'wreck' ? `${Math.floor(Math.random() * 500 + 50)} years` : undefined,
	};
}
