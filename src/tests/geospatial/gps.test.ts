import { describe, it, expect } from 'vitest';
import { gpsToScene, sceneToGps, gpsDistance, DEFAULT_GPS_CONFIG, type GPSPosition } from '$lib/geospatial/gps.js';

describe('GPS Integration', () => {
	const config = { ...DEFAULT_GPS_CONFIG, refLat: 51.5074, refLon: -0.1278, refAlt: 0 };

	it('maps GPS position at reference to scene origin', () => {
		const gps: GPSPosition = { lat: 51.5074, lon: -0.1278, alt: 0, accuracy: 5, heading: null, speed: null, timestamp: 0 };
		const scene = gpsToScene(gps, config);
		expect(Math.abs(scene[0])).toBeLessThan(0.001);
		expect(Math.abs(scene[1])).toBeLessThan(0.001);
		expect(Math.abs(scene[2])).toBeLessThan(0.001);
	});

	it('maps offset GPS to positive scene coords', () => {
		// ~1km north and ~1km east of reference
		const gps: GPSPosition = { lat: 51.5164, lon: -0.1138, alt: 0, accuracy: 5, heading: null, speed: null, timestamp: 0 };
		const scene = gpsToScene(gps, config);
		expect(scene[0]).toBeGreaterThan(0); // east → +X
		expect(scene[2]).toBeLessThan(0);   // north → -Z
	});

	it('round-trips GPS → scene → GPS', () => {
		const original: GPSPosition = { lat: 51.51, lon: -0.12, alt: 50, accuracy: 5, heading: null, speed: null, timestamp: 0 };
		const scene = gpsToScene(original, config);
		const back = sceneToGps(scene, config);
		expect(back.lat).toBeCloseTo(original.lat, 2);
		expect(back.lon).toBeCloseTo(original.lon, 2);
	});

	it('calculates distance between two GPS points', () => {
		const london: GPSPosition = { lat: 51.5074, lon: -0.1278, alt: 0, accuracy: 0, heading: null, speed: null, timestamp: 0 };
		const paris: GPSPosition = { lat: 48.8566, lon: 2.3522, alt: 0, accuracy: 0, heading: null, speed: null, timestamp: 0 };
		const dist = gpsDistance(london, paris);
		expect(dist / 1000).toBeCloseTo(340, -2); // ~340km
	});

	it('returns 0 distance for same point', () => {
		const p: GPSPosition = { lat: 40, lon: -74, alt: 0, accuracy: 0, heading: null, speed: null, timestamp: 0 };
		expect(gpsDistance(p, p)).toBeCloseTo(0);
	});
});
