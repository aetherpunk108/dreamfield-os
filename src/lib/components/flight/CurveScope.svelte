<script lang="ts">
	import { onMount } from 'svelte';
	import { sampleCurve, type CurveConfig, type CurveType, CURVE_PRESETS, createCurve } from '$lib/flight/curves.js';

	interface Props {
		config: CurveConfig;
		currentInput?: number;
		label?: string;
		onchange?: (type: CurveType) => void;
	}

	let { config, currentInput = 0, label = 'SENS', onchange }: Props = $props();

	let canvas: HTMLCanvasElement;
	let animFrame: number;

	const curveOrder: CurveType[] = ['LINEAR', 'SMOOTH_START', 'SMOOTH_END', 'S_SHAPE', 'CUSTOM'];

	function cyclePreset() {
		const idx = curveOrder.indexOf(config.type);
		const next = curveOrder[(idx + 1) % curveOrder.length];
		onchange?.(next);
	}

	onMount(() => {
		const ctx = canvas.getContext('2d')!;
		const w = canvas.width;
		const h = canvas.height;

		function draw() {
			ctx.clearRect(0, 0, w, h);

			// Background grid (retro oscilloscope)
			ctx.strokeStyle = '#0a2a1a';
			ctx.lineWidth = 0.5;
			for (let i = 0; i <= 8; i++) {
				const x = (i / 8) * w;
				const y = (i / 8) * h;
				ctx.beginPath();
				ctx.moveTo(x, 0); ctx.lineTo(x, h);
				ctx.moveTo(0, y); ctx.lineTo(w, y);
				ctx.stroke();
			}

			// Curve line
			const points = sampleCurve(config, 48);
			ctx.strokeStyle = '#00ffcc';
			ctx.lineWidth = 1.5;
			ctx.shadowColor = '#00ffcc';
			ctx.shadowBlur = 4;
			ctx.beginPath();
			for (let i = 0; i < points.length; i++) {
				const x = points[i][0] * w;
				const y = h - points[i][1] * h;
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
			ctx.shadowBlur = 0;

			// Current input dot
			if (Math.abs(currentInput) > 0.01) {
				const absInput = Math.abs(currentInput);
				const output = sampleCurve(config, 1).length > 0 ?
					points[Math.round(absInput * 48)]?.[1] ?? 0 : 0;
				const dotX = absInput * w;
				const dotY = h - output * h;

				ctx.fillStyle = '#ff44aa';
				ctx.shadowColor = '#ff44aa';
				ctx.shadowBlur = 6;
				ctx.beginPath();
				ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
				ctx.fill();
				ctx.shadowBlur = 0;

				// Crosshair lines to dot
				ctx.strokeStyle = '#ff44aa44';
				ctx.lineWidth = 0.5;
				ctx.setLineDash([2, 2]);
				ctx.beginPath();
				ctx.moveTo(dotX, h); ctx.lineTo(dotX, dotY);
				ctx.moveTo(0, dotY); ctx.lineTo(dotX, dotY);
				ctx.stroke();
				ctx.setLineDash([]);
			}

			// Linear reference (faint diagonal)
			ctx.strokeStyle = '#ffffff08';
			ctx.lineWidth = 0.5;
			ctx.beginPath();
			ctx.moveTo(0, h);
			ctx.lineTo(w, 0);
			ctx.stroke();

			animFrame = requestAnimationFrame(draw);
		}

		draw();
		return () => cancelAnimationFrame(animFrame);
	});
</script>

<div class="scope-container">
	<div class="scope-header">
		<span class="scope-label">{label}</span>
		<span class="scope-value">{Math.abs(currentInput).toFixed(2)}</span>
	</div>
	<canvas bind:this={canvas} width={96} height={64} class="scope-canvas"></canvas>
	<button class="scope-preset" onclick={cyclePreset}>
		<span class="waveform-icon">∿</span>
		<span class="preset-name">{config.type.replace('_', ' ')}</span>
	</button>
</div>

<style>
	.scope-container {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 4px;
		background: #080810;
		border: 1px solid #1a1a2a;
		border-radius: 3px;
		width: 104px;
	}

	.scope-header {
		display: flex;
		justify-content: space-between;
		font-size: 0.45rem;
		letter-spacing: 0.1em;
	}

	.scope-label { color: #555; }
	.scope-value { color: #00ffcc; font-variant-numeric: tabular-nums; }

	.scope-canvas {
		border-radius: 2px;
		background: #040408;
		border: 1px solid #111;
	}

	.scope-preset {
		display: flex;
		align-items: center;
		gap: 3px;
		background: #0a0a14;
		border: 1px solid #1a1a2a;
		border-radius: 2px;
		padding: 2px 4px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.scope-preset:hover {
		border-color: #00ffcc44;
		background: #00ffcc08;
	}

	.waveform-icon { font-size: 0.7rem; color: #00ffcc66; }
	.preset-name { font-size: 0.4rem; color: #666; letter-spacing: 0.05em; font-family: inherit; }
</style>
