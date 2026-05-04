import { describe, it, expect, beforeEach } from 'vitest';
import {
	createObject, getObject, getAllObjects, deleteObject, duplicateObject,
	setTransform, toggleVisibility, toggleLock, rename, reparent,
	select, getSelectedIds, deselectAll, findByName, findByType,
	clearScene, initForgeScene, serializeScene, getRootObjects
} from '$lib/forge/scene-graph.js';

beforeEach(() => { clearScene(); });

describe('Forge Scene Graph', () => {
	it('creates objects with unique IDs', () => {
		const a = createObject('Cube', 'mesh');
		const b = createObject('Sphere', 'mesh');
		expect(a.id).not.toBe(b.id);
		expect(getAllObjects()).toHaveLength(2);
	});

	it('gets object by ID', () => {
		const obj = createObject('Test', 'light');
		expect(getObject(obj.id)?.name).toBe('Test');
	});

	it('deletes objects', () => {
		const obj = createObject('Delete Me', 'mesh');
		deleteObject(obj.id);
		expect(getObject(obj.id)).toBeUndefined();
		expect(getAllObjects()).toHaveLength(0);
	});

	it('duplicates objects', () => {
		const orig = createObject('Original', 'mesh', { position: [1, 2, 3] });
		const copy = duplicateObject(orig.id);
		expect(copy).not.toBeNull();
		expect(copy!.name).toBe('Original (copy)');
		expect(copy!.transform.position[0]).toBe(2); // offset by 1
	});

	it('sets transform', () => {
		const obj = createObject('Move', 'mesh');
		setTransform(obj.id, { position: [5, 5, 5] });
		expect(getObject(obj.id)?.transform.position).toEqual([5, 5, 5]);
	});

	it('respects lock on transform', () => {
		const obj = createObject('Locked', 'mesh', { position: [0, 0, 0] });
		toggleLock(obj.id);
		setTransform(obj.id, { position: [99, 99, 99] });
		expect(getObject(obj.id)?.transform.position).toEqual([0, 0, 0]);
	});

	it('toggles visibility and lock', () => {
		const obj = createObject('Toggle', 'mesh');
		expect(obj.visible).toBe(true);
		toggleVisibility(obj.id);
		expect(getObject(obj.id)?.visible).toBe(false);
	});

	it('renames objects', () => {
		const obj = createObject('Old', 'mesh');
		rename(obj.id, 'New');
		expect(getObject(obj.id)?.name).toBe('New');
	});

	it('manages parent-child hierarchy', () => {
		const parent = createObject('Parent', 'group');
		const child = createObject('Child', 'mesh');
		reparent(child.id, parent.id);
		expect(getObject(child.id)?.parentId).toBe(parent.id);
		expect(getObject(parent.id)?.children).toContain(child.id);
	});

	it('deletes children recursively', () => {
		const parent = createObject('Parent', 'group');
		const child = createObject('Child', 'mesh');
		reparent(child.id, parent.id);
		deleteObject(parent.id);
		expect(getObject(child.id)).toBeUndefined();
	});

	it('manages selection', () => {
		const a = createObject('A', 'mesh');
		const b = createObject('B', 'mesh');
		select(a.id);
		expect(getSelectedIds()).toEqual([a.id]);
		deselectAll();
		expect(getSelectedIds()).toHaveLength(0);
	});

	it('finds by name and type', () => {
		createObject('Sun Light', 'light');
		createObject('Moon Light', 'light');
		createObject('Cube', 'mesh');
		expect(findByName('light')).toHaveLength(2);
		expect(findByType('mesh')).toHaveLength(1);
	});

	it('serializes scene', () => {
		createObject('Test', 'mesh');
		const json = serializeScene();
		const parsed = JSON.parse(json);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].name).toBe('Test');
	});

	it('initializes default forge scene', () => {
		initForgeScene();
		const objs = getAllObjects();
		expect(objs.length).toBeGreaterThanOrEqual(5);
		expect(findByType('camera')).toHaveLength(1);
		expect(findByType('light')).toHaveLength(2);
	});
});
