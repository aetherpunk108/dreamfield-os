import type { Vec3 } from '../types.js';

/**
 * Breath (β): Sparse voxel octree node with density and temperature.
 * Represents volumetric field data (ionosphere, atmosphere, etc.)
 */
export interface BreathVoxel {
	position: Vec3;
	density: number;
	temperature: number;
}

export class BreathField {
	private voxels = new Map<string, BreathVoxel>();
	readonly resolution: number;

	constructor(resolution = 1) {
		this.resolution = resolution;
	}

	private key(x: number, y: number, z: number): string {
		const rx = Math.floor(x / this.resolution);
		const ry = Math.floor(y / this.resolution);
		const rz = Math.floor(z / this.resolution);
		return `${rx},${ry},${rz}`;
	}

	set(position: Vec3, density: number, temperature: number): void {
		const k = this.key(position[0], position[1], position[2]);
		this.voxels.set(k, { position, density, temperature });
	}

	sample(position: Vec3): BreathVoxel | null {
		const k = this.key(position[0], position[1], position[2]);
		return this.voxels.get(k) ?? null;
	}

	get size(): number {
		return this.voxels.size;
	}

	clear(): void {
		this.voxels.clear();
	}
}
