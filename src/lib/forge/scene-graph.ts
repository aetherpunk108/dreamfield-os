/**
 * FORGE — Scene Graph Manager
 * Manages all objects in the editable scene with transform, visibility, and hierarchy.
 */

import type { Vec3 } from '$lib/spatial/types.js';

export type ForgeObjectType = 'mesh' | 'light' | 'camera' | 'group' | 'particle' | 'primitive' | 'imported' | 'effect';

export interface ForgeTransform {
	position: Vec3;
	rotation: Vec3; // euler degrees
	scale: Vec3;
}

export interface ForgeObject {
	id: string;
	name: string;
	type: ForgeObjectType;
	transform: ForgeTransform;
	visible: boolean;
	locked: boolean;
	parentId: string | null;
	children: string[];
	properties: Record<string, unknown>;
	// Metadata
	createdAt: number;
	tags: string[];
}

let objects: Map<string, ForgeObject> = new Map();
let selectedIds: Set<string> = new Set();
let nextId = 0;

function genId(): string { return `forge-${nextId++}`; }

export function createObject(
	name: string, type: ForgeObjectType,
	transform?: Partial<ForgeTransform>,
	properties?: Record<string, unknown>
): ForgeObject {
	const obj: ForgeObject = {
		id: genId(),
		name,
		type,
		transform: {
			position: transform?.position ?? [0, 0, 0],
			rotation: transform?.rotation ?? [0, 0, 0],
			scale: transform?.scale ?? [1, 1, 1],
		},
		visible: true,
		locked: false,
		parentId: null,
		children: [],
		properties: properties ?? {},
		createdAt: Date.now(),
		tags: [],
	};
	objects.set(obj.id, obj);
	return obj;
}

export function getObject(id: string): ForgeObject | undefined { return objects.get(id); }
export function getAllObjects(): ForgeObject[] { return Array.from(objects.values()); }
export function getRootObjects(): ForgeObject[] { return getAllObjects().filter(o => o.parentId === null); }

export function deleteObject(id: string): void {
	const obj = objects.get(id);
	if (!obj) return;
	// Remove from parent
	if (obj.parentId) {
		const parent = objects.get(obj.parentId);
		if (parent) parent.children = parent.children.filter(c => c !== id);
	}
	// Delete children recursively
	for (const childId of obj.children) deleteObject(childId);
	objects.delete(id);
	selectedIds.delete(id);
}

export function reparent(childId: string, newParentId: string | null): void {
	const child = objects.get(childId);
	if (!child) return;
	// Remove from old parent
	if (child.parentId) {
		const oldParent = objects.get(child.parentId);
		if (oldParent) oldParent.children = oldParent.children.filter(c => c !== childId);
	}
	child.parentId = newParentId;
	if (newParentId) {
		const newParent = objects.get(newParentId);
		if (newParent) newParent.children.push(childId);
	}
}

export function duplicateObject(id: string): ForgeObject | null {
	const orig = objects.get(id);
	if (!orig) return null;
	return createObject(
		orig.name + ' (copy)', orig.type,
		{ ...orig.transform, position: [orig.transform.position[0] + 1, orig.transform.position[1], orig.transform.position[2]] },
		{ ...orig.properties }
	);
}

export function setTransform(id: string, transform: Partial<ForgeTransform>): void {
	const obj = objects.get(id);
	if (!obj || obj.locked) return;
	if (transform.position) obj.transform.position = transform.position;
	if (transform.rotation) obj.transform.rotation = transform.rotation;
	if (transform.scale) obj.transform.scale = transform.scale;
}

export function setProperty(id: string, key: string, value: unknown): void {
	const obj = objects.get(id);
	if (!obj) return;
	obj.properties[key] = value;
}

export function toggleVisibility(id: string): void {
	const obj = objects.get(id);
	if (obj) obj.visible = !obj.visible;
}

export function toggleLock(id: string): void {
	const obj = objects.get(id);
	if (obj) obj.locked = !obj.locked;
}

export function rename(id: string, name: string): void {
	const obj = objects.get(id);
	if (obj) obj.name = name;
}

// Selection
export function getSelectedIds(): string[] { return Array.from(selectedIds); }
export function isSelected(id: string): boolean { return selectedIds.has(id); }
export function select(id: string): void { selectedIds.clear(); selectedIds.add(id); }
export function addToSelection(id: string): void { selectedIds.add(id); }
export function deselectAll(): void { selectedIds.clear(); }
export function getSelection(): ForgeObject[] { return getSelectedIds().map(id => objects.get(id)!).filter(Boolean); }

// Search
export function findByName(query: string): ForgeObject[] {
	const q = query.toLowerCase();
	return getAllObjects().filter(o => o.name.toLowerCase().includes(q));
}

export function findByType(type: ForgeObjectType): ForgeObject[] {
	return getAllObjects().filter(o => o.type === type);
}

export function findByTag(tag: string): ForgeObject[] {
	return getAllObjects().filter(o => o.tags.includes(tag));
}

// Serialization
export function serializeScene(): string {
	return JSON.stringify(getAllObjects(), null, 2);
}

export function clearScene(): void {
	objects = new Map();
	selectedIds = new Set();
	nextId = 0;
}

// Populate default scene
export function initForgeScene(): void {
	clearScene();
	const cam = createObject('Main Camera', 'camera', { position: [0, 5, 10] });
	cam.tags.push('default');
	const ambient = createObject('Ambient Light', 'light', { position: [0, 10, 0] }, { intensity: 0.5, color: '#334466' });
	const dir = createObject('Directional Light', 'light', { position: [5, 10, 5], rotation: [-30, 45, 0] }, { intensity: 0.8, color: '#ffffff' });
	const grid = createObject('Grid Floor', 'effect', { position: [0, 0, 0] }, { size: 20, divisions: 20 });
	const group = createObject('Scene Objects', 'group');
}
