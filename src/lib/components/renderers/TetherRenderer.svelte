<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import type { Tether } from '$lib/spatial/primitives/tether.js';
	import type { TrinaryState } from '$lib/spatial/state.js';
	import * as THREE from 'three';

	interface Props {
		tether: Tether;
		triState?: TrinaryState;
		color?: string;
	}

	let { tether, triState = 0, color = '#4488ff' }: Props = $props();

	let time = $state(0);
	useTask((delta) => { time += delta; });

	const mesh = $derived.by(() => {
		const geo = new THREE.BufferGeometry();
		const verts = new Float32Array(tether.vertices.flat());
		const norms = new Float32Array(tether.normals.flat());
		geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
		geo.setAttribute('normal', new THREE.BufferAttribute(norms, 3));
		if (tether.indices.length > 0) {
			geo.setIndex(new THREE.BufferAttribute(new Uint16Array(tether.indices), 1));
		}
		const threeColor = new THREE.Color(color);
		const mat = new THREE.MeshStandardMaterial({
			color: threeColor,
			transparent: true,
			opacity: triState === 1 ? 0.9 : triState === 0 ? 0.08 : 0,
			wireframe: triState === 0,
			emissive: threeColor,
			emissiveIntensity: triState === 1 ? 0.8 : 0.1,
			side: THREE.DoubleSide,
			depthWrite: false,
		});
		return new THREE.Mesh(geo, mat);
	});
</script>

{#if triState !== -1}
	<T is={mesh} />
{/if}
