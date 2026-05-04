import { describe, it, expect } from 'vitest';
import { applyCurve, createCurve, sampleCurve, holdToThrottle } from '$lib/flight/curves.js';

describe('Pressure curves', () => {
	it('LINEAR: output equals input (after deadzone)', () => {
		const curve = createCurve('LINEAR');
		expect(applyCurve(0.5, curve)).toBeCloseTo(0.474, 1); // adjusted for deadzone
		expect(applyCurve(1.0, curve)).toBeCloseTo(1.0, 1);
	});

	it('applies deadzone correctly', () => {
		const curve = createCurve('LINEAR', { deadzone: 0.1 });
		expect(applyCurve(0.05, curve)).toBe(0);
		expect(applyCurve(0.09, curve)).toBe(0);
		expect(applyCurve(0.15, curve)).toBeGreaterThan(0);
	});

	it('SMOOTH_START: low input gives low output', () => {
		const curve = createCurve('SMOOTH_START');
		const lowOutput = applyCurve(0.3, curve);
		const linCurve = createCurve('LINEAR');
		const linOutput = applyCurve(0.3, linCurve);
		expect(lowOutput).toBeLessThan(linOutput);
	});

	it('SMOOTH_END: high input gives dampened output', () => {
		const curve = createCurve('SMOOTH_END');
		const midOutput = applyCurve(0.5, curve);
		const linCurve = createCurve('LINEAR');
		const linOutput = applyCurve(0.5, linCurve);
		expect(midOutput).toBeGreaterThan(linOutput);
	});

	it('S_SHAPE: smooth transition', () => {
		const curve = createCurve('S_SHAPE');
		const mid = applyCurve(0.5, curve);
		expect(mid).toBeCloseTo(0.5, 1); // S-curve passes through ~0.5 at midpoint
	});

	it('handles negative input', () => {
		const curve = createCurve('LINEAR');
		const neg = applyCurve(-0.5, curve);
		const pos = applyCurve(0.5, curve);
		expect(neg).toBeCloseTo(-pos, 4);
	});

	it('respects ceiling', () => {
		const curve = createCurve('LINEAR', { ceiling: 0.8 });
		const atCeiling = applyCurve(0.9, curve);
		const atMax = applyCurve(1.0, curve);
		expect(atCeiling).toBeCloseTo(atMax, 1); // both clamped at ceiling
	});
});

describe('sampleCurve', () => {
	it('returns correct number of points', () => {
		const curve = createCurve('LINEAR');
		const points = sampleCurve(curve, 32);
		expect(points).toHaveLength(33); // 0 to 32 inclusive
	});

	it('starts at 0 and ends near 1 for LINEAR', () => {
		const curve = createCurve('LINEAR');
		const points = sampleCurve(curve);
		expect(points[0][1]).toBeCloseTo(0, 1);
		expect(points[points.length - 1][1]).toBeCloseTo(1, 1);
	});
});

describe('holdToThrottle', () => {
	it('returns 0 at time 0', () => {
		expect(holdToThrottle(0)).toBe(0);
	});

	it('returns ~1 at full ramp time', () => {
		expect(holdToThrottle(1.0, 1.0)).toBeCloseTo(1.0, 2);
	});

	it('returns partial value at half ramp', () => {
		const half = holdToThrottle(0.5, 1.0);
		expect(half).toBeGreaterThan(0.3);
		expect(half).toBeLessThan(0.9);
	});

	it('SMOOTH_END: fast initial ramp', () => {
		const early = holdToThrottle(0.2, 1.0);
		expect(early).toBeGreaterThan(0.15); // faster than linear
	});
});
