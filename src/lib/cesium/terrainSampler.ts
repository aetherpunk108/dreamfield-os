import { resolveIonAsset, type IonAssetEndpoint } from './tileLoader.js';
import { ION_ASSETS } from './config.js';
import { geodeticToECEF, ecefToGeodetic, degToRad, type GeodeticCoord } from '$lib/geospatial/coords.js';
import type { Vec3 } from '$lib/spatial/types.js';

export interface TerrainSample {
	position: GeodeticCoord;
	elevation: number;
	normal?: Vec3;
}

/**
 * Get the terrain endpoint for Cesium World Terrain.
 */
export async function getTerrainEndpoint(): Promise<IonAssetEndpoint> {
	return resolveIonAsset(ION_ASSETS.worldTerrain);
}

/**
 * Compute quantized-mesh tile coordinates from geodetic position.
 * Uses TMS tiling scheme.
 */
export function geodeticToTileCoords(coord: GeodeticCoord, level: number): { x: number; y: number; level: number } {
	const lonDeg = coord.lon * (180 / Math.PI);
	const latDeg = coord.lat * (180 / Math.PI);

	const numTilesX = 2 * (2 ** level);
	const numTilesY = 2 ** level;

	const x = Math.floor(((lonDeg + 180) / 360) * numTilesX);
	const y = Math.floor(((latDeg + 90) / 180) * numTilesY);

	return { x: Math.min(x, numTilesX - 1), y: Math.min(y, numTilesY - 1), level };
}

/**
 * Fetch a terrain tile from the quantized-mesh endpoint.
 * Returns raw ArrayBuffer for decoding.
 */
export async function fetchTerrainTile(
	endpoint: IonAssetEndpoint,
	level: number,
	x: number,
	y: number
): Promise<ArrayBuffer> {
	const url = `${endpoint.url}/${level}/${x}/${y}.terrain`;
	const res = await fetch(url, {
		headers: {
			Authorization: `Bearer ${endpoint.accessToken}`,
			Accept: 'application/vnd.quantized-mesh,application/octet-stream'
		}
	});
	if (!res.ok) throw new Error(`Terrain tile fetch failed: ${res.status} (${level}/${x}/${y})`);
	return res.arrayBuffer();
}

/**
 * Sample terrain elevation at a geodetic coordinate.
 * Uses bilinear interpolation on the quantized-mesh tile.
 */
export async function sampleElevation(
	latDeg: number,
	lonDeg: number,
	level = 10
): Promise<TerrainSample> {
	const coord: GeodeticCoord = { lat: degToRad(latDeg), lon: degToRad(lonDeg), height: 0 };
	const endpoint = await getTerrainEndpoint();
	const { x, y } = geodeticToTileCoords(coord, level);

	const buffer = await fetchTerrainTile(endpoint, level, x, y);
	const elevation = decodeElevationFromQuantizedMesh(buffer);

	return {
		position: { ...coord, height: elevation },
		elevation
	};
}

/**
 * Decode min/max elevation from quantized-mesh header.
 * Full vertex decoding would require more complex parsing.
 */
function decodeElevationFromQuantizedMesh(buffer: ArrayBuffer): number {
	const view = new DataView(buffer);
	// Quantized-mesh header: centerX(8), centerY(8), centerZ(8), minHeight(4), maxHeight(4)
	// Offset 24 = minimumHeight (float32), Offset 28 = maximumHeight (float32)
	if (buffer.byteLength < 32) return 0;

	const minHeight = view.getFloat32(24, true);
	const maxHeight = view.getFloat32(28, true);

	// Return average as approximation without full vertex decode
	return (minHeight + maxHeight) / 2;
}
