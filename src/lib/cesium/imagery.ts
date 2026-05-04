/**
 * Cesium Ion Imagery Provider — streams satellite imagery tiles for Earth texture.
 * Uses Ion asset endpoints to fetch map tiles at various LOD levels.
 */

import { CESIUM_ION_TOKEN, CESIUM_ION_BASE, ION_ASSETS, type IonAssetEndpoint } from './config.js';

export interface ImageryTile {
	x: number;
	y: number;
	level: number;
	url: string;
	loaded: boolean;
	image?: HTMLImageElement;
}

export interface ImageryProvider {
	endpoint: IonAssetEndpoint | null;
	maxLevel: number;
	tileSize: number;
	ready: boolean;
}

/**
 * Resolve Cesium Ion Bing Maps Aerial imagery endpoint.
 */
export async function resolveImageryEndpoint(token = CESIUM_ION_TOKEN): Promise<IonAssetEndpoint> {
	const res = await fetch(`${CESIUM_ION_BASE}/assets/${ION_ASSETS.bingAerial}/endpoint`, {
		headers: { Authorization: `Bearer ${token}` }
	});
	if (!res.ok) throw new Error(`Imagery endpoint failed: ${res.status}`);
	return res.json();
}

/**
 * Get tile URL for a given x, y, level from the imagery endpoint.
 * Cesium Ion Bing imagery uses a quadkey-based URL template.
 */
export function tileXYToQuadKey(x: number, y: number, level: number): string {
	let quadKey = '';
	for (let i = level; i > 0; i--) {
		let digit = 0;
		const mask = 1 << (i - 1);
		if ((x & mask) !== 0) digit += 1;
		if ((y & mask) !== 0) digit += 2;
		quadKey += digit.toString();
	}
	return quadKey;
}

/**
 * Build a tile URL from the endpoint template.
 * Bing Maps uses {quadkey} and {subdomain} replacements.
 */
export function buildTileUrl(endpoint: IonAssetEndpoint, x: number, y: number, level: number): string {
	const quadKey = tileXYToQuadKey(x, y, level);
	// The endpoint URL typically contains {quadkey} for Bing-style imagery
	let url = endpoint.url;
	if (url.includes('{quadkey}')) {
		url = url.replace('{quadkey}', quadKey);
	} else {
		// Fallback: construct TMS-style URL
		url = `${endpoint.url}/${level}/${x}/${y}.png`;
	}
	// Append access token if needed
	if (!url.includes('access_token') && endpoint.accessToken) {
		const sep = url.includes('?') ? '&' : '?';
		url += `${sep}access_token=${endpoint.accessToken}`;
	}
	return url;
}

/**
 * Get number of tiles at a given level.
 */
export function tilesAtLevel(level: number): { x: number; y: number } {
	return { x: 2 ** (level + 1), y: 2 ** level };
}

/**
 * Convert lat/lon (degrees) to tile coordinates at a given level.
 */
export function latLonToTile(lat: number, lon: number, level: number): { x: number; y: number } {
	const n = 2 ** level;
	const x = Math.floor(((lon + 180) / 360) * n * 2);
	const latRad = (lat * Math.PI) / 180;
	const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
	return { x: Math.max(0, Math.min(n * 2 - 1, x)), y: Math.max(0, Math.min(n - 1, y)) };
}

/**
 * Create a composite Earth texture from multiple low-level tiles.
 * Uses level 2 (16 tiles) for a basic global view.
 */
export async function createEarthTexture(endpoint: IonAssetEndpoint, level = 1): Promise<HTMLCanvasElement> {
	const { x: numX, y: numY } = tilesAtLevel(level);
	const tileSize = 256;
	const canvas = document.createElement('canvas');
	canvas.width = numX * tileSize;
	canvas.height = numY * tileSize;
	const ctx = canvas.getContext('2d')!;

	// Fill with ocean blue
	ctx.fillStyle = '#0a2040';
	ctx.fillRect(0, 0, canvas.width, canvas.height);

	const promises: Promise<void>[] = [];
	for (let y = 0; y < numY; y++) {
		for (let x = 0; x < numX; x++) {
			const url = buildTileUrl(endpoint, x, y, level);
			promises.push(
				loadImage(url).then(img => {
					ctx.drawImage(img, x * tileSize, y * tileSize, tileSize, tileSize);
				}).catch(() => {
					// Draw placeholder for failed tiles
					ctx.fillStyle = '#0a2a1a';
					ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
				})
			);
		}
	}

	await Promise.allSettled(promises);
	return canvas;
}

function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.crossOrigin = 'anonymous';
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = url;
	});
}
