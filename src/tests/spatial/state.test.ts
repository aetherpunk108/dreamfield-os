import { describe, it, expect } from 'vitest';
import {
	isPresent, isPotential, isAbsent,
	trinaryAnd, trinaryOr, trinaryNot, trinaryTensor,
	type TrinaryState
} from '$lib/spatial/state.js';

describe('TrinaryState', () => {
	it('identifies states correctly', () => {
		expect(isPresent(1)).toBe(true);
		expect(isPresent(0)).toBe(false);
		expect(isPotential(0)).toBe(true);
		expect(isPotential(1)).toBe(false);
		expect(isAbsent(-1)).toBe(true);
		expect(isAbsent(0)).toBe(false);
	});

	describe('trinaryAnd (min)', () => {
		const cases: [TrinaryState, TrinaryState, TrinaryState][] = [
			[1, 1, 1], [1, 0, 0], [1, -1, -1],
			[0, 0, 0], [0, -1, -1], [-1, -1, -1]
		];
		for (const [a, b, expected] of cases) {
			it(`${a} AND ${b} = ${expected}`, () => {
				expect(trinaryAnd(a, b)).toBe(expected);
			});
		}
	});

	describe('trinaryOr (max)', () => {
		const cases: [TrinaryState, TrinaryState, TrinaryState][] = [
			[1, 1, 1], [1, 0, 1], [1, -1, 1],
			[0, 0, 0], [0, -1, 0], [-1, -1, -1]
		];
		for (const [a, b, expected] of cases) {
			it(`${a} OR ${b} = ${expected}`, () => {
				expect(trinaryOr(a, b)).toBe(expected);
			});
		}
	});

	describe('trinaryNot (negation)', () => {
		it('negates correctly', () => {
			expect(trinaryNot(1)).toBe(-1);
			expect(trinaryNot(-1)).toBe(1);
			expect(trinaryNot(0)).toBe(0);
		});
	});

	describe('trinaryTensor (multiply)', () => {
		const cases: [TrinaryState, TrinaryState, TrinaryState][] = [
			[1, 1, 1], [1, -1, -1], [1, 0, 0],
			[-1, -1, 1], [-1, 0, 0], [0, 0, 0]
		];
		for (const [a, b, expected] of cases) {
			it(`${a} TENSOR ${b} = ${expected}`, () => {
				expect(trinaryTensor(a, b)).toBe(expected);
			});
		}
	});
});
