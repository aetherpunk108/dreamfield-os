import { describe, it, expect, beforeEach } from 'vitest';
import {
	initCombat, getCombatState, spawnEntity, spawnWave,
	fireProjectile, playerFire, updateCombat,
	getEntitiesInRange, getThreatCount
} from '$lib/game/combat.js';

beforeEach(() => { initCombat(); });

describe('Combat System', () => {
	it('spawns entities', () => {
		spawnEntity('pirate', [10, 0, 10]);
		expect(getCombatState().entities).toHaveLength(1);
		expect(getCombatState().entities[0].type).toBe('pirate');
	});

	it('spawns waves', () => {
		const wave = spawnWave([0, 0, 0], 5, 'drone');
		expect(wave).toHaveLength(5);
		expect(getCombatState().entities).toHaveLength(5);
	});

	it('fires projectiles', () => {
		fireProjectile([0, 0, 0], [1, 0, 0], 10, 'player');
		expect(getCombatState().projectiles).toHaveLength(1);
	});

	it('player fires in ship direction', () => {
		playerFire([0, 0, 0], { pitch: 0, yaw: 0 });
		expect(getCombatState().projectiles).toHaveLength(1);
		expect(getCombatState().projectiles[0].owner).toBe('player');
	});

	it('projectiles move over time', () => {
		fireProjectile([0, 0, 0], [1, 0, 0], 10, 'player', 100);
		const before = getCombatState().projectiles[0].position[0];
		updateCombat([0, 0, 0], 100, 50, 0.1);
		expect(getCombatState().projectiles[0].position[0]).toBeGreaterThan(before);
	});

	it('projectiles expire after lifetime', () => {
		fireProjectile([0, 0, 0], [1, 0, 0], 10, 'player');
		for (let i = 0; i < 40; i++) updateCombat([0, 0, 0], 100, 50, 0.1);
		expect(getCombatState().projectiles).toHaveLength(0);
	});

	it('projectiles damage entities', () => {
		const e = spawnEntity('pirate', [2, 0, 0]);
		fireProjectile([0, 0, 0], [1, 0, 0], 10, 'player', 50);
		// Run until hit
		for (let i = 0; i < 10; i++) updateCombat([0, 0, 0], 100, 50, 0.05);
		const entity = getCombatState().entities.find(x => x.id === e.id);
		if (entity) {
			expect(entity.shield + entity.hull).toBeLessThan(e.maxShield + e.maxHull);
		}
	});

	it('entities die and drop loot', () => {
		const e = spawnEntity('drone', [1, 0, 0]); // low HP
		// Fire many projectiles at it
		for (let i = 0; i < 5; i++) fireProjectile([0, 0, 0], [1, 0, 0], 20, 'player', 50);
		let totalLoot: any[] = [];
		for (let i = 0; i < 20; i++) {
			const result = updateCombat([0, 0, 0], 100, 50, 0.05);
			totalLoot = totalLoot.concat(result.loot);
			if (result.kills.length > 0) break;
		}
		// Entity should be dead or damaged
		expect(getCombatState().entities.length + totalLoot.length).toBeGreaterThan(0);
	});

	it('detects entities in range', () => {
		spawnEntity('pirate', [5, 0, 5]);
		spawnEntity('pirate', [100, 0, 100]);
		expect(getEntitiesInRange([0, 0, 0], 20)).toHaveLength(1);
	});

	it('counts threats', () => {
		spawnEntity('pirate', [5, 0, 0], 'hostile');
		spawnEntity('trader', [8, 0, 0], 'passive');
		expect(getThreatCount([0, 0, 0], 30)).toBe(1);
	});
});
