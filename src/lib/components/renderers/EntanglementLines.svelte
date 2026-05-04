<script lang="ts">
	import { T, useTask } from '@threlte/core';
	import type { Ghost } from '$lib/spatial/primitives/ghost.js';
	import type { EntanglementMap } from '$lib/spatial/entanglement.js';
	import * as THREE from 'three';

	interface Props {
		ghosts: Ghost[];
		entanglement: EntanglementMap;
		enabled?: boolean;
	}

	let { ghosts, entanglement, enabled = true }: Props = $props();

	let time = $state(0);
	useTask((delta) => { time += delta; });

	const ghostMap = $derived(new Map(ghosts.map((g) => [g.id, g])));

	const lines = $derived.by(() => {
		if (!enabled) return [];
		const result: { from: Ghost; to: Ghost }[] = [];
		const seen = new Set<string>();

		for (const ghost of ghosts) {
			const linked = entanglement.getLinked(ghost.id);
			for (const linkedId of linked) {
				const key = [ghost.id, linkedId].sort().join(':');
				if (seen.has(key)) continue;
				seen.add(key);
				const target = ghostMap.get(linkedId);
				if (target) result.push({ from: ghost, to: target });
			}
		}
		return result;
	});
</script>

{#each lines as line, i}
	{@const points = [
		new THREE.Vector3(...line.from.position),
		new THREE.Vector3(
			(line.from.position[0] + line.to.position[0]) / 2,
			(line.from.position[1] + line.to.position[1]) / 2 + 0.5 + Math.sin(time * 1.5 + i) * 0.2,
			(line.from.position[2] + line.to.position[2]) / 2
		),
		new THREE.Vector3(...line.to.position)
	]}
	{@const curve = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2])}
	{@const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.008, 4, false)}
	{@const tubeMesh = new THREE.Mesh(
		tubeGeo,
		new THREE.MeshBasicMaterial({
			color: new THREE.Color('#00ffcc'),
			transparent: true,
			opacity: 0.25 + Math.sin(time * 2 + i) * 0.1,
			depthWrite: false,
		})
	)}
	<T is={tubeMesh} />
{/each}
