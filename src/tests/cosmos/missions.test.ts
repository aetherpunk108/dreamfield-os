import { describe, it, expect, beforeEach } from 'vitest';
import {
	initMissions, getMissions, acceptMission, completeMission,
	completeObjective, getActiveMission, getPlayerXP, getPlayerCredits,
	getPlayerLevel, getAvailableMissions, getCompletedMissions, failMission
} from '$lib/cosmos/missions.js';

beforeEach(() => { initMissions(); });

describe('Mission System', () => {
	it('initializes with available missions', () => {
		const missions = getMissions();
		expect(missions.length).toBeGreaterThanOrEqual(7);
		expect(missions.every(m => m.status === 'available')).toBe(true);
	});

	it('accepts a mission', () => {
		const result = acceptMission('tutorial-1');
		expect(result).toBe(true);
		expect(getActiveMission()?.id).toBe('tutorial-1');
		expect(getMissions().find(m => m.id === 'tutorial-1')?.status).toBe('active');
	});

	it('only allows one active mission', () => {
		acceptMission('tutorial-1');
		const result = acceptMission('tutorial-2');
		expect(result).toBe(false);
		expect(getActiveMission()?.id).toBe('tutorial-1');
	});

	it('completes objectives and auto-completes mission', () => {
		acceptMission('tutorial-2');
		completeObjective('tutorial-2', 'obj-1');
		expect(getMissions().find(m => m.id === 'tutorial-2')?.progress).toBeCloseTo(0.5);
		completeObjective('tutorial-2', 'obj-2');
		expect(getMissions().find(m => m.id === 'tutorial-2')?.status).toBe('complete');
		expect(getActiveMission()).toBeNull();
	});

	it('awards XP and credits on completion', () => {
		const before = getPlayerXP();
		acceptMission('tutorial-1');
		completeMission('tutorial-1');
		expect(getPlayerXP()).toBe(before + 50);
		expect(getPlayerCredits()).toBeGreaterThan(100);
	});

	it('levels up from XP', () => {
		acceptMission('explore-sun');
		completeMission('explore-sun');
		expect(getPlayerLevel()).toBeGreaterThanOrEqual(1);
	});

	it('can fail missions', () => {
		acceptMission('tutorial-1');
		failMission('tutorial-1');
		expect(getMissions().find(m => m.id === 'tutorial-1')?.status).toBe('failed');
		expect(getActiveMission()).toBeNull();
	});

	it('filters available and completed', () => {
		acceptMission('tutorial-1');
		completeMission('tutorial-1');
		expect(getAvailableMissions().find(m => m.id === 'tutorial-1')).toBeUndefined();
		expect(getCompletedMissions().find(m => m.id === 'tutorial-1')).toBeDefined();
	});
});
