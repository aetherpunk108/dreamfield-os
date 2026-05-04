import type { Vec3, Vec4 } from '../types.js';

/**
 * Ghost (ψ): Gaussian splat primitive.
 * Position, covariance (simplified as sigma scalar for Phase 1),
 * color as spherical harmonics (simplified as RGBA for Phase 1).
 */
export interface Ghost {
	id: string;
	position: Vec3;
	sigma: number; // simplified covariance (uniform scale)
	color: Vec4;   // [r, g, b, a] 0-1
	opacity: number;
}

export function createGhost(
	id: string,
	position: Vec3,
	sigma = 0.5,
	color: Vec4 = [1, 1, 1, 1],
	opacity = 1
): Ghost {
	return { id, position, sigma, color, opacity };
}
