/**
 * GPS Integration — Browser Geolocation API + coordinate mapping
 * Bridges real-world position to Dreamfield scene coordinates.
 */

import { degToRad, geodeticToECEF, ecefToENU, type GeodeticCoord } from './coords.js';
import type { Vec3 } from '$lib/spatial/types.js';

export interface GPSPosition {
	lat: number;  // degrees
	lon: number;  // degrees
	alt: number;  // meters
	accuracy: number;
	heading: number | null;
	speed: number | null;
	timestamp: number;
}

export interface GPSConfig {
	/** Scene center reference point (geodetic degrees) */
	refLat: number;
	refLon: number;
	refAlt: number;
	/** Scale factor: meters to scene units */
	scaleMetersToScene: number;
	/** Enable high accuracy */
	highAccuracy: boolean;
}

export const DEFAULT_GPS_CONFIG: GPSConfig = {
	refLat: 0,
	refLon: 0,
	refAlt: 0,
	scaleMetersToScene: 0.001, // 1km = 1 scene unit
	highAccuracy: true,
};

/**
 * Convert GPS position to scene-local coordinates (ENU relative to reference).
 */
export function gpsToScene(gps: GPSPosition, config: GPSConfig): Vec3 {
	const ref: GeodeticCoord = {
		lat: degToRad(config.refLat),
		lon: degToRad(config.refLon),
		height: config.refAlt,
	};

	const point: GeodeticCoord = {
		lat: degToRad(gps.lat),
		lon: degToRad(gps.lon),
		height: gps.alt,
	};

	const ecef = geodeticToECEF(point);
	const enu = ecefToENU(ecef, ref);

	// ENU → scene: East=X, Up=Y, North=Z
	return [
		enu[0] * config.scaleMetersToScene,
		enu[2] * config.scaleMetersToScene, // Up → Y
		-enu[1] * config.scaleMetersToScene, // North → -Z (Three.js convention)
	];
}

/**
 * Convert scene position back to GPS (approximate).
 */
export function sceneToGps(scenePos: Vec3, config: GPSConfig): GPSPosition {
	const eastMeters = scenePos[0] / config.scaleMetersToScene;
	const northMeters = -scenePos[2] / config.scaleMetersToScene;
	const upMeters = scenePos[1] / config.scaleMetersToScene;

	// Approximate: 1 degree lat ≈ 111,320m, 1 degree lon ≈ 111,320 * cos(lat)
	const latOffset = northMeters / 111320;
	const lonOffset = eastMeters / (111320 * Math.cos(degToRad(config.refLat)));

	return {
		lat: config.refLat + latOffset,
		lon: config.refLon + lonOffset,
		alt: config.refAlt + upMeters,
		accuracy: 0,
		heading: null,
		speed: null,
		timestamp: Date.now(),
	};
}

/**
 * Request current GPS position from browser.
 */
export function getCurrentPosition(highAccuracy = true): Promise<GPSPosition> {
	return new Promise((resolve, reject) => {
		if (!navigator.geolocation) {
			reject(new Error('Geolocation not supported'));
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => resolve({
				lat: pos.coords.latitude,
				lon: pos.coords.longitude,
				alt: pos.coords.altitude ?? 0,
				accuracy: pos.coords.accuracy,
				heading: pos.coords.heading,
				speed: pos.coords.speed,
				timestamp: pos.timestamp,
			}),
			reject,
			{ enableHighAccuracy: highAccuracy, timeout: 10000 }
		);
	});
}

/**
 * Watch GPS position continuously.
 */
export function watchPosition(
	callback: (pos: GPSPosition) => void,
	highAccuracy = true
): () => void {
	if (!navigator.geolocation) return () => {};
	const id = navigator.geolocation.watchPosition(
		(pos) => callback({
			lat: pos.coords.latitude,
			lon: pos.coords.longitude,
			alt: pos.coords.altitude ?? 0,
			accuracy: pos.coords.accuracy,
			heading: pos.coords.heading,
			speed: pos.coords.speed,
			timestamp: pos.timestamp,
		}),
		() => {},
		{ enableHighAccuracy: highAccuracy }
	);
	return () => navigator.geolocation.clearWatch(id);
}

/**
 * Calculate distance between two GPS positions (haversine, meters).
 */
export function gpsDistance(a: GPSPosition, b: GPSPosition): number {
	const R = 6371000;
	const dLat = degToRad(b.lat - a.lat);
	const dLon = degToRad(b.lon - a.lon);
	const sinLat = Math.sin(dLat / 2);
	const sinLon = Math.sin(dLon / 2);
	const h = sinLat * sinLat + Math.cos(degToRad(a.lat)) * Math.cos(degToRad(b.lat)) * sinLon * sinLon;
	return 2 * R * Math.asin(Math.sqrt(h));
}
