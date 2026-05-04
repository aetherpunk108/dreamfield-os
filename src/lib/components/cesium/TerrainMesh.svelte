<script lang="ts">
	import { T } from '@threlte/core';
	import { onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { getTerrainEndpoint, geodeticToTileCoords, fetchTerrainTile } from '$lib/cesium/terrainSampler.js';
	import { degToRad } from '$lib/geospatial/coords.js';

	interface Props {
		lat: number;
		lon: number;
		level?: number;
		size?: number;
		wireframe?: boolean;
	}

	const { lat, lon, level = 8, size = 10, wireframe = false }: Props = $props();

	// Terrain mesh resolution
	const SEGMENTS = 32;

	const geometry = new THREE.PlaneGeometry(size, size, SEGMENTS, SEGMENTS);
	// Rotate flat so Y is up
	geometry.rotateX(-Math.PI / 2);

	const solidMaterial = new THREE.MeshStandardMaterial({
		color: 0x1a4a2a,
		roughness: 0.9,
		metalness: 0.1,
		side: THREE.DoubleSide,
	});

	const wireMaterial = new THREE.MeshBasicMaterial({
		color: 0x00ffcc,
		wireframe: true,
		transparent: true,
		opacity: 0.25,
	});

	const solidMesh = new THREE.Mesh(geometry, solidMaterial);
	const wireMesh = new THREE.Mesh(geometry, wireMaterial);

	const group = new THREE.Group();
	group.add(solidMesh);

	let loaded = $state(false);
	let loadError = $state<string | null>(null);

	async function loadTerrain(latDeg: number, lonDeg: number, detailLevel: number) {
		loaded = false;
		loadError = null;
		try {
			const coord = { lat: degToRad(latDeg), lon: degToRad(lonDeg), height: 0 };
			const endpoint = await getTerrainEndpoint();
			const { x, y } = geodeticToTileCoords(coord, detailLevel);
			const buffer = await fetchTerrainTile(endpoint, detailLevel, x, y);
			displaceVertices(buffer);
			loaded = true;
		} catch (e) {
			loadError = e instanceof Error ? e.message : String(e);
			loaded = true; // Show flat mesh on error
		}
	}

	/**
	 * Displace PlaneGeometry vertices using quantized-mesh heightmap data.
	 * Reads vertex heights from the quantized-mesh body (u/v/height arrays).
	 */
	function displaceVertices(buffer: ArrayBuffer) {
		const view = new DataView(buffer);
		if (buffer.byteLength < 88) return; // header too small

		// Quantized-mesh header (88 bytes):
		//   centerX(8d), centerY(8d), centerZ(8d)  = 24 bytes
		//   minHeight(4f), maxHeight(4f)             = 8 bytes  (offset 24)
		//   boundingSphere: center(24d)+radius(8d)   = 32 bytes (offset 32)
		//   horizonOcclusionPoint: x(8d),y(8d),z(8d) = 24 bytes (offset 64)
		//                                            = 88 bytes total header

		const minHeight = view.getFloat32(24, true);
		const maxHeight = view.getFloat32(28, true);
		const heightRange = maxHeight - minHeight || 1;

		// After header: vertexCount(uint32), then u[], v[], height[] arrays (uint16 each)
		if (buffer.byteLength < 92) return;
		const vertexCount = view.getUint32(88, true);
		const uOffset = 92;
		const vOffset = uOffset + vertexCount * 2;
		const hOffset = vOffset + vertexCount * 2;

		if (buffer.byteLength < hOffset + vertexCount * 2) return;

		// Build height lookup: decode zig-zag encoded u/v/height
		const heights: number[] = new Array(vertexCount);
		let h = 0;
		for (let i = 0; i < vertexCount; i++) {
			const encoded = view.getUint16(hOffset + i * 2, true);
			// Zig-zag decode
			const delta = (encoded >> 1) ^ -(encoded & 1);
			h += delta;
			heights[i] = minHeight + (h / 32767) * heightRange;
		}

		// Map grid vertices to quantized-mesh heights via nearest-neighbor lookup
		const pos = geometry.attributes.position as THREE.BufferAttribute;
		const gridSize = SEGMENTS + 1;

		for (let row = 0; row <= SEGMENTS; row++) {
			for (let col = 0; col <= SEGMENTS; col++) {
				const idx = row * gridSize + col;

				// Normalized grid position [0..1]
				const nx = col / SEGMENTS;
				const ny = row / SEGMENTS;

				// Find nearest vertex in quantized-mesh
				let bestIdx = 0;
				let bestDist = Infinity;
				for (let vi = 0; vi < vertexCount; vi++) {
					const vu = view.getUint16(uOffset + vi * 2, true) / 32767;
					const vv = view.getUint16(vOffset + vi * 2, true) / 32767;
					const dist = (vu - nx) ** 2 + (vv - ny) ** 2;
					if (dist < bestDist) {
						bestDist = dist;
						bestIdx = vi;
					}
				}

				// Y is up after the rotateX(-PI/2) applied to geometry
				pos.setY(idx, heights[bestIdx] * 0.001); // scale meters to world units
			}
		}

		pos.needsUpdate = true;
		geometry.computeVertexNormals();
	}

	$effect(() => {
		void loadTerrain(lat, lon, level);
	});

	$effect(() => {
		if (wireframe) {
			if (!group.children.includes(wireMesh)) group.add(wireMesh);
		} else {
			group.remove(wireMesh);
		}
	});

	onDestroy(() => {
		geometry.dispose();
		solidMaterial.dispose();
		wireMaterial.dispose();
	});
</script>

<T is={group} />
