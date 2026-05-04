/**
 * DREAMFIELD GAME ENGINE — Unified game state connecting all systems.
 * Bridges GPS pins, space flight, missions, multiplayer, and scale transitions.
 */

import type { Vec3 } from '$lib/spatial/types.js';

// ============================================
// SCALE SYSTEM — Real distances mapped to game
// ============================================

/** Real-world distances in km */
export const REAL_SCALE = {
	earthRadius: 6371,
	moonDistance: 384400,
	sunDistance: 149597870,
	issAltitude: 408,
	geoOrbit: 35786,
	moonRadius: 1737,
	sunRadius: 696340,
} as const;

/** Game scale: 1 game unit = X km */
export const GAME_SCALE = {
	surface: 0.001,    // 1u = 1m (ground level, GPS pins)
	orbital: 0.01,     // 1u = 10m (near-Earth orbit)
	planetary: 1,      // 1u = 1km (Earth-Moon travel)
	solar: 100,        // 1u = 100km (solar system)
} as const;

export type ScaleZone = 'surface' | 'orbital' | 'planetary' | 'solar';

/** Determine scale zone from altitude above Earth (km) */
export function getScaleZone(altitudeKm: number): ScaleZone {
	if (altitudeKm < 100) return 'surface';
	if (altitudeKm < 2000) return 'orbital';
	if (altitudeKm < 500000) return 'planetary';
	return 'solar';
}

/** Convert real km to game units at a given scale */
export function kmToGameUnits(km: number, zone: ScaleZone): number {
	return km / GAME_SCALE[zone];
}

/** Convert game units back to km */
export function gameUnitsToKm(units: number, zone: ScaleZone): number {
	return units * GAME_SCALE[zone];
}

// ============================================
// SHIP SYSTEM — Upgradeable player vessel
// ============================================

export interface ShipClass {
	id: string;
	name: string;
	description: string;
	maxSpeed: number;
	boostMultiplier: number;
	acceleration: number;
	turnRate: number;
	hull: number;
	shield: number;
	scanRange: number;
	cargo: number;
	color: string;
}

export const SHIP_CLASSES: ShipClass[] = [
	{
		id: 'scout', name: 'SCOUT', description: 'Fast and agile — exploration specialist',
		maxSpeed: 150, boostMultiplier: 4, acceleration: 30, turnRate: 3,
		hull: 80, shield: 50, scanRange: 120, cargo: 5, color: '#00ffcc',
	},
	{
		id: 'hauler', name: 'HAULER', description: 'Heavy cargo — trade and salvage',
		maxSpeed: 80, boostMultiplier: 2, acceleration: 12, turnRate: 1.5,
		hull: 200, shield: 100, scanRange: 60, cargo: 30, color: '#ffcc44',
	},
	{
		id: 'interceptor', name: 'INTERCEPTOR', description: 'Combat-ready — fast and deadly',
		maxSpeed: 200, boostMultiplier: 5, acceleration: 40, turnRate: 3.5,
		hull: 60, shield: 120, scanRange: 80, cargo: 3, color: '#ff44aa',
	},
	{
		id: 'explorer', name: 'EXPLORER', description: 'Long-range — deep space pioneer',
		maxSpeed: 120, boostMultiplier: 3, acceleration: 20, turnRate: 2.5,
		hull: 120, shield: 80, scanRange: 200, cargo: 15, color: '#4466ff',
	},
	{
		id: 'phantom', name: 'PHANTOM', description: 'Stealth vessel — quantum cloaking',
		maxSpeed: 180, boostMultiplier: 3.5, acceleration: 35, turnRate: 3,
		hull: 50, shield: 60, scanRange: 150, cargo: 8, color: '#aa44ff',
	},
];

// ============================================
// PLAYER STATE — Full game profile
// ============================================

