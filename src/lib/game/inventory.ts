/**
 * Inventory & Trading System — collect, trade, and craft resources.
 */

import type { CargoItem } from './engine.js';

export interface TradeOffer {
	id: string;
	item: CargoItem;
	buyPrice: number;
	sellPrice: number;
	stock: number;
	station: string;
}

export interface CraftRecipe {
	id: string;
	name: string;
	description: string;
	inputs: { name: string; quantity: number }[];
	output: CargoItem;
	craftTime: number; // seconds
}

/** Resource types found in the cosmos */
export const RESOURCES: CargoItem[] = [
	{ id: 'titanium', name: 'Titanium', quantity: 0, value: 15 },
	{ id: 'helium3', name: 'Helium-3', quantity: 0, value: 40 },
	{ id: 'dark-matter', name: 'Dark Matter', quantity: 0, value: 200 },
	{ id: 'quantum-crystal', name: 'Quantum Crystal', quantity: 0, value: 120 },
	{ id: 'rare-earth', name: 'Rare Earth', quantity: 0, value: 25 },
	{ id: 'ice', name: 'Ice', quantity: 0, value: 5 },
	{ id: 'carbon', name: 'Carbon', quantity: 0, value: 8 },
	{ id: 'iron', name: 'Iron', quantity: 0, value: 10 },
	{ id: 'plasma', name: 'Plasma Cell', quantity: 0, value: 60 },
	{ id: 'nanites', name: 'Nanites', quantity: 0, value: 90 },
	{ id: 'warp-fuel', name: 'Warp Fuel', quantity: 0, value: 50 },
	{ id: 'scan-data', name: 'Scan Data', quantity: 0, value: 30 },
];

export const CRAFT_RECIPES: CraftRecipe[] = [
	{
		id: 'shield-boost', name: 'Shield Booster', description: 'Temporarily doubles shield capacity',
		inputs: [{ name: 'Titanium', quantity: 3 }, { name: 'Plasma Cell', quantity: 1 }],
		output: { id: 'shield-boost', name: 'Shield Booster', quantity: 1, value: 100 },
		craftTime: 5,
	},
	{
		id: 'warp-cell', name: 'Warp Cell', description: 'Single-use instant warp charge',
		inputs: [{ name: 'Dark Matter', quantity: 1 }, { name: 'Quantum Crystal', quantity: 2 }],
		output: { id: 'warp-cell', name: 'Warp Cell', quantity: 1, value: 300 },
		craftTime: 10,
	},
	{
		id: 'fuel-pack', name: 'Fuel Pack', description: 'Restores 50 fuel',
		inputs: [{ name: 'Helium-3', quantity: 2 }, { name: 'Ice', quantity: 3 }],
		output: { id: 'fuel-pack', name: 'Fuel Pack', quantity: 1, value: 60 },
		craftTime: 3,
	},
	{
		id: 'scanner-amp', name: 'Scanner Amplifier', description: 'Doubles scan range for 60s',
		inputs: [{ name: 'Nanites', quantity: 2 }, { name: 'Quantum Crystal', quantity: 1 }],
		output: { id: 'scanner-amp', name: 'Scanner Amplifier', quantity: 1, value: 180 },
		craftTime: 8,
	},
];

/** Generate random trade offers for a station */
export function generateTradeOffers(stationName: string): TradeOffer[] {
	const offers: TradeOffer[] = [];
	const shuffled = [...RESOURCES].sort(() => Math.random() - 0.5);
	const count = 4 + Math.floor(Math.random() * 4);

	for (let i = 0; i < Math.min(count, shuffled.length); i++) {
		const res = shuffled[i];
		const priceVariation = 0.7 + Math.random() * 0.6; // ±30% from base
		offers.push({
			id: `trade-${stationName}-${res.id}`,
			item: { ...res, quantity: 1 },
			buyPrice: Math.round(res.value * priceVariation),
			sellPrice: Math.round(res.value * priceVariation * 0.7),
			stock: Math.floor(Math.random() * 20) + 1,
			station: stationName,
		});
	}
	return offers;
}

/** Add item to cargo (stack if same type) */
export function addToCargo(cargo: CargoItem[], item: CargoItem, maxSlots: number): boolean {
	const existing = cargo.find(c => c.id === item.id);
	if (existing) {
		existing.quantity += item.quantity;
		return true;
	}
	if (cargo.length >= maxSlots) return false;
	cargo.push({ ...item });
	return true;
}

/** Remove item from cargo */
export function removeFromCargo(cargo: CargoItem[], itemId: string, quantity = 1): boolean {
	const idx = cargo.findIndex(c => c.id === itemId);
	if (idx < 0) return false;
	cargo[idx].quantity -= quantity;
	if (cargo[idx].quantity <= 0) cargo.splice(idx, 1);
	return true;
}

/** Check if player has required crafting materials */
export function canCraft(cargo: CargoItem[], recipe: CraftRecipe): boolean {
	return recipe.inputs.every(input => {
		const item = cargo.find(c => c.name === input.name);
		return item && item.quantity >= input.quantity;
	});
}

/** Execute craft — consume inputs, produce output */
export function craft(cargo: CargoItem[], recipe: CraftRecipe, maxSlots: number): boolean {
	if (!canCraft(cargo, recipe)) return false;
	// Consume inputs
	for (const input of recipe.inputs) {
		const item = cargo.find(c => c.name === input.name);
		if (item) {
			item.quantity -= input.quantity;
			if (item.quantity <= 0) {
				const idx = cargo.indexOf(item);
				cargo.splice(idx, 1);
			}
		}
	}
	// Add output
	return addToCargo(cargo, { ...recipe.output }, maxSlots);
}

/** Calculate total cargo value */
export function cargoValue(cargo: CargoItem[]): number {
	return cargo.reduce((sum, c) => sum + c.value * c.quantity, 0);
}
