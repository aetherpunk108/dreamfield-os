<script lang="ts">
	import { useThrelte } from '@threlte/core';
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import {
		getHdriPath, getHdriIntensity, getHdriRotation, getHdriBlur,
		getBackgroundEnabled, getNearClip, getFarClip, getToneMapping, getExposure
	} from '$lib/stores/environment.svelte.js';

	const { scene, renderer, camera } = useThrelte();

	let texture: THREE.DataTexture | null = null;
	let pmremGenerator: THREE.PMREMGenerator | null = null;
	let envMap: THREE.Texture | null = null;

	// Galactic coordinate alignment:
	// The starmap_2020_4k.exr is in equatorial coordinates.
	// Rotate ~62.87° around X to align galactic plane with scene XZ plane.
	const GALACTIC_TILT = 62.87 * (Math.PI / 180);

	async function loadEXR(path: string) {
		// Dynamic import to avoid bundling when not needed
		const { EXRLoader } = await import('three/examples/jsm/loaders/EXRLoader.js');
		const loader = new EXRLoader();

		return new Promise<THREE.DataTexture>((resolve, reject) => {
			loader.load(
				path,
				(tex) => {
					tex.mapping = THREE.EquirectangularReflectionMapping;
					resolve(tex);
				},
				undefined,
				reject
			);
		});
	}

	function applyEnvironment() {
		const path = getHdriPath();
		const intensity = getHdriIntensity();
		const rotation = getHdriRotation();
		const blur = getHdriBlur();
		const bgEnabled = getBackgroundEnabled();
		const tone = getToneMapping();
		const exp = getExposure();
		const near = getNearClip();
		const far = getFarClip();

		// Tone mapping
		switch (tone) {
			case 'linear': renderer.toneMapping = THREE.LinearToneMapping; break;
			case 'aces': renderer.toneMapping = THREE.ACESFilmicToneMapping; break;
			case 'reinhard': renderer.toneMapping = THREE.ReinhardToneMapping; break;
			case 'cineon': renderer.toneMapping = THREE.CineonToneMapping; break;
		}
		renderer.toneMappingExposure = exp;

		// Camera clipping
		if (camera.current) {
			const cam = camera.current as THREE.PerspectiveCamera;
			cam.near = near;
			cam.far = far;
			cam.updateProjectionMatrix();
		}

		// Environment map
		if (envMap && bgEnabled) {
			scene.background = envMap;
			scene.backgroundIntensity = intensity;
			scene.backgroundBlurriness = blur;
			// Rotation: user rotation + galactic alignment
			scene.backgroundRotation = new THREE.Euler(GALACTIC_TILT, rotation, 0);
			scene.environment = envMap;
			scene.environmentIntensity = intensity * 0.3;
			scene.environmentRotation = new THREE.Euler(GALACTIC_TILT, rotation, 0);
		} else if (!bgEnabled || !envMap) {
			scene.background = new THREE.Color('#030308');
			scene.environment = null;
		}
	}

	onMount(async () => {
		pmremGenerator = new THREE.PMREMGenerator(renderer);
		pmremGenerator.compileEquirectangularShader();

		const path = getHdriPath();
		if (path) {
			try {
				texture = await loadEXR(path);
				envMap = pmremGenerator.fromEquirectangular(texture).texture;
				applyEnvironment();
			} catch (e) {
				console.warn('Failed to load HDRI:', e);
			}
		}
	});

	onDestroy(() => {
		texture?.dispose();
		envMap?.dispose();
		pmremGenerator?.dispose();
		scene.background = null;
		scene.environment = null;
	});

	// React to settings changes
	$effect(() => {
		// Touch all reactive getters to track them
		getHdriPath();
		getHdriIntensity();
		getHdriRotation();
		getHdriBlur();
		getBackgroundEnabled();
		getNearClip();
		getFarClip();
		getToneMapping();
		getExposure();

		applyEnvironment();
	});

	// React to HDRI path changes (reload texture)
	$effect(() => {
		const path = getHdriPath();
		if (path && pmremGenerator) {
			loadEXR(path).then((tex) => {
				texture?.dispose();
				envMap?.dispose();
				texture = tex;
				envMap = pmremGenerator!.fromEquirectangular(tex).texture;
				applyEnvironment();
			}).catch(e => console.warn('HDRI load failed:', e));
		} else {
			scene.background = new THREE.Color('#030308');
			scene.environment = null;
		}
	});
</script>
