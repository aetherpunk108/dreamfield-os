<script lang="ts">
	import { onMount } from 'svelte';

	interface TraceEvent {
		type: 'collapse' | 'entangle' | 'observe';
		timestamp: number; // ms since epoch
		id: string;
	}

	interface Props {
		events: TraceEvent[];
		maxHistory?: number; // seconds, default 60
	}

	let { events, maxHistory = 60 }: Props = $props();

	let canvas: HTMLCanvasElement;
	let width = $state(0);
	const HEIGHT = 48;

	let animFrame: number;
	let hoverEvent = $state<TraceEvent | null>(null);
	let hoverX = $state(0);
	let hoverY = $state(0);

	const EVENT_COLORS: Record<string, string> = {
		collapse: '#00ffcc',
		entangle: '#ff44aa',
		observe: '#4466ff'
	};

	// Map timestamp to canvas x coordinate
	function tsToX(ts: number, now: number, w: number): number {
		const maxMs = maxHistory * 1000;
		const age = now - ts;
		return w - (age / maxMs) * w;
	}

	function draw() {
		animFrame = requestAnimationFrame(draw);

		const ctx = canvas.getContext('2d')!;
		ctx.clearRect(0, 0, width, HEIGHT);

		const now = Date.now();
		const maxMs = maxHistory * 1000;
		const cutoff = now - maxMs;

		// Background bar
		ctx.fillStyle = 'rgba(3,3,8,0.7)';
		ctx.fillRect(0, 0, width, HEIGHT);

		// Border lines
		ctx.strokeStyle = 'rgba(0,255,204,0.12)';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(0, HEIGHT - 1);
		ctx.lineTo(width, HEIGHT - 1);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(0, 0);
		ctx.lineTo(width, 0);
		ctx.stroke();

		// Time grid (every 10 seconds)
		ctx.strokeStyle = 'rgba(0,255,204,0.06)';
		ctx.lineWidth = 0.5;
		for (let s = 0; s <= maxHistory; s += 10) {
			const x = width - (s / maxHistory) * width;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, HEIGHT);
			ctx.stroke();

			if (s > 0) {
				ctx.font = '7px JetBrains Mono, monospace';
				ctx.fillStyle = 'rgba(0,255,204,0.2)';
				ctx.textAlign = 'center';
				ctx.fillText(`-${s}s`, x, HEIGHT - 3);
			}
		}

		// Filter relevant events
		const visible = events.filter((e) => e.timestamp >= cutoff);

		// Draw entanglement arcs between same-id events
		const byId = new Map<string, TraceEvent[]>();
		for (const e of visible) {
			if (!byId.has(e.id)) byId.set(e.id, []);
			byId.get(e.id)!.push(e);
		}
		for (const group of byId.values()) {
			if (group.length < 2) continue;
			for (let i = 0; i < group.length - 1; i++) {
				const a = group[i];
				const b = group[i + 1];
				const ax = tsToX(a.timestamp, now, width);
				const bx = tsToX(b.timestamp, now, width);
				const midX = (ax + bx) / 2;
				const midY = HEIGHT / 2 - 12;

				const age = (now - a.timestamp) / maxMs;
				const alpha = Math.max(0, (1 - age) * 0.5);

				ctx.beginPath();
				ctx.moveTo(ax, HEIGHT / 2);
				ctx.quadraticCurveTo(midX, midY, bx, HEIGHT / 2);
				ctx.strokeStyle = `rgba(255,68,170,${alpha})`;
				ctx.lineWidth = 1;
				ctx.stroke();
			}
		}

		// Draw event dots
		for (const evt of visible) {
			const x = tsToX(evt.timestamp, now, width);
			const age = (now - evt.timestamp) / maxMs;
			const alpha = Math.max(0, 1 - age);
			const color = EVENT_COLORS[evt.type] ?? '#ffffff';
			const r = evt.type === 'collapse' ? 4 : evt.type === 'entangle' ? 3.5 : 3;

			// Glow
			const grd = ctx.createRadialGradient(x, HEIGHT / 2, 0, x, HEIGHT / 2, r * 4);
			grd.addColorStop(0, color.replace('#', 'rgba(') + `,${alpha * 0.35})`
				.replace('rgba(', 'rgba(')
			);
			grd.addColorStop(1, 'rgba(0,0,0,0)');

			// Use hex parsing for glow gradient
			const hex = color.slice(1);
			const rc = parseInt(hex.slice(0, 2), 16);
			const gc = parseInt(hex.slice(2, 4), 16);
			const bc = parseInt(hex.slice(4, 6), 16);
			const grdClean = ctx.createRadialGradient(x, HEIGHT / 2, 0, x, HEIGHT / 2, r * 4);
			grdClean.addColorStop(0, `rgba(${rc},${gc},${bc},${alpha * 0.35})`);
			grdClean.addColorStop(1, 'rgba(0,0,0,0)');

			ctx.beginPath();
			ctx.arc(x, HEIGHT / 2, r * 4, 0, Math.PI * 2);
			ctx.fillStyle = grdClean;
			ctx.fill();

			// Dot
			ctx.beginPath();
			ctx.arc(x, HEIGHT / 2, r, 0, Math.PI * 2);
			ctx.fillStyle = `rgba(${rc},${gc},${bc},${alpha})`;
			ctx.fill();

			// Strength ring (newest events get a bright ring)
			if (alpha > 0.7) {
				ctx.beginPath();
				ctx.arc(x, HEIGHT / 2, r + 2, 0, Math.PI * 2);
				ctx.strokeStyle = `rgba(${rc},${gc},${bc},${(alpha - 0.7) * 0.8})`;
				ctx.lineWidth = 1;
				ctx.stroke();
			}
		}

		// "NOW" indicator — vertical line at right edge
		const nowX = width - 2;
		ctx.beginPath();
		ctx.moveTo(nowX, 0);
		ctx.lineTo(nowX, HEIGHT);
		ctx.strokeStyle = 'rgba(0,255,204,0.6)';
		ctx.lineWidth = 1.5;
		ctx.stroke();

		// Small triangle at now indicator
		ctx.beginPath();
		ctx.moveTo(nowX, 0);
		ctx.lineTo(nowX - 5, 7);
		ctx.lineTo(nowX + 5, 7);
		ctx.closePath();
		ctx.fillStyle = 'rgba(0,255,204,0.6)';
		ctx.fill();

		// Label
		ctx.font = '7px JetBrains Mono, monospace';
		ctx.fillStyle = 'rgba(0,255,204,0.35)';
		ctx.textAlign = 'left';
		ctx.fillText('TEMPORAL TRACE', 8, 10);

		ctx.textAlign = 'right';
		ctx.fillText(`${visible.length} EVT`, width - 14, 10);
	}

	function handleMouseMove(e: MouseEvent) {
		const rect = canvas.getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;

		const now = Date.now();
		const maxMs = maxHistory * 1000;
		const cutoff = now - maxMs;
		const visible = events.filter((ev) => ev.timestamp >= cutoff);

		let closest: TraceEvent | null = null;
		let closestDist = 14;

		for (const evt of visible) {
			const x = tsToX(evt.timestamp, now, width);
			const dist = Math.abs(x - mx);
			if (dist < closestDist) {
				closestDist = dist;
				closest = evt;
			}
		}

		hoverEvent = closest;
		hoverX = mx;
		hoverY = my;
	}

	function handleMouseLeave() {
		hoverEvent = null;
	}

	onMount(() => {
		const ro = new ResizeObserver(() => {
			width = canvas.offsetWidth;
			canvas.width = width;
			canvas.height = HEIGHT;
		});
		ro.observe(canvas.parentElement!);
		width = canvas.offsetWidth;
		canvas.width = width;
		canvas.height = HEIGHT;

		draw();

		return () => {
			cancelAnimationFrame(animFrame);
			ro.disconnect();
		};
	});
