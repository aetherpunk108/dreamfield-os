/**
 * FORGE — Camera Effects System
 * DOF, film grain, vignette, color grading, motion blur presets.
 */

export interface CameraEffect {
	id: string;
	name: string;
	enabled: boolean;
	params: Record<string, number | boolean | string>;
}

export interface CameraPreset {
	name: string;
	description: string;
	effects: CameraEffect[];
	fov: number;
	exposure: number;
	toneMapping: string;
}

export const CAMERA_EFFECTS: CameraEffect[] = [
	{
		id: 'bloom', name: 'Bloom', enabled: true,
		params: { intensity: 1.5, threshold: 0.1, radius: 0.8 },
	},
	{
		id: 'dof', name: 'Depth of Field', enabled: false,
		params: { focusDistance: 10, aperture: 0.025, maxBlur: 0.01 },
	},
	{
		id: 'vignette', name: 'Vignette', enabled: true,
		params: { offset: 0.3, darkness: 0.7 },
	},
	{
		id: 'chromatic', name: 'Chromatic Aberration', enabled: false,
		params: { offset: 0.002 },
	},
	{
		id: 'filmGrain', name: 'Film Grain', enabled: false,
		params: { intensity: 0.15, luminanceThreshold: 0.8 },
	},
	{
		id: 'colorGrade', name: 'Color Grading', enabled: false,
		params: { brightness: 0, contrast: 0, saturation: 0, hue: 0, temperature: 6500 },
	},
	{
		id: 'scanlines', name: 'CRT Scanlines', enabled: false,
		params: { count: 800, intensity: 0.1 },
	},
	{
		id: 'pixelate', name: 'Pixelate', enabled: false,
		params: { granularity: 4 },
	},
	{
		id: 'glitch', name: 'Glitch', enabled: false,
		params: { strength: 0.3, frequency: 0.5 },
	},
	{
		id: 'tiltShift', name: 'Tilt Shift', enabled: false,
		params: { blur: 0.01, start: 0.4, end: 0.6 },
	},
];

export const CAMERA_PRESETS: CameraPreset[] = [
	{
		name: 'Cinematic',
		description: 'Film look — shallow DOF, color grading, grain',
		fov: 35, exposure: 1.1, toneMapping: 'aces',
		effects: [
			{ id: 'bloom', name: 'Bloom', enabled: true, params: { intensity: 0.8, threshold: 0.2, radius: 0.6 } },
			{ id: 'dof', name: 'DOF', enabled: true, params: { focusDistance: 8, aperture: 0.04, maxBlur: 0.015 } },
			{ id: 'vignette', name: 'Vignette', enabled: true, params: { offset: 0.25, darkness: 0.8 } },
			{ id: 'filmGrain', name: 'Film Grain', enabled: true, params: { intensity: 0.1 } },
			{ id: 'colorGrade', name: 'Color', enabled: true, params: { contrast: 0.1, saturation: -0.1, temperature: 5500 } },
		],
	},
	{
		name: 'Cyberpunk',
		description: 'Neon glow, chromatic, heavy bloom',
		fov: 55, exposure: 0.9, toneMapping: 'aces',
		effects: [
			{ id: 'bloom', name: 'Bloom', enabled: true, params: { intensity: 2.5, threshold: 0.05, radius: 0.9 } },
			{ id: 'chromatic', name: 'Chromatic', enabled: true, params: { offset: 0.004 } },
			{ id: 'vignette', name: 'Vignette', enabled: true, params: { offset: 0.4, darkness: 0.9 } },
			{ id: 'glitch', name: 'Glitch', enabled: true, params: { strength: 0.15, frequency: 0.2 } },
		],
	},
	{
		name: 'Retro CRT',
		description: 'Old-school terminal feel',
		fov: 50, exposure: 0.8, toneMapping: 'linear',
		effects: [
			{ id: 'bloom', name: 'Bloom', enabled: true, params: { intensity: 1.0, threshold: 0.3, radius: 0.5 } },
			{ id: 'scanlines', name: 'Scanlines', enabled: true, params: { count: 600, intensity: 0.15 } },
			{ id: 'vignette', name: 'Vignette', enabled: true, params: { offset: 0.5, darkness: 1.0 } },
			{ id: 'chromatic', name: 'Chromatic', enabled: true, params: { offset: 0.003 } },
			{ id: 'pixelate', name: 'Pixelate', enabled: true, params: { granularity: 2 } },
		],
	},
	{
		name: 'Clean',
		description: 'Minimal processing — sharp and clear',
		fov: 50, exposure: 1.0, toneMapping: 'aces',
		effects: [
			{ id: 'bloom', name: 'Bloom', enabled: true, params: { intensity: 0.5, threshold: 0.4, radius: 0.4 } },
		],
	},
	{
		name: 'Dreamfield',
		description: 'Default Dreamfield OS aesthetic',
		fov: 50, exposure: 1.0, toneMapping: 'aces',
		effects: [
			{ id: 'bloom', name: 'Bloom', enabled: true, params: { intensity: 2.0, threshold: 0.08, radius: 0.85 } },
			{ id: 'vignette', name: 'Vignette', enabled: true, params: { offset: 0.3, darkness: 0.7 } },
			{ id: 'chromatic', name: 'Chromatic', enabled: true, params: { offset: 0.0008 } },
		],
	},
];

let currentEffects = [...CAMERA_EFFECTS];
let currentPreset = 'Dreamfield';

export function getEffects(): CameraEffect[] { return currentEffects; }
export function getCurrentPreset(): string { return currentPreset; }

export function toggleEffect(id: string): void {
	const effect = currentEffects.find(e => e.id === id);
	if (effect) effect.enabled = !effect.enabled;
}

export function setEffectParam(id: string, key: string, value: number | boolean | string): void {
	const effect = currentEffects.find(e => e.id === id);
	if (effect) effect.params[key] = value;
}

export function applyPreset(presetName: string): void {
	const preset = CAMERA_PRESETS.find(p => p.name === presetName);
	if (!preset) return;
	currentPreset = presetName;
	// Disable all, then enable preset effects
	currentEffects.forEach(e => e.enabled = false);
	for (const pe of preset.effects) {
		const effect = currentEffects.find(e => e.id === pe.id);
		if (effect) {
			effect.enabled = pe.enabled;
			effect.params = { ...effect.params, ...pe.params };
		}
	}
}

export function resetEffects(): void {
	currentEffects = [...CAMERA_EFFECTS.map(e => ({ ...e, params: { ...e.params } }))];
	currentPreset = 'Dreamfield';
	applyPreset('Dreamfield');
}
