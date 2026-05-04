<script lang="ts">
	import { onMount } from 'svelte';
	import type { Vec3 } from '$lib/spatial/types.js';
	import type { Waypoint } from '$lib/navigation/waypoints.js';
	import * as THREE from 'three';

	interface Props {
		waypoints: Waypoint[];
		cameraPosition: Vec3;
		selectedId: string | null;
		onselect: (id: string) => void;
	}

	let { waypoints, cameraPosition, selectedId, onselect }: Props = $props();

	interface MarkerInfo {
		id: string;
		name: string;
		color: string;
		dist: number;
		displayDist: number;
		x: number;
		y: number;
		onScreen: boolean;
		edgeX: number;
		edgeY: number;
		edgeAngle: number;
		behind: boolean;
		selected: boolean;
	}

	let containerEl: HTMLDivElement;
	let width = $state(0);
	let height = $state(0);
	let markers = $state<MarkerInfo[]>([]);
	let pulseT = $state(0);
	let rafId: number;

	// Smoothed display distances keyed by id
	const smoothDist = new Map<string, number>();

	const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);

	function updateSize() {
		if (!containerEl) return;
		width = containerEl.offsetWidth;
		height = containerEl.offsetHeight;
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
	}

	function projectToScreen(pos: Vec3): { x: number; y: number; behind: boolean } {
		const camPos = new THREE.Vector3(...cameraPosition);
		const target = new THREE.Vector3(
			cameraPosition[0],
			cameraPosition[1],
			cameraPosition[2] - 1
		);
		camera.position.copy(camPos);
		camera.lookAt(target);
		camera.updateMatrixWorld();

		const worldPos = new THREE.Vector3(...pos);
		const ndc = worldPos.clone().project(camera);

		const behind = ndc.z > 1;

		const sx = ((ndc.x + 1) / 2) * width;
		const sy = ((-ndc.y + 1) / 2) * height;

		return { x: sx, y: sy, behind };
	}

	function edgeClamp(
		sx: number,
		sy: number,
		margin: number
	): { ex: number; ey: number; angle: number } {
		const cx = width / 2;
		const cy = height / 2;
		const dx = sx - cx;
		const dy = sy - cy;
		const angle = Math.atan2(dy, dx);
		const maxX = width / 2 - margin;
		const maxY = height / 2 - margin;
		const t = Math.min(maxX / Math.abs(dx || 0.001), maxY / Math.abs(dy || 0.001));
		const ex = cx + dx * t;
		const ey = cy + dy * t;
		return { ex, ey, angle };
	}

	function computeMarkers() {
		const result: MarkerInfo[] = [];

		for (const wp of waypoints) {
			if (!wp.visible) continue;

			const dx = wp.position[0] - cameraPosition[0];
			const dy = wp.position[1] - cameraPosition[1];
			const dz = wp.position[2] - cameraPosition[2];
			const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

			// Smooth the displayed distance
			const prev = smoothDist.get(wp.id) ?? dist;
			const smoothed = prev + (dist - prev) * 0.08;
			smoothDist.set(wp.id, smoothed);

			const { x, y, behind } = projectToScreen(wp.position);
			const onScreen =
				!behind && x >= 0 && x <= width && y >= 0 && y <= height;

			const { ex, ey, angle } = edgeClamp(x, y, 24);

			result.push({
				id: wp.id,
				name: wp.name,
				color: wp.color,
				dist,
				displayDist: smoothed,
				x,
				y,
				onScreen,
				edgeX: ex,
				edgeY: ey,
				edgeAngle: angle,
				behind,
				selected: wp.id === selectedId
			});
		}

		markers = result;
	}

	function markerScale(dist: number): number {
		// Closer = larger, capped between 0.5 and 1.4
		return Math.min(1.4, Math.max(0.5, 8 / (dist + 5)));
	}

	function tick() {
		rafId = requestAnimationFrame(tick);
		pulseT = (pulseT + 0.04) % (Math.PI * 2);
		computeMarkers();
	}

	onMount(() => {
		updateSize();
		const ro = new ResizeObserver(updateSize);
		ro.observe(containerEl);
		tick();
		return () => {
			cancelAnimationFrame(rafId);
			ro.disconnect();
		};
	});