</script>

<div class="trace-wrap">
	<canvas
		bind:this={canvas}
		height={HEIGHT}
		class="trace-canvas"
		onmousemove={handleMouseMove}
		onmouseleave={handleMouseLeave}
	></canvas>

	{#if hoverEvent}
		<div
			class="tooltip"
			style="left: {Math.min(hoverX, width - 130)}px; top: {HEIGHT + 4}px;"
		>
			<span class="tt-type" style="color: {EVENT_COLORS[hoverEvent.type] ?? '#fff'}"
				>{hoverEvent.type.toUpperCase()}</span
			>
			<span class="tt-id">{hoverEvent.id.slice(0, 12)}</span>
			<span class="tt-time"
				>{new Date(hoverEvent.timestamp).toLocaleTimeString('en', {
					hour12: false,
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit'
				})}</span
			>
		</div>
	{/if}
</div>

<style>
	.trace-wrap {
		position: relative;
		width: 100%;
		pointer-events: auto;
	}

	.trace-canvas {
		display: block;
		width: 100%;
		height: 48px;
		cursor: crosshair;
	}

	.tooltip {
		position: absolute;
		background: rgba(3, 3, 8, 0.92);
		border: 1px solid rgba(0, 255, 204, 0.2);
		padding: 0.3rem 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		pointer-events: none;
		z-index: 20;
	}

	.tt-type {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		letter-spacing: 0.1em;
		font-weight: 600;
	}

	.tt-id {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.5rem;
		color: rgba(255, 255, 255, 0.5);
		letter-spacing: 0.05em;
	}

	.tt-time {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.45rem;
		color: rgba(0, 255, 204, 0.4);
		letter-spacing: 0.08em;
	}
</style>
