import type { Vec3 } from './types.js';

export interface Ray {
	origin: Vec3;
	direction: Vec3;
	observerId: string;
}

export interface AABB {
	min: Vec3;
	max: Vec3;
}

export interface Sphere {
	center: Vec3;
	radius: number;
}

export function createRay(origin: Vec3, direction: Vec3, observerId: string): Ray {
	const len = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);
	const normalized: Vec3 = len > 0
		? [direction[0] / len, direction[1] / len, direction[2] / len]
		: [0, 0, -1];
	return { origin, direction: normalized, observerId };
}

/** Ray-AABB intersection using slab method. Returns distance or null. */
export function intersectAABB(ray: Ray, aabb: AABB, epsilon = 1e-6): number | null {
	let tMin = -Infinity;
	let tMax = Infinity;

	for (let i = 0; i < 3; i++) {
		const invD = 1.0 / (ray.direction[i] || epsilon);
		let t0 = (aabb.min[i] - ray.origin[i]) * invD;
		let t1 = (aabb.max[i] - ray.origin[i]) * invD;

		if (invD < 0) [t0, t1] = [t1, t0];

		tMin = Math.max(tMin, t0);
		tMax = Math.min(tMax, t1);

		if (tMax < tMin) return null;
	}

	return tMin >= 0 ? tMin : (tMax >= 0 ? tMax : null);
}

/** Ray-Sphere intersection. Returns distance or null. */
export function intersectSphere(ray: Ray, sphere: Sphere): number | null {
	const oc: Vec3 = [
		ray.origin[0] - sphere.center[0],
		ray.origin[1] - sphere.center[1],
		ray.origin[2] - sphere.center[2]
	];

	const a = dot(ray.direction, ray.direction);
	const b = 2 * dot(oc, ray.direction);
	const c = dot(oc, oc) - sphere.radius * sphere.radius;
	const discriminant = b * b - 4 * a * c;

	if (discriminant < 0) return null;

	const sqrtD = Math.sqrt(discriminant);
	const t0 = (-b - sqrtD) / (2 * a);
	const t1 = (-b + sqrtD) / (2 * a);

	if (t0 >= 0) return t0;
	if (t1 >= 0) return t1;
	return null;
}

/** Ray-Gaussian intersection approximation: treat as sphere with radius = 2*sigma */
export function intersectGaussian(
	ray: Ray,
	center: Vec3,
	sigma: number
): number | null {
	return intersectSphere(ray, { center, radius: 2 * sigma });
}

function dot(a: Vec3, b: Vec3): number {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
