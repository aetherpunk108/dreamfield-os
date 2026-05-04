import { describe, it, expect } from 'vitest';
import {
	createPlayer, createLocalPlayer, createWorldSession,
	generatePlayerId, serializePlayer, deserializePlayer
} from '$lib/multiplayer/identity.js';

describe('Player identity', () => {
	it('generates unique player IDs', () => {
		const id1 = generatePlayerId();
		const id2 = generatePlayerId();
		expect(id1).not.toBe(id2);
		expect(id1).toContain('player-');
	});

	it('creates player with correct defaults', () => {
		const p = createPlayer('TestUser', 'builder');
		expect(p.name).toBe('TestUser');
		expect(p.role).toBe('builder');
		expect(p.color).toMatch(/^#/);
		expect(p.joinedAt).toBeGreaterThan(0);
	});

	it('creates local player', () => {
		const p = createLocalPlayer('SpacePilot');
		expect(p.name).toBe('SpacePilot');
		expect(p.role).toBe('observer');
	});

	it('serializes and deserializes player', () => {
		const p = createPlayer('NetPlayer', 'navigator');
		const json = serializePlayer(p);
		const restored = deserializePlayer(json);
		expect(restored.id).toBe(p.id);
		expect(restored.name).toBe('NetPlayer');
		expect(restored.role).toBe('navigator');
	});
});

describe('World session', () => {
	it('creates session with host', () => {
		const host = createLocalPlayer('Host');
		const world = createWorldSession(host, 'My World');
		expect(world.name).toBe('My World');
		expect(world.host).toBe(host.id);
		expect(world.players).toHaveLength(1);
		expect(world.maxPlayers).toBe(16);
		expect(world.isPublic).toBe(true);
	});
});
