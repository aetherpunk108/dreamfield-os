<script lang="ts">
	import { onMount } from 'svelte';
	import type { Ghost } from '$lib/spatial/primitives/ghost.js';
	import type { TrinaryState } from '$lib/spatial/state.js';

	interface Props {
		ghosts: Ghost[];
		getState: (id: string) => TrinaryState;
		size?: number;
	}

	let { ghosts, getState, size = 140 }: Props = $props();

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null = null;
	let scanAngle = $state(0);
	let rafId: number;

	onMount(() => {
		ctx = canvas.getContext('2d');
		const dpr = window.devicePixelRatio || 1;
		canvas.width = size * dpr;
		canvas.height = size * dpr;
		ctx?.scale(dpr, dpr);

		const draw = () => {
			rafId = requestAnimationFrame(draw);
			scanAngle += 0.02;
			render();
		};
		draw();

		return () => cancelAnimationFrame(rafId);
	});

	function render() {
		if (!ctx) return;
		const cx = size / 2;
		const cy = size / 2;
		const r = size / 2 - 8;

		// Clear
		ctx.clearRect(0, 0, size, size);

		// Background
		ctx.fillStyle = 'rgba(5, 5, 12, 0.85)';
		ctx.beginPath();
		ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
		ctx.fill();

		// Ring
		ctx.strokeStyle = 'rgba(0, 255, 204, 0.15)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.stroke();

		// Inner rings
		for (const div of [0.33, 0.66]) {
			ctx.strokeStyle = 'rgba(0, 255, 204, 0.06)';
			ctx.beginPath();
			ctx.arc(cx, cy, r * div, 0, Math.PI * 2);
			ctx.stroke();
		}

		// Crosshairs
		ctx.strokeStyle = 'rgba(0, 255, 204, 0.08)';
		ctx.beginPath();
		ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
		ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
		ctx.stroke();

		// Scan sweep
		const grad = ctx.createConicGradient(scanAngle, cx, cy);
		grad.addColorStop(0, 'rgba(0, 255, 204, 0.12)');
		grad.addColorStop(0.15, 'rgba(0, 255, 204, 0)');
		grad.addColorStop(1, 'rgba(0, 255, 204, 0)');
		ctx.fillStyle = grad;
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, Math.PI * 2);
		ctx.fill();

		// Scan line
		ctx.strokeStyle = 'rgba(0, 255, 204, 0.5)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(cx, cy);
		ctx.lineTo(
			cx + Math.cos(scanAngle) * r,
			cy + Math.sin(scanAngle) * r
		);
		ctx.stroke();

		// Ghost blips
		const mapScale = r / 8;
		for (const ghost of ghosts) {
			const gx = cx + ghost.position[0] * mapScale;
			const gz = cy + ghost.position[2] * mapScale;

			if (Math.hypot(gx - cx, gz - cy) > r) continue;

			const triState = getState(ghost.id);
			const blipSize = triState === 1 ? 3.5 : 2;

			ctx.fillStyle = triState === 1
				? `rgba(${ghost.color[0]*255}, ${ghost.color[1]*255}, ${ghost.color[2]*255}, 0.9)`
				: 'rgba(255, 255, 255, 0.3)';

			ctx.beginPath();
			ctx.arc(gx, gz, blipSize, 0, Math.PI * 2);
			ctx.fill();

			// Glow
			if (triState === 1) {
				ctx.fillStyle = `rgba(${ghost.color[0]*255}, ${ghost.color[1]*255}, ${ghost.color[2]*255}, 0.15)`;
				ctx.beginPath();
				ctx.arc(gx, gz, blipSize * 3, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// Center dot
		ctx.fillStyle = 'rgba(0, 255, 204, 0.8)';
		ctx.beginPath();
		ctx.arc(cx, cy, 2, 0, Math.PI * 2);
		ctx.fill();
	}
</script>

<div class="radar-container" style="width: {size}px; height: {size}px;">
	<canvas bind:this={canvas} style="width: {size}px; height: {size}px;"></canvas>
	<span class="label">SPATIAL RADAR</span>
</div>

<style>
	.radar-container {
		position: fixed;
		bottom: 2rem;
		left: 2rem;
		z-index: 50;
		pointer-events: none;
	}

	canvas {
		border-radius: 50%;
	}

	.label {
		display: block;
		text-align: center;
		font-size: 0.45rem;
		letter-spacing: 0.15em;
		color: rgba(0, 255, 204, 0.3);
		margin-top: 0.3rem;
	}
</style>
