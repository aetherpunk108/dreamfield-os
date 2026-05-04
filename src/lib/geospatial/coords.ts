import { WGS84 } from './constants.js';
import type { Vec3 } from '$lib/spatial/types.js';

/** Geodetic coordinates (latitude, longitude in radians, height in meters) */
export interface GeodeticCoord {
	lat: number;
	lon: number;
	height: number;
}

/** Convert degrees to radians */
export function degToRad(deg: number): number {
	return deg * (Math.PI / 180);
}

/** Convert radians to degrees */
export function radToDeg(rad: number): number {
	return rad * (180 / Math.PI);
}

/**
 * WGS84 Geodetic (lat, lon, h) -> ECEF (x, y, z)
 * lat/lon in radians, h in meters
 */
export function geodeticToECEF(coord: GeodeticCoord): Vec3 {
	const { lat, lon, height } = coord;
	const sinLat = Math.sin(lat);
	const cosLat = Math.cos(lat);
	const sinLon = Math.sin(lon);
	const cosLon = Math.cos(lon);

	const N = WGS84.a / Math.sqrt(1 - WGS84.e2 * sinLat * sinLat);

	const x = (N + height) * cosLat * cosLon;
	const y = (N + height) * cosLat * sinLon;
	const z = (N * (1 - WGS84.e2) + height) * sinLat;

	return [x, y, z];
}

/**
 * ECEF (x, y, z) -> WGS84 Geodetic (lat, lon, h)
 * Iterative method (Bowring)
 */
export function ecefToGeodetic(ecef: Vec3): GeodeticCoord {
	const [x, y, z] = ecef;
	const lon = Math.atan2(y, x);

	const p = Math.sqrt(x * x + y * y);
	let lat = Math.atan2(z, p * (1 - WGS84.e2));

	for (let i = 0; i < 10; i++) {
		const sinLat = Math.sin(lat);
		const N = WGS84.a / Math.sqrt(1 - WGS84.e2 * sinLat * sinLat);
		lat = Math.atan2(z + WGS84.e2 * N * sinLat, p);
	}

	const sinLat = Math.sin(lat);
	const N = WGS84.a / Math.sqrt(1 - WGS84.e2 * sinLat * sinLat);
	const height = p / Math.cos(lat) - N;

	return { lat, lon, height };
}

/**
 * ECEF -> ENU (East-North-Up) relative to a reference point
 */
export function ecefToENU(ecef: Vec3, ref: GeodeticCoord): Vec3 {
	const refECEF = geodeticToECEF(ref);
	const dx = ecef[0] - refECEF[0];
	const dy = ecef[1] - refECEF[1];
	const dz = ecef[2] - refECEF[2];

	const sinLat = Math.sin(ref.lat);
	const cosLat = Math.cos(ref.lat);
	const sinLon = Math.sin(ref.lon);
	const cosLon = Math.cos(ref.lon);

	const east = -sinLon * dx + cosLon * dy;
	const north = -sinLat * cosLon * dx - sinLat * sinLon * dy + cosLat * dz;
	const up = cosLat * cosLon * dx + cosLat * sinLon * dy + sinLat * dz;

	return [east, north, up];
}

/**
 * Great-circle distance between two geodetic coords (Haversine)
 * Returns distance in meters
 */
export function greatCircleDistance(a: GeodeticCoord, b: GeodeticCoord): number {
	const dLat = b.lat - a.lat;
	const dLon = b.lon - a.lon;
	const sinHalfLat = Math.sin(dLat / 2);
	const sinHalfLon = Math.sin(dLon / 2);
	const h = sinHalfLat * sinHalfLat +
		Math.cos(a.lat) * Math.cos(b.lat) * sinHalfLon * sinHalfLon;
	return 2 * WGS84.a * Math.asin(Math.sqrt(h));
}

/**
 * Initial bearing (azimuth) from a to b in radians
 */
export function bearing(a: GeodeticCoord, b: GeodeticCoord): number {
	const dLon = b.lon - a.lon;
	const y = Math.sin(dLon) * Math.cos(b.lat);
	const x = Math.cos(a.lat) * Math.sin(b.lat) -
		Math.sin(a.lat) * Math.cos(b.lat) * Math.cos(dLon);
	return Math.atan2(y, x);
}

/**
 * Simple atmospheric refraction bending angle (radians)
 * Bennett's formula approximation for elevation angle e (radians)
 */
export function refractionAngle(elevationRad: number): number {
	const elevDeg = radToDeg(elevationRad);
	if (elevDeg < -1) return 0;
	const r = 1.0 / Math.tan(degToRad(elevDeg + 7.31 / (elevDeg + 4.4)));
	return degToRad(r / 60); // arcminutes to radians
}
