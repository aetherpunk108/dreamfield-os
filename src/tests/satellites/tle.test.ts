import { describe, it, expect } from 'vitest';
import { parseTLE, propagate, ISS_TLE, SAMPLE_SATELLITES, getAllPositions, satToScene } from '$lib/satellites/tle.js';

describe('TLE Parser', () => {
	it('parses ISS TLE correctly', () => {
		expect(ISS_TLE.name).toBe('ISS (ZARYA)');
		expect(ISS_TLE.inclination).toBeCloseTo(51.64 * Math.PI / 180, 2);
		expect(ISS_TLE.eccentricity).toBeCloseTo(0.0001, 3);
		expect(ISS_TLE.meanMotion).toBeCloseTo(15.49, 1);
		expect(ISS_TLE.catalogId).toBe('25544');
	});

	it('parses custom TLE', () => {
		const tle = parseTLE(
			'TEST SAT',
			'1 99999U 24001A   24100.50000000  .00000000  00000-0  00000-0 0  9999',
			'2 99999  45.0000  90.0000 0010000 180.0000   0.0000 14.50000000010000'
		);
		expect(tle.name).toBe('TEST SAT');
		expect(tle.inclination).toBeCloseTo(45 * Math.PI / 180, 2);
		expect(tle.meanMotion).toBeCloseTo(14.5, 1);
	});
});

describe('Orbital propagation', () => {
	it('propagates ISS to valid position', () => {
		const now = Date.now() / 1000;
		const pos = propagate(ISS_TLE, now);
		expect(pos.name).toBe('ISS (ZARYA)');
		expect(pos.altitude).toBeGreaterThan(300);  // ISS is ~400km
		expect(pos.altitude).toBeLessThan(500);
		expect(pos.lat).toBeGreaterThanOrEqual(-90);
		expect(pos.lat).toBeLessThanOrEqual(90);
		expect(pos.lon).toBeGreaterThanOrEqual(-180);
		expect(pos.lon).toBeLessThanOrEqual(180);
	});

	it('position changes over time', () => {
		const t1 = ISS_TLE.epoch;
		const t2 = ISS_TLE.epoch + 600; // 10 minutes later
		const pos1 = propagate(ISS_TLE, t1);
		const pos2 = propagate(ISS_TLE, t2);
		expect(pos1.position[0]).not.toBeCloseTo(pos2.position[0], 0);
	});

	it('propagates all sample satellites', () => {
		const now = Date.now() / 1000;
		const positions = getAllPositions(SAMPLE_SATELLITES, now);
		expect(positions).toHaveLength(4);
		positions.forEach(p => {
			expect(p.altitude).toBeGreaterThan(100);
			expect(isFinite(p.lat)).toBe(true);
		});
	});

	it('converts to scene coordinates', () => {
		const now = Date.now() / 1000;
		const pos = propagate(ISS_TLE, now);
		const scene = satToScene(pos, 3e-9);
		expect(scene).toHaveLength(3);
		expect(scene.every(v => isFinite(v))).toBe(true);
	});
});