export interface PlayerState {
	id: string;
	name: string;
	shipClass: string;
	position: Vec3;
	rotation: { pitch: number; yaw: number; roll: number };
	speed: number;
	hull: number;
	shield: number;
	fuel: number;
	maxFuel: number;
	credits: number;
	xp: number;
	level: number;
	scaleZone: ScaleZone;
	// Inventory
	cargo: CargoItem[];
	// Status
	docked: boolean;
	dockedAt: string | null;
	scanning: boolean;
	scanTarget: string | null;
	inWarp: boolean;
	warpTarget: Vec3 | null;
}

export interface CargoItem {
	id: string;
	name: string;
	quantity: number;
	value: number;
}

export function createPlayerState(name: string, shipClassId = 'scout'): PlayerState {
	const ship = SHIP_CLASSES.find(s => s.id === shipClassId) ?? SHIP_CLASSES[0];
	return {
		id: `player-${Date.now().toString(36)}`,
		name,
		shipClass: ship.id,
		position: [0, ship.id === 'scout' ? 9 : 12, 10],
		rotation: { pitch: -0.1, yaw: 0, roll: 0 },
		speed: 0,
		hull: ship.hull,
		shield: ship.shield,
		fuel: 100,
		maxFuel: 100,
		credits: 100,
		xp: 0,
		level: 1,
		scaleZone: 'orbital',
		cargo: [],
		docked: false,
		dockedAt: null,
		scanning: false,
		scanTarget: null,
		inWarp: false,
		warpTarget: null,
	};
}

// ============================================
// GPS-PINNED MISSIONS — Tied to real locations
// ============================================

export interface GPSMission {
	id: string;
	name: string;
	description: string;
	type: 'delivery' | 'scan' | 'patrol' | 'salvage' | 'explore' | 'race';
	// Real-world GPS anchor
	originLat: number;
	originLon: number;
	destinationLat: number;
	destinationLon: number;
	// Game positions (computed from GPS)
	originPos: Vec3;
	destPos: Vec3;
	// Reward
	reward: { credits: number; xp: number; cargo?: CargoItem };
	// Status
	distanceKm: number;
	timeLimit?: number;
	difficulty: 1 | 2 | 3 | 4 | 5;
}

/** Generate missions between real GPS pin locations */
export function generateGPSMissions(pins: Array<{ name: string; lat: number; lon: number; position: Vec3 }>): GPSMission[] {
	if (pins.length < 2) return [];
	const missions: GPSMission[] = [];
	const types: GPSMission['type'][] = ['delivery', 'scan', 'patrol', 'salvage', 'explore', 'race'];
	const adjectives = ['Urgent', 'Classified', 'Routine', 'Deep Space', 'Emergency', 'Covert', 'Priority'];

	for (let i = 0; i < Math.min(pins.length - 1, 10); i++) {
		const origin = pins[i];
		const dest = pins[(i + 1) % pins.length];
		const type = types[i % types.length];
		const adj = adjectives[i % adjectives.length];

		const dLat = (dest.lat - origin.lat) * 111.32;
		const dLon = (dest.lon - origin.lon) * 111.32 * Math.cos(origin.lat * Math.PI / 180);
		const distKm = Math.sqrt(dLat * dLat + dLon * dLon);

		const difficulty = Math.min(5, Math.max(1, Math.ceil(distKm / 2000))) as 1|2|3|4|5;

		missions.push({
			id: `gps-mission-${i}`,
			name: `${adj} ${type.charAt(0).toUpperCase() + type.slice(1)}: ${origin.name} → ${dest.name}`,
			description: `${type === 'delivery' ? 'Transport cargo' : type === 'scan' ? 'Survey the area' : type === 'patrol' ? 'Secure the route' : type === 'salvage' ? 'Recover materials' : type === 'explore' ? 'Map the region' : 'Race to destination'} from ${origin.name} to ${dest.name}`,
			type,
			originLat: origin.lat, originLon: origin.lon,
			destinationLat: dest.lat, destinationLon: dest.lon,
			originPos: origin.position, destPos: dest.position,
			reward: {
				credits: Math.round(distKm * 0.5 * difficulty),
				xp: Math.round(distKm * 0.3 * difficulty),
			},
			distanceKm: Math.round(distKm),
			difficulty,
			timeLimit: type === 'race' ? Math.round(distKm / 50) : undefined,
		});
	}
	return missions;
}

