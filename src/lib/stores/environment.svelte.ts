/** Scene environment settings store */

let hdriPath = $state<string | null>(null);
let hdriIntensity = $state(1.0);
let hdriRotation = $state(0); // radians — aligns galaxy to polar coords
let hdriBlur = $state(0);
let backgroundEnabled = $state(true);
let nearClip = $state(0.01);
let farClip = $state(100000); // effectively infinite
let fogEnabled = $state(true);
let fogNear = $state(20);
let fogFar = $state(80);
let toneMapping = $state<'linear' | 'aces' | 'reinhard' | 'cineon'>('aces');
let exposure = $state(1.0);

// Predefined HDRI options
export const HDRI_PRESETS = [
	{ name: 'Starmap 4K (Galaxy)', path: '/hdri/starmap_2020_4k.exr' },
	{ name: 'None (Black)', path: null },
] as const;

export function getHdriPath() { return hdriPath; }
export function setHdriPath(path: string | null) { hdriPath = path; }

export function getHdriIntensity() { return hdriIntensity; }
export function setHdriIntensity(v: number) { hdriIntensity = v; }

export function getHdriRotation() { return hdriRotation; }
export function setHdriRotation(v: number) { hdriRotation = v; }

export function getHdriBlur() { return hdriBlur; }
export function setHdriBlur(v: number) { hdriBlur = v; }

export function getBackgroundEnabled() { return backgroundEnabled; }
export function setBackgroundEnabled(v: boolean) { backgroundEnabled = v; }

export function getNearClip() { return nearClip; }
export function setNearClip(v: number) { nearClip = v; }

export function getFarClip() { return farClip; }
export function setFarClip(v: number) { farClip = v; }

export function getFogEnabled() { return fogEnabled; }
export function setFogEnabled(v: boolean) { fogEnabled = v; }

export function getFogNear() { return fogNear; }
export function setFogNear(v: number) { fogNear = v; }

export function getFogFar() { return fogFar; }
export function setFogFar(v: number) { fogFar = v; }

export function getToneMapping() { return toneMapping; }
export function setToneMapping(v: 'linear' | 'aces' | 'reinhard' | 'cineon') { toneMapping = v; }

export function getExposure() { return exposure; }
export function setExposure(v: number) { exposure = v; }

/** Get all settings as a serializable object */
export function getEnvironmentSettings() {
	return {
		hdriPath, hdriIntensity, hdriRotation, hdriBlur,
		backgroundEnabled, nearClip, farClip,
		fogEnabled, fogNear, fogFar, toneMapping, exposure,
	};
}
