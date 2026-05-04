<script lang="ts">
	import type { ShipState } from '$lib/flight/ship.js';

	interface Destination {
		name: string;
		distance: number;
		color: string;
		bearing?: number;
	}

	interface Props {
		ship: ShipState;
		locked: boolean;
		nearestBody: string;
		nearestDist: number;
		destinations: Destination[];
		timeElapsed: number;
	}

	let { ship, locked, nearestBody, nearestDist, destinations, timeElapsed }: Props = $props();

	const speedKms = $derived((ship.speed * 7.8).toFixed(1)); // scale to km/s feel
	const altKm = $derived(Math.max(0, (Math.sqrt(ship.position[0]**2 + ship.position[1]**2 + ship.position[2]**2) - 6) * 1000).toFixed(0));
	const throttlePct = $derived(Math.round(ship.throttleLevel * 100));
	const heading = $derived(((ship.rotation.yaw * 180 / Math.PI) % 360 + 360) % 360);
	const pitch = $derived((ship.rotation.pitch * 180 / Math.PI).toFixed(1));
	const missionTime = $derived(formatTime(timeElapsed));

	function formatTime(s: number): string {
		const m = Math.floor(s / 60);
		const sec = Math.floor(s % 60);
		return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
	}
</script>

{#if locked}
<div class="cosmos-hud">
	<!-- Top bar: speed + heading + mission time -->
	<div class="top-bar">
		<div class="top-cell">
			<span class="cell-label">SPD</span>
			<span class="cell-value speed">{speedKms}<span class="unit">km/s</span></span>
		</div>
		<div class="top-cell center">
			<span class="cell-label">HDG</span>
			<span class="cell-value">{heading.toFixed(0).padStart(3, '0')}°</span>
		</div>
		<div class="top-cell right">
			<span class="cell-label">MISSION</span>
			<span class="cell-value">{missionTime}</span>
		</div>
	</div>

	<!-- Left: throttle + altitude -->
	<div class="left-panel">
		<div class="throttle-col">
			<span class="col-label">THR</span>
			<div class="vbar">
				<div class="vbar-fill" style:height="{throttlePct}%" class:boost={ship.boostActive}></div>
			</div>
			<span class="col-val">{throttlePct}%</span>
		</div>
		<div class="alt-readout">
			<span class="col-label">ALT</span>
			<span class="alt-val">{altKm}</span>
			<span class="alt-unit">km</span>
		</div>
		<div class="pitch-readout">
			<span class="col-label">PITCH</span>
			<span class="col-val">{pitch}°</span>
		</div>
	</div>

	<!-- Right: destinations -->
	<div class="right-panel">
		<span class="panel-label">NAV TARGETS</span>
		{#each destinations.sort((a, b) => a.distance - b.distance).slice(0, 6) as dest}
			<div class="dest-row">
				<span class="dest-dot" style:background={dest.color}></span>
				<span class="dest-name">{dest.name}</span>
				<span class="dest-dist">{dest.distance < 10 ? dest.distance.toFixed(1) : dest.distance.toFixed(0)}</span>
			</div>
		{/each}
	</div>

	<!-- Center crosshair -->
	<div class="crosshair">
		<div class="ch-ring"></div>
		<div class="ch-h"></div>
		<div class="ch-v"></div>
		{#if ship.boostActive}
			<div class="boost-indicator">BOOST</div>
		{/if}
	</div>

	<!-- Proximity warning -->
	{#if nearestDist < 12}
		<div class="proximity" class:critical={nearestDist < 4}>
			<span class="prox-icon">⚠</span>
			{nearestBody} — {nearestDist.toFixed(1)}u
		</div>
	{/if}

	<!-- Speed lines (visual effect when fast) -->
	{#if ship.speed > 40}
		<div class="speed-lines" style:opacity={(ship.speed - 40) / 80}></div>
	{/if}
</div>
{/if}

<style>
	.cosmos-hud {
		position: absolute;
		inset: 0;
		pointer-events: none;
		font-family: 'JetBrains Mono', monospace;
		z-index: 45;
	}

	.top-bar {
		position: absolute;
		top: 8px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 2rem;
		padding: 0.3rem 1rem;
		background: rgba(8, 8, 14, 0.7);
		border: 1px solid #1a1a2a;
		border-radius: 4px;
		backdrop-filter: blur(4px);
	}

	.top-cell { display: flex; flex-direction: column; align-items: center; }
	.top-cell.center { min-width: 60px; }
	.top-cell.right { min-width: 60px; }
	.cell-label { font-size: 0.35rem; color: #555; letter-spacing: 0.12em; }
	.cell-value { font-size: 0.7rem; color: #ccc; font-variant-numeric: tabular-nums; }
	.cell-value.speed { color: #00ffcc; }
	.unit { font-size: 0.4rem; color: #555; margin-left: 2px; }

	.left-panel {
		position: absolute;
		left: 12px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem;
		background: rgba(8, 8, 14, 0.6);
		border: 1px solid #1a1a2a;
		border-radius: 4px;
	}

	.throttle-col { display: flex; flex-direction: column; align-items: center; gap: 3px; }
	.col-label { font-size: 0.35rem; color: #555; letter-spacing: 0.1em; }
	.col-val { font-size: 0.5rem; color: #00ffcc88; font-variant-numeric: tabular-nums; }

	.vbar { width: 6px; height: 80px; background: #111; border-radius: 2px; position: relative; overflow: hidden; border: 1px solid #1a1a2a; }
	.vbar-fill { position: absolute; bottom: 0; width: 100%; background: linear-gradient(to top, #00ffcc44, #00ffcc); transition: height 0.1s; }
	.vbar-fill.boost { background: linear-gradient(to top, #ff44aa44, #ff44aa); }

	.alt-readout { text-align: center; }
	.alt-val { font-size: 0.7rem; color: #4466ff; display: block; }
	.alt-unit { font-size: 0.35rem; color: #4466ff88; }

	.pitch-readout { text-align: center; }

	.right-panel {
		position: absolute;
		right: 12px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 0.5rem 0.6rem;
		background: rgba(8, 8, 14, 0.6);
		border: 1px solid #1a1a2a;
		border-radius: 4px;
		min-width: 120px;
	}

	.panel-label { font-size: 0.35rem; color: #555; letter-spacing: 0.12em; margin-bottom: 3px; }

	.dest-row {
		display: flex; align-items: center; gap: 0.4rem;
		font-size: 0.5rem; color: #888;
	}
	.dest-dot { width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0; }
	.dest-name { flex: 1; }
	.dest-dist { color: #555; font-variant-numeric: tabular-nums; font-size: 0.45rem; }

	.crosshair {
		position: absolute;
		top: 50%; left: 50%;
		transform: translate(-50%, -50%);
	}

	.ch-ring {
		width: 30px; height: 30px;
		border: 1px solid #00ffcc33;
		border-radius: 50%;
		position: absolute;
		top: -15px; left: -15px;
	}

	.ch-h {
		position: absolute;
		width: 20px; height: 1px;
		background: #00ffcc44;
		top: 0; left: -10px;
	}

	.ch-v {
		position: absolute;
		width: 1px; height: 20px;
		background: #00ffcc44;
		top: -10px; left: 0;
	}

	.boost-indicator {
		position: absolute;
		top: 20px; left: 50%;
		transform: translateX(-50%);
		font-size: 0.45rem;
		color: #ff44aa;
		letter-spacing: 0.15em;
		animation: blink 0.4s infinite alternate;
	}

	.proximity {
		position: absolute;
		bottom: 60px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.55rem;
		color: #ffcc44;
		letter-spacing: 0.1em;
		padding: 0.3rem 0.8rem;
		background: rgba(255, 204, 68, 0.05);
		border: 1px solid #ffcc4433;
		border-radius: 3px;
		animation: blink 1.5s infinite;
	}

	.proximity.critical {
		color: #ff44aa;
		border-color: #ff44aa44;
		background: rgba(255, 68, 170, 0.05);
		animation: blink 0.5s infinite;
	}

	.prox-icon { margin-right: 0.3rem; }

	@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

	.speed-lines {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at center, transparent 40%, rgba(0, 255, 204, 0.02) 70%, rgba(0, 255, 204, 0.05) 100%);
		pointer-events: none;
	}
</style>
