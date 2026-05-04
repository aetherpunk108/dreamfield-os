<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import type { BreathVoxel } from '$lib/spatial/octree/breath.js';
	import * as THREE from 'three';

	interface Props {
		voxels: BreathVoxel[];
		resolution?: number;
	}

	let { voxels, resolution = 1 }: Props = $props();

	let time = $state(0);
	useTask((delta) => { time += delta; });
</script>

{#each voxels as voxel, i}
	{@const intensity = Math.min(voxel.density, 1)}
	{@const hue = 0.55 + (voxel.temperature / 1000) * 0.15}
	<T.Mesh position={voxel.position}>
		<T.BoxGeometry args={[resolution * 0.9, resolution * 0.9, resolution * 0.9]} />
		<T.MeshStandardMaterial
			color={new THREE.Color().setHSL(hue, 0.6, 0.4)}
			transparent
			opacity={intensity * 0.15 + Math.sin(time + i * 0.5) * 0.03}
			wireframe
			emissive={new THREE.Color().setHSL(hue, 0.8, 0.3)}
			emissiveIntensity={0.3}
			depthWrite={false}
		/>
	</T.Mesh>
{/each}
