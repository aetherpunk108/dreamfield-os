import { describe, it, expect } from 'vitest';
import { Field } from '$lib/spatial/octree/field.js';
import { BreathField } from '$lib/spatial/octree/breath.js';
import { createRay } from '$lib/spatial/ray.js';

describe('Field (Octree)', () => {
	const bounds = {
		min: [-10, -10, -10] as [number, number, number],
		max: [10, 10, 10] as [number, number, number]
	};

	it('inserts a primitive and finds it via ray', () => {
		const field = new Field(bounds);
		field.insertPrimitive('g1', [0, 0, 0]);

		const ray = createRay([0, 0, -15], [0, 0, 1], 'obs');
		const hits = field.queryRay(ray);
		expect(hits).toContain('g1');
	});

	it('does not find primitives outside ray path', () => {
		const field = new Field(bounds);
		field.insertPrimitive('g1', [0, 0, 0]);

		// Ray going away from bounds
		const ray = createRay([0, 0, -15], [0, 0, -1], 'obs');
		const hits = field.queryRay(ray);
		expect(hits).toHaveLength(0);
	});

	it('updates observer state cache', () => {
		const field = new Field(bounds);
		field.updateObserverState('obs-1', 1);
		expect(field.root.stateCache.get('obs-1')).toBe(1);
	});
});

describe('BreathField (Sparse Voxel)', () => {
	it('stores and samples voxels', () => {
		const bf = new BreathField(1);
		bf.set([2, 3, 4], 0.8, 300);

		const v = bf.sample([2, 3, 4]);
		expect(v).not.toBeNull();
		expect(v!.density).toBe(0.8);
		expect(v!.temperature).toBe(300);
	});

	it('returns null for empty cells', () => {
		const bf = new BreathField(1);
		expect(bf.sample([99, 99, 99])).toBeNull();
	});

	it('tracks size', () => {
		const bf = new BreathField(1);
		bf.set([0, 0, 0], 1, 100);
		bf.set([1, 1, 1], 0.5, 200);
		expect(bf.size).toBe(2);
	});
});
