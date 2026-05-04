<script lang="ts">
	import { onMount } from 'svelte';
	import type { ObservationTensor } from '$lib/spatial/observation.js';

	interface Props {
		observers: string[];
		tensor: ObservationTensor;
		ghostCount: number;
		activeObserver: string;
	}

	let { observers, tensor, ghostCount, activeObserver }: Props = $props();

	// SVG dimensions
	const SIZE = 160;
	const CX = SIZE / 2;
	const CY = SIZE / 2;
	const OUTER_R = 68;
	const INNER_R = 46;
	const ENTANGLE_R = 34;

	// Observer color palette
	const OBSERVER_COLORS: Record<string, string> = {
		human: '#00ffcc',
		ai: '#4466ff',
		satellite: '#ff44aa'
	};
	const DEFAULT_COLORS = ['#00ffcc', '#4466ff', '#ff44aa', '#ffaa00', '#aa44ff'];

	function observerColor(obs: string, i: number): string {
		return OBSERVER_COLORS[obs] ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
	}

	// Elapsed time for rotation animation
	let elapsed = $state(0);
	let rafId: number;
	let lastTs = 0;

	// Track active observer changes for pulse
	let pulseObserver = $state('');
	let pulseOpacity = $state(0);
	let prevActive = '';

	$effect(() => {
		if (activeObserver !== prevActive && prevActive !== '') {
			pulseObserver = activeObserver;
			pulseOpacity = 1;
		}
		prevActive = activeObserver;
	});

	onMount(() => {
		function tick(ts: number) {
			if (lastTs) elapsed += (ts - lastTs) / 1000;
			lastTs = ts;

			// Fade pulse
			if (pulseOpacity > 0) pulseOpacity = Math.max(0, pulseOpacity - 0.03);

			rafId = requestAnimationFrame(tick);
		}
		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});

	// Build arc path for a ring segment
	function arcPath(
		cx: number,
		cy: number,
		r: number,
		startAngle: number,
		endAngle: number,
		thickness: number
	): string {
		const innerR = r - thickness;
		const s = polarToCart(cx, cy, r, startAngle);
		const e = polarToCart(cx, cy, r, endAngle);
		const si = polarToCart(cx, cy, innerR, startAngle);
		const ei = polarToCart(cx, cy, innerR, endAngle);
		const large = endAngle - startAngle > Math.PI ? 1 : 0;
		return [
			`M ${s.x} ${s.y}`,
			`A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`,
			`L ${ei.x} ${ei.y}`,
			`A ${innerR} ${innerR} 0 ${large} 0 ${si.x} ${si.y}`,
			'Z'
		].join(' ');
	}

	function polarToCart(cx: number, cy: number, r: number, angle: number) {
		return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
	}

	// Segments: equal angular slices for each observer, filled proportionally
	interface Segment {
		color: string;
		label: string;
		fillPath: string;
		trackPath: string;
		ratio: number;
		isActive: boolean;
	}

	let segments = $derived.by((): Segment[] => {
		const count = observers.length;
		if (count === 0) return [];
		const gap = 0.04;
		const sliceAngle = (Math.PI * 2) / count;
		const rotation = elapsed * 0.15; // slow rotation

		return observers.map((obs, i) => {
			const startBase = -Math.PI / 2 + i * sliceAngle + gap / 2 + rotation;
			const endBase = startBase + sliceAngle - gap;

			// Ratio: how many ghosts this observer has collapsed / total ghosts
			let collapsed = 0;
			if (ghostCount > 0) {
				const states = tensor.getObserverStates(obs);
				for (const v of states.values()) {
					if (v === 1) collapsed++;
				}
			}
			const ratio = ghostCount > 0 ? Math.min(collapsed / ghostCount, 1) : 0;

			// Track arc (faint background)
			const trackPath = arcPath(CX, CY, OUTER_R, startBase, endBase, 10);

			// Fill arc (ratio of segment filled)
			const fillEnd = startBase + (endBase - startBase) * Math.max(ratio, 0.02);
			const fillPath = arcPath(CX, CY, OUTER_R, startBase, fillEnd, 10);

			return {
				color: observerColor(obs, i),
				label: obs.toUpperCase().slice(0, 3),
				fillPath,
				trackPath,
				ratio,
				isActive: obs === activeObserver
			};
		});
	});

	// Entanglement density ring (inner ring fill 0-1 based on collapse ratio)
	let entangleDensity = $derived.by(() => {
		if (ghostCount === 0) return 0;
		let total = 0;
		for (const obs of observers) {
			const states = tensor.getObserverStates(obs);
			for (const v of states.values()) {
				if (v === 1) total++;
			}
		}
		return Math.min(total / (observers.length * Math.max(ghostCount, 1)), 1);
	});

	let entangleArc = $derived.by(() => {
		const span = Math.PI * 2 * Math.max(entangleDensity, 0.02);
		const r = elapsed * 0.3;
		return arcPath(CX, CY, ENTANGLE_R, -Math.PI / 2 + r, -Math.PI / 2 + r + span, 6);
	});

	// Label positions (outside the ring)
	function labelPos(i: number, count: number): { x: number; y: number } {
		const angle = -Math.PI / 2 + ((i + 0.5) / count) * Math.PI * 2 + elapsed * 0.15;
		const r = OUTER_R + 16;
		return { x: CX + r * Math.cos(angle), y: CY + r * Math.sin(angle) };
	}
