<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';

	interface Props {
		count?: number;
		radius?: number;
		twinkleSpeed?: number;
	}

	const { count = 3000, radius = 500, twinkleSpeed = 1.0 }: Props = $props();

	// Build star positions on a sphere surface using spherical coordinates
	const positions = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);
	const sizes = new Float32Array(count);

	// Track which stars twinkle (~10%) and their twinkle phase
	const TWINKLE_COUNT = Math.floor(count * 0.1);
	const twinkleIndices = new Int32Array(TWINKLE_COUNT);
	const twinklePhase = new Float32Array(TWINKLE_COUNT);
	const twinkleBaseSize = new Float32Array(TWINKLE_COUNT);

	// Constellation stars: 3-5 brighter, slightly larger stars
	const CONSTELLATION_COUNT = 4;
	const constellationIndices = new Int32Array(CONSTELLATION_COUNT);
	const constellationPhase = new Float32Array(CONSTELLATION_COUNT);

	for (let i = 0; i < count; i++) {
		// Fibonacci sphere distribution for even coverage
		const phi = Math.acos(1 - 2 * (i + 0.5) / count);
		const theta = Math.PI * (1 + Math.sqrt(5)) * i;

		const x = radius * Math.sin(phi) * Math.cos(theta);
		const y = radius * Math.sin(phi) * Math.sin(theta);
		const z = radius * Math.cos(phi);

		positions[i * 3] = x;
		positions[i * 3 + 1] = y;
		positions[i * 3 + 2] = z;

		// Color variation: mostly white, some blue-white, some warm yellow
		const colorRoll = Math.random();
		let r: number, g: number, b: number;
		if (colorRoll < 0.6) {
			// White
			r = 1.0; g = 1.0; b = 1.0;
		} else if (colorRoll < 0.82) {
			// Blue-white
			r = 0.8 + Math.random() * 0.15;
			g = 0.88 + Math.random() * 0.1;
			b = 1.0;
		} else {
			// Warm yellow
			r = 1.0;
			g = 0.88 + Math.random() * 0.1;
			b = 0.6 + Math.random() * 0.2;
		}
		colors[i * 3] = r;
		colors[i * 3 + 1] = g;
		colors[i * 3 + 2] = b;

		// Size: 0.05–0.3, skewed small
		sizes[i] = 0.05 + Math.pow(Math.random(), 2.5) * 0.25;
	}

	// Assign twinkle indices evenly spread across stars
	for (let t = 0; t < TWINKLE_COUNT; t++) {
		const idx = Math.floor((t / TWINKLE_COUNT) * count);
		twinkleIndices[t] = idx;
		twinklePhase[t] = Math.random() * Math.PI * 2;
		twinkleBaseSize[t] = sizes[idx];
	}

	// Assign constellation stars: pick from brighter regions of the sphere
	for (let c = 0; c < CONSTELLATION_COUNT; c++) {
		const idx = Math.floor(Math.random() * count);
		constellationIndices[c] = idx;
		constellationPhase[c] = Math.random() * Math.PI * 2;
		// Make constellation stars noticeably larger and brighter
		sizes[idx] = 0.4 + Math.random() * 0.2;
		colors[idx * 3] = 1.0;
		colors[idx * 3 + 1] = 0.95;
		colors[idx * 3 + 2] = 0.85;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
	geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

	const material = new THREE.PointsMaterial({
		vertexColors: true,
		sizeAttenuation: true,
		transparent: true,
		opacity: 0.9,
		size: 0.15,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});

	const points = new THREE.Points(geometry, material);

	// Cycle index for partial updates per frame
	let twinkleCursor = 0;
	const UPDATES_PER_FRAME = 50;
	let elapsed = 0;

	useTask((delta) => {
		elapsed += delta;

		// Slow rotation for parallax
		points.rotation.y += 0.001 * delta;

		const sizeAttr = geometry.attributes.size as THREE.BufferAttribute;

		// Update a rolling window of twinkle stars
		for (let u = 0; u < UPDATES_PER_FRAME; u++) {
			const t = (twinkleCursor + u) % TWINKLE_COUNT;
			const idx = twinkleIndices[t];
			const phase = twinklePhase[t] + elapsed * twinkleSpeed;
			// Oscillate size between 50% and 100% of base size
			const scale = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(phase * 2.5));
			sizeAttr.array[idx] = twinkleBaseSize[t] * scale;
		}
		twinkleCursor = (twinkleCursor + UPDATES_PER_FRAME) % TWINKLE_COUNT;

		// Pulse constellation stars gently
		for (let c = 0; c < CONSTELLATION_COUNT; c++) {
			const idx = constellationIndices[c];
			const phase = constellationPhase[c] + elapsed * 0.4;
			const base = sizes[idx];
			sizeAttr.array[idx] = base * (0.85 + 0.15 * Math.sin(phase));
		}

		sizeAttr.needsUpdate = true;
	});
</script>

<T is={points} />
