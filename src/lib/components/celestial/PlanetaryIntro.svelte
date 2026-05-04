<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import { onMount } from 'svelte';
	import { BODY_RADIUS, VIS_SCALE } from '$lib/geospatial/constants.js';
	import EarthGlobe from './EarthGlobe.svelte';
	import MoonBody from './MoonBody.svelte';

	interface Props {
		oncomplete?: () => void;
		skip?: boolean;
	}

	let { oncomplete, skip = false }: Props = $props();

	// --- Camera approach animation ---
	// Start far from Earth, lerp to orbital position over 8 seconds
	const CAM_START_DIST = 30;
	const CAM_END_DIST = 5;
	const INTRO_DURATION = 8; // seconds

	const camPos = new THREE.Vector3(0, 4, CAM_START_DIST);
	const camTarget = new THREE.Vector3(0, 0, 0);
	const desiredPos = new THREE.Vector3(0, 1.5, CAM_START_DIST);

	let cameraRef = $state<THREE.PerspectiveCamera | undefined>(undefined);
	let introTime = $state(0);
	let introDone = $state(false);

	// HUD text phases
	let showTitle = $state(false);
	let showObserving = $state(false);
	let showHints = $state(false);
	let overlayVisible = $state(true);

	// --- Stars: 2000 point particles in a large sphere ---
	const STAR_COUNT = 2000;
	const STAR_SPHERE_RADIUS = 200;

	const starPositions = new Float32Array(STAR_COUNT * 3);
	const starColors = new Float32Array(STAR_COUNT * 3);

	for (let i = 0; i < STAR_COUNT; i++) {
		// Uniform distribution on sphere surface
		const theta = Math.acos(2 * Math.random() - 1);
		const phi = 2 * Math.PI * Math.random();
		const r = STAR_SPHERE_RADIUS * (0.8 + Math.random() * 0.2);
		starPositions[i * 3]     = r * Math.sin(theta) * Math.cos(phi);
		starPositions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
		starPositions[i * 3 + 2] = r * Math.cos(theta);

		// Slight warm/cool variation
		const t = Math.random();
		const col = new THREE.Color();
		if (t < 0.15) {
			col.setRGB(1.0, 0.85, 0.7);  // warm
		} else if (t < 0.3) {
			col.setRGB(0.7, 0.85, 1.0);  // cool blue
		} else {
			col.setRGB(1.0, 1.0, 1.0);   // white
		}
		starColors[i * 3]     = col.r;
		starColors[i * 3 + 1] = col.g;
		starColors[i * 3 + 2] = col.b;
	}

	const starGeo = new THREE.BufferGeometry();
	starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
	starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

	const starMat = new THREE.PointsMaterial({
		vertexColors: true,
		size: 0.35,
		sizeAttenuation: true,
		transparent: true,
		opacity: 0.9,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});

	const starField = new THREE.Points(starGeo, starMat);

	// Twinkle: per-star opacity modulation via a size buffer
	const starSizes = new Float32Array(STAR_COUNT);
	const starPhases = new Float32Array(STAR_COUNT);
	for (let i = 0; i < STAR_COUNT; i++) {
		starSizes[i] = 0.15 + Math.random() * 0.4;
		starPhases[i] = Math.random() * Math.PI * 2;
	}
	starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes.slice(), 1));

	// Moon orbital position (simple offset)
	const moonOrbitRadius = BODY_RADIUS.moon * VIS_SCALE * 60;
	let moonAngle = $state(0);
	let moonPos = $derived<[number, number, number]>([
		Math.cos(moonAngle) * moonOrbitRadius,
		0.3,
		Math.sin(moonAngle) * moonOrbitRadius,
	]);

	// Earth rotation angle
	let earthAngle = $state(0);

	// --- Ambient + directional lighting ---
	const ambientLight = new THREE.AmbientLight(0x111133, 0.4);
	const sunLight = new THREE.DirectionalLight(0xffeedd, 1.8);
	sunLight.position.set(50, 20, 30);

	// --- Animation loop ---
	useTask((delta) => {
		if (introDone) return;

		const dt = Math.min(delta, 0.05);
		introTime += dt;

		// Clamp progress 0..1
		const progress = Math.min(introTime / INTRO_DURATION, 1);

		// Ease-in-out cubic
		const eased = progress < 0.5
			? 4 * progress * progress * progress
			: 1 - Math.pow(-2 * progress + 2, 3) / 2;

		// Camera approach: lerp Z distance from start to end
		const dist = CAM_START_DIST + (CAM_END_DIST - CAM_START_DIST) * eased;
		// Gentle drift: small lateral oscillation during approach
		const driftX = Math.sin(introTime * 0.18) * 0.6 * (1 - eased);
		const driftY = 1.5 + Math.cos(introTime * 0.12) * 0.3 * (1 - eased);
		desiredPos.set(driftX, driftY, dist);

		camPos.lerp(desiredPos, 0.04);
		camTarget.lerp(new THREE.Vector3(0, 0, 0), 0.06);

		if (cameraRef) {
			cameraRef.position.copy(camPos);
			cameraRef.lookAt(camTarget);
		}

		// Twinkle stars by modulating sizes
		const sizeAttr = starGeo.attributes.size as THREE.BufferAttribute;
		for (let i = 0; i < STAR_COUNT; i++) {
			sizeAttr.array[i] = starSizes[i] * (0.7 + 0.3 * Math.sin(introTime * 1.8 + starPhases[i]));
		}
		sizeAttr.needsUpdate = true;

		// Slowly rotate Earth
		earthAngle += dt * 0.08;

		// Moon orbits slowly
		moonAngle += dt * 0.05;

		// Mark done when approach completes
		if (progress >= 1 && !introDone) {
			introDone = true;
			setTimeout(() => oncomplete?.(), 400);
		}
	});

	// HUD text timing
	onMount(() => {
		if (skip) {
			introDone = true;
			overlayVisible = false;
			oncomplete?.();
			return;
		}

		const timers: ReturnType<typeof setTimeout>[] = [];
		timers.push(setTimeout(() => { showTitle = true; }, 800));
		timers.push(setTimeout(() => { showObserving = true; }, 2200));
		timers.push(setTimeout(() => { showHints = true; }, 5500));
		// Fade overlay out just before completion
		timers.push(setTimeout(() => { overlayVisible = false; }, 7800));

		return () => timers.forEach(clearTimeout);
	});
