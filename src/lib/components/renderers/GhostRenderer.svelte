<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import type { Ghost } from '$lib/spatial/primitives/ghost.js';
	import type { TrinaryState } from '$lib/spatial/state.js';
	import * as THREE from 'three';

	interface Props {
		ghost: Ghost;
		triState?: TrinaryState;
		onclick?: () => void;
		selected?: boolean;
	}

	let { ghost, triState = 0, onclick, selected = false }: Props = $props();

	let time = $state(0);
	let meshRef = $state<THREE.Mesh | undefined>(undefined);

	useTask((delta) => {
		time += delta;
		if (meshRef) {
			// Gentle float + rotate
			meshRef.position.y = ghost.position[1] + Math.sin(time * 0.8 + ghost.position[0] * 2) * 0.12;
			meshRef.rotation.y = time * 0.4;
			meshRef.rotation.x = Math.sin(time * 0.3) * 0.05;
		}
	});

	const baseColor = $derived(
		new THREE.Color(ghost.color[0], ghost.color[1], ghost.color[2])
	);

	const emissiveColor = $derived(
		triState === 1
			? baseColor.clone()
			: new THREE.Color(ghost.color[0] * 0.4, ghost.color[1] * 0.4, ghost.color[2] * 0.4)
	);

	const currentOpacity = $derived(
		triState === 1 ? ghost.opacity : triState === 0 ? 0.08 + Math.sin(time * 2.5) * 0.04 : 0
	);

	const emissiveStrength = $derived(
		triState === 1 ? 2.0 + Math.sin(time * 3) * 0.5 : 0.3
	);

	const scale = $derived(ghost.sigma * 2);

	// Selection ring pulse
	const selRingScale = $derived(
		selected ? scale * 1.8 + Math.sin(time * 4) * 0.05 : scale * 1.5
	);
</script>

{#if triState !== -1}
	<!-- Main primitive -->
	<T.Mesh
		bind:ref={meshRef}
		position={[ghost.position[0], ghost.position[1], ghost.position[2]]}
		onclick={onclick}
	>
		<T.IcosahedronGeometry args={[scale, triState === 1 ? 4 : 1]} />
		<T.MeshStandardMaterial
			color={baseColor}
			transparent
			opacity={currentOpacity}
			wireframe={triState === 0}
			emissive={emissiveColor}
			emissiveIntensity={emissiveStrength}
			side={THREE.DoubleSide}
			depthWrite={false}
		/>
	</T.Mesh>

	<!-- Inner core (collapsed only) -->
	{#if triState === 1}
		<T.Mesh position={[ghost.position[0], ghost.position[1], ghost.position[2]]}>
			<T.SphereGeometry args={[scale * 0.3, 16, 12]} />
			<T.MeshBasicMaterial
				color={baseColor}
				transparent
				opacity={0.6 + Math.sin(time * 5) * 0.2}
				depthWrite={false}
			/>
		</T.Mesh>

		<!-- Point light emanating from collapsed ghost -->
		<T.PointLight
			position={[ghost.position[0], ghost.position[1], ghost.position[2]]}
			color={baseColor}
			intensity={1.5 + Math.sin(time * 3) * 0.5}
			distance={4}
			decay={2}
		/>
	{/if}

	<!-- Orbital ring -->
	<T.Mesh
		position={[ghost.position[0], ghost.position[1], ghost.position[2]]}
		rotation.x={Math.PI / 2 + Math.sin(time * 0.5) * 0.1}
		rotation.z={time * 0.2}
	>
		<T.RingGeometry args={[scale * 1.15, scale * 1.25, 48]} />
		<T.MeshBasicMaterial
			color={baseColor}
			transparent
			opacity={triState === 1 ? 0.35 : 0.04}
			side={THREE.DoubleSide}
			depthWrite={false}
		/>
	</T.Mesh>

	<!-- Second ring (tilted) -->
	<T.Mesh
		position={[ghost.position[0], ghost.position[1], ghost.position[2]]}
		rotation.x={Math.PI / 3}
		rotation.y={time * -0.15}
	>
		<T.RingGeometry args={[scale * 1.3, scale * 1.38, 48]} />
		<T.MeshBasicMaterial
			color={baseColor}
			transparent
			opacity={triState === 1 ? 0.2 : 0.02}
			side={THREE.DoubleSide}
			depthWrite={false}
		/>
	</T.Mesh>

	<!-- Selection indicator -->
	{#if selected}
		<T.Mesh
			position={[ghost.position[0], ghost.position[1], ghost.position[2]]}
			rotation.x={Math.PI / 2}
		>
			<T.RingGeometry args={[selRingScale, selRingScale + 0.03, 48]} />
			<T.MeshBasicMaterial
				color="#ffffff"
				transparent
				opacity={0.4 + Math.sin(time * 6) * 0.15}
				side={THREE.DoubleSide}
				depthWrite={false}
			/>
		</T.Mesh>
	{/if}
{/if}
