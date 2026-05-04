<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';

	interface Props {
		position?: [number, number, number];
		radius?: number;
	}

	let { position = [0, 0, 0], radius = 2 }: Props = $props();

	let time = $state(0);
	useTask((delta) => { time += delta; });

	// Core sphere
	const sunGeo = new THREE.SphereGeometry(radius, 32, 24);
	const sunMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color('#ffcc44'),
	});
	const sunMesh = new THREE.Mesh(sunGeo, sunMat);

	// Corona glow
	const coronaGeo = new THREE.SphereGeometry(radius * 1.8, 24, 16);
	const coronaMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color('#ffaa22'),
		transparent: true,
		opacity: 0.08,
		side: THREE.BackSide,
		depthWrite: false,
	});
	const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);

	const group = new THREE.Group();
	group.add(sunMesh, coronaMesh);

	$effect(() => {
		group.position.set(...position);
		// Pulse the corona
		coronaMat.opacity = 0.06 + Math.sin(time * 1.5) * 0.03;
	});
</script>

<T is={group} />
<T.PointLight position={position} intensity={3} color="#ffcc44" distance={200} decay={1.5} />
