<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		observerId: string;
		ghostCount: number;
		collapsedCount: number;
	}

	let { observerId, ghostCount, collapsedCount }: Props = $props();

	let uptime = $state(0);
	let frameTime = $state('0.0');

	onMount(() => {
		const interval = setInterval(() => {
			uptime += 1;
		}, 1000);

		let lastTime = performance.now();
		let rafId: number;
		const measureFrame = () => {
			const now = performance.now();
			frameTime = (now - lastTime).toFixed(1);
			lastTime = now;
			rafId = requestAnimationFrame(measureFrame);
		};
		rafId = requestAnimationFrame(measureFrame);

		return () => {
			clearInterval(interval);
			cancelAnimationFrame(rafId);
		};
	});

	function formatUptime(s: number): string {
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
	}
</script>

<div class="hud">
	<!-- Top left: System title -->
	<div class="hud-block top-left">
		<h1 class="title">DREAMFIELD <span class="accent">OS</span></h1>
		<p class="subtitle">SPATIAL BRIDGE v0.0.1</p>
	</div>

	<!-- Top right: System stats -->
	<div class="hud-block top-right">
		<div class="stat-row">
			<span class="label">UPTIME</span>
			<span class="value">{formatUptime(uptime)}</span>
		</div>
		<div class="stat-row">
			<span class="label">FRAME</span>
			<span class="value">{frameTime}ms</span>
		</div>
		<div class="stat-row">
			<span class="label">OBSERVER</span>
			<span class="value accent">{observerId.toUpperCase()}</span>
		</div>
	</div>

	<!-- Bottom left: Field status -->
	<div class="hud-block bottom-left">
		<div class="stat-row">
			<span class="indicator" class:active={true}></span>
			<span class="label">GHOSTS</span>
			<span class="value">{ghostCount}</span>
		</div>
		<div class="stat-row">
			<span class="indicator" class:active={collapsedCount > 0}></span>
			<span class="label">COLLAPSED</span>
			<span class="value">{collapsedCount}/{ghostCount}</span>
		</div>
		<div class="stat-row">
			<span class="indicator active"></span>
			<span class="label">ENTANGLEMENT</span>
			<span class="value">ACTIVE</span>
		</div>
	</div>

	<!-- Bottom center: Instructions -->
	<div class="hud-block bottom-center">
		<p class="hint">[ CLICK GHOST TO COLLAPSE ] [ DRAG TO ORBIT ] [ SCROLL TO ZOOM ]</p>
	</div>

	<!-- Corner decorations -->
	<div class="corner tl"></div>
	<div class="corner tr"></div>
	<div class="corner bl"></div>
	<div class="corner br"></div>

	<!-- Scanline overlay -->
	<div class="scanlines"></div>
</div>

<style>
	.hud {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 10;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
	}

	.hud-block {
		position: absolute;
		padding: 1.2rem;
	}

	.top-left { top: 0; left: 0; }
	.top-right { top: 0; right: 0; text-align: right; }
	.bottom-left { bottom: 0; left: 0; }
	.bottom-center {
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		padding-bottom: 1.5rem;
	}

	.title {
		font-size: 1.4rem;
		font-weight: 200;
		letter-spacing: 0.3em;
		margin: 0;
		text-shadow: 0 0 20px #00ffcc33;
	}

	.accent { color: #00ffcc; }

	.subtitle {
		font-size: 0.55rem;
		letter-spacing: 0.25em;
		opacity: 0.35;
		margin-top: 0.3rem;
	}

	.stat-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		padding: 0.15rem 0;
	}

	.label {
		opacity: 0.4;
		min-width: 5rem;
		text-transform: uppercase;
	}

	.value {
		opacity: 0.8;
		font-variant-numeric: tabular-nums;
	}

	.indicator {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #333;
		flex-shrink: 0;
	}

	.indicator.active {
		background: #00ffcc;
		box-shadow: 0 0 6px #00ffcc88;
	}

	.hint {
		font-size: 0.5rem;
		letter-spacing: 0.15em;
		opacity: 0.2;
		text-align: center;
	}

	/* Corner brackets */
	.corner {
		position: absolute;
		width: 20px;
		height: 20px;
		border-color: #00ffcc22;
		border-style: solid;
		border-width: 0;
	}
	.corner.tl { top: 8px; left: 8px; border-top-width: 1px; border-left-width: 1px; }
	.corner.tr { top: 8px; right: 8px; border-top-width: 1px; border-right-width: 1px; }
	.corner.bl { bottom: 8px; left: 8px; border-bottom-width: 1px; border-left-width: 1px; }
	.corner.br { bottom: 8px; right: 8px; border-bottom-width: 1px; border-right-width: 1px; }

	/* Scanline effect */
	.scanlines {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 2px,
			rgba(0, 255, 204, 0.008) 2px,
			rgba(0, 255, 204, 0.008) 4px
		);
		pointer-events: none;
	}
</style>
