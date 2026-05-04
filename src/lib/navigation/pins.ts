/**
 * Location Pins — Google Earth-style markers on the globe.
 * Pins are placed at geodetic coordinates and rendered in 3D.
 */

import type { Vec3 } from '$lib/spatial/types.js';
import { degToRad, geodeticToECEF, type GeodeticCoord } from '$lib/geospatial/coords.js';
import { BODY_RADIUS } from '$lib/geospatial/constants.js';

export type PinCategory = 'landmark' | 'city' | 'custom' | 'gps' | 'event' | 'player';

export interface LocationPin {
	id: string;
	name: string;
	description?: string;
	category: PinCategory;
	lat: number; // degrees
	lon: number; // degrees
	alt: number; // meters above surface
	color: string;
	icon?: string;
	createdBy: string;
	createdAt: number;
	visible: boolean;
	/** Computed 3D position on globe (set by positionOnGlobe) */
	worldPosition?: Vec3;
}

export const PIN_COLORS: Record<PinCategory, string> = {
	landmark: '#ffcc44',
	city: '#4466ff',
	custom: '#00ffcc',
	gps: '#44ff88',
	event: '#ff44aa',
	player: '#aa44ff',
};

let pinIdCounter = 0;
let pins: LocationPin[] = [];

/** Default landmark pins */
const DEFAULT_PINS: Omit<LocationPin, 'id' | 'worldPosition' | 'createdBy' | 'createdAt'>[] = [
	{ name: 'London', category: 'city', lat: 51.5074, lon: -0.1278, alt: 0, color: PIN_COLORS.city, visible: true },
	{ name: 'New York', category: 'city', lat: 40.7128, lon: -74.006, alt: 0, color: PIN_COLORS.city, visible: true },
	{ name: 'Tokyo', category: 'city', lat: 35.6762, lon: 139.6503, alt: 0, color: PIN_COLORS.city, visible: true },
	{ name: 'Sydney', category: 'city', lat: -33.8688, lon: 151.2093, alt: 0, color: PIN_COLORS.city, visible: true },
	{ name: 'Mt. Everest', category: 'landmark', lat: 27.9881, lon: 86.925, alt: 8849, color: PIN_COLORS.landmark, visible: true },
	{ name: 'Sahara Desert', category: 'landmark', lat: 23.4162, lon: 25.6628, alt: 0, color: PIN_COLORS.landmark, visible: true },
	{ name: 'Amazon Basin', category: 'landmark', lat: -3.4653, lon: -62.2159, alt: 0, color: PIN_COLORS.landmark, visible: true },
	{ name: 'North Pole', category: 'landmark', lat: 90, lon: 0, alt: 0, color: PIN_COLORS.landmark, visible: true },
	{ name: 'South Pole', category: 'landmark', lat: -90, lon: 0, alt: 0, color: PIN_COLORS.landmark, visible: true },
];

/** Initialize with default pins */
export function initDefaultPins(): void {
	pins = DEFAULT_PINS.map(p => ({
		...p,
		id: `pin-${pinIdCounter++}`,
		createdBy: 'system',
		createdAt: Date.now(),
	}));
	// Compute world positions
	pins.forEach(p => { p.worldPosition = pinToWorldPosition(p); });
}

/** Convert pin geodetic coords to 3D world position on globe */
export function pinToWorldPosition(pin: LocationPin, globeScale = 1e-7): Vec3 {
	// Place pin at Earth surface + altitude
	const coord: GeodeticCoord = {
		lat: degToRad(pin.lat),
		lon: degToRad(pin.lon),
		height: BODY_RADIUS.earth + pin.alt,
	};
	const ecef = geodeticToECEF(coord);
	return [ecef[0] * globeScale, ecef[2] * globeScale, -ecef[1] * globeScale];
}

/** Convert pin to scaled position for orrery view */
export function pinToOrreryPosition(pin: LocationPin, visScale = 3e-9, earthPos: Vec3 = [0, 0, 0]): Vec3 {
	const surfacePos = pinToWorldPosition(pin, visScale);
	return [
		surfacePos[0] + earthPos[0],
		surfacePos[1] + earthPos[1],
		surfacePos[2] + earthPos[2],
	];
}

export function getPins(): LocationPin[] { return pins; }

export function addPin(pin: Omit<LocationPin, 'id' | 'worldPosition' | 'createdAt'>): LocationPin {
	const newPin: LocationPin = {
		...pin,
		id: `pin-${pinIdCounter++}`,
		createdAt: Date.now(),
	};
	newPin.worldPosition = pinToWorldPosition(newPin);
	pins = [...pins, newPin];
	return newPin;
}

export function removePin(id: string): void {
	pins = pins.filter(p => p.id !== id);
}

export function updatePin(id: string, updates: Partial<LocationPin>): void {
	pins = pins.map(p => {
		if (p.id !== id) return p;
		const updated = { ...p, ...updates };
		updated.worldPosition = pinToWorldPosition(updated);
		return updated;
	});
}

export function getPinsByCategory(category: PinCategory): LocationPin[] {
	return pins.filter(p => p.category === category);
}

export function findNearestPin(lat: number, lon: number): LocationPin | null {
	if (pins.length === 0) return null;
	let nearest = pins[0];
	let minDist = Infinity;
	for (const pin of pins) {
		const dLat = pin.lat - lat;
		const dLon = pin.lon - lon;
		const dist = dLat * dLat + dLon * dLon;
		if (dist < minDist) { minDist = dist; nearest = pin; }
	}
	return nearest;
}

export function togglePinVisibility(id: string): void {
	pins = pins.map(p => p.id === id ? { ...p, visible: !p.visible } : p);
}

/** Toggle all pins of a category */
export function toggleCategory(category: PinCategory, visible: boolean): void {
	pins = pins.map(p => p.category === category ? { ...p, visible } : p);
}
