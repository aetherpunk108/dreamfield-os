import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import type { Tile3D, TilesetJson } from './tileLoader.js';
import { fetchTilesetJson } from './tileLoader.js';
import type { IonAssetEndpoint } from './config.js';

export interface TileRenderer {
	group: THREE.Group;
	update(cameraPosition: THREE.Vector3): Promise<void>;
	dispose(): void;
	stats: { loaded: number; visible: number; pending: number };
}

interface LoadedTile {
	tileId: string;
	object: THREE.Object3D;
	lastUsed: number;
}

const CACHE_MAX = 100;
const gltfLoader = new GLTFLoader();

/**
 * Load a .b3dm or .glb tile from a URL and return a THREE.Object3D.
 * .b3dm files have a 28-byte header before the embedded glb payload.
 */
async function loadTileContent(url: string, accessToken: string): Promise<THREE.Object3D> {
	const res = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` }
	});
	if (!res.ok) throw new Error(`Tile content fetch failed: ${res.status} (${url})`);

	const buffer = await res.arrayBuffer();
	let glbBuffer = buffer;

	// b3dm: magic bytes "b3dm" at offset 0
	const magic = new Uint8Array(buffer, 0, 4);
	const isB3dm =
		magic[0] === 0x62 && magic[1] === 0x33 && magic[2] === 0x64 && magic[3] === 0x6d;

	if (isB3dm) {
		// b3dm header layout (all uint32 LE):
		//   magic(4), version(4), byteLength(4), featureTableJSONByteLength(4),
		//   featureTableBinaryByteLength(4), batchTableJSONByteLength(4), batchTableBinaryByteLength(4)
		// Total header = 28 bytes, then featureTable/batchTable, then glb
		const view = new DataView(buffer);
		const featureTableJsonLen = view.getUint32(12, true);
		const featureTableBinLen = view.getUint32(16, true);
		const batchTableJsonLen = view.getUint32(20, true);
		const batchTableBinLen = view.getUint32(24, true);
		const glbOffset = 28 + featureTableJsonLen + featureTableBinLen + batchTableJsonLen + batchTableBinLen;
		glbBuffer = buffer.slice(glbOffset);
	}

	return new Promise<THREE.Object3D>((resolve, reject) => {
		gltfLoader.parse(
			glbBuffer,
			'',
			(gltf) => resolve(gltf.scene),
			(err) => reject(err)
		);
	});
}

/**
 * Compute screen-space error approximation for a tile.
 * Returns true when the tile is detailed enough (no need to subdivide).
 */
function isSufficientDetail(
	tile: Tile3D,
	cameraPosition: THREE.Vector3,
	screenHeight = 768,
	fovDeg = 60
): boolean {
	const center = tile.boundingVolume?.center;
	if (!center) return true;

	const dist = cameraPosition.distanceTo(new THREE.Vector3(center[0], center[1], center[2]));
	if (dist < 0.001) return true;

	// Screen-space error: sse = (geometricError * screenHeight) / (dist * 2 * tan(fov/2))
	const sse = (tile.geometricError * screenHeight) / (dist * 2 * Math.tan((fovDeg * Math.PI) / 360));
	return sse < 4; // 4px threshold
}

export function createTileRenderer(tilesetUrl: string, accessToken: string): TileRenderer {
	const group = new THREE.Group();

	// LRU cache: tileId -> LoadedTile
	const cache = new Map<string, LoadedTile>();

	let tileset: TilesetJson | null = null;
	let loadingTileset = false;
	let pendingCount = 0;
	const loadingSet = new Set<string>();

	const stats = { loaded: 0, visible: 0, pending: 0 };

	// Resolve base URL from tileset URL for relative tile URIs
	function resolveTileUrl(uri: string): string {
		if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
		const base = tilesetUrl.substring(0, tilesetUrl.lastIndexOf('/') + 1);
		return base + uri;
	}

	function evictLRU() {
		if (cache.size < CACHE_MAX) return;

		// Find the least recently used entry
		let oldestKey = '';
		let oldestTime = Infinity;
		for (const [key, entry] of cache) {
			if (entry.lastUsed < oldestTime) {
				oldestTime = entry.lastUsed;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			const entry = cache.get(oldestKey)!;
			group.remove(entry.object);
			// Dispose geometries/materials
			entry.object.traverse((obj) => {
				if (obj instanceof THREE.Mesh) {
					obj.geometry?.dispose();
					if (Array.isArray(obj.material)) {
						obj.material.forEach((m) => m.dispose());
					} else {
						obj.material?.dispose();
					}
				}
			});
			cache.delete(oldestKey);
		}
	}

	async function loadTile(tile: Tile3D, tileId: string): Promise<void> {
		if (!tile.content?.uri || cache.has(tileId) || loadingSet.has(tileId)) return;

		loadingSet.add(tileId);
		pendingCount++;
		stats.pending = pendingCount;

		try {
			evictLRU();
			const url = resolveTileUrl(tile.content.uri);
			const object = await loadTileContent(url, accessToken);
			group.add(object);
			cache.set(tileId, { tileId, object, lastUsed: Date.now() });
			stats.loaded = cache.size;
		} catch {
			// Silently skip failed tile loads — network or format issues
		} finally {
			loadingSet.delete(tileId);
			pendingCount--;
			stats.pending = pendingCount;
		}
	}

	async function traverseTiles(
		tile: Tile3D,
		cameraPosition: THREE.Vector3,
		tileId: string
	): Promise<void> {
		const sufficient = isSufficientDetail(tile, cameraPosition);

		if (sufficient || !tile.children?.length) {
			// Show this tile
			if (tile.content?.uri) {
				await loadTile(tile, tileId);
				const entry = cache.get(tileId);
				if (entry) {
					entry.object.visible = true;
					entry.lastUsed = Date.now();
				}
			}
		} else {
			// Hide this tile, show children
			const entry = cache.get(tileId);
			if (entry) entry.object.visible = false;

			await Promise.all(
				tile.children.map((child, i) =>
					traverseTiles(child, cameraPosition, `${tileId}_${i}`)
				)
			);
		}
	}

	return {
		group,
		stats,

		async update(cameraPosition: THREE.Vector3): Promise<void> {
			// Load tileset on first update
			if (!tileset && !loadingTileset) {
				loadingTileset = true;
				try {
					const endpoint: IonAssetEndpoint = { type: '3DTILES', url: tilesetUrl, accessToken, attributions: [] };
					tileset = await fetchTilesetJson(endpoint);
				} catch {
					// Retry next frame
					loadingTileset = false;
					return;
				}
			}

			if (!tileset) return;

			// Hide all cached tiles, then re-show visible ones during traversal
			for (const entry of cache.values()) {
				entry.object.visible = false;
			}

			await traverseTiles(tileset.root, cameraPosition, 'root');

			let visible = 0;
			for (const entry of cache.values()) {
				if (entry.object.visible) visible++;
			}
			stats.visible = visible;
			stats.loaded = cache.size;
		},

		dispose(): void {
			for (const entry of cache.values()) {
				group.remove(entry.object);
				entry.object.traverse((obj) => {
					if (obj instanceof THREE.Mesh) {
						obj.geometry?.dispose();
						if (Array.isArray(obj.material)) {
							obj.material.forEach((m) => m.dispose());
						} else {
							obj.material?.dispose();
						}
					}
				});
			}
			cache.clear();
			stats.loaded = 0;
			stats.visible = 0;
			stats.pending = 0;
		}
	};
}
