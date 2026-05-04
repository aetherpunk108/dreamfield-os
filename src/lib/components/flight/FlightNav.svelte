<script lang="ts">
	import { sceneToGps } from '$lib/geospatial/gps.js';
	import type { GPSConfig } from '$lib/geospatial/gps.js';
	import type { LocationPin } from '$lib/navigation/pins.js';
	import type { Vec3 } from '$lib/spatial/types.js';
	import FlightCompass from './FlightCompass.svelte';

	interface Props {
		shipPosition: Vec3;
		shipRotation: { pitch: number; yaw: number; roll: number };
		shipSpeed: number;
		pins?: LocationPin[];
		selectedPinId?: string | null;
		gpsConfig: GPSConfig;
	}

	let {
		shipPosition,
		shipRotation,
		shipSpeed,
		pins = [],
		selectedPinId = null,
		gpsConfig,
	}: Props = $props();

	// Current GPS position derived from ship scene position
	const gpsPos = $derived(sceneToGps(shipPosition, gpsConfig));

	// Heading in degrees (yaw, Three.js: positive yaw = clockwise from +Z)
	const headingDeg = $derived(((shipRotation.yaw * 180 / Math.PI) % 360 + 360) % 360);

	// Format lat/lon with cardinal direction
	function fmtLat(lat: number): string {
		const dir = lat >= 0 ? 'N' : 'S';
		return `${Math.abs(lat).toFixed(4)}° ${dir}`;
	}

	function fmtLon(lon: number): string {
		const dir = lon >= 0 ? 'E' : 'W';
		return `${Math.abs(lon).toFixed(4)}° ${dir}`;
	}

	function fmtAlt(alt: number): string {
		if (Math.abs(alt) >= 1000) return `${(alt / 1000).toFixed(2)} km`;
		return `${alt.toFixed(0)} m`;
	}

	// Compute bearing from ship to a pin (degrees, 0=north, clockwise)
	function bearingToPin(pin: LocationPin): number {
		const dLat = pin.lat - gpsPos.lat;
		const dLon = pin.lon - gpsPos.lon;
		const y = Math.sin(dLon * Math.PI / 180) * Math.cos(pin.lat * Math.PI / 180);
		const x =
			Math.cos(gpsPos.lat * Math.PI / 180) * Math.sin(pin.lat * Math.PI / 180) -
			Math.sin(gpsPos.lat * Math.PI / 180) *
				Math.cos(pin.lat * Math.PI / 180) *
				Math.cos(dLon * Math.PI / 180);
		return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
	}

	// Straight-line scene distance to a pin (uses worldPosition if available)
	function distToPin(pin: LocationPin): number {
		if (pin.worldPosition) {
			const dx = pin.worldPosition[0] - shipPosition[0];
			const dy = pin.worldPosition[1] - shipPosition[1];
			const dz = pin.worldPosition[2] - shipPosition[2];
			return Math.sqrt(dx * dx + dy * dy + dz * dz);
		}
		// Fallback: approximate via lat/lon delta (degrees to scene units, rough)
		const dLat = (pin.lat - gpsPos.lat) * 111320 * gpsConfig.scaleMetersToScene;
		const dLon =
			(pin.lon - gpsPos.lon) *
			111320 *
			Math.cos((gpsPos.lat * Math.PI) / 180) *
			gpsConfig.scaleMetersToScene;
		return Math.sqrt(dLat * dLat + dLon * dLon);
	}

	// Scene distance to meters conversion
	function sceneDistToMeters(sceneDist: number): number {
		return sceneDist / gpsConfig.scaleMetersToScene;
	}

	function fmtDistance(meters: number): string {
		if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
		return `${Math.round(meters)} m`;
	}

	function fmtEta(meters: number, speedSceneUnits: number): string {
		if (speedSceneUnits < 0.1) return '--:--';
		const speedMs = sceneDistToMeters(speedSceneUnits);
		const seconds = meters / speedMs;
		if (!isFinite(seconds) || seconds > 99 * 60) return '--:--';
		const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
		const ss = Math.floor(seconds % 60).toString().padStart(2, '0');
		return `${mm}:${ss}`;
	}

	// Selected pin data
	const selectedPin = $derived(pins.find(p => p.id === selectedPinId) ?? null);
	const selectedBearing = $derived(selectedPin ? bearingToPin(selectedPin) : 0);
	const selectedDistScene = $derived(selectedPin ? distToPin(selectedPin) : 0);
	const selectedDistMeters = $derived(sceneDistToMeters(selectedDistScene));
	const selectedEta = $derived(fmtEta(selectedDistMeters, shipSpeed));

	// Relative bearing arrow (bearing relative to heading)
	const relativeBearing = $derived((selectedBearing - headingDeg + 360) % 360);

	// Compass markers: one per visible pin
	const compassMarkers = $derived(
		pins
			.filter(p => p.visible)
			.map(p => ({
				bearing: bearingToPin(p),
				color: p.color,
				label: p.name.slice(0, 4).toUpperCase(),
			}))
	);

	// Proximity alert: pins within 2 scene units
	const nearbyPins = $derived(
		pins.filter(p => p.visible && distToPin(p) < 2)
	);

	// Altitude tape: current altitude mapped to vertical position
	const altitude = $derived(shipPosition[1]);
	const altTapeOffset = $derived(-(altitude % 50) * 2); // scroll within range

	// Generate altitude tape ticks around current altitude
	const altTicks = $derived(() => {
		const base = Math.floor(altitude / 10) * 10;
		const ticks: { val: number; y: number; major: boolean }[] = [];
		for (let i = -6; i <= 6; i++) {
			const val = base + i * 10;
			const y = 60 + i * -20; // center at 60px, each 10 units = 20px
			ticks.push({ val, y, major: val % 50 === 0 });
		}
		return ticks;
	});