</script>

<div class="ring-container">
	<svg
		width={SIZE}
		height={SIZE}
		viewBox="0 0 {SIZE} {SIZE}"
		xmlns="http://www.w3.org/2000/svg"
		class="ring-svg"
	>
		<!-- Background dark disc -->
		<circle cx={CX} cy={CY} r={OUTER_R + 2} fill="rgba(3,3,8,0.75)" />

		<!-- Track arcs (faint) -->
		{#each segments as seg}
			<path d={seg.trackPath} fill="rgba(255,255,255,0.04)" />
		{/each}

		<!-- Filled arcs per observer -->
		{#each segments as seg, i}
			<path
				d={seg.fillPath}
				fill={seg.color}
				opacity={seg.isActive ? 0.85 : 0.45}
				style="filter: drop-shadow(0 0 4px {seg.color}88); transition: opacity 0.3s ease;"
			/>
		{/each}

		<!-- Active observer pulse ring -->
		{#if pulseOpacity > 0}
			<circle
				cx={CX}
				cy={CY}
				r={OUTER_R + 6}
				fill="none"
				stroke={observerColor(pulseObserver, observers.indexOf(pulseObserver))}
				stroke-width="2"
				opacity={pulseOpacity}
				style="transition: opacity 0.05s linear;"
			/>
		{/if}

		<!-- Inner entanglement density ring -->
		<circle cx={CX} cy={CY} r={ENTANGLE_R} fill="none" stroke="rgba(68,102,255,0.12)" stroke-width="6" />
		<path
			d={entangleArc}
			fill="rgba(68,102,255,0.6)"
			style="filter: drop-shadow(0 0 3px #4466ff88);"
		/>

		<!-- Center dot + consciousness label -->
		<circle cx={CX} cy={CY} r={10} fill="rgba(3,3,8,0.9)" />
		<circle
			cx={CX}
			cy={CY}
			r={6}
			fill="#00ffcc"
			opacity={0.3 + 0.7 * entangleDensity}
			style="filter: drop-shadow(0 0 4px #00ffcc);"
		/>

		<!-- Observer labels -->
		{#each segments as seg, i}
			{@const lp = labelPos(i, segments.length)}
			<text
				x={lp.x}
				y={lp.y}
				text-anchor="middle"
				dominant-baseline="middle"
				font-family="JetBrains Mono, monospace"
				font-size="7"
				fill={seg.color}
				opacity={seg.isActive ? 1 : 0.45}
			>{seg.label}</text>
		{/each}

		<!-- Outer border tick marks -->
		{#each Array(36) as _, i}
			{@const angle = (i / 36) * Math.PI * 2 - Math.PI / 2}
			{@const isMajor = i % 9 === 0}
			{@const r1 = OUTER_R + (isMajor ? 3 : 1)}
			{@const r2 = OUTER_R + (isMajor ? 6 : 3)}
			{@const x1 = CX + r1 * Math.cos(angle)}
			{@const y1 = CY + r1 * Math.sin(angle)}
			{@const x2 = CX + r2 * Math.cos(angle)}
			{@const y2 = CY + r2 * Math.sin(angle)}
			<line
				x1={x1} y1={y1}
				x2={x2} y2={y2}
				stroke="rgba(0,255,204,0.2)"
				stroke-width={isMajor ? 1.2 : 0.6}
			/>
		{/each}
	</svg>

	<!-- Label below ring -->
	<div class="ring-label">AWARENESS</div>
</div>

<style>
	.ring-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		pointer-events: none;
		user-select: none;
	}

	.ring-svg {
		overflow: visible;
	}

	.ring-label {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.45rem;
		letter-spacing: 0.25em;
		color: rgba(0, 255, 204, 0.3);
		margin-top: 0.3rem;
		text-transform: uppercase;
	}
</style>
