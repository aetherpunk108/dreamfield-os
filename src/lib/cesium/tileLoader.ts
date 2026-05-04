import { CESIUM_ION_BASE, CESIUM_ION_TOKEN, type IonAssetEndpoint } from './config.js';
import type { Vec3 } from '$lib/spatial/types.js';

export interface Tile3D {
	id: string;
	boundingVolume: { center: Vec3; radius: number };
	geometricError: number;
	content?: { uri: string };
	children?: Tile3D[];
}

export interface TilesetJson {
	asset: { version: string };
	geometricError: number;
	root: Tile3D;
}

/**
 * Resolve a Cesium Ion asset ID to its streaming endpoint.
 */
export async function resolveIonAsset(assetId: number, token = CESIUM_ION_TOKEN): Promise<IonAssetEndpoint> {
	const res = await fetch(`${CESIUM_ION_BASE}/assets/${assetId}/endpoint`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) throw new Error(`Ion endpoint failed: ${res.status} ${res.statusText}`);
	return res.json();
}

/**
 * Fetch a 3D Tileset JSON from a resolved Ion endpoint.
 */
export async function fetchTilesetJson(endpoint: IonAssetEndpoint): Promise<TilesetJson> {
	const url = endpoint.url.endsWith('/') ? endpoint.url + 'tileset.json' : endpoint.url + '/tileset.json';
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${endpoint.accessToken}` }
	});
	if (!res.ok) throw new Error(`Tileset fetch failed: ${res.status}`);
	return res.json();
}

/**
 * Load a 3D Tileset from Ion by asset ID.
 */
export async function loadIonTileset(assetId: number): Promise<TilesetJson> {
	const endpoint = await resolveIonAsset(assetId);
	return fetchTilesetJson(endpoint);
}

/**
 * Traverse tileset tree and collect tile content URIs up to a given depth.
 */
export function collectTileUris(root: Tile3D, maxDepth = 3): string[] {
	const uris: string[] = [];
	function walk(tile: Tile3D, depth: number) {
		if (depth > maxDepth) return;
		if (tile.content?.uri) uris.push(tile.content.uri);
		if (tile.children) {
			for (const child of tile.children) walk(child, depth + 1);
		}
	}
	walk(root, 0);
	return uris;
}
