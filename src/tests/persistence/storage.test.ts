import { describe, it, expect, beforeEach } from 'vitest';
import { createEmptyWorld, type WorldSave } from '$lib/persistence/storage.js';

describe('Persistence', () => {
	it('creates empty world with defaults', () => {
		const world = createEmptyWorld('Test World');
		expect(world.name).toBe('Test World');
		expect(world.version).toBe('1.0.0');
		expect(world.viewMode).toBe('orrery');
		expect(world.ghosts).toHaveLength(0);
		expect(world.pins).toHaveLength(0);
		expect(world.settings.hdriPath).toContain('starmap');
		expect(world.settings.toneMapping).toBe('aces');
	});

	it('serializes to valid JSON', () => {
		const world = createEmptyWorld();
		const json = JSON.stringify(world);
		const parsed = JSON.parse(json) as WorldSave;
		expect(parsed.version).toBe('1.0.0');
		expect(parsed.timestamp).toBeGreaterThan(0);
	});
});
