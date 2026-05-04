<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { resolveIonAsset } from '$lib/cesium/tileLoader.js';
	import { createTileRenderer, type TileRenderer } from '$lib/cesium/tiles3dRenderer.js';

	interface Props {
		assetId: number;
		visible?: boolean;
		opacity?: number;
	}

	const { assetId, visible = true, opacity = 1.0 }: Props = $props();

	const { camera } = useThrelte();

	let renderer: TileRenderer | null = null;
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Initialize renderer from Ion asset
	async function init(id: number) {
		loading = true;
		error = null;
		try {
			const endpoint = await resolveIonAsset(id);
			const url = endpoint.url.endsWith('/') ? endpoint.url + 'tileset.json' : endpoint.url + '/tileset.json';
			renderer = createTileRenderer(url, endpoint.accessToken);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void init(assetId);
	});

	// Apply opacity to all meshes in the group when it changes
	$effect(() => {
		if (!renderer) return;
		renderer.group.traverse((obj) => {
			if (obj instanceof THREE.Mesh) {
				if (Array.isArray(obj.material)) {
					obj.material.forEach((m) => {
						m.transparent = opacity < 1;
						m.opacity = opacity;
					});
				} else if (obj.material) {
					obj.material.transparent = opacity < 1;
					obj.material.opacity = opacity;
				}
			}
		});
	});

	const cameraPos = new THREE.Vector3();

	useTask(async () => {
		if (!renderer || !visible) return;
		camera.current.getWorldPosition(cameraPos);
		await renderer.update(cameraPos);
	});

	onDestroy(() => {
		renderer?.dispose();
		renderer = null;
	});
</script>

{#if renderer && visible}
	<T is={renderer.group} />
{/if}

{#if loading}
	<!-- Loading state: small pulsing indicator mesh -->
	<T.Mesh>
		<T.SphereGeometry args={[0.15, 8, 8]} />
		<T.MeshBasicMaterial color="#00ffcc" wireframe />
	</T.Mesh>
{/if}
