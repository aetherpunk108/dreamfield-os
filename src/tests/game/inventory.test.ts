import { describe, it, expect } from 'vitest';
import {
	RESOURCES, CRAFT_RECIPES, generateTradeOffers,
	addToCargo, removeFromCargo, canCraft, craft, cargoValue
} from '$lib/game/inventory.js';
import type { CargoItem } from '$lib/game/engine.js';

describe('Inventory System', () => {
	it('has defined resources', () => {
		expect(RESOURCES.length).toBeGreaterThanOrEqual(10);
		RESOURCES.forEach(r => expect(r.value).toBeGreaterThan(0));
	});

	it('generates trade offers for stations', () => {
		const offers = generateTradeOffers('ISS ALPHA');
		expect(offers.length).toBeGreaterThanOrEqual(4);
		offers.forEach(o => {
			expect(o.buyPrice).toBeGreaterThan(0);
			expect(o.sellPrice).toBeLessThan(o.buyPrice);
			expect(o.stock).toBeGreaterThan(0);
		});
	});

	it('adds items to cargo', () => {
		const cargo: CargoItem[] = [];
		expect(addToCargo(cargo, { id: 'iron', name: 'Iron', quantity: 5, value: 10 }, 10)).toBe(true);
		expect(cargo).toHaveLength(1);
		expect(cargo[0].quantity).toBe(5);
	});

	it('stacks same items', () => {
		const cargo: CargoItem[] = [{ id: 'iron', name: 'Iron', quantity: 3, value: 10 }];
		addToCargo(cargo, { id: 'iron', name: 'Iron', quantity: 2, value: 10 }, 10);
		expect(cargo).toHaveLength(1);
		expect(cargo[0].quantity).toBe(5);
	});

	it('respects max cargo slots', () => {
		const cargo: CargoItem[] = [
			{ id: 'a', name: 'A', quantity: 1, value: 1 },
			{ id: 'b', name: 'B', quantity: 1, value: 1 },
		];
		expect(addToCargo(cargo, { id: 'c', name: 'C', quantity: 1, value: 1 }, 2)).toBe(false);
	});

	it('removes from cargo', () => {
		const cargo: CargoItem[] = [{ id: 'iron', name: 'Iron', quantity: 5, value: 10 }];
		removeFromCargo(cargo, 'iron', 3);
		expect(cargo[0].quantity).toBe(2);
		removeFromCargo(cargo, 'iron', 2);
		expect(cargo).toHaveLength(0);
	});

	it('checks craft requirements', () => {
		const cargo: CargoItem[] = [
			{ id: 'helium3', name: 'Helium-3', quantity: 5, value: 40 },
			{ id: 'ice', name: 'Ice', quantity: 10, value: 5 },
		];
		const recipe = CRAFT_RECIPES.find(r => r.id === 'fuel-pack')!;
		expect(canCraft(cargo, recipe)).toBe(true);
	});

	it('crafts items consuming inputs', () => {
		const cargo: CargoItem[] = [
			{ id: 'helium3', name: 'Helium-3', quantity: 2, value: 40 },
			{ id: 'ice', name: 'Ice', quantity: 3, value: 5 },
		];
		const recipe = CRAFT_RECIPES.find(r => r.id === 'fuel-pack')!;
		expect(craft(cargo, recipe, 10)).toBe(true);
		expect(cargo.find(c => c.id === 'helium3')).toBeUndefined(); // consumed
		expect(cargo.find(c => c.id === 'fuel-pack')).toBeDefined();
	});

	it('calculates cargo value', () => {
		const cargo: CargoItem[] = [
			{ id: 'iron', name: 'Iron', quantity: 5, value: 10 },
			{ id: 'helium3', name: 'Helium-3', quantity: 2, value: 40 },
		];
		expect(cargoValue(cargo)).toBe(130);
	});
});
