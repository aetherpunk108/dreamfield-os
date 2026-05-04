import { describe, it, expect } from 'vitest';
import { collapseRay } from '$lib/spatial/collapse.js';
import { createRay } from '$lib/spatial/ray.js';
import { ObservationTensor } from '$lib/spatial/observation.js';
import { EntanglementMap } from '$lib/spatial/entanglement.js';
import { createGhost } from '$lib/spatial/primitives/ghost.js';

describe('collapseRay', () => {
	it('collapses a ghost hit by a ray', () => {
		const tensor = new ObservationTensor();
		const ghost = createGhost('g1', [0, 0, 0], 0.5);
		const ray = createRay([0, 0, -5], [0, 0, 1], 'obs');

		const result = collapseRay(ray, [ghost], tensor);
		expect(result.collapsed).toContain('g1');
		expect(tensor.getState('obs', 'g1')).toBe(1);
	});

	it('does not collapse a ghost missed by a ray', () => {
		const tensor = new ObservationTensor();
		const ghost = createGhost('g1', [10, 10, 10], 0.5);
		const ray = createRay([0, 0, -5], [0, 0, 1], 'obs');

		const result = collapseRay(ray, [ghost], tensor);
		expect(result.collapsed).toHaveLength(0);
		expect(tensor.getState('obs', 'g1')).toBe(0);
	});

	it('propagates collapse through entanglement', () => {
		const tensor = new ObservationTensor();
		const entanglement = new EntanglementMap();
		const g1 = createGhost('g1', [0, 0, 0], 0.5);
		const g2 = createGhost('g2', [10, 10, 10], 0.5); // far away, not hit
		entanglement.link('g1', 'g2');

		const ray = createRay([0, 0, -5], [0, 0, 1], 'obs');
		const result = collapseRay(ray, [g1, g2], tensor, entanglement);

		expect(result.collapsed).toContain('g1');
		expect(result.propagated).toContain('g2');
		expect(tensor.getState('obs', 'g2')).toBe(1);
	});

	it('respects distance threshold', () => {
		const tensor = new ObservationTensor();
		const ghost = createGhost('g1', [0, 0, 0], 0.5);
		const ray = createRay([0, 0, -50], [0, 0, 1], 'obs');

		// threshold=10 but distance ~49
		const result = collapseRay(ray, [ghost], tensor, undefined, 10);
		expect(result.collapsed).toHaveLength(0);
	});
});
