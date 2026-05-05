/**
 * Combat System — space encounters, damage, shields, and threats.
 */

import type { Vec3 } from '$lib/spatial/types.js';
import { distance } from './engine.js';

export type ThreatLevel = 'passive' | 'cautious' | 'hostile' | 'elite';

export interface SpaceEntity {
	id: string;
	name: string;
	type: 'pirate' | 'patrol' | 'trader' | 'drone' | 'boss';
	position: Vec3;
	velocity: Vec3;
	hull: number;
	maxHull: number;
	shield: number;
	maxShield: number;
	speed: number;
	damage: number;
	fireRate: number; // shots per second
	range: number;
	threat: ThreatLevel;
	behavior: 'idle' | 'patrol' | 'chase' | 'flee' | 'attack';
	target: string | null;
	lastFired: number;
	loot: { id: string; name: string; quantity: number; value: number }[];
}

export interface Projectile {
	id: string;
	position: Vec3;
	velocity: Vec3;
	damage: number;
	owner: string;
	lifetime: number;
	maxLifetime: number;
}

export interface CombatState {
	entities: SpaceEntity[];
	projectiles: Projectile[];
	playerDamageFlash: number;
	killCount: number;
}

let combatState: CombatState = {
	entities: [],
	projectiles: [],
	playerDamageFlash: 0,
	killCount: 0,
};

let projectileCounter = 0;

/** Initialize combat state */
export function initCombat(): void {
	combatState = { entities: [], projectiles: [], playerDamageFlash: 0, killCount: 0 };
}

export function getCombatState(): CombatState { return combatState; }

