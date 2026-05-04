<script lang="ts">
	import { T, useTask, extend } from '@threlte/core';
	import * as THREE from 'three';

	extend({ Points: THREE.Points, PointsMaterial: THREE.PointsMaterial, BufferGeometry: THREE.BufferGeometry });

	const PARTICLE_COUNT = 200;
	const SPREAD = 12;

	const positions = new Float32Array(PARTICLE_COUNT * 3);
	const colors = new Float32Array(PARTICLE_COUNT * 3);

	for (let i = 0; i < PARTICLE_COUNT; i++) {
		positions[i * 3] = (Math.random() - 0.5) * SPREAD;
		positions[i * 3 + 1] = Math.random() * SPREAD * 0.6;
		positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;

		const color = new THREE.Color().setHSL(0.45 + Math.random() * 0.2, 0.8, 0.6);
		colors[i * 3] = color.r;
		colors[i * 3 + 1] = color.g;
		colors[i * 3 + 2] = color.b;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

	const material = new THREE.PointsMaterial({
		vertexColors: true,
		transparent: true,
		opacity: 0.6,
		size: 0.05,
		sizeAttenuation: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});

	const points = new THREE.Points(geometry, material);

	let time = $state(0);

	useTask((delta) => {
		time += delta;
		const pos = geometry.attributes.position as THREE.BufferAttribute;
		for (let i = 0; i < PARTICLE_COUNT; i++) {
			pos.array[i * 3 + 1] += Math.sin(time + i * 0.1) * 0.001;
		}
		pos.needsUpdate = true;
		points.rotation.y = time * 0.02;
	});
</script>

<T is={points} />
