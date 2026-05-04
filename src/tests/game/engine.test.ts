import { describe, it, expect } from 'vitest';
import {
	getScaleZone, kmToGameUnits, gameUnitsToKm,
	SHIP_CLASSES, createPlayerState,
	generateGPSMissions, initWarp, updateWarp,
	getDockingServices, consumeFuel, rechargeShield,
	checkLevelUp, distance, REAL_SCALE
} from '$lib/game/engine.js';

describe('Scale System', () => {
	it('maps altitude to correct scale zone', () => {
		expect(getScaleZone(0)).toBe('surface');
		expect(getScaleZone(50)).toBe('surface');
		expect(getScaleZone(400)).toBe('orbital');
		expect(getScaleZone(1000)).toBe('orbital');
		expect(getScaleZone(50000)).toBe('planetary');
		expect(getScaleZone(REAL_SCALE.moonDistance)).toBe('planetary');
		expect(getScaleZone(1000000)).toBe('solar');
	});

	it('converts km to game units and back', () => {
		const km = 1000;
		const units = kmToGameUnits(km, 'planetary');
		const back = gameUnitsToKm(units, 'planetary');
		expect(back).toBeCloseTo(km);
	});

	it('surface scale is finest', () => {
		const surfaceU = kmToGameUnits(1, 'surface');
		const solarU = kmToGameUnits(1, 'solar');
		expect(surfaceU).toBeGreaterThan(solarU);
	});
});

describe('Ship Classes', () => {
	it('has 5 ship classes', () => {
		expect(SHIP_CLASSES).toHaveLength(5);
	});

	it('all have valid stats', () => {
		SHIP_CLASSES.forEach(s => {
			expect(s.maxSpeed).toBeGreaterThan(0);
			expect(s.hull).toBeGreaterThan(0);
			expect(s.cargo).toBeGreaterThan(0);
			expect(s.color).toMatch(/^#/);
		});
	});

	it('interceptor is fastest', () => {
		const fastest = SHIP_CLASSES.reduce((a, b) => a.maxSpeed > b.maxSpeed ? a : b);
		expect(fastest.id).toBe('interceptor');
	});

	it('hauler has most cargo', () => {
		const biggest = SHIP_CLASSES.reduce((a, b) => a.cargo > b.cargo ? a : b);
		expect(biggest.id).toBe('hauler');
	});
});

describe('Player State', () => {
	it('creates player with ship stats', () => {
		const p = createPlayerState('TestPilot', 'scout');
		expect(p.name).toBe('TestPilot');
		expect(p.shipClass).toBe('scout');
		expect(p.hull).toBe(80);
		expect(p.fuel).toBe(100);
		expect(p.credits).toBe(100);
	});

	it('defaults to scout', () => {
		const p = createPlayerState('Default');
		expect(p.shipClass).toBe('scout');
	});
});

describe('GPS Missions', () => {
	const pins = [
		{ name: 'London', lat: 51.5, lon: -0.1, position: [0, 0, 0] as [number,number,number] },
		{ name: 'Paris', lat: 48.8, lon: 2.3, position: [3, 0, -3] as [number,number,number] },
		{ name: 'Tokyo', lat: 35.6, lon: 139.6, position: [60, 0, -20] as [number,number,number] },
	];

	it('generates missions between pins', () => {
		const missions = generateGPSMissions(pins);
		expect(missions.length).toBeGreaterThanOrEqual(2);
		expect(missions[0].originLat).toBe(51.5);
		expect(missions[0].destinationLat).toBe(48.8);
	});

	it('calculates distance and difficulty', () => {
		const missions = generateGPSMissions(pins);
		expect(missions[0].distanceKm).toBeGreaterThan(0);
		expect(missions[0].difficulty).toBeGreaterThanOrEqual(1);
		expect(missions[0].difficulty).toBeLessThanOrEqual(5);
	});

	it('assigns rewards scaled by distance', () => {
		const missions = generateGPSMissions(pins);
		const short = missions[0]; // London-Paris
		const long = missions[1]; // Paris-Tokyo
		expect(long.reward.credits).toBeGreaterThan(short.reward.credits);
	});

	it('needs at least 2 pins', () => {
		expect(generateGPSMissions([pins[0]])).toHaveLength(0);
	});
});

describe('Warp Drive', () => {
	it('initializes warp state', () => {
		const warp = initWarp([0, 0, 0], [100, 0, 0], 'Target');
		expect(warp.active).toBe(true);
		expect(warp.progress).toBe(0);
		expect(warp.duration).toBeGreaterThanOrEqual(2);
	});

	it('progresses warp over time', () => {
		const warp = initWarp([0, 0, 0], [10, 0, 0], 'Near');
		const from: [number,number,number] = [0, 0, 0];
		const r1 = updateWarp(warp, from, 1);
		expect(warp.progress).toBeGreaterThan(0);
		expect(r1.complete).toBe(false);
	});

	it('completes warp', () => {
		const warp = initWarp([0, 0, 0], [10, 0, 0], 'Near');
		const from: [number,number,number] = [0, 0, 0];
		// Run for longer than duration
		for (let i = 0; i < 100; i++) updateWarp(warp, from, 0.1);
		expect(warp.active).toBe(false);
		expect(warp.progress).toBe(1);
	});
});

describe('Docking', () => {
	it('returns services for any station', () => {
		const services = getDockingServices('ISS ALPHA');
		expect(services.length).toBeGreaterThanOrEqual(6);
		expect(services.find(s => s.id === 'refuel')).toBeDefined();
		expect(services.find(s => s.id === 'trade')).toBeDefined();
	});
});

describe('Game Loop Helpers', () => {
	it('consumes fuel', () => {
		const player = createPlayerState('Test');
		consumeFuel(player, 1, 0.5, false);
		expect(player.fuel).toBeLessThan(100);
	});

	it('boosting burns more fuel', () => {
		const p1 = createPlayerState('A');
		const p2 = createPlayerState('B');
		consumeFuel(p1, 1, 0.5, false);
		consumeFuel(p2, 1, 0.5, true);
		expect(p2.fuel).toBeLessThan(p1.fuel);
	});

	it('recharges shield', () => {
		const player = createPlayerState('Test', 'scout');
		player.shield = 10;
		rechargeShield(player, 5);
		expect(player.shield).toBeGreaterThan(10);
	});

	it('checks level up', () => {
		const player = createPlayerState('Test');
		player.xp = 500;
		expect(checkLevelUp(player)).toBe(true);
		expect(player.level).toBe(2);
	});

	it('calculates distance', () => {
		expect(distance([0,0,0], [3,4,0])).toBeCloseTo(5);
		expect(distance([0,0,0], [0,0,0])).toBe(0);
	});
});
