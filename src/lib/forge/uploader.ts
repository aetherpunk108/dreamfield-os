/**
 * FORGE — Asset Uploader
 * Import 3D models, textures, HDRIs, and data files into the scene.
 */

export type AssetType = 'model' | 'texture' | 'hdri' | 'audio' | 'data' | 'unknown';

export interface UploadedAsset {
	id: string;
	name: string;
	type: AssetType;
	mimeType: string;
	size: number;
	url: string; // object URL
	thumbnail?: string;
	uploadedAt: number;
	metadata: Record<string, unknown>;
}

const MIME_MAP: Record<string, AssetType> = {
	'model/gltf-binary': 'model',
	'model/gltf+json': 'model',
	'application/octet-stream': 'model', // .glb fallback
	'image/png': 'texture',
	'image/jpeg': 'texture',
	'image/webp': 'texture',
	'image/exr': 'hdri',
	'image/hdr': 'hdri',
	'audio/mpeg': 'audio',
	'audio/wav': 'audio',
	'audio/ogg': 'audio',
	'application/json': 'data',
	'text/plain': 'data',
};

const EXT_MAP: Record<string, AssetType> = {
	glb: 'model', gltf: 'model', fbx: 'model', obj: 'model', ply: 'model', stl: 'model',
	png: 'texture', jpg: 'texture', jpeg: 'texture', webp: 'texture',
	exr: 'hdri', hdr: 'hdri', hdri: 'hdri',
	mp3: 'audio', wav: 'audio', ogg: 'audio',
	json: 'data', csv: 'data', las: 'data', laz: 'data',
};

let assets: UploadedAsset[] = [];
let assetCounter = 0;

function detectType(file: File): AssetType {
	const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
	return MIME_MAP[file.type] ?? EXT_MAP[ext] ?? 'unknown';
}

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Upload a file and create an asset entry.
 */
export function uploadFile(file: File): UploadedAsset {
	const asset: UploadedAsset = {
		id: `asset-${assetCounter++}`,
		name: file.name,
		type: detectType(file),
		mimeType: file.type || 'application/octet-stream',
		size: file.size,
		url: URL.createObjectURL(file),
		uploadedAt: Date.now(),
		metadata: {
			originalName: file.name,
			sizeFormatted: formatSize(file.size),
			lastModified: file.lastModified,
		},
	};

	// Generate thumbnail for images
	if (asset.type === 'texture') {
		asset.thumbnail = asset.url;
	}

	assets.push(asset);
	return asset;
}

/**
 * Upload multiple files.
 */
export function uploadFiles(files: FileList | File[]): UploadedAsset[] {
	return Array.from(files).map(f => uploadFile(f));
}

/**
 * Get all uploaded assets.
 */
export function getAssets(): UploadedAsset[] { return assets; }

/**
 * Get assets by type.
 */
export function getAssetsByType(type: AssetType): UploadedAsset[] {
	return assets.filter(a => a.type === type);
}

/**
 * Remove an asset.
 */
export function removeAsset(id: string): void {
	const idx = assets.findIndex(a => a.id === id);
	if (idx < 0) return;
	URL.revokeObjectURL(assets[idx].url);
	assets.splice(idx, 1);
}

/**
 * Clear all assets.
 */
export function clearAssets(): void {
	assets.forEach(a => URL.revokeObjectURL(a.url));
	assets = [];
}

/**
 * Supported file extensions for the file picker.
 */
export const SUPPORTED_EXTENSIONS = Object.keys(EXT_MAP).map(e => `.${e}`).join(',');

/**
 * Get asset type icon.
 */
export function getAssetIcon(type: AssetType): string {
	switch (type) {
		case 'model': return '◇';
		case 'texture': return '◫';
		case 'hdri': return '◉';
		case 'audio': return '♫';
		case 'data': return '⊞';
		default: return '◈';
	}
}
