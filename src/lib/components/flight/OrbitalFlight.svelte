<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import * as THREE from 'three';
	import CesiumEarth from '$lib/components/celestial/CesiumEarth.svelte';
	import Starfield from '$lib/components/scene/Starfield.svelte';
	import { createShipState, updateShip, DEFAULT_SHIP_CONFIG, type ShipState } from '$lib/flight/ship.js';
	import { processInput, createInputState, getDefaultConfig, type InputState, type FlightConfig } from '$lib/flight/input.js';
	import { createCurve, type CurveType } from '$lib/flight/curves.js';
	import FlightHud from './FlightHud.svelte';
	import { createAtmosphereShader } from '$lib/shaders/atmosphere.js';
	import { sceneToGps, DEFAULT_GPS_CONFIG, type GPSConfig } from '$lib/geospatial/gps.js';
	import { getPins } from '$lib/navigation/pins.js';

	interface Props {
		active?: boolean;
		scale?: 'orbital' | 'planetary' | 'surface';
	}

	let { active = true, scale = 'orbital' }: Props = $props();

	// Scale settings — how big is Earth relative to ship
	const SCALE_CONFIG = {
		orbital: { earthRadius: 20, shipDist: 25, shipSpeed: 8, farClip: 50000 },
		planetary: { earthRadius: 50, shipDist: 55, shipSpeed: 15, farClip: 100000 },
		surface: { earthRadius: 200, shipDist: 201, shipSpeed: 3, farClip: 200000 },
	};

	const cfg = $derived(SCALE_CONFIG[scale]);

	let ship = $state(createShipState());
	let flightConfig = $state<FlightConfig>(getDefaultConfig('desktop'));
	let inputState = $state<InputState>(createInputState());
	let rawInput = $state({ pitch: 0, yaw: 0, roll: 0, throttle: 0 });
	let cameraRef: THREE.PerspectiveCamera;
	let locked = $state(false);

	// Override ship config for space flight
	const spaceShipConfig = {
		...DEFAULT_SHIP_CONFIG,
		maxSpeed: 80,
		boostMultiplier: 3.0,
		acceleration: 15,
		deceleration: 2, // less deceleration in space
		drag: 0.995, // less drag in space
		pitchRate: 1.8,
		yawRate: 2.0,
		rollRate: 2.5,
	};

	// Initialize ship position above Earth
	$effect(() => {
		if (active) {
			ship.position = [0, cfg.shipDist, cfg.shipDist * 0.3];
			ship.rotation = { pitch: -0.3, yaw: 0, roll: 0 };
		}
	});

	// Ship mesh
	const shipGroup = new THREE.Group();
	const shipGeo = new THREE.ConeGeometry(0.2, 0.7, 6);
	shipGeo.rotateX(Math.PI / 2);
	const shipMat = new THREE.MeshBasicMaterial({ color: '#00ffcc', wireframe: true, transparent: true, opacity: 0.7 });
	const shipMesh = new THREE.Mesh(shipGeo, shipMat);
	shipGroup.add(shipMesh);

	// Engine trails
	const trailGeo = new THREE.BufferGeometry();
	const trailPositions = new Float32Array(450); // 150 points
	trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
	const trailMat = new THREE.PointsMaterial({ color: '#00ffcc', size: 0.06, transparent: true, opacity: 0.4 });
	const trail = new THREE.Points(trailGeo, trailMat);
	let trailIdx = 0;

	// GPS config for position readout (centered on Earth origin)
	const gpsConfig: GPSConfig = { ...DEFAULT_GPS_CONFIG, refLat: 0, refLon: 0, refAlt: 0, scaleMetersToScene: 1 / (cfg.earthRadius * 1000) };

	function handleKeyDown(e: KeyboardEvent) {
		if (!active || !locked) return;
		inputState.keys.add(e.key.toLowerCase());
	}

	function handleKeyUp(e: KeyboardEvent) {
		if (!active) return;
		const k = e.key.toLowerCase();
		inputState.keys.delete(k);
		inputState.keyHoldTime.delete(k);
	}

	function handleMouseMove(e: MouseEvent) {
		if (!active || !locked) return;
		inputState.mouseDeltaX = e.movementX;
		inputState.mouseDeltaY = e.movementY;
	}

	function handlePointerLock() {
		if (!active) return;
		locked = document.pointerLockElement !== null;
	}

	function requestLock(e: MouseEvent) {
		if (!active || locked) return;
		(e.target as HTMLElement)?.requestPointerLock?.();
	}

	function handleCurveChange(axis: string, type: CurveType) {
		const newCurve = createCurve(type);
		switch (axis) {
			case 'yaw': flightConfig.yawCurve = newCurve; break;
			case 'pitch': flightConfig.pitchCurve = newCurve; break;
			case 'throttle': flightConfig.throttleCurve = newCurve; break;
		}
	}

	// Compute altitude above Earth surface
	const altitude = $derived(() => {
		const dist = Math.sqrt(ship.position[0] ** 2 + ship.position[1] ** 2 + ship.position[2] ** 2);
		return Math.max(0, dist - cfg.earthRadius);
	});

	useTask((delta) => {
		if (!active) return;

		// Update key hold times
		for (const key of inputState.keys) {
			const prev = inputState.keyHoldTime.get(key) ?? 0;
			inputState.keyHoldTime.set(key, prev + delta);
		}

		// Process input
		const processed = processInput(inputState, flightConfig, delta);
		rawInput = { pitch: processed.pitch, yaw: processed.yaw, roll: processed.roll, throttle: processed.throttle };

		// Update ship
		ship = updateShip(ship, processed, spaceShipConfig, delta);

		// Gravity pull toward Earth center (subtle)
		const dist = Math.sqrt(ship.position[0] ** 2 + ship.position[1] ** 2 + ship.position[2] ** 2);
		if (dist > 0 && ship.throttleLevel < 0.1) {
			const gravity = 0.5 / (dist * dist) * delta;
			ship.position = [
				ship.position[0] - (ship.position[0] / dist) * gravity,
				ship.position[1] - (ship.position[1] / dist) * gravity,
				ship.position[2] - (ship.position[2] / dist) * gravity,
			];
		}

		// Prevent going inside Earth
		if (dist < cfg.earthRadius + 0.5) {
			const norm = cfg.earthRadius + 0.5;
			ship.position = [
				ship.position[0] * norm / dist,
				ship.position[1] * norm / dist,
				ship.position[2] * norm / dist,
			];
			ship.speed *= 0.5; // bounce damping
		}

		// Update visuals
		shipGroup.position.set(...ship.position);
		shipGroup.rotation.set(ship.rotation.pitch, ship.rotation.yaw, ship.rotation.roll, 'YXZ');

		// Engine color
		if (ship.boostActive) {
			shipMat.color.set('#ff44aa');
			trailMat.color.set('#ff44aa');
		} else {
			shipMat.color.set('#00ffcc');
			trailMat.color.set('#00ffcc');
		}

		// Trail
		trailPositions[trailIdx * 3] = ship.position[0];
		trailPositions[trailIdx * 3 + 1] = ship.position[1];
		trailPositions[trailIdx * 3 + 2] = ship.position[2];
		trailIdx = (trailIdx + 1) % 150;
		trailGeo.attributes.position.needsUpdate = true;

		// Camera follow (third-person, offset behind ship)
		if (cameraRef) {
			const camOffset = new THREE.Vector3(0, 1.2, -3.5);
			camOffset.applyEuler(new THREE.Euler(ship.rotation.pitch * 0.4, ship.rotation.yaw, 0, 'YXZ'));
			const targetPos = new THREE.Vector3(...ship.position).add(camOffset);
			cameraRef.position.lerp(targetPos, 0.06);
			const lookAt = new THREE.Vector3(...ship.position);
			cameraRef.lookAt(lookAt);
		}

		// Reset mouse delta
		inputState.mouseDeltaX = 0;
		inputState.mouseDeltaY = 0;
	});
