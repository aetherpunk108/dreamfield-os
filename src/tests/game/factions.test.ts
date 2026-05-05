import { describe, it, expect, beforeEach } from 'vitest';
import {
	initFactions, getFactions, getFaction, modifyReputation,
	getFactionPerks, onMissionComplete, onKillFactionMember,
	getFactionsByReputation, getHostileFactions, getAlliedFactions
} from '$lib/game/factions.js';

beforeEach(() => { initFactions(); });

describe('Faction System', () => {
	it('initializes 6 factions', () => {
		expect(getFactions()).toHaveLength(6);
	});

	it('gets faction by id', () => {
		const f = getFaction('terra-fed');
		expect(f?.name).toBe('TERRA FEDERATION');
	});

	it('modifies reputation', () => {
		modifyReputation('terra-fed', 30);
		expect(getFaction('terra-fed')!.reputation).toBe(50);
	});

	it('clamps reputation to -100/100', () => {
		modifyReputation('terra-fed', 200);
		expect(getFaction('terra-fed')!.reputation).toBe(100);
		modifyReputation('terra-fed', -300);
		expect(getFaction('terra-fed')!.reputation).toBe(-100);
	});

	it('updates tier from reputation', () => {
		modifyReputation('void-runners', 80);
		expect(getFaction('void-runners')!.tier).toBe('allied');
		modifyReputation('void-runners', -200);
		expect(getFaction('void-runners')!.tier).toBe('hostile');
	});

	it('mission complete increases rep', () => {
		const before = getFaction('terra-fed')!.reputation;
		onMissionComplete('terra-fed');
		expect(getFaction('terra-fed')!.reputation).toBe(before + 10);
	});

	it('killing faction member decreases rep', () => {
		const before = getFaction('terra-fed')!.reputation;
		onKillFactionMember('terra-fed');
		expect(getFaction('terra-fed')!.reputation).toBe(before - 20);
	});

	it('returns perks for tier', () => {
		modifyReputation('dreamfield-order', 30); // should be allied
		const perks = getFactionPerks('dreamfield-order');
		expect(perks.length).toBeGreaterThan(0);
	});

	it('sorts by reputation', () => {
		const sorted = getFactionsByReputation();
		for (let i = 1; i < sorted.length; i++) {
			expect(sorted[i - 1].reputation).toBeGreaterThanOrEqual(sorted[i].reputation);
		}
	});

	it('filters hostile and allied', () => {
		expect(getHostileFactions().length).toBeGreaterThanOrEqual(1); // shadow fleet
		expect(getAlliedFactions().length).toBeGreaterThanOrEqual(1); // dreamfield order
	});
});