</script>

<!-- Three.js scene elements -->
<T is={ambientLight} />
<T is={sunLight} />
<T is={starField} />

<EarthGlobe position={[0, 0, 0]} rotationAngle={earthAngle} />
<MoonBody position={moonPos} />

<T.PerspectiveCamera
	makeDefault
	bind:ref={cameraRef}
	fov={52}
	near={0.1}
	far={800}
	position={[0, 4, CAM_START_DIST]}
/>

<!-- HTML overlay -->
{#if overlayVisible}
<div class="intro-overlay">
	<div class="hud-center">
		<div class="title-block" class:visible={showTitle}>
			<div class="title-line">DREAMFIELD OS</div>
			<div class="title-sub">GEOSPATIAL AWARENESS SYSTEM</div>
		</div>

		<div class="observing" class:visible={showObserving}>
			<span class="obs-dot"></span>
			OBSERVING...
		</div>
	</div>

	<div class="hints-bar" class:visible={showHints}>
		<span class="hint-item"><kbd>1</kbd> Spatial</span>
		<span class="hint-sep">|</span>
		<span class="hint-item"><kbd>2</kbd> Orrery</span>
		<span class="hint-sep">|</span>
		<span class="hint-item"><kbd>3</kbd> Flight</span>
		<span class="hint-sep">|</span>
		<span class="hint-item"><kbd>D</kbd> Dashboard</span>
	</div>

	<div class="corner-tl">
		<div class="corner-label">SYS</div>
		<div class="corner-val">INIT</div>
	</div>
	<div class="corner-tr">
		<div class="corner-label">LAT</div>
		<div class="corner-val">51.5074° N</div>
	</div>
	<div class="corner-br">
		<div class="corner-label">ALT</div>
		<div class="corner-val">35,786 km</div>
	</div>

	<div class="scan-line"></div>
</div>
{/if}

<style>
	.intro-overlay {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 100;
		overflow: hidden;
	}

	/* Center HUD block */
	.hud-center {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.4rem;
	}

	.title-block {
		opacity: 0;
		transform: translateY(12px);
		transition: opacity 1.2s ease, transform 1.2s ease;
	}
	.title-block.visible {
		opacity: 1;
		transform: translateY(0);
	}

	.title-line {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 2.2rem;
		font-weight: 300;
		letter-spacing: 0.35em;
		color: #00ffcc;
		text-shadow: 0 0 28px #00ffcc88, 0 0 60px #00ffcc33;
		white-space: nowrap;
	}

	.title-sub {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.5rem;
		letter-spacing: 0.5em;
		color: #00ffcc55;
		margin-top: 0.4rem;
		text-transform: uppercase;
	}

	.observing {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		letter-spacing: 0.25em;
		color: #ff44aa;
		text-shadow: 0 0 12px #ff44aa66;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		opacity: 0;
		transition: opacity 1s ease;
	}
	.observing.visible {
		opacity: 1;
	}

	.obs-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #ff44aa;
		box-shadow: 0 0 8px #ff44aa;
		animation: pulse 1.4s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.4; transform: scale(0.6); }
	}

	/* Bottom hints bar */
	.hints-bar {
		position: absolute;
		bottom: 2.5rem;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 1rem;
		opacity: 0;
		transition: opacity 1.2s ease;
		white-space: nowrap;
	}
	.hints-bar.visible {
		opacity: 1;
	}

	.hint-item {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: #00ffcc99;
	}

	.hint-sep {
		color: #00ffcc22;
		font-size: 0.5rem;
	}

	kbd {
		display: inline-block;
		background: #00ffcc18;
		border: 1px solid #00ffcc44;
		border-radius: 2px;
		padding: 0.05rem 0.3rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		color: #00ffcc;
		margin-right: 0.2rem;
	}

	/* Corner readouts */
	.corner-tl,
	.corner-tr,
	.corner-br {
		position: absolute;
		font-family: 'JetBrains Mono', monospace;
		opacity: 0.5;
	}

	.corner-tl { top: 1.5rem; left: 1.5rem; }
	.corner-tr { top: 1.5rem; right: 1.5rem; text-align: right; }
	.corner-br { bottom: 1.5rem; right: 1.5rem; text-align: right; }

	.corner-label {
		font-size: 0.4rem;
		letter-spacing: 0.3em;
		color: #00ffcc55;
		text-transform: uppercase;
	}

	.corner-val {
		font-size: 0.6rem;
		letter-spacing: 0.1em;
		color: #00ffcc;
	}

	/* Animated scan line */
	.scan-line {
		position: absolute;
		left: 0;
		right: 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, #00ffcc22, transparent);
		animation: scanDown 4s linear infinite;
		pointer-events: none;
	}

	@keyframes scanDown {
		from { top: -1px; }
		to { top: 100%; }
	}
</style>
