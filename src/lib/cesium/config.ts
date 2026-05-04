/** Cesium Ion configuration */
export const CESIUM_ION_TOKEN = import.meta.env.VITE_CESIUM_ION_TOKEN as string;

export const CESIUM_ION_BASE = 'https://api.cesium.com/v1';

/** Well-known Ion asset IDs */
export const ION_ASSETS = {
	/** Cesium World Terrain */
	worldTerrain: 1,
	/** Bing Maps Aerial imagery */
	bingAerial: 2,
	/** Cesium OSM Buildings */
	osmBuildings: 96188,
} as const;

export interface IonAssetEndpoint {
	type: string;
	url: string;
	accessToken: string;
	attributions: Array<{ html: string }>;
}
