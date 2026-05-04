/**
 * Phase 12: Persistence — Save/Load world state to localStorage and export/import JSON.
 */

import type { Vec3 } from '$lib/spatial/types.js';

export interface WorldSave {
	version: string;
	timestamp: number;
	name: string;
	viewMode: string;
	ghosts: Array<{ id: string; position: Vec3; collapsed: boolean }>;
	pins: Array<{ name: string; lat: number; lon: number; alt: number; category: string; color: string }>;
	waypoints: Array<{ name: string; position: Vec3; type: string; color: string }>;
	settings: {
		hdriPath: string | null;
		hdriIntensity: number;
		hdriRotation: number;
		nearClip: number;
		farClip: number;
		fogEnabled: boolean;
		toneMapping: string;
		exposure: number;
	};
	achievements: string[]; // unlocked IDs
	playerName: string;
}

const STORAGE_KEY = 'dreamfield-os-save';
const AUTOSAVE_KEY = 'dreamfield-os-autosave';

/**
 * Save world state to localStorage.
 */
export function saveWorld(data: WorldSave): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	} catch (e) {
		console.warn('Failed to save world:', e);
	}
}

/**
 * Load world state from localStorage.
 */
export function loadWorld(): WorldSave | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as WorldSave;
	} catch { return null; }
}

/**
 * Autosave (throttled, separate key).
 */
export function autosave(data: WorldSave): void {
	try {
		localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
	} catch {}
}

/**
 * Load autosave.
 */
export function loadAutosave(): WorldSave | null {
	try {
		const raw = localStorage.getItem(AUTOSAVE_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as WorldSave;
	} catch { return null; }
}

/**
 * Clear all saved data.
 */
export function clearSaves(): void {
	localStorage.removeItem(STORAGE_KEY);
	localStorage.removeItem(AUTOSAVE_KEY);
}

/**
 * Export world as downloadable JSON file.
 */
export function exportWorld(data: WorldSave): void {
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `dreamfield-${data.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`;
	a.click();
	URL.revokeObjectURL(url);
}

/**
 * Import world from a JSON file.
 */
export function importWorld(file: File): Promise<WorldSave> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const data = JSON.parse(reader.result as string) as WorldSave;
				if (!data.version || !data.timestamp) throw new Error('Invalid save format');
				resolve(data);
			} catch (e) { reject(e); }
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsText(file);
	});
}

/**
 * Create a fresh WorldSave template.
 */
export function createEmptyWorld(name = 'Untitled World'): WorldSave {
	return {
		version: '1.0.0',
		timestamp: Date.now(),
		name,
		viewMode: 'orrery',
		ghosts: [],
		pins: [],
		waypoints: [],
		settings: {
			hdriPath: '/hdri/starmap_2020_4k.exr',
			hdriIntensity: 1.0,
			hdriRotation: 0,
			nearClip: 0.01,
			farClip: 100000,
			fogEnabled: true,
			toneMapping: 'aces',
			exposure: 1.0,
		},
		achievements: [],
		playerName: 'Pilot',
	};
}

/**
 * Get list of all save slots.
 */
export function listSaves(): { key: string; name: string; timestamp: number }[] {
	const saves: { key: string; name: string; timestamp: number }[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key?.startsWith('dreamfield-os-')) {
			try {
				const data = JSON.parse(localStorage.getItem(key)!) as WorldSave;
				saves.push({ key, name: data.name, timestamp: data.timestamp });
			} catch {}
		}
	}
	return saves.sort((a, b) => b.timestamp - a.timestamp);
}
