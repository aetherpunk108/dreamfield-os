import { describe, it, expect, beforeEach } from 'vitest';
import {
	AVAILABLE_UPGRADES, getAvailableUpgrades, purchaseUpgrade,
	getInstalledUpgrades, getUpgradeBonuses, resetUpgrades
} from '$lib/game/upgrades.js';

beforeEach(() => { resetUpgrades(); });

describe('Ship Upgrades', () => {
	it('has upgrades across all categories', () => {
		const categories = new Set(AVAILABLE_UPGRADES.map(u => u.category));
		expect(categories.size).toBeGreaterThanOrEqual(6);
	});

	it('filters by level', () => {
		const lvl1 = getAvailableUpgrades(1);
		const lvl5 = getAvailableUpgrades(5);
		expect(lvl5.length).toBeGreaterThan(lvl1.length);
	});

	it('purchases upgrade successfully', () => {
		const result = purchaseUpgrade('engine-1', 500, 1);
		expect(result.success).toBe(true);
		expect(result.cost).toBe(200);
		expect(getInstalledUpgrades()).toHaveLength(1);
	});

	it('rejects if insufficient credits', () => {
		const result = purchaseUpgrade('engine-1', 50, 1);
		expect(result.success).toBe(false);
		expect(result.message).toContain('credits');
	});

	it('rejects if level too low', () => {
		const result = purchaseUpgrade('engine-3', 5000, 2);
		expect(result.success).toBe(false);
		expect(result.message).toContain('level');
	});

	it('prevents double install', () => {
		purchaseUpgrade('hull-1', 500, 1);
		const result = purchaseUpgrade('hull-1', 500, 1);
		expect(result.success).toBe(false);
	});

	it('calculates stat bonuses', () => {
		purchaseUpgrade('engine-1', 500, 1);
		purchaseUpgrade('hull-1', 500, 1);
		const bonuses = getUpgradeBonuses();
		expect(bonuses.maxSpeed).toBeCloseTo(0.2);
		expect(bonuses.hull).toBe(30);
	});
});
