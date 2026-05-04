<script lang="ts">
	import { useTask } from '@threlte/core';
	import EarthGlobe from './EarthGlobe.svelte';
	import MoonBody from './MoonBody.svelte';
	import SunBody from './SunBody.svelte';
	import OrbitRing from './OrbitRing.svelte';
	import { getCelestialState } from '$lib/geospatial/orbits.js';
	import { AXIAL_TILT } from '$lib/geospatial/constants.js';

	interface Props {
		timeMultiplier?: number;
		visScale?: number;
		showOrbits?: boolean;
	}

	let { timeMultiplier = 50000, visScale = 1e-7, showOrbits = true }: Props = $props();

	let elapsed = $state(0);
	useTask((delta) => { elapsed += delta * timeMultiplier; });

	const celestial = $derived(getCelestialState(elapsed, visScale));

	// Orbit ring radii (in vis units)
	const moonOrbitRadius = $derived(384_400_000 * visScale);
	const earthOrbitRadius = $derived(149_597_870_700 * visScale);

	// Sun visual radius (scaled down dramatically so it's visible but not scene-filling)
	const sunVisRadius = $derived(Math.max(0.8, 696_340_000 * visScale * 0.01));
</script>

<!-- Sun at origin -->
<SunBody position={[0, 0, 0]} radius={sunVisRadius} />

<!-- Earth orbit ring -->
{#if showOrbits}
	<OrbitRing radius={earthOrbitRadius} tilt={AXIAL_TILT.earth} color="#2266aa" opacity={0.06} />
{/if}

<!-- Earth -->
<EarthGlobe
	position={celestial.earthPos}
	rotationAngle={celestial.earthRotAngle}
	scale={visScale}
/>

<!-- Moon orbit ring around Earth -->
{#if showOrbits}
	<OrbitRing
		radius={moonOrbitRadius}
		tilt={AXIAL_TILT.moon}
		color="#666688"
		opacity={0.05}
		center={celestial.earthPos}
	/>
{/if}

<!-- Moon -->
<MoonBody
	position={celestial.moonAbsolute}
	scale={visScale}
/>
