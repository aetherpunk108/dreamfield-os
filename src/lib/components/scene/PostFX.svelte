<script lang="ts">
	import { useThrelte } from '@threlte/core';
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';
	import { EffectComposer, RenderPass, EffectPass, BloomEffect, VignetteEffect, ChromaticAberrationEffect } from 'postprocessing';

	interface Props {
		bloomIntensity?: number;
		bloomThreshold?: number;
		bloomRadius?: number;
		vignetteOffset?: number;
		vignetteDarkness?: number;
		chromaticOffset?: number;
	}

	let {
		bloomIntensity = 1.2,
		bloomThreshold = 0.2,
		bloomRadius = 0.6,
		vignetteOffset = 0.3,
		vignetteDarkness = 0.7,
		chromaticOffset = 0.0008,
	}: Props = $props();

	const { renderer, scene, camera, size, autoRender } = useThrelte();

	let composer: EffectComposer;
	let bloom: BloomEffect;
	let frameId: number;

	onMount(() => {
		autoRender.set(false);

		composer = new EffectComposer(renderer);
		composer.addPass(new RenderPass(scene, camera.current));

		bloom = new BloomEffect({
			intensity: bloomIntensity,
			luminanceThreshold: bloomThreshold,
			luminanceSmoothing: 0.08,
			mipmapBlur: true,
		});

		const vignette = new VignetteEffect({
			offset: vignetteOffset,
			darkness: vignetteDarkness,
		});

		const chromatic = new ChromaticAberrationEffect({
			offset: new THREE.Vector2(chromaticOffset, chromaticOffset),
		});

		composer.addPass(new EffectPass(camera.current, bloom, vignette, chromatic));

		const animate = () => {
			frameId = requestAnimationFrame(animate);
			composer.render();
		};
		animate();
	});

	$effect(() => {
		if (composer) {
			composer.setSize(size.current.width, size.current.height);
		}
	});

	$effect(() => {
		if (bloom) {
			bloom.intensity = bloomIntensity;
		}
	});

	onDestroy(() => {
		cancelAnimationFrame(frameId);
		autoRender.set(true);
		composer?.dispose();
	});
</script>
