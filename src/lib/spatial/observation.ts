import type { TrinaryState } from './state.js';

/**
 * ObservationTensor: Map<observerId, Map<primitiveId, TrinaryState>>
 * Tracks what each observer has collapsed or observed.
 */
export class ObservationTensor {
	private data = new Map<string, Map<string, TrinaryState>>();

	addObserver(observerId: string): void {
		if (!this.data.has(observerId)) {
			this.data.set(observerId, new Map());
		}
	}

	removeObserver(observerId: string): void {
		this.data.delete(observerId);
	}

	getObservers(): string[] {
		return [...this.data.keys()];
	}

	setState(observerId: string, primitiveId: string, state: TrinaryState): void {
		let observer = this.data.get(observerId);
		if (!observer) {
			observer = new Map();
			this.data.set(observerId, observer);
		}
		observer.set(primitiveId, state);
	}

	getState(observerId: string, primitiveId: string): TrinaryState {
		return this.data.get(observerId)?.get(primitiveId) ?? 0;
	}

	getObserverStates(observerId: string): Map<string, TrinaryState> {
		return this.data.get(observerId) ?? new Map();
	}

	collapse(observerId: string, primitiveId: string): void {
		this.setState(observerId, primitiveId, 1);
	}

	reset(observerId: string, primitiveId: string): void {
		this.setState(observerId, primitiveId, 0);
	}

	clear(): void {
		this.data.clear();
	}

	toJSON(): Record<string, Record<string, TrinaryState>> {
		const result: Record<string, Record<string, TrinaryState>> = {};
		for (const [obs, prims] of this.data) {
			result[obs] = Object.fromEntries(prims);
		}
		return result;
	}
}
