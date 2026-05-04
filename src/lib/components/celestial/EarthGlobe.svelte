<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import * as THREE from 'three';
	import { BODY_RADIUS, VIS_SCALE } from '$lib/geospatial/constants.js';

	interface Props {
		position?: [number, number, number];
		rotationAngle?: number;
		scale?: number;
	}

	let { position = [0, 0, 0], rotationAngle = 0, scale = VIS_SCALE }: Props = $props();

	const radius = BODY_RADIUS.earth * scale;

	// Generate a wireframe globe with lat/lon lines
	const earthGeo = new THREE.SphereGeometry(radius, 48, 32);
	const earthMat = new THREE.MeshStandardMaterial({
		color: new THREE.Color('#1a4a2a'),
		emissive: new THREE.Color('#0a2a1a'),
		emissiveIntensity: 0.3,
		wireframe: false,
		transparent: true,
		opacity: 0.85,
	});
	const earthMesh = new THREE.Mesh(earthGeo, earthMat);

	// Wireframe overlay for grid lines
	const wireGeo = new THREE.SphereGeometry(radius * 1.002, 24, 16);
	const wireMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color('#00ffcc'),
		wireframe: true,
		transparent: true,
		opacity: 0.12,
		depthWrite: false,
	});
	const wireMesh = new THREE.Mesh(wireGeo, wireMat);

	// Atmosphere glow
	const atmosGeo = new THREE.SphereGeometry(radius * 1.08, 32, 24);
	const atmosMat = new THREE.MeshBasicMaterial({
		color: new THREE.Color('#4488ff'),
		transparent: true,
		opacity: 0.06,
		side: THREE.BackSide,
		depthWrite: false,
	});
	const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);

	// Axis line
	const axisPoints = [
		new THREE.Vector3(0, -radius * 1.5, 0),
		new THREE.Vector3(0, radius * 1.5, 0)
	];
	const axisGeo = new THREE.BufferGeometry().setFromPoints(axisPoints);
	const axisMat = new THREE.LineBasicMaterial({ color: '#00ffcc', transparent: true, opacity: 0.15 });
	const axisLine = new THREE.Line(axisGeo, axisMat);

	// Equator ring
	const equatorCurve = new THREE.EllipseCurve(0, 0, radius * 1.01, radius * 1.01, 0, Math.PI * 2, false, 0);
	const equatorPoints = equatorCurve.getPoints(64);
	const equatorGeo = new THREE.BufferGeometry().setFromPoints(
		equatorPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
	);
	const equatorMat = new THREE.LineBasicMaterial({ color: '#00ffcc', transparent: true, opacity: 0.3 });
	const equatorLine = new THREE.Line(equatorGeo, equatorMat);

	const group = new THREE.Group();
	group.add(earthMesh, wireMesh, atmosMesh, axisLine, equatorLine);

	let time = $state(0);
	useTask((delta) => { time += delta; });

	$effect(() => {
		group.position.set(...position);
		group.rotation.y = rotationAngle;
	});
</script>

<T is={group} />
