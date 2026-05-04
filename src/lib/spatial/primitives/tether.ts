import type { Vec3 } from '../types.js';

/**
 * Tether (τ): Triangle cluster primitive.
 * Vertices, normals, and indices forming a mesh fragment.
 */
export interface Tether {
	id: string;
	vertices: Vec3[];
	normals: Vec3[];
	indices: number[];
}

export function createTether(
	id: string,
	vertices: Vec3[],
	normals: Vec3[],
	indices: number[]
): Tether {
	return { id, vertices, normals, indices };
}
