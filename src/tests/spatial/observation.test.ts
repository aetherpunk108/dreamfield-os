import { describe, it, expect } from 'vitest';
import { ObservationTensor } from '$lib/spatial/observation.js';

describe('ObservationTensor', () => {
	it('defaults to 0 (potential) for unknown states', () => {
		const tensor = new ObservationTensor();
		expect(tensor.getState('obs-1', 'prim-1')).toBe(0);
	});

	it('tracks observers', () => {
		const tensor = new ObservationTensor();
		tensor.addObserver('obs-1');
		tensor.addObserver('obs-2');
		expect(tensor.getObservers()).toEqual(['obs-1', 'obs-2']);
	});

	it('sets and gets state', () => {
		const tensor = new ObservationTensor();
		tensor.setState('obs-1', 'ghost-1', 1);
		expect(tensor.getState('obs-1', 'ghost-1')).toBe(1);
	});

	it('collapses a primitive to 1', () => {
		const tensor = new ObservationTensor();
		tensor.collapse('obs-1', 'ghost-1');
		expect(tensor.getState('obs-1', 'ghost-1')).toBe(1);
	});

	it('resets a primitive to 0', () => {
		const tensor = new ObservationTensor();
		tensor.collapse('obs-1', 'ghost-1');
		tensor.reset('obs-1', 'ghost-1');
		expect(tensor.getState('obs-1', 'ghost-1')).toBe(0);
	});

	it('isolates observer states', () => {
		const tensor = new ObservationTensor();
		tensor.collapse('obs-1', 'ghost-1');
		expect(tensor.getState('obs-2', 'ghost-1')).toBe(0);
	});

	it('serializes to JSON', () => {
		const tensor = new ObservationTensor();
		tensor.setState('obs-1', 'ghost-1', 1);
		tensor.setState('obs-1', 'ghost-2', -1);
		const json = tensor.toJSON();
		expect(json['obs-1']['ghost-1']).toBe(1);
		expect(json['obs-1']['ghost-2']).toBe(-1);
	});
});
