import { describe, it, expect } from 'vitest';
import {
	resolveIonAsset, collectTileUris,
	type Tile3D
} from '$lib/cesium/tileLoader.js';
import { geodeticToTileCoords } from '$lib/cesium/terrainSampler.js';
import { detectFormat, createIonAsset } from '$lib/cesium/ingestor.js';
import { CESIUM_ION_TOKEN, ION_ASSETS } from '$lib/cesium/config.js';
import { degToRad } from '$lib/geospatial/coords.js';

describe('Cesium config', () => {
	it('has a valid Ion token', () => {
		expect(CESIUM_ION_TOKEN).toBeDefined();
		expect(CESIUM_ION_TOKEN.length).toBeGreaterThan(50);
	});

	it('has well-known asset IDs', () => {
		expect(ION_ASSETS.worldTerrain).toBe(1);
		expect(ION_ASSETS.osmBuildings).toBe(96188);
	});
});

describe('Terrain tile coords', () => {
	it('computes tile coords for Paris at level 10', () => {
		const coord = { lat: degToRad(48.8566), lon: degToRad(2.3522), height: 0 };
		const tile = geodeticToTileCoords(coord, 10);
		expect(tile.level).toBe(10);
		expect(tile.x).toBeGreaterThan(0);
		expect(tile.y).toBeGreaterThan(0);
		expect(tile.x).toBeLessThan(2048);
		expect(tile.y).toBeLessThan(1024);
	});

	it('computes tile coords for equator/prime meridian', () => {
		const coord = { lat: 0, lon: 0, height: 0 };
		const tile = geodeticToTileCoords(coord, 0);
		expect(tile.x).toBe(1);
		expect(tile.y).toBe(0);
	});
});

describe('Tile URI collection', () => {
	it('collects URIs from nested tileset', () => {
		const root: Tile3D = {
			id: 'root',
			boundingVolume: { center: [0, 0, 0], radius: 100 },
			geometricError: 50,
			content: { uri: 'root.b3dm' },
			children: [
				{
					id: 'child1',
					boundingVolume: { center: [1, 0, 0], radius: 50 },
					geometricError: 25,
					content: { uri: 'child1.b3dm' },
					children: [
						{
							id: 'grandchild',
							boundingVolume: { center: [2, 0, 0], radius: 25 },
							geometricError: 10,
							content: { uri: 'grandchild.b3dm' }
						}
					]
				}
			]
		};
		const uris = collectTileUris(root, 3);
		expect(uris).toContain('root.b3dm');
		expect(uris).toContain('child1.b3dm');
		expect(uris).toContain('grandchild.b3dm');
		expect(uris).toHaveLength(3);
	});

	it('respects maxDepth', () => {
		const root: Tile3D = {
			id: 'root',
			boundingVolume: { center: [0, 0, 0], radius: 100 },
			geometricError: 50,
			content: { uri: 'root.b3dm' },
			children: [{
				id: 'deep',
				boundingVolume: { center: [0, 0, 0], radius: 50 },
				geometricError: 25,
				content: { uri: 'deep.b3dm' }
			}]
		};
		const uris = collectTileUris(root, 0);
		expect(uris).toEqual(['root.b3dm']);
	});
});

describe('Format detection', () => {
	it('detects LAS point cloud', () => {
		expect(detectFormat('scan.las')).toBe('LAS');
		expect(detectFormat('scan.laz')).toBe('LAS');
	});

	it('detects PLY splats', () => {
		expect(detectFormat('gaussian.ply')).toBe('PLY');
		expect(detectFormat('model.splat')).toBe('PLY');
	});

	it('detects photogrammetry images', () => {
		expect(detectFormat('photo.jpg')).toBe('PHOTOGRAMMETRY');
		expect(detectFormat('image.jpeg')).toBe('PHOTOGRAMMETRY');
	});

	it('detects terrain rasters', () => {
		expect(detectFormat('dem.tif')).toBe('TIFF');
		expect(detectFormat('elevation.tiff')).toBe('TIFF');
	});

	it('detects 3D models', () => {
		expect(detectFormat('building.glb')).toBe('3D_TILE');
		expect(detectFormat('city.gltf')).toBe('3D_TILE');
	});
});

describe('Ion API (live)', () => {
	it('resolves world terrain endpoint', async () => {
		if (!CESIUM_ION_TOKEN) return;
		const endpoint = await resolveIonAsset(ION_ASSETS.worldTerrain);
		expect(endpoint.type).toBeDefined();
		expect(endpoint.url).toContain('http');
		expect(endpoint.accessToken).toBeDefined();
	});
});
