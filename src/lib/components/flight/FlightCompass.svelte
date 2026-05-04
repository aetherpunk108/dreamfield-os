<script lang="ts">
	interface Marker {
		bearing: number;
		color: string;
		label: string;
	}

	interface Props {
		heading: number;
		markers?: Marker[];
	}

	let { heading, markers = [] }: Props = $props();

	// Normalize heading to 0-360
	const normalizedHeading = $derived(((heading % 360) + 360) % 360);

	// The band is 720px wide representing 360° twice (so it tiles)
	// Each degree = 2px, band offset = heading * 2px to center
	const bandOffset = $derived(-(normalizedHeading * 2) + 150);

	// Generate tick marks for -180° to +540° around center (enough for scrolling)
	// We generate for 0-359 and display them at their positions
	const ticks = $derived(() => {
		const result: { deg: number; x: number; major: boolean; cardinal: string | null }[] = [];
		for (let d = 0; d < 360; d += 10) {
			const isMajor = d % 30 === 0;
			const cardinals: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
			result.push({
				deg: d,
				x: d * 2,
				major: isMajor,
				cardinal: cardinals[d] ?? null,
			});
			// duplicate at +360 for seamless wrap
			result.push({
				deg: d + 360,
				x: (d + 360) * 2,
				major: isMajor,
				cardinal: cardinals[d] ?? null,
			});
		}
		return result;
	});

	// Map markers to x positions on the band
	const markerPositions = $derived(
		markers.map(m => ({
			...m,
			x: (((m.bearing % 360) + 360) % 360) * 2,
			x2: ((((m.bearing % 360) + 360) % 360) + 360) * 2,
		}))
	);
</script>

<div class="compass-band-wrap">
	<!-- Center indicator -->
	<div class="center-tick"></div>
	<!-- Heading readout -->
	<div class="heading-readout">{normalizedHeading.toFixed(0).padStart(3, '0')}°</div>

	<div class="compass-band-clip">
		<div class="compass-band" style:transform="translateX({bandOffset}px)">
			<!-- Tick marks -->
			{#each ticks() as t (t.deg + '-' + t.major)}
				<div
					class="tick"
					class:major={t.major}
					style:left="{t.x}px"
				>
					{#if t.cardinal}
						<span class="cardinal">{t.cardinal}</span>
					{:else if t.major}
						<span class="degree">{t.deg % 360}</span>
					{/if}
				</div>
			{/each}

			<!-- Waypoint/pin markers -->
			{#each markerPositions as m}
				<div class="marker-tick" style:left="{m.x}px" style:--mc={m.color}>
					<svg class="marker-tri" width="7" height="6" viewBox="0 0 7 6">
						<polygon points="3.5,0 7,6 0,6" fill={m.color} opacity="0.9" />
					</svg>
					<span class="marker-label" style:color={m.color}>{m.label}</span>
				</div>
				<!-- duplicate at +360 for wrap -->
				<div class="marker-tick" style:left="{m.x2}px" style:--mc={m.color}>
					<svg class="marker-tri" width="7" height="6" viewBox="0 0 7 6">
						<polygon points="3.5,0 7,6 0,6" fill={m.color} opacity="0.9" />
					</svg>
					<span class="marker-label" style:color={m.color}>{m.label}</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.compass-band-wrap {
		position: relative;
		width: 300px;
		height: 36px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.compass-band-clip {
		width: 300px;
		height: 36px;
		overflow: hidden;
		position: relative;
	}

	.compass-band {
		position: absolute;
		top: 0;
		left: 0;
		/* 720px = 360° * 2px/° duplicated once */
		width: 1440px;
		height: 36px;
		will-change: transform;
	}

	.tick {
		position: absolute;
		bottom: 0;
		width: 1px;
		height: 6px;
		background: #333;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column-reverse;
		align-items: center;
	}

	.tick.major {
		height: 10px;
		background: #555;
	}

	.cardinal {
		position: absolute;
		bottom: 12px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		color: #00ffcc;
		letter-spacing: 0;
		white-space: nowrap;
		transform: translateX(-50%);
		text-shadow: 0 0 6px #00ffcc66;
	}

	.degree {
		position: absolute;
		bottom: 12px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.42rem;
		color: #444;
		white-space: nowrap;
		transform: translateX(-50%);
		font-variant-numeric: tabular-nums;
	}

	.center-tick {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 1px;
		height: 14px;
		background: #00ffcc;
		box-shadow: 0 0 4px #00ffcc;
		z-index: 2;
		pointer-events: none;
	}

	.heading-readout {
		position: absolute;
		top: 18px;
		left: 50%;
		transform: translateX(-50%);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.5rem;
		color: #00ffcc;
		letter-spacing: 0.08em;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		z-index: 2;
		pointer-events: none;
	}

	.marker-tick {
		position: absolute;
		bottom: 10px;
		display: flex;
		flex-direction: column;
		align-items: center;
		transform: translateX(-50%);
		gap: 1px;
		filter: drop-shadow(0 0 3px var(--mc));
	}

	.marker-tri {
		display: block;
	}

	.marker-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.42rem;
		white-space: nowrap;
		letter-spacing: 0.04em;
		opacity: 0.85;
	}
</style>
