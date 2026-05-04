import { describe, it, expect } from 'vitest';
import {
	orbitalPosition, moonPosition, earthPosition,
	earthRotation, toVisScale, getCelestialState
} from '$lib/geospatial/orbits.js';
import { ORBITAL_DISTANCE, ORBITAL_PERIOD } from '$lib/geospatial/constants.js';

describe('Orbital mechanics', () => {
	it('returns origin at t=0 with phase=0', () => {
		const pos = orbitalPosition(100, 1000, 0, 0, 0);
		expect(pos[0]).toBeCloseTo(100); // cos(0) = 1
		expect(pos[1]).toBeCloseTo(0);
		expect(pos[2]).toBeCloseTo(0);
	});

	it('returns quarter orbit position', () => {
		const period = 1000;
		const pos = orbitalPosition(100, period, 0, period / 4);
		// At t = period/4, angle = pi/2, cos(pi/2) ≈ 0
		expect(pos[0]).toBeCloseTo(0, 0);
	});

	it('moon position has correct distance magnitude', () => {
		const pos = moonPosition(0);
		const dist = Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2);
		expect(dist).toBeCloseTo(ORBITAL_DISTANCE.earthToMoon, -3);
	});

	it('earth position has correct distance magnitude', () => {
		const pos = earthPosition(0);
		const dist = Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2);
		expect(dist).toBeCloseTo(ORBITAL_DISTANCE.earthToSun, -3);
	});

	it('earth rotation completes in one sidereal day', () => {
		const angle0 = earthRotation(0);
		const angle1 = earthRotation(ORBITAL_PERIOD.earthRotation);
		expect(angle1 - angle0).toBeCloseTo(2 * Math.PI, 4);
	});
});

describe('Visualization scaling', () => {
	it('scales positions correctly', () => {
		const pos = toVisScale([1e7, 2e7, 3e7], 1e-7);
		expect(pos[0]).toBeCloseTo(1);
		expect(pos[1]).toBeCloseTo(2);
		expect(pos[2]).toBeCloseTo(3);
	});
});

describe('getCelestialState', () => {
	it('returns valid state object', () => {
		const state = getCelestialState(0, 1e-9);
		expect(state.sunPos).toEqual([0, 0, 0]);
		expect(state.earthPos).toBeDefined();
		expect(state.moonPos).toBeDefined();
		expect(state.moonAbsolute).toBeDefined();
		expect(typeof state.earthRotAngle).toBe('number');
	});

	it('moon absolute = earth + moon relative', () => {
		const state = getCelestialState(1000, 1e-9);
		expect(state.moonAbsolute[0]).toBeCloseTo(state.earthPos[0] + state.moonPos[0], 5);
		expect(state.moonAbsolute[1]).toBeCloseTo(state.earthPos[1] + state.moonPos[1], 5);
		expect(state.moonAbsolute[2]).toBeCloseTo(state.earthPos[2] + state.moonPos[2], 5);
	});
});
