<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { resolveIonAsset } from '$lib/cesium/tileLoader.js';
	import { resolveImageryEndpoint, createEarthTexture } from '$lib/cesium/imagery.js';
	import { ION_ASSETS } from '$lib/cesium/config.js';
	import { BODY_RADIUS } from '$lib/geospatial/constants.js';
	import { createAtmosphereShader } from '$lib/shaders/atmosphere.js';

	interface Props {
		radius?: number;
		position?: [number, number, number];
		rotationSpeed?: number;
		showClouds?: boolean;
		showAtmosphere?: boolean;
		quality?: 'low' | 'medium' | 'high';
	}

	let {
		radius = 3,
		position = [0, 0, 0],
		rotationSpeed = 0.02,
		showClouds = true,
		showAtmosphere = true,
		quality = 'medium'
	}: Props = $props();

	let time = $state(0);
	let textureLoaded = $state(false);

	// Earth sphere
	const segments = quality === 'high' ? 128 : quality === 'medium' ? 64 : 32;
	const earthGeo = new THREE.SphereGeometry(radius, segments, segments / 2);

	// Initial material (procedural until imagery loads)
	const earthMat = new THREE.MeshStandardMaterial({
		color: new THREE.Color('#1a4a2a'),
		emissive: new THREE.Color('#0a2a1a'),
		emissiveIntensity: 0.2,
		roughness: 0.8,
		metalness: 0.1,
	});
	const earthMesh = new THREE.Mesh(earthGeo, earthMat);

	// Wireframe overlay (lat/lon grid)
	const wireGeo = new THREE.SphereGeometry(radius * 1.001, 36, 18);
	const wireMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color('#00ffcc'),
		wireframe: true,
		transparent: true,
		opacity: 0.04,
		depthWrite: false,
	});
	const wireMesh = new THREE.Mesh(wireGeo, wireMat);

	// Atmosphere (custom shader)
	const atmosGeo = new THREE.SphereGeometry(radius * 1.12, 48, 32);
	const atmosMat = createAtmosphereShader('#4488ff', 1.2);
	const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);

	// Cloud layer
	const cloudGeo = new THREE.SphereGeometry(radius * 1.02, 48, 32);
	const cloudMat = new THREE.MeshBasicMaterial({
		color: '#ffffff',
		transparent: true,
		opacity: 0.15,
		depthWrite: false,
	});
	// Procedural cloud pattern via canvas
	const cloudCanvas = document.createElement('canvas');
	cloudCanvas.width = 512;
	cloudCanvas.height = 256;
	const cloudCtx = cloudCanvas.getContext('2d')!;
	generateCloudPattern(cloudCtx, 512, 256);
	const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
	cloudTexture.wrapS = THREE.RepeatWrapping;
	cloudTexture.wrapT = THREE.RepeatWrapping;
	cloudMat.alphaMap = cloudTexture;
	const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);

	// Equator ring
	const equatorCurve = new THREE.EllipseCurve(0, 0, radius * 1.005, radius * 1.005, 0, Math.PI * 2, false, 0);
	const equatorPoints = equatorCurve.getPoints(128);
	const equatorGeo = new THREE.BufferGeometry().setFromPoints(
		equatorPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
	);
	const equatorMat = new THREE.LineBasicMaterial({ color: '#00ffcc', transparent: true, opacity: 0.2 });
	const equatorLine = new THREE.Line(equatorGeo, equatorMat);

	// Assemble group
	const group = new THREE.Group();
	group.add(earthMesh);
	group.add(wireMesh);
	group.add(equatorLine);
	if (showClouds) group.add(cloudMesh);
	if (showAtmosphere) group.add(atmosMesh);

	// Animation
	useTask((delta) => {
		time += delta;
		group.rotation.y += rotationSpeed * delta;
		cloudMesh.rotation.y += rotationSpeed * 0.3 * delta;
		atmosMat.uniforms.uTime.value = time;
	});

	// Load Cesium Ion imagery
	onMount(async () => {
		try {
			const endpoint = await resolveImageryEndpoint();
			const level = quality === 'high' ? 3 : quality === 'medium' ? 2 : 1;
			const canvas = await createEarthTexture(endpoint, level);
			const texture = new THREE.CanvasTexture(canvas);
			texture.colorSpace = THREE.SRGBColorSpace;
			texture.wrapS = THREE.RepeatWrapping;

			earthMat.map = texture;
			earthMat.color.set('#ffffff');
			earthMat.emissive.set('#111111');
			earthMat.emissiveIntensity = 0.1;
			earthMat.needsUpdate = true;
			textureLoaded = true;
		} catch (e) {
			console.warn('Cesium imagery load failed, using procedural Earth:', e);
		}
	});

	$effect(() => {
		group.position.set(...position);
	});

	function generateCloudPattern(ctx: CanvasRenderingContext2D, w: number, h: number) {
		ctx.fillStyle = '#000000';
		ctx.fillRect(0, 0, w, h);
		// Simple noise-like pattern
		for (let i = 0; i < 800; i++) {
			const x = Math.random() * w;
			const y = Math.random() * h;
			const r = 5 + Math.random() * 25;
			const alpha = 0.1 + Math.random() * 0.3;
			ctx.beginPath();
			ctx.arc(x, y, r, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
			ctx.fill();
		}
		// Gaussian blur effect via multiple passes
		ctx.filter = 'blur(8px)';
		ctx.drawImage(ctx.canvas, 0, 0);
		ctx.filter = 'none';
	}
</script>

<T is={group} />

{#if !textureLoaded}
	<T.PointLight position={position} intensity={0.5} color="#00ffcc" distance={radius * 4} decay={2} />
{/if}
