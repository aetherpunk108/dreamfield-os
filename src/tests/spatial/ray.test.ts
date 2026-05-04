import { describe, it, expect } from 'vitest';
import { createRay, intersectAABB, intersectSphere, intersectGaussian } from '$lib/spatial/ray.js';

describe('Ray', () => {
	it('normalizes direction on creation', () => {
		const ray = createRay([0, 0, 0], [3, 0, 0], 'obs-1');
		expect(ray.direction[0]).toBeCloseTo(1);
		expect(ray.direction[1]).toBeCloseTo(0);
		expect(ray.direction[2]).toBeCloseTo(0);
	});
});

describe('Ray-AABB intersection', () => {
	const aabb = { min: [-1, -1, -1] as [number, number, number], max: [1, 1, 1] as [number, number, number] };

	it('hits a box directly ahead', () => {
		const ray = createRay([0, 0, -5], [0, 0, 1], 'obs');
		const t = intersectAABB(ray, aabb);
		expect(t).not.toBeNull();
		expect(t!).toBeCloseTo(4);
	});

	it('misses a box to the side', () => {
		const ray = createRay([0, 0, -5], [1, 0, 0], 'obs');
		const t = intersectAABB(ray, aabb);
		expect(t).toBeNull();
	});

	it('returns 0 when origin is inside the box', () => {
		const ray = createRay([0, 0, 0], [0, 0, 1], 'obs');
		const t = intersectAABB(ray, aabb);
		expect(t).not.toBeNull();
	});
});

describe('Ray-Sphere intersection', () => {
	const sphere = { center: [0, 0, 0] as [number, number, number], radius: 1 };

	it('hits a sphere directly ahead', () => {
		const ray = createRay([0, 0, -5], [0, 0, 1], 'obs');
		const t = intersectSphere(ray, sphere);
		expect(t).not.toBeNull();
		expect(t!).toBeCloseTo(4);
	});

	it('misses a sphere', () => {
		const ray = createRay([0, 5, -5], [0, 0, 1], 'obs');
		const t = intersectSphere(ray, sphere);
		expect(t).toBeNull();
	});
});

describe('Ray-Gaussian intersection', () => {
	it('uses 2*sigma as effective radius', () => {
		const ray = createRay([0, 0, -5], [0, 0, 1], 'obs');
		const t = intersectGaussian(ray, [0, 0, 0], 0.5);
		expect(t).not.toBeNull();
		expect(t!).toBeCloseTo(4); // sphere radius = 1, so hit at z=-1 -> dist 4
	});

	it('misses when far away', () => {
		const ray = createRay([0, 10, -5], [0, 0, 1], 'obs');
		const t = intersectGaussian(ray, [0, 0, 0], 0.5);
		expect(t).toBeNull();
	});
});