// ============================================
// WARP DRIVE — Fast travel between distant points
// ============================================

export interface WarpState {
	active: boolean;
	target: Vec3 | null;
	targetName: string;
	progress: number; // 0-1
	duration: number; // seconds
	speed: number;
}

export function initWarp(from: Vec3, to: Vec3, targetName: string): WarpState {
	const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
	const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
	return {
		active: true,
		target: to,
		targetName,
		progress: 0,
		duration: Math.max(2, dist / 100), // 2s minimum
		speed: dist / Math.max(2, dist / 100),
	};
}

export function updateWarp(warp: WarpState, shipPos: Vec3, dt: number): { position: Vec3; complete: boolean } {
	if (!warp.active || !warp.target) return { position: shipPos, complete: false };

	warp.progress = Math.min(1, warp.progress + dt / warp.duration);

	// Smooth ease in-out
	const t = warp.progress < 0.5
		? 4 * warp.progress * warp.progress * warp.progress
		: 1 - Math.pow(-2 * warp.progress + 2, 3) / 2;

	const position: Vec3 = [
		shipPos[0] + (warp.target[0] - shipPos[0]) * t,
		shipPos[1] + (warp.target[1] - shipPos[1]) * t,
		shipPos[2] + (warp.target[2] - shipPos[2]) * t,
	];

	const complete = warp.progress >= 1;
	if (complete) warp.active = false;

	return { position, complete };
}

// ============================================
// DOCKING — Interact with stations
// ============================================

export interface DockingState {
	stationId: string;
	stationName: string;
	services: DockingService[];
}

export interface DockingService {
	id: string;
	name: string;
	description: string;
	icon: string;
	available: boolean;
}

export function getDockingServices(stationName: string): DockingService[] {
	return [
		{ id: 'refuel', name: 'REFUEL', description: 'Restore fuel to maximum', icon: '⛽', available: true },
		{ id: 'repair', name: 'REPAIR', description: 'Restore hull integrity', icon: '🔧', available: true },
		{ id: 'trade', name: 'TRADE', description: 'Buy and sell cargo', icon: '💰', available: true },
		{ id: 'missions', name: 'MISSIONS', description: 'Accept new contracts', icon: '📋', available: true },
		{ id: 'upgrade', name: 'UPGRADE', description: 'Ship modifications', icon: '⚡', available: true },
		{ id: 'scan-data', name: 'SELL SCANS', description: 'Upload scan data for credits', icon: '📡', available: true },
	];
}

// ============================================
// GAME LOOP HELPERS
// ============================================

/** Apply fuel consumption */
export function consumeFuel(player: PlayerState, dt: number, throttle: number, boosting: boolean): number {
	const rate = throttle * 0.5 + (boosting ? 2 : 0);
	player.fuel = Math.max(0, player.fuel - rate * dt);
	return player.fuel;
}

/** Apply shield recharge */
export function rechargeShield(player: PlayerState, dt: number): void {
	const ship = SHIP_CLASSES.find(s => s.id === player.shipClass);
	if (!ship) return;
	if (player.shield < ship.shield) {
		player.shield = Math.min(ship.shield, player.shield + 2 * dt);
	}
}

/** Level up check */
export function checkLevelUp(player: PlayerState): boolean {
	const newLevel = Math.floor(player.xp / 500) + 1;
	if (newLevel > player.level) {
		player.level = newLevel;
		return true;
	}
	return false;
}

/** Compute distance between two Vec3 */
export function distance(a: Vec3, b: Vec3): number {
	return Math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2);
}