</script>

<svelte:window
	onkeydown={handleKeyDown}
	onkeyup={handleKeyUp}
	onmousemove={handleMouseMove}
	onpointerlockchange={handlePointerLock}
/>

{#if active}
	<T.PerspectiveCamera makeDefault bind:ref={cameraRef}
		position={[0, cfg.shipDist + 2, cfg.shipDist + 5]}
		fov={60} near={0.01} far={cfg.farClip}
	/>

	<!-- Lighting -->
	<T.AmbientLight intensity={0.02} color="#111133" />
	<T.DirectionalLight position={[50, 30, 40]} intensity={0.5} color="#ffffee" />
	<T.PointLight position={ship.position} intensity={0.3} color="#00ffcc" distance={5} decay={2} />

	<!-- Earth -->
	<CesiumEarth radius={cfg.earthRadius} showClouds showAtmosphere quality="medium" />

	<!-- Ship & trail -->
	<T is={shipGroup} />
	<T is={trail} />

	<!-- Stars -->
	<Starfield count={2000} radius={cfg.farClip * 0.8} twinkleSpeed={0.6} />

	<!-- Click target for pointer lock -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="flight-lock-target" onmousedown={requestLock} class:locked>
		{#if !locked}
			<div class="lock-prompt">
				<div class="prompt-title">ORBITAL FLIGHT</div>
				<div class="prompt-sub">Click to engage — Orbit Earth at {scale} scale</div>
			</div>
		{/if}
	</div>

	<FlightHud {ship} {flightConfig} {rawInput} oncurvechange={handleCurveChange} />

	<!-- Altitude/orbit info overlay -->
	<div class="orbit-info">
		<div class="orbit-label">ALT</div>
		<div class="orbit-value">{(altitude() * 100).toFixed(0)} km</div>
		<div class="orbit-label">SCALE</div>
		<div class="orbit-value">{scale.toUpperCase()}</div>
	</div>
{/if}

<style>
	.flight-lock-target {
		position: absolute;
		inset: 0;
		z-index: 30;
		cursor: crosshair;
	}

	.flight-lock-target.locked {
		cursor: none;
		pointer-events: none;
	}

	.lock-prompt {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		text-align: center;
		animation: pulse 2s ease-in-out infinite;
		pointer-events: none;
	}

	.prompt-title {
		font-size: 0.8rem;
		letter-spacing: 0.3em;
		color: #00ffcc88;
		text-shadow: 0 0 12px #00ffcc33;
		margin-bottom: 0.3rem;
	}

	.prompt-sub {
		font-size: 0.5rem;
		color: #00ffcc44;
		letter-spacing: 0.1em;
	}

	@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

	.orbit-info {
		position: absolute;
		top: 60px;
		left: 16px;
		pointer-events: none;
		z-index: 40;
	}

	.orbit-label {
		font-size: 0.4rem;
		color: #555;
		letter-spacing: 0.12em;
	}

	.orbit-value {
		font-size: 0.7rem;
		color: #4466ff;
		font-weight: 300;
		margin-bottom: 0.4rem;
	}
</style>
