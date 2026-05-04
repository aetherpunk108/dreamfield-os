<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		earthRotation: number;
		moonPhase: number;
		currentPhase: number;
		onnavigate: (mode: string) => void;
	}

	let { earthRotation, moonPhase, currentPhase, onnavigate }: Props = $props();

	// Animated display values
	let displayRotation = $state(0);
	let displayPhase = $state(0);
	let displayVelocity = $state(0);

	// Ticker state
	let tickerIndex = $state(0);
	let tickerVisible = $state(true);

	const FACTS = [
		'EARTH ORBITS SUN AT 29.78 KM/S — FASTER THAN ANY HUMAN-MADE OBJECT',
		'THE MOON IS SLOWLY DRIFTING AWAY FROM EARTH AT 3.8 CM/YEAR',
		'A QUANTUM BIT CAN BE 0 AND 1 SIMULTANEOUSLY UNTIL OBSERVED',
		'THE OBSERVABLE UNIVERSE CONTAINS ~2 TRILLION GALAXIES',
		'LIGHT FROM THE SUN TAKES 8 MIN 20 SEC TO REACH EARTH',
		'ENTANGLEMENT CORRELATIONS ARE INSTANTANEOUS REGARDLESS OF DISTANCE',
		'EARTH HAS COMPLETED ~4.5 BILLION ORBITS SINCE FORMATION',
		'THE DREAMFIELD OCCUPIES 0 PHYSICAL SPACE BUT INFINITE LOGICAL SPACE',
		'PLANCK LENGTH: 1.616 × 10⁻³⁵ M — THE SMALLEST MEANINGFUL DISTANCE',
		'OCTREE SUBDIVISION REDUCES SPATIAL QUERIES FROM O(N) TO O(LOG N)',
	];

	const PHASES = [
		'FOUNDATION', 'RENDERING', 'BACKEND', 'GEOSPATIAL',
		'GUI POLISH', 'ADVANCED', 'INTEGRATION', 'DEPLOYMENT', 'RELEASE',
	];

	const NAV_BUTTONS = [
		{ label: 'OBSERVE', mode: 'spatial',    key: 'O' },
		{ label: 'ORBIT',   mode: 'orrery',     key: 'R' },
		{ label: 'FLY',     mode: 'flight',     key: 'F' },
		{ label: 'SCAN',    mode: 'dashboard',  key: 'S' },
	];

	// Phase ring geometry
	const RING_R = 22;
	const RING_CIRC = $derived(2 * Math.PI * RING_R);
	const ringDash = $derived((currentPhase / 9) * RING_CIRC);

	// Moon phase label
	const moonPhaseLabel = $derived(() => {
		const p = ((moonPhase % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
		const t = p / (2 * Math.PI);
		if (t < 0.0625 || t >= 0.9375) return 'NEW';
		if (t < 0.1875) return 'WAXING CRESCENT';
		if (t < 0.3125) return 'FIRST QUARTER';
		if (t < 0.4375) return 'WAXING GIBBOUS';
		if (t < 0.5625) return 'FULL';
		if (t < 0.6875) return 'WANING GIBBOUS';
		if (t < 0.8125) return 'LAST QUARTER';
		return 'WANING CRESCENT';
	});

	// Fake geodetic coords derived from earthRotation
	const geoLat = $derived(Math.sin(earthRotation * 0.7) * 28.5);
	const geoLon = $derived(((earthRotation * (180 / Math.PI)) % 360 + 360) % 360 - 180);
	const geoAlt = $derived(408 + Math.sin(earthRotation * 1.3) * 12);

	function fmt(n: number, dec = 1): string {
		return n.toFixed(dec);
	}

	function fmtDeg(n: number): string {
		return `${n >= 0 ? '+' : ''}${fmt(n, 2)}°`;
	}

	// Smooth animated display values
	$effect(() => {
		const target = earthRotation * (180 / Math.PI);
		displayRotation = target;
	});

	$effect(() => {
		displayPhase = moonPhase;
	});

	$effect(() => {
		// Orbital velocity: LEO ~7.8 km/s, vary slightly
		displayVelocity = 7.78 + Math.sin(earthRotation * 2.1) * 0.04;
	});

	onMount(() => {
		// Ticker rotation every 5s with fade transition
		const tick = setInterval(() => {
			tickerVisible = false;
			setTimeout(() => {
				tickerIndex = (tickerIndex + 1) % FACTS.length;
				tickerVisible = true;
			}, 400);
		}, 5000);

		return () => clearInterval(tick);
	});

	function handleKey(e: KeyboardEvent) {
		const btn = NAV_BUTTONS.find(b => b.key === e.key.toUpperCase());
		if (btn) onnavigate(btn.mode);
	}
</script>

<svelte:window onkeydown={handleKey} />

<div class="hud">

	<!-- Top: Fact ticker -->
	<div class="ticker-bar">
		<span class="ticker-label">SYS//INFO</span>
		<span class="ticker-text" class:visible={tickerVisible}>{FACTS[tickerIndex]}</span>
	</div>

	<!-- Top-left: Orbital telemetry -->
	<div class="hud-block top-left">
		<div class="block-title">ORBITAL TELEMETRY</div>
		<div class="stat-row">
			<span class="label">EARTH ROT</span>
			<span class="value primary">{fmt(displayRotation % 360, 2)}°</span>
		</div>
		<div class="stat-row">
			<span class="label">MOON PHASE</span>
			<span class="value secondary">{moonPhaseLabel()}</span>
		</div>
		<div class="stat-row">
			<span class="label">ORB VELOCITY</span>
			<span class="value accent">{fmt(displayVelocity, 2)} KM/S</span>
		</div>
		<div class="stat-row">
			<span class="label">INCLINATION</span>
			<span class="value primary">{fmt(51.6 + Math.sin(earthRotation) * 0.1, 1)}°</span>
		</div>
	</div>

	<!-- Bottom-left: Geodetic coordinates -->
	<div class="hud-block bottom-left">
		<div class="block-title">GEODETIC POSITION</div>
		<div class="stat-row">
			<span class="label">LAT</span>
			<span class="value primary">{fmtDeg(geoLat)}</span>
		</div>
		<div class="stat-row">
			<span class="label">LON</span>
			<span class="value primary">{fmtDeg(geoLon)}</span>
		</div>
		<div class="stat-row">
			<span class="label">ALT</span>
			<span class="value secondary">{fmt(geoAlt, 1)} KM</span>
		</div>
		<div class="stat-row">
			<span class="label">FRAME</span>
			<span class="value accent">GEO/ECI</span>
		</div>
	</div>

	<!-- Bottom-center: Phase indicator -->
	<div class="hud-block bottom-center">
		<div class="phase-ring-wrap">
			<svg class="phase-ring" viewBox="0 0 56 56" width="56" height="56">
				<circle class="ring-bg" cx="28" cy="28" r={RING_R} />
				<circle
					class="ring-fill"
					cx="28" cy="28"
					r={RING_R}
					stroke-dasharray="{ringDash} {RING_CIRC}"
					stroke-dashoffset={RING_CIRC / 4}
				/>
				<text class="ring-num" x="28" y="32" text-anchor="middle">{currentPhase}</text>
			</svg>
			<div class="phase-info">
				<div class="phase-name">{PHASES[Math.min(currentPhase - 1, 8)]}</div>
				<div class="phase-sub">PHASE {currentPhase} / 9</div>
			</div>
		</div>
	</div>

	<!-- Right: Quick-nav buttons -->
	<div class="nav-stack">
		{#each NAV_BUTTONS as btn}
			<button
				class="nav-btn"
				class:active={btn.mode === 'orrery'}
				onclick={() => onnavigate(btn.mode)}
			>
				<span class="nav-key">[{btn.key}]</span>
				<span class="nav-label">{btn.label}</span>
			</button>
		{/each}
	</div>

	<!-- Corner decorations -->
	<div class="corner tl"></div>
	<div class="corner tr"></div>
	<div class="corner bl"></div>
	<div class="corner br"></div>

	<!-- Scanlines -->
	<div class="scanlines"></div>
</div>

<style>
	.hud {
		position: absolute;
		inset: 0;
		pointer-events: none;
		z-index: 10;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		color: rgba(255, 255, 255, 0.75);
	}

	/* ── Ticker ── */
	.ticker-bar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.55rem 1.2rem;
		border-bottom: 1px solid rgba(0, 255, 204, 0.08);
		background: linear-gradient(180deg, rgba(0,0,0,0.25) 0%, transparent 100%);
		overflow: hidden;
	}

	.ticker-label {
		font-size: 0.45rem;
		letter-spacing: 0.2em;
		color: #4466ff;
		opacity: 0.7;
		flex-shrink: 0;
	}

	.ticker-text {
		font-size: 0.5rem;
		letter-spacing: 0.12em;
		opacity: 0;
		color: rgba(255, 255, 255, 0.5);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: opacity 0.4s ease;
	}

	.ticker-text.visible {
		opacity: 1;
	}

	/* ── Blocks ── */
	.hud-block {
		position: absolute;
		padding: 1.2rem;
	}

	.top-left    { top: 2.2rem; left: 0; }
	.bottom-left { bottom: 0; left: 0; }
	.bottom-center {
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		padding-bottom: 1.5rem;
	}

	.block-title {
		font-size: 0.45rem;
		letter-spacing: 0.25em;
		color: #4466ff;
		opacity: 0.6;
		margin-bottom: 0.55rem;
		text-transform: uppercase;
	}

	/* ── Stat rows ── */
	.stat-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.6rem;
		letter-spacing: 0.08em;
		padding: 0.15rem 0;
	}

	.label {
		opacity: 0.35;
		min-width: 6rem;
		text-transform: uppercase;
	}

	.value {
		opacity: 0.85;
		font-variant-numeric: tabular-nums;
	}

	.primary   { color: #00ffcc; }
	.secondary { color: #4466ff; }
	.accent    { color: #ff44aa; }

	/* ── Phase ring ── */
	.phase-ring-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.phase-ring {
		overflow: visible;
	}

	.ring-bg {
		fill: none;
		stroke: rgba(0, 255, 204, 0.1);
		stroke-width: 2.5;
	}

	.ring-fill {
		fill: none;
		stroke: #00ffcc;
		stroke-width: 2.5;
		stroke-linecap: round;
		filter: drop-shadow(0 0 4px #00ffcc88);
		transition: stroke-dasharray 0.6s ease;
	}

	.ring-num {
		fill: #00ffcc;
		font-family: 'JetBrains Mono', monospace;
		font-size: 14px;
		font-weight: 200;
	}

	.phase-info {
		text-align: center;
	}

	.phase-name {
		font-size: 0.55rem;
		letter-spacing: 0.2em;
		color: #00ffcc;
		opacity: 0.8;
	}

	.phase-sub {
		font-size: 0.45rem;
		letter-spacing: 0.15em;
		opacity: 0.35;
		margin-top: 0.15rem;
	}

	/* ── Nav buttons ── */
	.nav-stack {
		position: absolute;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		pointer-events: all;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.45rem 0.8rem;
		background: rgba(0, 0, 0, 0.4);
		border: 1px solid rgba(0, 255, 204, 0.2);
		color: rgba(255, 255, 255, 0.55);
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.6rem;
		letter-spacing: 0.15em;
		cursor: pointer;
		transition: all 0.2s ease;
		text-transform: uppercase;
	}

	.nav-btn:hover {
		border-color: #00ffcc;
		color: #00ffcc;
		box-shadow: 0 0 12px rgba(0, 255, 204, 0.3), inset 0 0 8px rgba(0, 255, 204, 0.08);
		background: rgba(0, 255, 204, 0.05);
	}

	.nav-btn.active {
		border-color: #4466ff;
		color: #4466ff;
		box-shadow: 0 0 10px rgba(68, 102, 255, 0.3), inset 0 0 6px rgba(68, 102, 255, 0.08);
	}

	.nav-key {
		font-size: 0.45rem;
		opacity: 0.45;
		color: #ff44aa;
	}

	.nav-btn:hover .nav-key {
		opacity: 0.7;
	}

	/* ── Corners ── */
	.corner {
		position: absolute;
		width: 20px;
		height: 20px;
		border-color: rgba(0, 255, 204, 0.15);
		border-style: solid;
		border-width: 0;
	}
	.corner.tl { top: 8px; left: 8px; border-top-width: 1px; border-left-width: 1px; }
	.corner.tr { top: 8px; right: 8px; border-top-width: 1px; border-right-width: 1px; }
	.corner.bl { bottom: 8px; left: 8px; border-bottom-width: 1px; border-left-width: 1px; }
	.corner.br { bottom: 8px; right: 8px; border-bottom-width: 1px; border-right-width: 1px; }

	/* ── Scanlines ── */
	.scanlines {
		position: absolute;
		inset: 0;
		background: repeating-linear-gradient(
			0deg,
			transparent,
			transparent 2px,
			rgba(0, 255, 204, 0.006) 2px,
			rgba(0, 255, 204, 0.006) 4px
		);
		pointer-events: none;
	}
</style>
