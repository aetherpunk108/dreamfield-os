<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import type { Vec3 } from '$lib/spatial/types.js';
	import type { Ghost } from '$lib/spatial/primitives/ghost.js';
	import {
		getCameraMode,
		setCameraMode,
		cycleCameraMode,
		setCameraPosition,
		setCameraTarget,
		type CameraMode,
	} from '$lib/stores/camera.svelte.js';

	interface Props {
		mode?: CameraMode;
		target?: Vec3;
		speed?: number;
		ghosts?: Ghost[];
		collapsedIds?: Set<string>;
	}

	const {
		mode = 'observer',
		target = [0, 1, 0] as Vec3,
		speed = 1,
		ghosts = [],
		collapsedIds = new Set<string>(),
	}: Props = $props();

	// Sync external mode prop into store on mount and when prop changes
	$effect(() => {
		setCameraMode(mode);
	});

	// --- Internal camera state ---
	const camPos = new THREE.Vector3(0, 2.5, 7);
	const camTarget = new THREE.Vector3(0, 1, 0);
	const camQuat = new THREE.Quaternion();

	// Working vectors (reused, no allocation per frame)
	const _tmpVec = new THREE.Vector3();
	const _tmpVec2 = new THREE.Vector3();
	const _tmpQuat = new THREE.Quaternion();
	const _up = new THREE.Vector3(0, 1, 0);

	// Observer mode
	let observerAngle = 0;
	const OBSERVER_RADIUS = 7;
	const OBSERVER_HEIGHT = 2.5;
	const OBSERVER_SPEED = 0.08;

	// First-person mode
	const fpPos = new THREE.Vector3(0, 1.7, 5);
	const fpYaw = { v: 0 };
	const fpPitch = { v: 0 };
	const fpKeys = new Set<string>();
	let pointerLocked = false;

	// Cinematic mode
	let cinematicT = 0;
	const CINEMATIC_SPEED = 0.04;
	// Four bezier control-point sets for a sweeping path
	const cinematicCurves: THREE.CubicBezierCurve3[] = [
		new THREE.CubicBezierCurve3(
			new THREE.Vector3(8, 3, 0),
			new THREE.Vector3(6, 6, 6),
			new THREE.Vector3(-6, 5, 6),
			new THREE.Vector3(-8, 3, 0),
		),
		new THREE.CubicBezierCurve3(
			new THREE.Vector3(-8, 3, 0),
			new THREE.Vector3(-6, 1, -6),
			new THREE.Vector3(6, 4, -6),
			new THREE.Vector3(8, 3, 0),
		),
	];

	// Tensor mode
	const TENSOR_PULL_STRENGTH = 0.6;
	const TENSOR_ORBIT_RADIUS = 5;
	const TENSOR_HEIGHT = 3;
	let tensorAngle = 0;

	// Transition interpolation
	const interpPos = new THREE.Vector3(0, 2.5, 7);
	const interpTarget = new THREE.Vector3(0, 1, 0);
	const LERP_FACTOR = 0.06;

	// Camera ref for direct manipulation
	let cameraRef = $state<THREE.PerspectiveCamera | undefined>(undefined);

	// --- Input handlers ---
	function onKeydown(e: KeyboardEvent) {
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
		const k = e.key.toLowerCase();
		fpKeys.add(k);
		if (k === 'c') {
			cycleCameraMode();
		}
		if (k === 'f') {
			// Focus on selected/first collapsed ghost
			const collapsed = ghosts.filter((g) => collapsedIds.has(g.id));
			const focus = collapsed[0] ?? ghosts[0];
			if (focus) {
				setCameraTarget(focus.position);
				camTarget.set(...focus.position);
			}
		}
	}

	function onKeyup(e: KeyboardEvent) {
		fpKeys.delete(e.key.toLowerCase());
	}

	function onPointerLockChange() {
		pointerLocked = document.pointerLockElement !== null;
	}

	function onMouseMove(e: MouseEvent) {
		if (!pointerLocked) return;
		fpYaw.v -= e.movementX * 0.002;
		fpPitch.v -= e.movementY * 0.002;
		fpPitch.v = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, fpPitch.v));
	}

	function onCanvasClick(e: MouseEvent) {
		const currentMode = getCameraMode();
		if (currentMode === 'firstperson') {
			const canvas = e.currentTarget as HTMLElement | null;
			canvas?.requestPointerLock?.();
		}
	}

	$effect(() => {
		window.addEventListener('keydown', onKeydown);
		window.addEventListener('keyup', onKeyup);
		document.addEventListener('pointerlockchange', onPointerLockChange);
		window.addEventListener('mousemove', onMouseMove);

		// Attach canvas click for pointer lock
		const canvas = document.querySelector('canvas');
		if (canvas) canvas.addEventListener('click', onCanvasClick as EventListener);

		return () => {
			window.removeEventListener('keydown', onKeydown);
			window.removeEventListener('keyup', onKeyup);
			document.removeEventListener('pointerlockchange', onPointerLockChange);
			window.removeEventListener('mousemove', onMouseMove);
			if (canvas) canvas.removeEventListener('click', onCanvasClick as EventListener);
		};
	});

	// --- Per-frame update ---
	useTask((delta) => {
		const currentMode = getCameraMode();
		const dt = Math.min(delta, 0.05); // clamp to avoid large jumps

		switch (currentMode) {
			case 'observer':
				updateObserver(dt);
				break;
			case 'firstperson':
				updateFirstPerson(dt);
				break;
			case 'cinematic':
				updateCinematic(dt);
				break;
			case 'tensor':
				updateTensor(dt);
				break;
		}

		// Smooth interpolation toward desired position/target
		interpPos.lerp(camPos, LERP_FACTOR);
		interpTarget.lerp(camTarget, LERP_FACTOR);

		if (cameraRef) {
			if (currentMode === 'firstperson') {
				// In FP mode, apply directly without lerp lag for responsive feel
				cameraRef.position.copy(camPos);
				cameraRef.setRotationFromEuler(new THREE.Euler(fpPitch.v, fpYaw.v, 0, 'YXZ'));
			} else {
				cameraRef.position.copy(interpPos);
				cameraRef.lookAt(interpTarget);
			}
		}

		// Publish to store
		setCameraPosition([interpPos.x, interpPos.y, interpPos.z]);
		setCameraTarget([interpTarget.x, interpTarget.y, interpTarget.z]);
	});

	function updateObserver(dt: number) {
		observerAngle += OBSERVER_SPEED * dt * speed;
		const focusVec = new THREE.Vector3(...target);
		camPos.set(
			focusVec.x + Math.cos(observerAngle) * OBSERVER_RADIUS,
			focusVec.y + OBSERVER_HEIGHT,
			focusVec.z + Math.sin(observerAngle) * OBSERVER_RADIUS,
		);
		camTarget.lerp(focusVec, 0.05);
	}

	function updateFirstPerson(dt: number) {
		const moveSpeed = speed * 4 * dt;
		// Build forward/right from yaw
		const forward = new THREE.Vector3(-Math.sin(fpYaw.v), 0, -Math.cos(fpYaw.v));
		const right = new THREE.Vector3(Math.cos(fpYaw.v), 0, -Math.sin(fpYaw.v));

		if (fpKeys.has('w') || fpKeys.has('arrowup')) fpPos.addScaledVector(forward, moveSpeed);
		if (fpKeys.has('s') || fpKeys.has('arrowdown')) fpPos.addScaledVector(forward, -moveSpeed);
		if (fpKeys.has('a') || fpKeys.has('arrowleft')) fpPos.addScaledVector(right, -moveSpeed);
		if (fpKeys.has('d') || fpKeys.has('arrowright')) fpPos.addScaledVector(right, moveSpeed);
		if (fpKeys.has('q') || fpKeys.has(' ')) fpPos.y += moveSpeed;
		if (fpKeys.has('e')) fpPos.y -= moveSpeed;

		camPos.copy(fpPos);
		// In FP mode camTarget is not used for lookAt (rotation set directly in useTask)
	}

	function updateCinematic(dt: number) {
		cinematicT += CINEMATIC_SPEED * dt * speed;
		if (cinematicT > 1) cinematicT -= 1;

		// Determine which curve segment we're in
		const segCount = cinematicCurves.length;
		const segT = cinematicT * segCount;
		const segIdx = Math.floor(segT) % segCount;
		const localT = segT - Math.floor(segT);

		const curve = cinematicCurves[segIdx];
		curve.getPoint(localT, camPos);

		// Look at scene center with a slow dramatic sweep
		const lookTarget = new THREE.Vector3(...target);
		lookTarget.y += Math.sin(cinematicT * Math.PI * 2) * 1.5;
		camTarget.lerp(lookTarget, 0.02);
	}

	function updateTensor(dt: number) {
		// Compute attraction vector from collapsed ghost positions
		let attractX = 0;
		let attractY = 0;
		let attractZ = 0;
		let collapseCount = 0;

		for (const ghost of ghosts) {
			if (collapsedIds.has(ghost.id)) {
				attractX += ghost.position[0];
				attractY += ghost.position[1];
				attractZ += ghost.position[2];
				collapseCount++;
			}
		}

		// Base orbit point: weighted average of collapsed ghosts or target
		let orbitCenter: THREE.Vector3;
		if (collapseCount > 0) {
			orbitCenter = new THREE.Vector3(
				attractX / collapseCount,
				attractY / collapseCount,
				attractZ / collapseCount,
			);
		} else {
			orbitCenter = new THREE.Vector3(...target);
		}

		// Slowly orbit and pull toward collapsed ghosts
		tensorAngle += 0.3 * dt * speed;
		const radius = TENSOR_ORBIT_RADIUS - collapseCount * TENSOR_PULL_STRENGTH * 0.5;
		const clampedRadius = Math.max(2.5, radius);

		_tmpVec.set(
			orbitCenter.x + Math.cos(tensorAngle) * clampedRadius,
			orbitCenter.y + TENSOR_HEIGHT + Math.sin(tensorAngle * 0.7) * 1.2,
			orbitCenter.z + Math.sin(tensorAngle) * clampedRadius,
		);

		camPos.lerp(_tmpVec, 0.03);
		camTarget.lerp(orbitCenter, 0.04);
	}
</script>

<T.PerspectiveCamera
	makeDefault
	bind:ref={cameraRef}
	fov={55}
	near={0.1}
	far={500}
	position={[0, 2.5, 7]}
/>
