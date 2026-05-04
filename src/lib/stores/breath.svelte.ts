import { BreathField, type BreathVoxel } from '$lib/spatial/octree/breath.js';

const breathField = new BreathField(1);

// Seed some atmospheric voxels around the scene
const SEED_POSITIONS: [number, number, number][] = [
	[-3, 4, -2], [-2, 4.5, -1], [-1, 5, 0], [0, 5.2, 1], [1, 4.8, 2],
	[-4, 3.5, 1], [-3, 4, 2], [2, 4, -3], [3, 3.8, -2], [4, 4.2, -1],
	[-2, 6, -3], [-1, 5.5, -2], [0, 6, -1], [1, 5.8, 0], [2, 5.5, 1],
];

for (const pos of SEED_POSITIONS) {
	breathField.set(pos, 0.3 + Math.random() * 0.7, 200 + Math.random() * 300);
}

export function getBreathField(): BreathField {
	return breathField;
}

export function getBreathVoxels(): BreathVoxel[] {
	const voxels: BreathVoxel[] = [];
	for (const pos of SEED_POSITIONS) {
		const v = breathField.sample(pos);
		if (v) voxels.push(v);
	}
	return voxels;
}
