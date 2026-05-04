import { describe, it, expect } from 'vitest';
import {
	degToRad, radToDeg,
	geodeticToECEF, ecefToGeodetic,
	ecefToENU, greatCircleDistance, bearing, refractionAngle
} from '$lib/geospatial/coords.js';
import type { GeodeticCoord } from '$lib/geospatial/coords.js';

describe('Coordinate conversions', () => {
	it('converts degrees to radians', () => {
		expect(degToRad(180)).toBeCloseTo(Math.PI);
		expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
		expect(degToRad(0)).toBe(0);
	});

	it('converts radians to degrees', () => {
		expect(radToDeg(Math.PI)).toBeCloseTo(180);
		expect(radToDeg(Math.PI / 2)).toBeCloseTo(90);
	});
});

describe('WGS84 <-> ECEF', () => {
	it('converts equator/prime meridian to ECEF', () => {
		const coord: GeodeticCoord = { lat: 0, lon: 0, height: 0 };
		const ecef = geodeticToECEF(coord);
		expect(ecef[0]).toBeCloseTo(6_378_137, -1); // ~semi-major axis
		expect(ecef[1]).toBeCloseTo(0, 0);
		expect(ecef[2]).toBeCloseTo(0, 0);
	});

	it('converts north pole to ECEF', () => {
		const coord: GeodeticCoord = { lat: Math.PI / 2, lon: 0, height: 0 };
		const ecef = geodeticToECEF(coord);
		expect(ecef[0]).toBeCloseTo(0, 0);
		expect(ecef[1]).toBeCloseTo(0, 0);
		expect(ecef[2]).toBeCloseTo(6_356_752, -1); // ~semi-minor axis
	});

	it('round-trips geodetic -> ECEF -> geodetic', () => {
		const original: GeodeticCoord = {
			lat: degToRad(48.8566), // Paris
			lon: degToRad(2.3522),
			height: 35
		};
		const ecef = geodeticToECEF(original);
		const result = ecefToGeodetic(ecef);

		expect(radToDeg(result.lat)).toBeCloseTo(48.8566, 3);
		expect(radToDeg(result.lon)).toBeCloseTo(2.3522, 3);
		expect(result.height).toBeCloseTo(35, 0);
	});
});

describe('ECEF -> ENU', () => {
	it('computes ENU offset', () => {
		const ref: GeodeticCoord = { lat: 0, lon: 0, height: 0 };
		const point: GeodeticCoord = { lat: degToRad(0.001), lon: degToRad(0.001), height: 0 };
		const enu = ecefToENU(geodeticToECEF(point), ref);
		// Small offset should give positive east and north
		expect(enu[0]).toBeGreaterThan(0); // east
		expect(enu[1]).toBeGreaterThan(0); // north
	});
});

describe('Great circle distance', () => {
	it('computes London to New York (~5570 km)', () => {
		const london: GeodeticCoord = { lat: degToRad(51.5074), lon: degToRad(-0.1278), height: 0 };
		const nyc: GeodeticCoord = { lat: degToRad(40.7128), lon: degToRad(-74.006), height: 0 };
		const dist = greatCircleDistance(london, nyc);
		expect(dist / 1000).toBeCloseTo(5570, -2); // within ~100km
	});

	it('returns 0 for same point', () => {
		const p: GeodeticCoord = { lat: degToRad(45), lon: degToRad(90), height: 0 };
		expect(greatCircleDistance(p, p)).toBeCloseTo(0);
	});
});

describe('Bearing', () => {
	it('computes north bearing as ~0', () => {
		const a: GeodeticCoord = { lat: degToRad(0), lon: degToRad(0), height: 0 };
		const b: GeodeticCoord = { lat: degToRad(1), lon: degToRad(0), height: 0 };
		const b_rad = bearing(a, b);
		expect(radToDeg(b_rad)).toBeCloseTo(0, 0);
	});

	it('computes east bearing as ~90', () => {
		const a: GeodeticCoord = { lat: degToRad(0), lon: degToRad(0), height: 0 };
		const b: GeodeticCoord = { lat: degToRad(0), lon: degToRad(1), height: 0 };
		const b_rad = bearing(a, b);
		expect(radToDeg(b_rad)).toBeCloseTo(90, 0);
	});
});

describe('Atmospheric refraction', () => {
	it('returns positive bending angle for low elevation', () => {
		const angle = refractionAngle(degToRad(5));
		expect(angle).toBeGreaterThan(0);
	});

	it('returns near-zero for zenith', () => {
		const angle = refractionAngle(degToRad(89));
		expect(angle).toBeCloseTo(0, 4);
	});
});
