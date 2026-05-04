<script lang="ts">
	import type { ShipState } from '$lib/flight/ship.js';
	import type { FlightConfig } from '$lib/flight/input.js';
	import CurveScope from './CurveScope.svelte';
	import type { CurveType } from '$lib/flight/curves.js';
	import { createCurve } from '$lib/flight/curves.js';

	interface Props {
		ship: ShipState;
		flightConfig: FlightConfig;
		rawInput?: { pitch: number; yaw: number; roll: number; throttle: number };
		oncurvechange?: (axis: string, type: CurveType) => void;
	}

	let { ship, flightConfig, rawInput = { pitch: 0, yaw: 0, roll: 0, throttle: 0 }, oncurvechange }: Props = $props();

	const speedPct = $derived(Math.min(100, (ship.speed / 50) * 100));
	const throttlePct = $derived(Math.round(ship.throttleLevel * 100));
	const altitudeStr = $derived(ship.position[1].toFixed(1));
	const heading = $derived(((ship.rotation.yaw * 180 / Math.PI) % 360 + 360) % 360);
</script>

<div class="flight-hud">
	<!-- Throttle bar (left side) -->
	<div class="throttle-rail">
		<div class="throttle-label">THR</div>
		<div class="throttle-bar">
			<div class="throttle-fill" style:height="{throttlePct}%"
				class:boost={ship.boostActive}></div>
			{#each Array(10) as _, i}
				<div class="throttle-tick" style:bottom="{i * 10}%"></div>
			{/each}
		</div>
		<div class="throttle-value">{throttlePct}%</div>
	</div>

	<!-- Speed indicator (top-left) -->
	<div class="speed-display">
		<div class="speed-value">{ship.speed.toFixed(1)}</div>
		<div class="speed-label">M/S</div>
		<div class="speed-bar">
			<div class="speed-fill" style:width="{speedPct}%"></div>
		</div>
	</div>

	<!-- Heading (top-center) -->
	<div class="heading-display">
		<div class="heading-value">{heading.toFixed(0).padStart(3, '0')}°</div>
		<div class="heading-label">HDG</div>
	</div>

	<!-- Altitude (top-right) -->
	<div class="alt-display">
		<div class="alt-value">{altitudeStr}</div>
		<div class="alt-label">ALT</div>
	</div>

	<!-- Attitude indicator (center) -->
	<div class="attitude">
		<div class="crosshair"></div>
		<div class="pitch-indicator" style:transform="translateY({ship.rotation.pitch * 30}px)">
			{#each [-20, -10, 0, 10, 20] as deg}
				<div class="pitch-line" style:transform="translateY({deg * 1.5}px)">
					<span>{deg}</span>
				</div>
			{/each}
		</div>
		<div class="roll-indicator" style:transform="rotate({ship.rotation.roll}rad)">
			<div class="roll-wing left"></div>
			<div class="roll-wing right"></div>
		</div>
	</div>

	<!-- Afterburner flash -->
	{#if ship.afterburnerFlash > 0}
		<div class="afterburner" style:opacity={ship.afterburnerFlash}>
			AFTERBURNER
		</div>
	{/if}

	<!-- Curve scopes (bottom-right panel) -->
	<div class="curves-panel">
		<div class="curves-title">PRESSURE CURVES</div>
		<div class="curves-row">
			<CurveScope
				config={flightConfig.yawCurve}
				currentInput={rawInput.yaw}
				label="YAW"
				onchange={(t) => oncurvechange?.('yaw', t)}
			/>
			<CurveScope
				config={flightConfig.pitchCurve}
				currentInput={rawInput.pitch}
				label="PITCH"
				onchange={(t) => oncurvechange?.('pitch', t)}
			/>
			<CurveScope
				config={flightConfig.throttleCurve}
				currentInput={rawInput.throttle}
				label="THROTTLE"
				onchange={(t) => oncurvechange?.('throttle', t)}
			/>
		</div>
	</div>
</div>

<style>
	.flight-hud {
		position: absolute;
		inset: 0;
		pointer-events: none;
		font-family: 'JetBrains Mono', monospace;
		z-index: 40;
	}

	/* Throttle rail */
	.throttle-rail {
		position: absolute;
		left: 16px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.throttle-label { font-size: 0.45rem; color: #555; letter-spacing: 0.1em; }

	.throttle-bar {
		width: 8px;
		height: 120px;
		background: #0a0a14;
		border: 1px solid #1a1a2a;
		border-radius: 2px;
		position: relative;
		overflow: hidden;
	}

	.throttle-fill {
		position: absolute;
		bottom: 0;
		width: 100%;
		background: linear-gradient(to top, #00ffcc44, #00ffcc);
		transition: height 0.1s;
		border-radius: 1px;
	}

	.throttle-fill.boost {
		background: linear-gradient(to top, #ff44aa44, #ff44aa);
		box-shadow: 0 0 8px #ff44aa66;
	}

	.throttle-tick {
		position: absolute;
		left: 0;
		width: 3px;
		height: 1px;
		background: #333;
	}

	.throttle-value { font-size: 0.5rem; color: #00ffcc88; font-variant-numeric: tabular-nums; }

	/* Speed */
	.speed-display {
		position: absolute;
		top: 40px;
		left: 50px;
	}

	.speed-value { font-size: 1rem; color: #00ffcc; font-weight: 300; }
	.speed-label { font-size: 0.4rem; color: #555; letter-spacing: 0.1em; }

	.speed-bar {
		width: 80px;
		height: 2px;
		background: #1a1a2a;
		margin-top: 4px;
		border-radius: 1px;
		overflow: hidden;
	}

	.speed-fill {
		height: 100%;
		background: #00ffcc;
		transition: width 0.1s;
	}

	/* Heading */
	.heading-display {
		position: absolute;
		top: 12px;
		left: 50%;
		transform: translateX(-50%);
		text-align: center;
	}

	.heading-value { font-size: 0.8rem; color: #ccc; letter-spacing: 0.05em; }
	.heading-label { font-size: 0.4rem; color: #444; letter-spacing: 0.1em; }

	/* Altitude */
	.alt-display {
		position: absolute;
		top: 40px;
		right: 50px;
		text-align: right;
	}

	.alt-value { font-size: 1rem; color: #4466ff; font-weight: 300; }
	.alt-label { font-size: 0.4rem; color: #555; letter-spacing: 0.1em; }

	/* Attitude */
	.attitude {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 160px;
		height: 120px;
		overflow: hidden;
	}

	.crosshair {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 40px;
		height: 40px;
		border: 1px solid #00ffcc33;
		border-radius: 50%;
	}

	.crosshair::before, .crosshair::after {
		content: '';
		position: absolute;
		background: #00ffcc55;
	}

	.crosshair::before {
		width: 12px; height: 1px;
		top: 50%; left: -8px;
		transform: translateY(-50%);
	}

	.crosshair::after {
		width: 1px; height: 12px;
		left: 50%; top: -8px;
		transform: translateX(-50%);
	}

	.pitch-indicator {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		transition: transform 0.1s;
	}

	.pitch-line {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 60px;
		height: 1px;
		background: #ffffff15;
		margin: 0 auto;
		position: relative;
	}

	.pitch-line span {
		position: absolute;
		right: -20px;
		font-size: 0.35rem;
		color: #444;
	}

	.roll-indicator {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 80px;
		height: 2px;
		transition: transform 0.1s;
	}

	.roll-wing {
		position: absolute;
		top: 0;
		width: 20px;
		height: 1px;
		background: #00ffcc66;
	}

	.roll-wing.left { left: 0; }
	.roll-wing.right { right: 0; }

	/* Afterburner */
	.afterburner {
		position: absolute;
		bottom: 80px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.55rem;
		letter-spacing: 0.2em;
		color: #ff44aa;
		text-shadow: 0 0 10px #ff44aa88;
		animation: flashText 0.3s ease-in-out infinite alternate;
	}

	@keyframes flashText { from { opacity: 0.7; } to { opacity: 1; } }

	/* Curves panel */
	.curves-panel {
		position: absolute;
		bottom: 16px;
		right: 16px;
		pointer-events: all;
	}

	.curves-title {
		font-size: 0.45rem;
		color: #444;
		letter-spacing: 0.12em;
		margin-bottom: 4px;
	}

	.curves-row {
		display: flex;
		gap: 4px;
	}
</style>
