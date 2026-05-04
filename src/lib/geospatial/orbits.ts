import { ORBITAL_DISTANCE, ORBITAL_PERIOD, AXIAL_TILT, VIS_SCALE } from './constants.js';
import type { Vec3 } from '$lib/spatial/types.js';

/**
 * Compute orbital position using simple Keplerian circular orbit.
 * Returns [x, y, z] in meters.
 * t = time in seconds since J2000 epoch
 */
export function orbitalPosition(
	distance: number,
	period: number,
	tilt: number,
	t: number,
	phaseOffset = 0
): Vec3 {
	const angle = ((2 * Math.PI * t) / period) + phaseOffset;
	const x = distance * Math.cos(angle);
	const y = distance * Math.sin(tilt) * Math.sin(angle);
	const z = distance * Math.cos(tilt) * Math.sin(angle);
	return [x, y, z];
}

/** Moon position relative to Earth in meters */
export function moonPosition(t: number): Vec3 {
	return orbitalPosition(
		ORBITAL_DISTANCE.earthToMoon,
		ORBITAL_PERIOD.moonAroundEarth,
		AXIAL_TILT.moon,
		t
	);
}

/** Earth position relative to Sun in meters */
export function earthPosition(t: number): Vec3 {
	return orbitalPosition(
		ORBITAL_DISTANCE.earthToSun,
		ORBITAL_PERIOD.earthAroundSun,
		AXIAL_TILT.earth,
		t
	);
}

/** Earth rotation angle in radians at time t */
export function earthRotation(t: number): number {
	return (2 * Math.PI * t) / ORBITAL_PERIOD.earthRotation;
}

/** Scale a real-world position to visualization units */
export function toVisScale(pos: Vec3, scale = VIS_SCALE): Vec3 {
	return [pos[0] * scale, pos[1] * scale, pos[2] * scale];
}

/**
 * Get current celestial positions scaled for the scene.
 * Uses a configurable time multiplier for speed.
 */
export interface CelestialState {
	earthPos: Vec3;
	moonPos: Vec3;        // relative to Earth
	moonAbsolute: Vec3;   // relative to Sun
	earthRotAngle: number;
	sunPos: Vec3;         // always [0,0,0] in heliocentric
}

export function getCelestialState(t: number, visScale = VIS_SCALE): CelestialState {
	const earthReal = earthPosition(t);
	const moonRelative = moonPosition(t);

	const earthVis = toVisScale(earthReal, visScale);
	const moonRelVis = toVisScale(moonRelative, visScale);
	const moonAbsVis: Vec3 = [
		earthVis[0] + moonRelVis[0],
		earthVis[1] + moonRelVis[1],
		earthVis[2] + moonRelVis[2]
	];

	return {
		earthPos: earthVis,
		moonPos: moonRelVis,
		moonAbsolute: moonAbsVis,
		earthRotAngle: earthRotation(t),
		sunPos: [0, 0, 0]
	};
}
