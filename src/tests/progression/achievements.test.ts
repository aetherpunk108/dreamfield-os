import { describe, it, expect, beforeEach } from 'vitest';
import {
	getAchievements, checkAchievements, updateContext, getUnlockedCount,
	getTotalCount, getProgress, resetProgress
} from '$lib/progression/achievements.js';

beforeEach(() => { resetProgress(); });

describe('Achievements system', () => {
	it('starts with all achievements locked', () => {
		expect(getUnlockedCount()).toBe(0);
		expect(getTotalCount()).toBeGreaterThanOrEqual(15);
		expect(getProgress()).toBe(0);
	});

	it('unlocks first-collapse after 1 collapse', () => {
		updateContext({ collapseCount: 1 });
		const newly = checkAchievements();
		expect(newly.find(a => a.id === 'first-collapse')).toBeDefined();
		expect(getUnlockedCount()).toBe(1);
	});

	it('unlocks mass-observer after 10 collapses', () => {
		updateContext({ collapseCount: 10 });
		const newly = checkAchievements();
		expect(newly.find(a => a.id === 'mass-observer')).toBeDefined();
	});

	it('unlocks multiple achievements at once', () => {
		updateContext({ collapseCount: 10, entanglementCount: 5, maxSpeed: 60, boostCount: 10 });
		const newly = checkAchievements();
		expect(newly.length).toBeGreaterThanOrEqual(4);
	});

	it('does not re-unlock already unlocked', () => {
		updateContext({ collapseCount: 1 });
		checkAchievements();
		const second = checkAchievements();
		expect(second.find(a => a.id === 'first-collapse')).toBeUndefined();
	});

	it('unlocks discovery achievements', () => {
		updateContext({ earthViewOpened: true, dashboardOpened: true });
		const newly = checkAchievements();
		expect(newly.find(a => a.id === 'terrain-scanner')).toBeDefined();
		expect(newly.find(a => a.id === 'dashboard-detective')).toBeDefined();
	});

	it('tracks progress percentage', () => {
		updateContext({ collapseCount: 10, maxSpeed: 60, timeInOrrery: 120, dashboardOpened: true });
		checkAchievements();
		expect(getProgress()).toBeGreaterThan(0);
		expect(getProgress()).toBeLessThan(1);
	});

	it('resets progress', () => {
		updateContext({ collapseCount: 5 });
		checkAchievements();
		expect(getUnlockedCount()).toBeGreaterThan(0);
		resetProgress();
		expect(getUnlockedCount()).toBe(0);
	});
});