/** Spawn an enemy at a position */
export function spawnEntity(
	type: SpaceEntity['type'],
	position: Vec3,
	threat: ThreatLevel = 'cautious'
): SpaceEntity {
	const templates: Record<SpaceEntity['type'], Omit<SpaceEntity, 'id' | 'position' | 'velocity' | 'target' | 'lastFired' | 'behavior'>> = {
		pirate: { name: 'PIRATE', type: 'pirate', hull: 40, maxHull: 40, shield: 20, maxShield: 20, speed: 60, damage: 5, fireRate: 1.5, range: 15, threat, loot: [{ id: 'iron', name: 'Iron', quantity: 3, value: 10 }] },
		patrol: { name: 'PATROL', type: 'patrol', hull: 80, maxHull: 80, shield: 50, maxShield: 50, speed: 40, damage: 8, fireRate: 1, range: 20, threat: 'cautious', loot: [{ id: 'titanium', name: 'Titanium', quantity: 2, value: 15 }] },
		trader: { name: 'TRADER', type: 'trader', hull: 60, maxHull: 60, shield: 30, maxShield: 30, speed: 30, damage: 3, fireRate: 0.5, range: 10, threat: 'passive', loot: [{ id: 'rare-earth', name: 'Rare Earth', quantity: 5, value: 25 }] },
		drone: { name: 'DRONE', type: 'drone', hull: 15, maxHull: 15, shield: 5, maxShield: 5, speed: 80, damage: 3, fireRate: 3, range: 8, threat, loot: [{ id: 'nanites', name: 'Nanites', quantity: 1, value: 90 }] },
		boss: { name: 'VOID DREAD', type: 'boss', hull: 300, maxHull: 300, shield: 200, maxShield: 200, speed: 25, damage: 20, fireRate: 0.8, range: 30, threat: 'elite', loot: [{ id: 'dark-matter', name: 'Dark Matter', quantity: 3, value: 200 }, { id: 'quantum-crystal', name: 'Quantum Crystal', quantity: 2, value: 120 }] },
	};

	const t = templates[type];
	const entity: SpaceEntity = {
		...t,
		id: `entity-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
		position: [...position],
		velocity: [0, 0, 0],
		target: null,
		lastFired: 0,
		behavior: type === 'pirate' ? 'patrol' : type === 'trader' ? 'idle' : 'patrol',
	};

	combatState.entities.push(entity);
	return entity;
}

/** Spawn a wave of enemies around a point */
export function spawnWave(center: Vec3, count: number, type: SpaceEntity['type'] = 'pirate'): SpaceEntity[] {
	const spawned: SpaceEntity[] = [];
	for (let i = 0; i < count; i++) {
		const angle = (i / count) * Math.PI * 2;
		const dist = 5 + Math.random() * 10;
		const pos: Vec3 = [
			center[0] + Math.cos(angle) * dist,
			center[1] + (Math.random() - 0.5) * 4,
			center[2] + Math.sin(angle) * dist,
		];
		spawned.push(spawnEntity(type, pos));
	}
	return spawned;
}

/** Fire a projectile from a position in a direction */
export function fireProjectile(position: Vec3, direction: Vec3, damage: number, owner: string, speed = 80): void {
	const mag = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2) || 1;
	const vel: Vec3 = [
		(direction[0] / mag) * speed,
		(direction[1] / mag) * speed,
		(direction[2] / mag) * speed,
	];

	combatState.projectiles.push({
		id: `proj-${projectileCounter++}`,
		position: [...position],
		velocity: vel,
		damage,
		owner,
		lifetime: 0,
		maxLifetime: 3,
	});
}

/** Player fires forward based on ship rotation */
export function playerFire(position: Vec3, rotation: { pitch: number; yaw: number }, damage = 10): void {
	const dir: Vec3 = [
		Math.cos(rotation.pitch) * Math.sin(rotation.yaw),
		-Math.sin(rotation.pitch),
		Math.cos(rotation.pitch) * Math.cos(rotation.yaw),
	];
	fireProjectile(position, dir, damage, 'player', 100);
}

/**
 * Update combat each frame.
 * Returns events (kills, hits, etc.)
 */
export function updateCombat(
	playerPos: Vec3,
	playerHull: number,
	playerShield: number,
	dt: number
): { newHull: number; newShield: number; hits: string[]; kills: string[]; loot: SpaceEntity['loot'] } {
	const hits: string[] = [];
	const kills: string[] = [];
	let loot: SpaceEntity['loot'] = [];
	let hull = playerHull;
	let shield = playerShield;

	// Update projectiles
	combatState.projectiles = combatState.projectiles.filter(p => {
		p.position[0] += p.velocity[0] * dt;
		p.position[1] += p.velocity[1] * dt;
		p.position[2] += p.velocity[2] * dt;
		p.lifetime += dt;
		if (p.lifetime > p.maxLifetime) return false;

		// Check hits on entities (player projectiles)
		if (p.owner === 'player') {
			for (const e of combatState.entities) {
				if (distance(p.position, e.position) < 1.5) {
					// Hit entity
					if (e.shield > 0) {
						e.shield = Math.max(0, e.shield - p.damage);
					} else {
						e.hull -= p.damage;
					}
					hits.push(e.id);
					if (e.hull <= 0) {
						kills.push(e.id);
						loot = loot.concat(e.loot);
						combatState.killCount++;
					}
					return false; // projectile consumed
				}
			}
		}

		// Check hits on player (entity projectiles)
		if (p.owner !== 'player' && distance(p.position, playerPos) < 1.2) {
			if (shield > 0) {
				shield = Math.max(0, shield - p.damage);
			} else {
				hull -= p.damage;
			}
			combatState.playerDamageFlash = 0.3;
			return false;
		}

		return true;
	});

	// Remove dead entities
	combatState.entities = combatState.entities.filter(e => e.hull > 0);

	// Update entity AI
	for (const e of combatState.entities) {
		const distToPlayer = distance(e.position, playerPos);

		// Behavior logic
		if (e.threat === 'hostile' || e.threat === 'elite') {
			if (distToPlayer < e.range * 1.5) {
				e.behavior = 'chase';
				e.target = 'player';
			}
		} else if (e.threat === 'cautious') {
			if (distToPlayer < e.range * 0.5) e.behavior = 'attack';
		}

		// Movement
		if (e.behavior === 'chase' && e.target === 'player') {
			const dx = playerPos[0] - e.position[0];
			const dy = playerPos[1] - e.position[1];
			const dz = playerPos[2] - e.position[2];
			const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
			const moveSpeed = e.speed * dt;

			if (dist > 3) {
				e.position[0] += (dx / dist) * moveSpeed;
				e.position[1] += (dy / dist) * moveSpeed;
				e.position[2] += (dz / dist) * moveSpeed;
			}
		} else if (e.behavior === 'patrol') {
			// Simple orbit movement
			const angle = Date.now() * 0.001 * (e.speed * 0.01);
			e.position[0] += Math.sin(angle) * e.speed * 0.01 * dt;
			e.position[2] += Math.cos(angle) * e.speed * 0.01 * dt;
		} else if (e.behavior === 'flee') {
			const dx = e.position[0] - playerPos[0];
			const dz = e.position[2] - playerPos[2];
			const dist = Math.sqrt(dx * dx + dz * dz) || 1;
			e.position[0] += (dx / dist) * e.speed * dt;
			e.position[2] += (dz / dist) * e.speed * dt;
		}

		// Firing
		if ((e.behavior === 'chase' || e.behavior === 'attack') && distToPlayer < e.range) {
			e.lastFired += dt;
			if (e.lastFired >= 1 / e.fireRate) {
				e.lastFired = 0;
				const dir: Vec3 = [
					playerPos[0] - e.position[0],
					playerPos[1] - e.position[1],
					playerPos[2] - e.position[2],
				];
				fireProjectile(e.position, dir, e.damage, e.id, 50);
			}
		}

		// Shield regen
		if (e.shield < e.maxShield) e.shield += 2 * dt;
	}

	// Fade damage flash
	if (combatState.playerDamageFlash > 0) combatState.playerDamageFlash -= dt;

	return { newHull: hull, newShield: shield, hits, kills, loot };
}

/** Get entities within range */
export function getEntitiesInRange(position: Vec3, range: number): SpaceEntity[] {
	return combatState.entities.filter(e => distance(e.position, position) <= range);
}

/** Get threat count near player */
export function getThreatCount(position: Vec3, range = 30): number {
	return combatState.entities.filter(e =>
		(e.threat === 'hostile' || e.threat === 'elite') && distance(e.position, position) <= range
	).length;
}
