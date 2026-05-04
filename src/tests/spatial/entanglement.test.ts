import { describe, it, expect } from 'vitest';
import { EntanglementMap } from '$lib/spatial/entanglement.js';

describe('EntanglementMap', () => {
	it('links two primitives bidirectionally', () => {
		const map = new EntanglementMap();
		map.link('a', 'b');
		expect(map.isLinked('a', 'b')).toBe(true);
		expect(map.isLinked('b', 'a')).toBe(true);
	});

	it('returns linked primitives', () => {
		const map = new EntanglementMap();
		map.link('a', 'b');
		map.link('a', 'c');
		expect(map.getLinked('a')).toContain('b');
		expect(map.getLinked('a')).toContain('c');
	});

	it('unlinks primitives', () => {
		const map = new EntanglementMap();
		map.link('a', 'b');
		map.unlink('a', 'b');
		expect(map.isLinked('a', 'b')).toBe(false);
		expect(map.isLinked('b', 'a')).toBe(false);
	});

	it('returns empty for unlinked primitives', () => {
		const map = new EntanglementMap();
		expect(map.getLinked('x')).toEqual([]);
		expect(map.isLinked('x', 'y')).toBe(false);
	});
});
