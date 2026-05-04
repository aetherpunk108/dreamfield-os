import { describe, it, expect } from 'vitest';
import { createGhost } from '$lib/spatial/primitives/ghost.js';
import { createTether } from '$lib/spatial/primitives/tether.js';

describe('Ghost primitive', () => {
	it('creates with defaults', () => {
		const g = createGhost('g1', [1, 2, 3]);
		expect(g.id).toBe('g1');
		expect(g.position).toEqual([1, 2, 3]);
		expect(g.sigma).toBe(0.5);
		expect(g.color).toEqual([1, 1, 1, 1]);
		expect(g.opacity).toBe(1);
	});

	it('creates with custom values', () => {
		const g = createGhost('g2', [0, 0, 0], 1.5, [0.5, 0.5, 1, 0.8], 0.6);
		expect(g.sigma).toBe(1.5);
		expect(g.color[2]).toBe(1);
		expect(g.opacity).toBe(0.6);
	});
});

describe('Tether primitive', () => {
	it('creates a triangle', () => {
		const t = createTether(
			't1',
			[[0, 0, 0], [1, 0, 0], [0, 1, 0]],
			[[0, 0, 1], [0, 0, 1], [0, 0, 1]],
			[0, 1, 2]
		);
		expect(t.id).toBe('t1');
		expect(t.vertices).toHaveLength(3);
		expect(t.indices).toEqual([0, 1, 2]);
	});
});
