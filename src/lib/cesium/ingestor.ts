import { CESIUM_ION_BASE, CESIUM_ION_TOKEN } from './config.js';

export type IngestFormat = 'LAS' | 'PLY' | 'JPEG' | 'TIFF' | '3D_TILE' | 'PHOTOGRAMMETRY';

export interface IngestOptions {
	name: string;
	description?: string;
	sourceType: IngestFormat;
	filePath?: string;
	token?: string;
}

export interface IonAsset {
	id: number;
	name: string;
	status: 'AWAITING_FILES' | 'IN_PROGRESS' | 'COMPLETE' | 'ERROR';
	type: string;
	percentComplete?: number;
}

/**
 * Map file extensions to Ion source types.
 */
export function detectFormat(filename: string): IngestFormat {
	const ext = filename.split('.').pop()?.toLowerCase();
	switch (ext) {
		case 'las': case 'laz': return 'LAS';
		case 'ply': case 'splat': return 'PLY';
		case 'jpg': case 'jpeg': case 'png': return 'PHOTOGRAMMETRY';
		case 'tif': case 'tiff': return 'TIFF';
		case 'glb': case 'gltf': return '3D_TILE';
		default: return '3D_TILE';
	}
}

/**
 * Create a new Ion asset and get upload location.
 */
export async function createIonAsset(
	options: IngestOptions,
	token = CESIUM_ION_TOKEN
): Promise<{ assetId: number; uploadLocation: { endpoint: string; bucket: string; prefix: string; accessKey: string; secretKey: string; sessionToken: string } }> {
	const body = {
		name: options.name,
		description: options.description || `Dreamfield ingest: ${options.name}`,
		type: options.sourceType === 'TIFF' ? 'TERRAIN' : '3DTILES',
		options: {
			sourceType: options.sourceType === 'PLY' ? 'POINT_CLOUD' :
				options.sourceType === 'LAS' ? 'POINT_CLOUD' :
				options.sourceType === 'TIFF' ? 'RASTER_TERRAIN' :
				options.sourceType === 'PHOTOGRAMMETRY' ? 'PHOTOGRAMMETRY' : '3D_MODEL'
		}
	};

	const res = await fetch(`${CESIUM_ION_BASE}/assets`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`Ion asset creation failed: ${res.status} — ${err}`);
	}

	const data = await res.json();
	return { assetId: data.assetMetadata.id, uploadLocation: data.uploadLocation };
}

/**
 * Poll Ion asset status until complete or error.
 */
export async function pollAssetStatus(
	assetId: number,
	token = CESIUM_ION_TOKEN,
	intervalMs = 3000,
	maxAttempts = 100,
	onProgress?: (pct: number) => void
): Promise<IonAsset> {
	for (let i = 0; i < maxAttempts; i++) {
		const res = await fetch(`${CESIUM_ION_BASE}/assets/${assetId}`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (!res.ok) throw new Error(`Poll failed: ${res.status}`);

		const asset: IonAsset = await res.json();
		onProgress?.(asset.percentComplete ?? 0);

		if (asset.status === 'COMPLETE') return asset;
		if (asset.status === 'ERROR') throw new Error(`Ion processing failed for asset ${assetId}`);

		await new Promise(r => setTimeout(r, intervalMs));
	}
	throw new Error(`Timed out waiting for asset ${assetId}`);
}

/**
 * List all Ion assets for this account.
 */
export async function listIonAssets(token = CESIUM_ION_TOKEN): Promise<IonAsset[]> {
	const res = await fetch(`${CESIUM_ION_BASE}/assets`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) throw new Error(`List assets failed: ${res.status}`);
	const data = await res.json();
	return data.items;
}

/**
 * Delete an Ion asset.
 */
export async function deleteIonAsset(assetId: number, token = CESIUM_ION_TOKEN): Promise<void> {
	const res = await fetch(`${CESIUM_ION_BASE}/assets/${assetId}`, {
		method: 'DELETE',
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) throw new Error(`Delete asset failed: ${res.status}`);
}