</script>

<div class="flight-nav">
	<!-- Compass band (top center) -->
	<div class="compass-wrap">
		<FlightCompass heading={headingDeg} markers={compassMarkers} />
	</div>

	<!-- GPS readout (bottom-left) -->
	<div class="gps-readout">
		<div class="gps-label">GPS</div>
		<div class="gps-row">
			<span class="gps-key">LAT</span>
			<span class="gps-val">{fmtLat(gpsPos.lat)}</span>
		</div>
		<div class="gps-row">
			<span class="gps-key">LON</span>
			<span class="gps-val">{fmtLon(gpsPos.lon)}</span>
		</div>
		<div class="gps-row">
			<span class="gps-key">ALT</span>
			<span class="gps-val alt-val">{fmtAlt(gpsPos.alt)}</span>
		</div>
	</div>

	<!-- Selected destination (bottom-right) -->
	{#if selectedPin}
		<div class="destination">
			<div class="dest-label">DEST</div>
			<div class="dest-name">{selectedPin.name.toUpperCase()}</div>
			<div class="dest-row">
				<span class="dest-key">DIST</span>
				<span class="dest-val">{fmtDistance(selectedDistMeters)}</span>
			</div>
			<div class="dest-row">
				<span class="dest-key">ETA</span>
				<span class="dest-val">{selectedEta}</span>
			</div>
			<!-- Bearing arrow -->
			<div class="bearing-arrow-wrap">
				<svg
					class="bearing-arrow"
					width="28"
					height="28"
					viewBox="0 0 28 28"
					style:transform="rotate({relativeBearing}deg)"
				>
					<circle cx="14" cy="14" r="12" fill="none" stroke="#ffcc4433" stroke-width="1" />
					<polygon points="14,3 18,18 14,15 10,18" fill="#ffcc44" opacity="0.9" />
				</svg>
				<span class="bearing-deg">{selectedBearing.toFixed(0).padStart(3, '0')}°</span>
			</div>
		</div>
	{/if}

	<!-- Altitude tape (right side) -->
	<div class="alt-tape">
		<div class="alt-tape-label">ALT</div>
		<div class="alt-tape-track">
			<div class="alt-tape-scroll" style:transform="translateY({altTapeOffset}px)">
				{#each altTicks() as t}
					<div
						class="alt-tick"
						class:major={t.major}
						style:top="{t.y}px"
					>
						{#if t.major}
							<span class="alt-tick-val">{t.val}</span>
						{/if}
					</div>
				{/each}
			</div>
			<!-- Current altitude cursor -->
			<div class="alt-cursor">
				<span class="alt-cursor-val">{altitude.toFixed(1)}</span>
			</div>
		</div>
	</div>

	<!-- Proximity alerts -->
	{#if nearbyPins.length > 0}
		<div class="proximity-alerts">
			{#each nearbyPins as pin (pin.id)}
				<div class="proximity-alert" style:color={pin.color} style:border-color={pin.color}>
					{pin.name.toUpperCase()}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.flight-nav {
		position: absolute;
		inset: 0;
		pointer-events: none;
		font-family: 'JetBrains Mono', monospace;
		z-index: 41;
	}

	/* Compass band */
	.compass-wrap {
		position: absolute;
		top: 8px;
		left: 50%;
		transform: translateX(-50%);
	}

	/* GPS readout */
	.gps-readout {
		position: absolute;
		bottom: 20px;
		left: 20px;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.gps-label {
		font-size: 0.42rem;
		color: #444;
		letter-spacing: 0.15em;
		margin-bottom: 2px;
	}

	.gps-row {
		display: flex;
		gap: 6px;
		align-items: baseline;
	}

	.gps-key {
		font-size: 0.42rem;
		color: #444;
		letter-spacing: 0.1em;
		width: 20px;
	}

	.gps-val {
		font-size: 0.5rem;
		color: #00ffcc;
		letter-spacing: 0.05em;
		font-variant-numeric: tabular-nums;
		text-shadow: 0 0 6px #00ffcc44;
	}

	.alt-val {
		color: #4466ff;
		text-shadow: 0 0 6px #4466ff44;
	}

	/* Destination panel */
	.destination {
		position: absolute;
		bottom: 20px;
		right: 80px;
		display: flex;
		flex-direction: column;
		gap: 3px;
		align-items: flex-end;
	}

	.dest-label {
		font-size: 0.42rem;
		color: #444;
		letter-spacing: 0.15em;
		margin-bottom: 2px;
	}

	.dest-name {
		font-size: 0.6rem;
		color: #ffcc44;
		letter-spacing: 0.1em;
		text-shadow: 0 0 8px #ffcc4466;
	}

	.dest-row {
		display: flex;
		gap: 6px;
		align-items: baseline;
	}

	.dest-key {
		font-size: 0.42rem;
		color: #444;
		letter-spacing: 0.1em;
	}

	.dest-val {
		font-size: 0.5rem;
		color: #ffcc44;
		letter-spacing: 0.05em;
		font-variant-numeric: tabular-nums;
	}

	.bearing-arrow-wrap {
		display: flex;
		align-items: center;
		gap: 6px;
		margin-top: 4px;
	}

	.bearing-arrow {
		display: block;
		filter: drop-shadow(0 0 4px #ffcc4466);
		transition: transform 0.15s ease-out;
	}

	.bearing-deg {
		font-size: 0.48rem;
		color: #ffcc44;
		letter-spacing: 0.05em;
		font-variant-numeric: tabular-nums;
		opacity: 0.75;
	}

	/* Altitude tape */
	.alt-tape {
		position: absolute;
		right: 16px;
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.alt-tape-label {
		font-size: 0.42rem;
		color: #444;
		letter-spacing: 0.1em;
	}

	.alt-tape-track {
		width: 36px;
		height: 120px;
		background: #0a0a1488;
		border: 1px solid #1a1a2a;
		border-radius: 2px;
		position: relative;
		overflow: hidden;
	}

	.alt-tape-scroll {
		position: absolute;
		left: 0;
		top: 0;
		width: 100%;
		will-change: transform;
	}

	.alt-tick {
		position: absolute;
		right: 0;
		width: 6px;
		height: 1px;
		background: #333;
		transform: translateY(-50%);
	}

	.alt-tick.major {
		width: 10px;
		background: #555;
	}

	.alt-tick-val {
		position: absolute;
		right: 12px;
		font-size: 0.38rem;
		color: #444;
		white-space: nowrap;
		transform: translateY(-50%);
		font-variant-numeric: tabular-nums;
	}

	.alt-cursor {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		transform: translateY(-50%);
		border-top: 1px solid #4466ff;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		padding-right: 2px;
	}

	.alt-cursor-val {
		font-size: 0.42rem;
		color: #4466ff;
		font-variant-numeric: tabular-nums;
		text-shadow: 0 0 6px #4466ff66;
		white-space: nowrap;
	}

	/* Proximity alerts */
	.proximity-alerts {
		position: absolute;
		top: 60px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
	}

	.proximity-alert {
		font-size: 0.55rem;
		letter-spacing: 0.18em;
		border: 1px solid;
		padding: 2px 8px;
		background: #00000066;
		text-shadow: 0 0 8px currentColor;
		animation: proxFlash 0.6s ease-in-out infinite alternate;
	}

	@keyframes proxFlash {
		from { opacity: 0.5; }
		to { opacity: 1; }
	}
</style>
