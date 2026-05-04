<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import * as THREE from 'three';
	import { createShipState, updateShip, DEFAULT_SHIP_CONFIG, type ShipState } from '$lib/flight/ship.js';
	import { processInput, createInputState, getDefaultConfig, type InputState, type FlightConfig } from '$lib/flight/input.js';
	import { createCurve, type CurveType } from '$lib/flight/curves.js';
	import FlightHud from './FlightHud.svelte';

	interface Props {
		active?: boolean;
		onshipupdate?: (ship: ShipState) => void;
	}

	let { active = true, onshipupdate }: Props = $props();

	let ship = $state(createShipState());
	let flightConfig = $state<FlightConfig>(getDefaultConfig('desktop'));
	let inputState = $state<InputState>(createInputState());
	let rawInput = $state({ pitch: 0, yaw: 0, roll: 0, throttle: 0 });
	let cameraRef: THREE.PerspectiveCamera;
	let locked = $state(false);

	// Ship mesh group
	const shipGroup = new THREE.Group();

	// Simple ship indicator (triangle wireframe)
	const shipGeo = new THREE.ConeGeometry(0.15, 0.5, 4);
	shipGeo.rotateX(Math.PI / 2);
	const shipMat = new THREE.MeshBasicMaterial({
		color: '#00ffcc',
		wireframe: true,
		transparent: true,
		opacity: 0.6,
	});
	const shipMesh = new THREE.Mesh(shipGeo, shipMat);
	shipGroup.add(shipMesh);

	// Engine glow
	const glowGeo = new THREE.SphereGeometry(0.08, 8, 6);
	const glowMat = new THREE.MeshBasicMaterial({
		color: '#00ffcc',
		transparent: true,
		opacity: 0.4,
	});
	const glowMesh = new THREE.Mesh(glowGeo, glowMat);
	glowMesh.position.z = 0.3;
	shipGroup.add(glowMesh);

	// Trail particles
	const trailGeo = new THREE.BufferGeometry();
	const trailPositions = new Float32Array(300); // 100 points * 3
	trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
	const trailMat = new THREE.PointsMaterial({
		color: '#00ffcc',
		size: 0.03,
		transparent: true,
		opacity: 0.3,
	});
	const trail = new THREE.Points(trailGeo, trailMat);
	let trailIdx = 0;

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

	// Check for gamepad
	function pollGamepad() {
		const gamepads = navigator.getGamepads?.() ?? [];
		const gp = gamepads[0];
		if (gp) {
			inputState.gamepadAxes = [...gp.axes];
			inputState.gamepadButtons = gp.buttons.map(b => b.value);
			if (flightConfig.device !== 'gamepad') {
				flightConfig = getDefaultConfig('gamepad');
			}
		}
	}

	useTask((delta) => {
		if (!active) return;

		// Update key hold times
		for (const key of inputState.keys) {
			const prev = inputState.keyHoldTime.get(key) ?? 0;
			inputState.keyHoldTime.set(key, prev + delta);
		}

		// Poll gamepad
		pollGamepad();

		// Process input through curves
		const processed = processInput(inputState, flightConfig, delta);
		rawInput = { pitch: processed.pitch, yaw: processed.yaw, roll: processed.roll, throttle: processed.throttle };

		// Update ship physics
		ship = updateShip(ship, processed, DEFAULT_SHIP_CONFIG, delta);

		// Update ship mesh
		shipGroup.position.set(...ship.position);
		shipGroup.rotation.set(ship.rotation.pitch, ship.rotation.yaw, ship.rotation.roll, 'YXZ');

		// Engine glow intensity
		glowMat.opacity = 0.2 + ship.throttleLevel * 0.6;
		if (ship.boostActive) {
			glowMat.color.set('#ff44aa');
			shipMat.color.set('#ff44aa');
		} else {
			glowMat.color.set('#00ffcc');
			shipMat.color.set('#00ffcc');
		}

		// Trail
		trailPositions[trailIdx * 3] = ship.position[0];
		trailPositions[trailIdx * 3 + 1] = ship.position[1];
		trailPositions[trailIdx * 3 + 2] = ship.position[2];
		trailIdx = (trailIdx + 1) % 100;
		trailGeo.attributes.position.needsUpdate = true;

		// Camera follow (behind and above ship)
		if (cameraRef) {
			const camOffset = new THREE.Vector3(0, 1.5, -4);
			camOffset.applyEuler(new THREE.Euler(ship.rotation.pitch * 0.3, ship.rotation.yaw, 0, 'YXZ'));
			const targetPos = new THREE.Vector3(...ship.position).add(camOffset);
			cameraRef.position.lerp(targetPos, 0.08);
			const lookAt = new THREE.Vector3(...ship.position);
			cameraRef.lookAt(lookAt);
		}

		// Reset mouse delta
		inputState.mouseDeltaX = 0;
		inputState.mouseDeltaY = 0;

		onshipupdate?.(ship);
	});
</script>

<svelte:window
	onkeydown={handleKeyDown}
	onkeyup={handleKeyUp}
	onmousemove={handleMouseMove}
	onpointerlockchange={handlePointerLock}
/>

{#if active}
	<T.PerspectiveCamera makeDefault bind:ref={cameraRef} position={[0, 6.5, -4]} fov={65} />
	<T is={shipGroup} />
	<T is={trail} />

	<!-- Click target for pointer lock -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="flight-lock-target" onmousedown={requestLock}
		class:locked>
		{#if !locked}
			<div class="lock-prompt">CLICK TO ENGAGE FLIGHT CONTROLS</div>
		{/if}
	</div>

	<FlightHud {ship} {flightConfig} {rawInput} oncurvechange={handleCurveChange} />
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
		font-size: 0.6rem;
		letter-spacing: 0.2em;
		color: #00ffcc66;
		text-shadow: 0 0 8px #00ffcc22;
		animation: pulse 2s ease-in-out infinite;
		pointer-events: none;
	}

	@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
</style>
