import type { Vec3 } from '$lib/spatial/types.js';

export type WaypointType = 'marker' | 'destination' | 'poi' | 'hazard' | 'spawn';

export interface Waypoint {
	id: string;
	name: string;
	position: Vec3;
	type: WaypointType;
	color: string;
	description?: string;
	createdBy: string;
	createdAt: number;
	visible: boolean;
}

export const WAYPOINT_COLORS: Record<WaypointType, string> = {
	marker: '#00ffcc',
	destination: '#4466ff',
	poi: '#ffcc44',
	hazard: '#ff44aa',
	spawn: '#44ff88'
};

const DEFAULT_WAYPOINTS: Waypoint[] = [
	{
		id: 'wp-origin',
		name: 'Origin',
		position: [0, 0, 0],
		type: 'spawn',
		color: WAYPOINT_COLORS.spawn,
		description: 'Initial spawn point',
		createdBy: 'system',
		createdAt: 0,
		visible: true
	},
	{
		id: 'wp-observatory',
		name: 'Observatory',
		position: [0, 5, 0],
		type: 'poi',
		color: WAYPOINT_COLORS.poi,
		description: 'Elevated observation platform',
		createdBy: 'system',
		createdAt: 0,
		visible: true
	},
	{
		id: 'wp-nebula-alpha',
		name: 'Nebula Alpha',
		position: [15, 3, -10],
		type: 'destination',
		color: WAYPOINT_COLORS.destination,
		description: 'Nebula formation sector alpha',
		createdBy: 'system',
		createdAt: 0,
		visible: true
	},
	{
		id: 'wp-deep-field',
		name: 'Deep Field',
		position: [-20, 8, 25],
		type: 'destination',
		color: WAYPOINT_COLORS.destination,
		description: 'Deep spatial field exploration zone',
		createdBy: 'system',
		createdAt: 0,
		visible: true
	}
];

let waypoints: Waypoint[] = [...DEFAULT_WAYPOINTS];

let idCounter = 1000;

function generateId(): string {
	return `wp-${Date.now()}-${idCounter++}`;
}

export function createWaypoint(
	name: string,
	position: Vec3,
	type: WaypointType,
	createdBy: string
): Waypoint {
	return {
		id: generateId(),
		name,
		position,
		type,
		color: WAYPOINT_COLORS[type],
		createdBy,
		createdAt: Date.now(),
		visible: true
	};
}

export function getWaypoints(): Waypoint[] {
	return waypoints;
}

export function addWaypoint(waypoint: Waypoint): void {
	waypoints = [...waypoints, waypoint];
}

export function removeWaypoint(id: string): void {
	waypoints = waypoints.filter((wp) => wp.id !== id);
}

export function findNearest(position: Vec3, maxDist?: number): Waypoint | null {
	let nearest: Waypoint | null = null;
	let nearestDist = Infinity;

	for (const wp of waypoints) {
		if (!wp.visible) continue;
		const d = distanceTo(position, wp);
		if (d < nearestDist && (maxDist === undefined || d <= maxDist)) {
			nearestDist = d;
			nearest = wp;
		}
	}

	return nearest;
}

export function getWaypointsByType(type: WaypointType): Waypoint[] {
	return waypoints.filter((wp) => wp.type === type);
}

export function distanceTo(from: Vec3, waypoint: Waypoint): number {
	const dx = from[0] - waypoint.position[0];
	const dy = from[1] - waypoint.position[1];
	const dz = from[2] - waypoint.position[2];
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function bearingTo(from: Vec3, waypoint: Waypoint): number {
	const dx = waypoint.position[0] - from[0];
	const dz = waypoint.position[2] - from[2];
	return Math.atan2(dx, -dz);
}
