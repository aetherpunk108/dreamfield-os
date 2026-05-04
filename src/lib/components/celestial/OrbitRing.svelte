<script lang="ts">
	import { T } from '@threlte/core';
	import * as THREE from 'three';

	interface Props {
		radius: number;
		tilt?: number;
		color?: string;
		opacity?: number;
		center?: [number, number, number];
	}

	let { radius, tilt = 0, color = '#00ffcc', opacity = 0.08, center = [0, 0, 0] }: Props = $props();

	const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
	const points = curve.getPoints(128);
	const geo = new THREE.BufferGeometry().setFromPoints(
		points.map(p => new THREE.Vector3(p.x, 0, p.y))
	);
	const mat = new THREE.LineBasicMaterial({
		color: new THREE.Color(color),
		transparent: true,
		opacity,
		depthWrite: false,
	});
	const line = new THREE.Line(geo, mat);
	line.rotation.x = tilt;
	line.position.set(...center);
</script>

<T is={line} />
