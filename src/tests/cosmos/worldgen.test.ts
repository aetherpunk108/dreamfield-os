import { describe, it, expect } from 'vitest';
import { generateWorld, scanNearby, findDockable } from '$lib/cosmos/worldgen.js';

describe('Cosmos World Generator', () => {
	it('generates world with all body types', () => {
		const world = generateWorld({ seed: 42, density: 'normal', scale: 1 });
		const types = new Set(world.map(b => b.type));
		expect(types.has('star')).toBe(true);
		expect(types.has('planet')).toBe(true);
		expect(types.has('moon')).toBe(true);
		expect(types.has('station')).toBe(true);
		expect(types.has('asteroid')).toBe(true);
		expect(types.has('anomaly')).toBe(true);
		expect(types.has('gate')).toBe(true);
		expect(types.has('wreck')).toBe(true);
		expect(types.has('beacon')).toBe(true);
	});

	it('generates deterministic world from seed', () => {
		const w1 = generateWorld({ seed: 123, density: 'normal', scale: 1 });
		const w2 = generateWorld({ seed: 123, density: 'normal', scale: 1 });
		expect(w1.length).toBe(w2.length);
		expect(w1[5].name).toBe(w2[5].name);
		expect(w1[5].position).toEqual(w2[5].position);
	});

	it('different seeds produce different worlds', () => {
		const w1 = generateWorld({ seed: 1, density: 'normal', scale: 1 });
		const w2 = generateWorld({ seed: 2, density: 'normal', scale: 1 });
		expect(w1[5].position).not.toEqual(w2[5].position);
	});

	it('density affects body count', () => {
		const sparse = generateWorld({ seed: 42, density: 'sparse', scale: 1 });
		const dense = generateWorld({ seed: 42, density: 'dense', scale: 1 });
		expect(dense.length).toBeGreaterThan(sparse.length);
	});

	it('scanNearby finds bodies in range', () => {
		const world = generateWorld({ seed: 42, density: 'normal', scale: 1 });
		const nearby = scanNearby(world, [0, 0, 0], 20);
		expect(nearby.length).toBeGreaterThan(0);
		expect(nearby.find(b => b.id === 'earth')).toBeDefined();
	});

	it('findDockable returns only dockable bodies', () => {
		const world = generateWorld({ seed: 42, density: 'normal', scale: 1 });
		const dockable = findDockable(world, [0, 8, 9], 5);
		dockable.forEach(b => expect(b.dockable).toBe(true));
	});

	it('all bodies have valid positions', () => {
		const world = generateWorld({ seed: 99, density: 'dense', scale: 1 });
		world.forEach(b => {
			expect(b.position).toHaveLength(3);
			expect(b.position.every(v => isFinite(v))).toBe(true);
			expect(b.radius).toBeGreaterThan(0);
		});
	});
});
