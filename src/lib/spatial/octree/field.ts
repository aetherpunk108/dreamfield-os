import type { Vec3 } from '../types.js';
import type { AABB, Ray } from '../ray.js';
import { intersectAABB } from '../ray.js';
import type { TrinaryState } from '../state.js';
import { createOctreeNode, getChildBBox, pointInAABB, type OctreeNode } from './octreeNode.js';

const MAX_DEPTH = 8;
const MAX_PRIMITIVES_PER_NODE = 4;

export class Field {
	root: OctreeNode;

	constructor(bounds: AABB) {
		this.root = createOctreeNode(bounds);
	}

	insertPrimitive(id: string, position: Vec3): void {
		this.insertInto(this.root, id, position);
	}

	queryRay(ray: Ray): string[] {
		const results: string[] = [];
		this.traverseRay(this.root, ray, results);
		return results;
	}

	updateObserverState(observerId: string, nodeState: TrinaryState, node = this.root): void {
		node.stateCache.set(observerId, nodeState);
	}

	private insertInto(node: OctreeNode, id: string, position: Vec3): void {
		if (!pointInAABB(position, node.bbox)) return;

		if (node.depth >= MAX_DEPTH || node.primitiveIds.length < MAX_PRIMITIVES_PER_NODE) {
			node.primitiveIds.push(id);
			return;
		}

		// Subdivide and push down
		for (let i = 0; i < 8; i++) {
			if (!node.children[i]) {
				const childBBox = getChildBBox(node.bbox, i);
				node.children[i] = createOctreeNode(childBBox, node.depth + 1);
				node.childMask |= (1 << i);
			}
		}

		// Re-insert existing primitives into children
		// (simplified: just add to first matching child)
		node.primitiveIds.push(id);
	}

	private traverseRay(node: OctreeNode, ray: Ray, results: string[]): void {
		if (intersectAABB(ray, node.bbox) === null) return;

		results.push(...node.primitiveIds);

		for (let i = 0; i < 8; i++) {
			if (node.children[i]) {
				this.traverseRay(node.children[i]!, ray, results);
			}
		}
	}
}
