import type { Vec3 } from '../types.js';
import type { AABB } from '../ray.js';
import type { TrinaryState } from '../state.js';

export interface OctreeNode {
	bbox: AABB;
	depth: number;
	childMask: number; // 8-bit bitmask for which children exist
	children: (OctreeNode | null)[];
	primitiveIds: string[];
	stateCache: Map<string, TrinaryState>; // observerId -> cached state
}

export function createOctreeNode(bbox: AABB, depth = 0): OctreeNode {
	return {
		bbox,
		depth,
		childMask: 0,
		children: new Array(8).fill(null),
		primitiveIds: [],
		stateCache: new Map()
	};
}

export function getChildBBox(parent: AABB, octant: number): AABB {
	const mid: Vec3 = [
		(parent.min[0] + parent.max[0]) / 2,
		(parent.min[1] + parent.max[1]) / 2,
		(parent.min[2] + parent.max[2]) / 2
	];

	const min: Vec3 = [
		(octant & 1) ? mid[0] : parent.min[0],
		(octant & 2) ? mid[1] : parent.min[1],
		(octant & 4) ? mid[2] : parent.min[2]
	];
	const max: Vec3 = [
		(octant & 1) ? parent.max[0] : mid[0],
		(octant & 2) ? parent.max[1] : mid[1],
		(octant & 4) ? parent.max[2] : mid[2]
	];

	return { min, max };
}

export function pointInAABB(point: Vec3, bbox: AABB): boolean {
	return (
		point[0] >= bbox.min[0] && point[0] <= bbox.max[0] &&
		point[1] >= bbox.min[1] && point[1] <= bbox.max[1] &&
		point[2] >= bbox.min[2] && point[2] <= bbox.max[2]
	);
}
