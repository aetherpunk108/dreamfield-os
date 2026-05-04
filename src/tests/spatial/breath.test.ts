import { describe, it, expect } from 'vitest';
import { BreathField } from '$lib/spatial/octree/breath.js';

describe('BreathField', () => {
	it('quantizes positions to grid resolution', () => {
		const bf = new BreathField(2);
		bf.set([3.5, 1.2, 0.8], 0.5, 250);

		// Should quantize to grid cell [1, 0, 0] (floor(3.5/2), floor(1.2/2), floor(0.8/2))
		const v = bf.sample([3.5, 1.2, 0.8]);
		expect(v).not.toBeNull();
		expect(v!.density).toBe(0.5);
	});

	it('overwrites existing voxels at same position', () => {
		const bf = new BreathField(1);
		bf.set([0, 0, 0], 0.3, 100);
		bf.set([0, 0, 0], 0.9, 500);

		const v = bf.sample([0, 0, 0]);
		expect(v!.density).toBe(0.9);
		expect(v!.temperature).toBe(500);
		expect(bf.size).toBe(1);
	});

	it('clears all voxels', () => {
		const bf = new BreathField(1);
		bf.set([0, 0, 0], 1, 100);
		bf.set([1, 1, 1], 1, 100);
		bf.clear();
		expect(bf.size).toBe(0);
	});
});