</script>

<div class="waypoint-overlay" bind:this={containerEl}>
	{#each markers as m (m.id)}
		{#if m.onScreen}
			<!-- On-screen marker -->
			{@const scale = markerScale(m.dist)}
			{@const pulseScale = m.selected ? 1 + Math.sin(pulseT) * 0.25 : 1}
			<button
				class="marker"
				style="
					left: {m.x}px;
					top: {m.y}px;
					transform: translate(-50%, -50%) scale({scale});
					--color: {m.color};
				"
				onclick={() => onselect(m.id)}
			>
				<!-- Diamond shape -->
				<svg class="diamond" width="18" height="18" viewBox="0 0 18 18">
					<polygon
						points="9,1 17,9 9,17 1,9"
						fill="none"
						stroke={m.color}
						stroke-width="1.5"
						opacity="0.9"
					/>
					<polygon
						points="9,4 14,9 9,14 4,9"
						fill={m.color}
						opacity="0.25"
					/>
				</svg>

				<!-- Pulse ring for selected -->
				{#if m.selected}
					<svg
						class="pulse-ring"
						width="40"
						height="40"
						viewBox="0 0 40 40"
						style="transform: scale({pulseScale});"
					>
						<circle
							cx="20"
							cy="20"
							r="16"
							fill="none"
							stroke={m.color}
							stroke-width="1"
							opacity={0.6 - Math.sin(pulseT) * 0.3}
						/>
					</svg>
				{/if}

				<!-- Label -->
				<div class="label" style="color: {m.color};">
					<span class="name">{m.name}</span>
					<span class="dist">{m.displayDist.toFixed(1)}u</span>
				</div>
			</button>
		{:else if !m.behind || m.dist < 200}
			<!-- Off-screen edge arrow -->
			<div
				class="edge-arrow"
				style="
					left: {m.edgeX}px;
					top: {m.edgeY}px;
					transform: translate(-50%, -50%) rotate({m.edgeAngle}rad);
					--color: {m.color};
				"
			>
				<svg width="16" height="16" viewBox="0 0 16 16">
					<polygon
						points="8,1 15,15 8,11 1,15"
						fill={m.color}
						opacity="0.7"
					/>
				</svg>
			</div>

			<!-- Edge label near arrow -->
			<div
				class="edge-label"
				style="
					left: {m.edgeX}px;
					top: {m.edgeY}px;
					color: {m.color};
				"
			>
				{m.name} · {m.displayDist.toFixed(0)}u
			</div>
		{/if}
	{/each}
</div>

<style>
	.waypoint-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
	}

	.marker {
		position: absolute;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		pointer-events: all;
	}

	.marker:focus {
		outline: none;
	}

	.diamond {
		display: block;
		filter: drop-shadow(0 0 4px var(--color));
	}

	.pulse-ring {
		position: absolute;
		top: 50%;
		left: 50%;
		transform-origin: center;
		translate: -50% -50%;
		pointer-events: none;
	}

	.label {
		position: absolute;
		top: calc(100% + 6px);
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1px;
		white-space: nowrap;
		pointer-events: none;
		text-shadow: 0 0 8px currentColor;
	}

	.name {
		font-size: 0.5rem;
		letter-spacing: 0.1em;
		opacity: 0.9;
		text-transform: uppercase;
	}

	.dist {
		font-size: 0.45rem;
		letter-spacing: 0.05em;
		opacity: 0.55;
		font-variant-numeric: tabular-nums;
	}

	.edge-arrow {
		position: absolute;
		pointer-events: none;
		filter: drop-shadow(0 0 3px var(--color));
	}

	.edge-label {
		position: absolute;
		transform: translate(-50%, 14px);
		font-size: 0.42rem;
		letter-spacing: 0.08em;
		opacity: 0.6;
		white-space: nowrap;
		pointer-events: none;
		text-shadow: 0 0 6px currentColor;
		text-transform: uppercase;
	}
</style>
