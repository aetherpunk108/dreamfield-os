/**
 * Phase 15: Satellite tracking — TLE parsing and SGP4-simplified propagation.
 * Simplified orbital propagation for visualization (not mission-critical accuracy).
 */

import type { Vec3 } from '$lib/spatial/types.js';

export interface TLEData {
	name: string;
	line1: string;
	line2: string;
	// Parsed elements
	epoch: number;
	inclination: number;     // radians
	raan: number;            // right ascension of ascending node (radians)
	eccentricity: number;
	argPerigee: number;      // radians
	meanAnomaly: number;     // radians
	meanMotion: number;      // revolutions per day
	catalogId: string;
}

export interface SatellitePosition {
	name: string;
	position: Vec3;     // ECEF meters
	velocity: Vec3;     // m/s
	altitude: number;   // km
	lat: number;        // degrees
	lon: number;        // degrees
}

const DEG2RAD = Math.PI / 180;
const EARTH_RADIUS = 6371; // km
const MU = 398600.4418; // km³/s² (Earth gravitational parameter)

/**
 * Parse a TLE (Two-Line Element) set.
 */
export function parseTLE(name: string, line1: string, line2: string): TLEData {
	const epochYear = parseInt(line1.substring(18, 20));
	const epochDay = parseFloat(line1.substring(20, 32));
	const fullYear = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;
	const epoch = new Date(fullYear, 0, 1).getTime() / 1000 + (epochDay - 1) * 86400;

	return {
		name: name.trim(),
		line1,
		line2,
		epoch,
		inclination: parseFloat(line2.substring(8, 16)) * DEG2RAD,
		raan: parseFloat(line2.substring(17, 25)) * DEG2RAD,
		eccentricity: parseFloat('0.' + line2.substring(26, 33)),
		argPerigee: parseFloat(line2.substring(34, 42)) * DEG2RAD,
		meanAnomaly: parseFloat(line2.substring(43, 51)) * DEG2RAD,
		meanMotion: parseFloat(line2.substring(52, 63)),
		catalogId: line1.substring(2, 7).trim(),
	};
}

/**
 * Simplified SGP4-like propagation.
 * Returns position in ECEF coordinates (km).
 */
export function propagate(tle: TLEData, timestampSec: number): SatellitePosition {
	const dt = (timestampSec - tle.epoch) / 60; // minutes since epoch
	const n = tle.meanMotion * 2 * Math.PI / 1440; // rad/min

	// Mean anomaly at time
	const M = tle.meanAnomaly + n * dt;

	// Solve Kepler's equation (simplified: E ≈ M for low eccentricity)
	let E = M;
	for (let i = 0; i < 5; i++) {
		E = M + tle.eccentricity * Math.sin(E);
	}

	// True anomaly
	const sinV = Math.sqrt(1 - tle.eccentricity ** 2) * Math.sin(E) / (1 - tle.eccentricity * Math.cos(E));
	const cosV = (Math.cos(E) - tle.eccentricity) / (1 - tle.eccentricity * Math.cos(E));
	const v = Math.atan2(sinV, cosV);

	// Semi-major axis from mean motion
	const a = Math.pow(MU / (n / 60) ** 2, 1 / 3); // km

	// Radius
	const r = a * (1 - tle.eccentricity * Math.cos(E));

	// Position in orbital plane
	const u = v + tle.argPerigee; // argument of latitude
	const xOrbital = r * Math.cos(u);
	const yOrbital = r * Math.sin(u);

	// Rotate to ECEF (simplified: RAAN + Earth rotation)
	const earthRotation = (timestampSec % 86400) / 86400 * 2 * Math.PI;
	const raan = tle.raan - earthRotation;

	const cosRaan = Math.cos(raan);
	const sinRaan = Math.sin(raan);
	const cosInc = Math.cos(tle.inclination);
	const sinInc = Math.sin(tle.inclination);

	const x = xOrbital * cosRaan - yOrbital * sinRaan * cosInc;
	const y = xOrbital * sinRaan + yOrbital * cosRaan * cosInc;
	const z = yOrbital * sinInc;

	// Velocity (simplified circular approximation)
	const vMag = Math.sqrt(MU / r);
	const vx = -vMag * Math.sin(u);
	const vy = vMag * Math.cos(u);

	// Convert to lat/lon
	const altitude = r - EARTH_RADIUS;
	const lat = Math.asin(z / r) / DEG2RAD;
	const lon = Math.atan2(y, x) / DEG2RAD;

	return {
		name: tle.name,
		position: [x * 1000, y * 1000, z * 1000], // convert to meters
		velocity: [vx * 1000, vy * 1000, 0],
		altitude,
		lat,
		lon,
	};
}

/** Well-known TLE for ISS (sample — update periodically) */
export const ISS_TLE: TLEData = parseTLE(
	'ISS (ZARYA)',
	'1 25544U 98067A   24001.50000000  .00016717  00000-0  10270-3 0  9005',
	'2 25544  51.6400 200.0000 0001000  90.0000 270.0000 15.49000000400000'
);

/** Sample constellation */
export const SAMPLE_SATELLITES: TLEData[] = [
	ISS_TLE,
	parseTLE('HUBBLE', '1 20580U 90037B   24001.50000000  .00000000  00000-0  00000-0 0  9999', '2 20580  28.4700 100.0000 0002500  80.0000 280.0000 15.09000000100000'),
	parseTLE('STARLINK-1007', '1 44713U 19074A   24001.50000000  .00000000  00000-0  00000-0 0  9999', '2 44713  53.0000  50.0000 0001200 270.0000  90.0000 15.06000000050000'),
	parseTLE('GPS IIR-10', '1 28474U 04045A   24001.50000000  .00000000  00000-0  00000-0 0  9999', '2 28474  55.0000 120.0000 0050000  45.0000 315.0000  2.00560000010000'),
];

/**
 * Get all satellite positions at a given time.
 */
export function getAllPositions(satellites: TLEData[], timestampSec: number): SatellitePosition[] {
	return satellites.map(s => propagate(s, timestampSec));
}

/**
 * Convert satellite ECEF position to orrery scene coordinates.
 */
export function satToScene(pos: SatellitePosition, visScale = 3e-9): Vec3 {
	return [
		pos.position[0] * visScale,
		pos.position[2] * visScale,
		-pos.position[1] * visScale,
	];
}
