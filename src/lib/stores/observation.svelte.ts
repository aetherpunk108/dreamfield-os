import { ObservationTensor } from '$lib/spatial/observation.js';

const tensor = new ObservationTensor();
tensor.addObserver('human');
tensor.addObserver('ai');
tensor.addObserver('satellite');

let currentObserverId = $state('human');
let collapseCount = $state(0);

export function getTensor(): ObservationTensor {
	return tensor;
}

export function getCurrentObserverId(): string {
	return currentObserverId;
}

export function setCurrentObserverId(id: string): void {
	currentObserverId = id;
	tensor.addObserver(id);
}

export function getCollapseCount(): number {
	return collapseCount;
}

export function incrementCollapseCount(n = 1): void {
	collapseCount += n;
}

export function resetCollapseCount(): void {
	collapseCount = 0;
}
