<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import * as THREE from 'three';
	import { degToRad, geodeticToECEF } from '$lib/geospatial/coords.js';
	import { BODY_RADIUS } from '$lib/geospatial/constants.js';
	import type { LocationPin } from '$lib/navigation/pins.js';
	import type { Vec3 } from '$lib/spatial/types.js';

	interface Props {
		pins: LocationPin[];
		earthPosition: Vec3;
		earthRotation: number;
		visScale: number;
		selectedPinId: string | null;
		onselect: (id: string) => void;
	}

	let { pins, earthPosition, earthRotation, visScale, selectedPinId, onselect }: Props = $props();

	const { camera } = useThrelte();

	// Pin geometry constants (in scene units)
	const PIN_STEM_HEIGHT = 0.02;
	const PIN_SPHERE_RADIUS = 0.005;
	// Small extra offset above surface so pins are visible
	const SURFACE_OFFSET = PIN_STEM_HEIGHT * 0.5;

	/** Convert a pin's geodetic coords to a position relative to earth center (in scene units) */
	function pinLocalPosition(pin: LocationPin): THREE.Vector3 {
		const coord = {
			lat: degToRad(pin.lat),
			lon: degToRad(pin.lon),
			height: BODY_RADIUS.earth + pin.alt,
		};
		const ecef = geodeticToECEF(coord);
		// Same axis swap as pinToWorldPosition in pins.ts: Y↔Z, negate original Y
		return new THREE.Vector3(
			ecef[0] * visScale,
			ecef[2] * visScale,
			-ecef[1] * visScale,
		);
	}

	/** Build a canvas-texture sprite for a pin name label */
	function makeLabel(name: string, color: string): THREE.Sprite {
		const canvas = document.createElement('canvas');
		canvas.width = 256;
		canvas.height = 64;
		const ctx = canvas.getContext('2d')!;
		ctx.clearRect(0, 0, 256, 64);
		ctx.fillStyle = color;
		ctx.font = 'bold 22px monospace';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.shadowColor = color;
		ctx.shadowBlur = 10;
		ctx.fillText(name, 128, 32);
		const tex = new THREE.CanvasTexture(canvas);
		const mat = new THREE.SpriteMaterial({
			map: tex,
			transparent: true,
			depthWrite: false,
		});
		const sprite = new THREE.Sprite(mat);
		// Scale sprite proportional to scene
		sprite.scale.set(0.08, 0.02, 1);
		return sprite;
	}

	// Per-pin Three.js objects
	interface PinObjects {
		group: THREE.Group;
		sphere: THREE.Mesh;
		stemLine: THREE.Line;
		pulseRing: THREE.Line;
		label: THREE.Sprite;
		localPos: THREE.Vector3; // position relative to earth center
	}

	// Master group — positioned at earthPosition, rotated by earthRotation
	const masterGroup = new THREE.Group();

	// Map from pin id to objects
	let pinObjects = new Map<string, PinObjects>();

	function buildPinObjects(pin: LocationPin): PinObjects {
		const color = new THREE.Color(pin.color);
		const localPos = pinLocalPosition(pin);

		// Outward normal direction (normalized position = radial direction)
		const normal = localPos.clone().normalize();

		// Stem: a short line from surface to slightly above
		const stemStart = localPos.clone().addScaledVector(normal, -SURFACE_OFFSET);
		const stemEnd = localPos.clone().addScaledVector(normal, SURFACE_OFFSET + PIN_STEM_HEIGHT);
		const stemGeo = new THREE.BufferGeometry().setFromPoints([stemStart.clone().sub(localPos), stemEnd.clone().sub(localPos)]);
		const stemMat = new THREE.LineBasicMaterial({
			color,
			transparent: true,
			opacity: 0.9,
			depthWrite: false,
		});
		const stemLine = new THREE.Line(stemGeo, stemMat);

		// Glowing sphere at pin tip
		const sphereGeo = new THREE.SphereGeometry(PIN_SPHERE_RADIUS, 8, 6);
		const sphereMat = new THREE.MeshBasicMaterial({
			color,
			transparent: true,
			opacity: 0.95,
		});
		const sphere = new THREE.Mesh(sphereGeo, sphereMat);
		// Position sphere at top of stem, relative to group
		const tipOffset = stemEnd.clone().sub(localPos);
		sphere.position.copy(tipOffset);

		// Pulse ring (initially invisible; shown when selected)
		const ringPts: THREE.Vector3[] = [];
		const RING_SEGS = 32;
		const RING_RADIUS = PIN_SPHERE_RADIUS * 3;
		for (let i = 0; i <= RING_SEGS; i++) {
			const a = (i / RING_SEGS) * Math.PI * 2;
			ringPts.push(new THREE.Vector3(Math.cos(a) * RING_RADIUS, Math.sin(a) * RING_RADIUS, 0));
		}
		const ringGeo = new THREE.BufferGeometry().setFromPoints(ringPts);
		const ringMat = new THREE.LineBasicMaterial({
			color,
			transparent: true,
			opacity: 0.0,
			depthWrite: false,
		});
		const pulseRing = new THREE.Line(ringGeo, ringMat);
		// Orient ring to face outward (align with normal)
		pulseRing.position.copy(tipOffset);
		const up = new THREE.Vector3(0, 1, 0);
		const quat = new THREE.Quaternion().setFromUnitVectors(up, normal);
		pulseRing.quaternion.copy(quat);

		// Label sprite
		const label = makeLabel(pin.name, pin.color);
		label.position.copy(tipOffset).addScaledVector(normal, PIN_SPHERE_RADIUS * 4 + 0.015);
		label.visible = false;

		const group = new THREE.Group();
		group.position.copy(localPos);
		group.add(stemLine, sphere, pulseRing, label);

		masterGroup.add(group);

		return { group, sphere, stemLine, pulseRing, label, localPos };
	}

	function disposePinObjects(objs: PinObjects) {
		(objs.stemLine.geometry as THREE.BufferGeometry).dispose();
		(objs.stemLine.material as THREE.Material).dispose();
		(objs.sphere.geometry as THREE.BufferGeometry).dispose();
		(objs.sphere.material as THREE.Material).dispose();
		(objs.pulseRing.geometry as THREE.BufferGeometry).dispose();
		(objs.pulseRing.material as THREE.Material).dispose();
		const spriteMat = objs.label.material as THREE.SpriteMaterial;
		spriteMat.map?.dispose();
		spriteMat.dispose();
		masterGroup.remove(objs.group);
	}

	// Raycaster for click detection
	const raycaster = new THREE.Raycaster();
	raycaster.params.Mesh = { threshold: 0 };

	// Pulse animation time
	let pulseTime = 0;

	// Sync pin objects when pins prop changes
	$effect(() => {
		const currentIds = new Set(pins.map(p => p.id));

		// Remove obsolete pins
		for (const [id, objs] of pinObjects) {
			if (!currentIds.has(id)) {
				disposePinObjects(objs);
				pinObjects.delete(id);
			}
		}

		// Add new pins
		for (const pin of pins) {
			if (!pin.visible) {
				// Hide existing if present
				const objs = pinObjects.get(pin.id);
				if (objs) objs.group.visible = false;
				continue;
			}
			if (!pinObjects.has(pin.id)) {
				pinObjects.set(pin.id, buildPinObjects(pin));
			} else {
				pinObjects.get(pin.id)!.group.visible = true;
			}
		}
	});

	// Update master group position and rotation from props
	$effect(() => {
		masterGroup.position.set(earthPosition[0], earthPosition[1], earthPosition[2]);
		masterGroup.rotation.y = earthRotation;
	});

	// Per-frame: update pulse ring on selected pin, fade by camera distance
	useTask((delta) => {
		pulseTime += delta;

		const camPos = ($camera as THREE.Camera).position;
		const worldMasterPos = masterGroup.position;

		for (const [id, objs] of pinObjects) {
			if (!objs.group.visible) continue;

			const isSelected = id === selectedPinId;

			// Distance-based fade — compute world position of pin sphere
			const worldPinPos = objs.sphere.getWorldPosition(new THREE.Vector3());
			const dist = camPos.distanceTo(worldPinPos);

			// Fade: fully opaque within 0.5, transparent beyond 3.0 (scene units)
			const FADE_NEAR = 0.3;
			const FADE_FAR = 4.0;
			const fade = Math.max(0, Math.min(1, 1 - (dist - FADE_NEAR) / (FADE_FAR - FADE_NEAR)));

			(objs.stemLine.material as THREE.LineBasicMaterial).opacity = 0.9 * fade;
			(objs.sphere.material as THREE.MeshBasicMaterial).opacity = 0.95 * fade;

			// Pulse ring for selected pin
			if (isSelected) {
				const pulseOpacity = (0.5 + Math.sin(pulseTime * 3) * 0.4) * fade;
				const pulseScale = 1 + Math.sin(pulseTime * 3) * 0.3;
				(objs.pulseRing.material as THREE.LineBasicMaterial).opacity = Math.max(0, pulseOpacity);
				objs.pulseRing.scale.setScalar(pulseScale);
				objs.label.visible = fade > 0.05;
				(objs.label.material as THREE.SpriteMaterial).opacity = fade;
			} else {
				(objs.pulseRing.material as THREE.LineBasicMaterial).opacity = 0;
				objs.label.visible = false;
			}
		}
	});

	/** Handle pointer click — raycast against pin spheres */
	function handleClick(event: MouseEvent) {
		const domElement = (($camera as THREE.Camera) as any).userData?.domElement as HTMLElement | undefined;
		// Get renderer canvas via the scene's renderer; fall back to document canvas
		const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		raycaster.setFromCamera(new THREE.Vector2(x, y), $camera as THREE.Camera);

		const sphereMeshes: THREE.Mesh[] = [];
		const sphereToId = new Map<THREE.Mesh, string>();
		for (const [id, objs] of pinObjects) {
			if (objs.group.visible) {
				sphereMeshes.push(objs.sphere);
				sphereToId.set(objs.sphere, id);
			}
		}

		const hits = raycaster.intersectObjects(sphereMeshes, false);
		if (hits.length > 0) {
			const hitId = sphereToId.get(hits[0].object as THREE.Mesh);
			if (hitId) onselect(hitId);
		}
	}
</script>

<svelte:window onclick={handleClick} />

<T is={masterGroup} />
