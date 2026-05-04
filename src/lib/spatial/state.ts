/**
 * TrinaryState: the fundamental unit of observer-dependent reality.
 * -1 = Absent (confirmed not present)
 *  0 = Potential (superposition, unobserved)
 *  1 = Present (collapsed, confirmed)
 */
export type TrinaryState = -1 | 0 | 1;

export function isPresent(s: TrinaryState): boolean {
	return s === 1;
}

export function isPotential(s: TrinaryState): boolean {
	return s === 0;
}

export function isAbsent(s: TrinaryState): boolean {
	return s === -1;
}

/** Trinary AND: min of two states */
export function trinaryAnd(a: TrinaryState, b: TrinaryState): TrinaryState {
	return Math.min(a, b) as TrinaryState;
}

/** Trinary OR: max of two states */
export function trinaryOr(a: TrinaryState, b: TrinaryState): TrinaryState {
	return Math.max(a, b) as TrinaryState;
}

/** Trinary NOT: negation (-1 <-> 1, 0 stays 0) */
export function trinaryNot(s: TrinaryState): TrinaryState {
	if (s === 0) return 0;
	return (-s) as TrinaryState;
}

/** Trinary tensor product: multiplication */
export function trinaryTensor(a: TrinaryState, b: TrinaryState): TrinaryState {
	if (a === 0 || b === 0) return 0;
	return (a * b) as TrinaryState;
}
