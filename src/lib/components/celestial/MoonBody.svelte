<script lang="ts">
	import { T } from '@threlte/core';
	import * as THREE from 'three';
	import { BODY_RADIUS, VIS_SCALE } from '$lib/geospatial/constants.js';

	interface Props {
		position?: [number, number, number];
		scale?: number;
	}

	let { position = [0, 0, 0], scale = VIS_SCALE }: Props = $props();

	const radius = BODY_RADIUS.moon * scale;

	const moonGeo = new THREE.SphereGeometry(radius, 24, 16);
	const moonMat = new THREE.MeshStandardMaterial({
		color: new THREE.Color('#888888'),
		emissive: new THREE.Color('#333333'),
		emissiveIntensity: 0.2,
		roughness: 0.9,
	});
	const moonMesh = new THREE.Mesh(moonGeo, moonMat);

	const wireGeo = new THREE.SphereGeometry(radius * 1.01, 12, 8);
	const wireMat = new THREE.MeshBasicMaterial({
		color: '#aaaacc',
		wireframe: true,
		transparent: true,
		opacity: 0.1,
		depthWrite: false,
	});
	const wireMesh = new THREE.Mesh(wireGeo, wireMat);

	const group = new THREE.Group();
	group.add(moonMesh, wireMesh);

	$effect(() => {
		group.position.set(...position);
	});
</script>

<T is={group} />
