<script lang="ts">
	import { Canvas } from '@threlte/core';
	import { OrbitControls } from '@threlte/extras';
	import { T } from '@threlte/core';
	import SpatialField from '$lib/components/renderers/SpatialField.svelte';
	import EntanglementLines from '$lib/components/renderers/EntanglementLines.svelte';
	import BreathRenderer from '$lib/components/renderers/BreathRenderer.svelte';
	import ParticleField from '$lib/components/scene/ParticleField.svelte';
	import ScanGrid from '$lib/components/scene/ScanGrid.svelte';
	import PostFX from '$lib/components/scene/PostFX.svelte';
	import Orrery from '$lib/components/celestial/Orrery.svelte';
	import FlightController from '$lib/components/flight/FlightController.svelte';
	import PlanetaryIntro from '$lib/components/celestial/PlanetaryIntro.svelte';
	import EarthView from '$lib/components/celestial/EarthView.svelte';
	import CesiumEarth from '$lib/components/celestial/CesiumEarth.svelte';
	import Cosmos from '$lib/components/scene/Cosmos.svelte';
	import GlobePins from '$lib/components/celestial/GlobePins.svelte';
	import { initDefaultPins, getPins } from '$lib/navigation/pins.js';
	import Starfield from '$lib/components/scene/Starfield.svelte';
	import PlanetaryHud from '$lib/components/hud/PlanetaryHud.svelte';
	import BootSequence from '$lib/components/hud/BootSequence.svelte';
	import SystemHud from '$lib/components/hud/SystemHud.svelte';
	import RadarMinimap from '$lib/components/hud/RadarMinimap.svelte';
	import EventToast from '$lib/components/hud/EventToast.svelte';
	import ViewportBar from '$lib/components/hud/ViewportBar.svelte';
	import DreamfieldPane from '$lib/components/controls/DreamfieldPane.svelte';
	import MenuBar from '$lib/components/ui/MenuBar.svelte';
	import Outliner from '$lib/components/ui/Outliner.svelte';
	import PropertiesPanel from '$lib/components/ui/PropertiesPanel.svelte';
	import FileImportModal from '$lib/components/ui/FileImportModal.svelte';
	import Dashboard from '$lib/components/ui/Dashboard.svelte';
	import SceneSettings from '$lib/components/ui/SceneSettings.svelte';
	import LayersPanel from '$lib/components/ui/LayersPanel.svelte';
	import CommandPalette from '$lib/components/ui/CommandPalette.svelte';
	import DeviceIndicator from '$lib/components/hud/DeviceIndicator.svelte';
	import { initDevices } from '$lib/stores/devices.svelte.js';
	import EnvironmentMap from '$lib/components/scene/EnvironmentMap.svelte';
	import { getNearClip, getFarClip, setHdriPath } from '$lib/stores/environment.svelte.js';
	import { browser } from '$app/environment';
	import {
		getTensor, getCurrentObserverId, setCurrentObserverId,
		incrementCollapseCount
	} from '$lib/stores/observation.svelte.js';
	import { getGhosts, getEntanglement } from '$lib/stores/scene.svelte.js';
	import { getBreathVoxels } from '$lib/stores/breath.svelte.js';
	import { collapseRay } from '$lib/spatial/collapse.js';
	import { createRay } from '$lib/spatial/ray.js';

	const tensor = getTensor();

	// App state
	let booted = $state(false);
	let introComplete = $state(false);
	let collapsedIds = $state<Set<string>>(new Set());
	let viewMode = $state<'spatial' | 'orrery' | 'earth' | 'flight' | 'cosmos' | 'forge'>('orrery'); // Default: planetary view
	let showOutliner = $state(true);
	let showProperties = $state(true);
	let showControls = $state(false);
	let showImportModal = $state(false);
	let showDashboard = $state(false);
	let showSceneSettings = $state(false);
	let showLayers = $state(false);
	let showCommandPalette = $state(false);
	let selectedId = $state<string | null>(null);

	// Tweakpane
	let collapseThreshold = $state(10);
	let entanglementEnabled = $state(true);
	let observerMode = $state('human');
	let fogNear = $state(8);
	let fogFar = $state(25);
	let autoRotate = $state(true);
	let particleOpacity = $state(0.6);

	// Toast ref
	let toastRef: EventToast;

	// Init pins and device detection on first load (browser only)
	$effect(() => { if (browser && getPins().length === 0) initDefaultPins(); });
	$effect(() => { if (browser) initDevices(); });

	// Auto-load galaxy HDRI for planetary/flight/earth views
	$effect(() => {
		if (viewMode === 'orrery' || viewMode === 'flight' || viewMode === 'earth') {
			setHdriPath('/hdri/starmap_2020_4k.exr');
		}
	});

	$effect(() => {
		if (observerMode !== getCurrentObserverId()) {
			setCurrentObserverId(observerMode);
			collapsedIds = new Set();
		}
	});

	function handleCollapseGhost(ghostId: string) {
		const ghost = getGhosts().find((g) => g.id === ghostId);
		if (!ghost) return;
		const ray = createRay([0, 2, 5], ghost.position, getCurrentObserverId());
		const result = collapseRay(
			ray, getGhosts(), tensor,
			entanglementEnabled ? getEntanglement() : undefined,
			collapseThreshold
		);
		const newIds = new Set(collapsedIds);
		for (const id of [...result.collapsed, ...result.propagated]) newIds.add(id);
		collapsedIds = newIds;
		incrementCollapseCount(result.collapsed.length + result.propagated.length);

		// Toast notifications
		for (const id of result.collapsed) {
			toastRef?.push('collapse', `Collapsed: ${id}`);
		}
		for (const id of result.propagated) {
			toastRef?.push('entangle', `Entangled: ${id}`);
		}

		// Auto-select collapsed ghost
		selectedId = ghostId;
	}

	function handleMenuAction(action: string) {
		switch (action) {
			case 'file:import': showImportModal = true; break;
			case 'view:dashboard': showDashboard = !showDashboard; break;
			case 'view:sceneSettings': showSceneSettings = !showSceneSettings; break;
			case 'view:layers': showLayers = !showLayers; break;
			case 'view:spatial': viewMode = 'spatial'; break;
			case 'view:orrery': viewMode = 'orrery'; break;
			case 'view:earth': viewMode = 'earth'; break;
			case 'view:cosmos': viewMode = 'cosmos'; break;
			case 'view:forge': viewMode = 'forge'; break;
			case 'view:flight': viewMode = 'flight'; break;
			case 'view:outliner': showOutliner = !showOutliner; break;
			case 'view:properties': showProperties = !showProperties; break;
			case 'view:controls': showControls = !showControls; break;
			case 'spatial:resetTensor': {
				tensor.clear();
				tensor.addObserver(getCurrentObserverId());
				collapsedIds = new Set();
				toastRef?.push('reset', 'Observation tensor reset');
				break;
			}
			case 'spatial:collapseAll': {
				for (const g of getGhosts()) {
					tensor.collapse(getCurrentObserverId(), g.id);
					collapsedIds = new Set([...collapsedIds, g.id]);
				}
				toastRef?.push('collapse', `All ${getGhosts().length} ghosts collapsed`);
				break;
			}
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p')) {
			e.preventDefault();
			showCommandPalette = !showCommandPalette;
			return;
		}
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
		switch (e.key.toLowerCase()) {
			case 'n': showOutliner = !showOutliner; break;
			case 'p': showProperties = !showProperties; break;
			case 't': showControls = !showControls; break;
			case 'd': showDashboard = !showDashboard; break;
			case 'l': showLayers = !showLayers; break;
			case '1': viewMode = 'spatial'; break;
			case '2': viewMode = 'orrery'; break;
			case '3': viewMode = 'earth'; break;
			case '4': viewMode = 'flight'; break;
			case '5': viewMode = 'cosmos'; break;
			case '6': viewMode = 'forge'; break;
			case 'escape': selectedId = null; showImportModal = false; showDashboard = false; break;
		}
	}

	function handleImport(file: File, type: string) {
		toastRef?.push('info', `Importing ${file.name} as ${type}`);
	}

	// Outliner tree
	const outlinerNodes = $derived.by(() => {
		const ghosts = getGhosts();
		const ghostChildren = ghosts.map(g => ({
			id: g.id,
			label: g.id.replace('ghost-', '').toUpperCase(),
			type: 'ghost' as const,
			visible: true,
		}));
		const nodes = [
			{
				id: 'scene', label: 'Scene', type: 'group' as const, visible: true,
				children: [
					{ id: 'camera', label: 'Camera', type: 'camera' as const },
					{ id: 'ambient', label: 'Ambient Light', type: 'light' as const },
					{ id: 'dir-light', label: 'Directional', type: 'light' as const },
				]
			},
			{
				id: 'spatial-field', label: 'Spatial Field (\u03A9)', type: 'group' as const,
				visible: true, children: ghostChildren
			},
			{
				id: 'breath-field', label: 'Breath Field (\u03B2)', type: 'breath' as const,
				visible: true, children: [{ id: 'breath-atmos', label: 'Atmosphere', type: 'breath' as const }]
			},
		];
		if (viewMode === 'orrery') {
			nodes.push({
				id: 'orrery', label: 'Orrery', type: 'group' as const, visible: true,
				children: [
					{ id: 'sun', label: 'Sun', type: 'celestial' as const },
					{ id: 'earth', label: 'Earth', type: 'celestial' as const },
					{ id: 'moon', label: 'Moon', type: 'celestial' as const },
				]
			});
		}
		return nodes;
	});

	const selectedGhost = $derived(getGhosts().find(g => g.id === selectedId) ?? null);
	const selectedTriState = $derived(selectedId ? tensor.getState(getCurrentObserverId(), selectedId) : 0);

	function getGhostState(id: string) {
		return tensor.getState(getCurrentObserverId(), id);
	}
</script>

<svelte:head>
	<title>DREAMFIELD OS</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@200;300;400&display=swap" rel="stylesheet" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

{#if !booted}
	<BootSequence oncomplete={() => booted = true} />
{/if}

<div class="app-shell" class:visible={booted}>
	<MenuBar onaction={handleMenuAction} />

	<div class="workspace">
		<Outliner
			nodes={outlinerNodes}
			visible={showOutliner}
			onselect={(id) => selectedId = id}
		/>

		<div
			class="viewport"
			style:margin-left={showOutliner ? '220px' : '0'}
			style:margin-right={showProperties ? '240px' : '0'}
		>
			<div class="view-tabs">
				<button class="tab" class:active={viewMode === 'spatial'} onclick={() => viewMode = 'spatial'}>
					<span class="tab-key">1</span> SPATIAL FIELD
				</button>
				<button class="tab" class:active={viewMode === 'orrery'} onclick={() => viewMode = 'orrery'}>
					<span class="tab-key">2</span> ORRERY
				</button>
				<button class="tab" class:active={viewMode === 'earth'} onclick={() => viewMode = 'earth'}>
					<span class="tab-key">3</span> EARTH
				</button>
				<button class="tab" class:active={viewMode === 'flight'} onclick={() => viewMode = 'flight'}>
					<span class="tab-key">4</span> FLIGHT
				</button>
				<button class="tab" class:active={viewMode === 'cosmos'} onclick={() => viewMode = 'cosmos'}>
					<span class="tab-key">5</span> COSMOS
				</button>
				<button class="tab" class:active={viewMode === 'forge'} onclick={() => viewMode = 'forge'}>
					<span class="tab-key">6</span> FORGE
				</button>
			</div>

			<Canvas>
				{#if viewMode === 'spatial'}
					<T.PerspectiveCamera makeDefault position={[0, 2.5, 7]} fov={55}>
						<OrbitControls
							enableDamping dampingFactor={0.05}
							{autoRotate} autoRotateSpeed={0.2}
							maxPolarAngle={Math.PI * 0.85}
							minDistance={2} maxDistance={40}
						/>
					</T.PerspectiveCamera>

					<T.AmbientLight intensity={0.04} color="#334466" />
					<T.DirectionalLight position={[5, 10, 5]} intensity={0.2} color="#8899bb" />
					<T.PointLight position={[0, 4, 0]} intensity={1.0} color="#00ffcc" distance={15} decay={2} />
					<T.PointLight position={[-4, 1, 3]} intensity={0.5} color="#4466ff" distance={10} decay={2} />
					<T.PointLight position={[3, 2, -2]} intensity={0.3} color="#ff44aa" distance={8} decay={2} />
					<T.Fog args={['#030308', fogNear, fogFar]} attach="fog" />

					<SpatialField
						ghosts={getGhosts()} {tensor}
						observerId={getCurrentObserverId()}
						{selectedId}
						oncollapseGhost={handleCollapseGhost}
					/>
					<EntanglementLines
						ghosts={getGhosts()} entanglement={getEntanglement()}
						enabled={entanglementEnabled}
					/>
					<BreathRenderer voxels={getBreathVoxels()} />
					<ScanGrid />
					<ParticleField />
					<PostFX bloomIntensity={1.4} bloomThreshold={0.15} bloomRadius={0.7} />

				{:else if viewMode === 'orrery'}
					{#if !introComplete}
						<PlanetaryIntro oncomplete={() => introComplete = true} skip={false} />
					{:else}
						<T.PerspectiveCamera makeDefault position={[2, 1.5, 4]} fov={45}>
							<OrbitControls
								enableDamping dampingFactor={0.04}
								autoRotate autoRotateSpeed={0.05}
								minDistance={1} maxDistance={150}
								target={[0, 0, 0]}
							/>
						</T.PerspectiveCamera>
					{/if}

					<T.AmbientLight intensity={0.015} color="#0a0a22" />
					<T.DirectionalLight position={[30, 10, 20]} intensity={0.4} color="#ffffee" />
					<T.Fog args={['#010104', 60, 250]} attach="fog" />

					<EnvironmentMap />
					<Starfield count={3000} radius={500} twinkleSpeed={1.0} />
					<Orrery timeMultiplier={80000} visScale={3e-9} showOrbits />
					<PostFX bloomIntensity={2.0} bloomThreshold={0.08} bloomRadius={0.85} />

				{:else if viewMode === 'earth'}
					<T.PerspectiveCamera makeDefault position={[0, 2, 8]} fov={40} near={0.01} far={1000}>
						<OrbitControls
							enableDamping dampingFactor={0.04}
							minDistance={3.5} maxDistance={30}
						/>
					</T.PerspectiveCamera>

					<T.AmbientLight intensity={0.02} color="#0a0a22" />
					<T.DirectionalLight position={[20, 10, 15]} intensity={0.6} color="#ffffee" />

					<CesiumEarth radius={3} showClouds showAtmosphere quality="medium" />
					<Starfield count={1000} radius={80} twinkleSpeed={0.8} />
					<EnvironmentMap />
					<PostFX bloomIntensity={1.5} bloomThreshold={0.12} bloomRadius={0.7} />

				{:else if viewMode === 'forge'}
					<T.PerspectiveCamera makeDefault position={[0, 5, 10]} fov={50} near={0.01} far={10000}>
						<OrbitControls
							enableDamping dampingFactor={0.05}
							minDistance={1} maxDistance={200}
						/>
					</T.PerspectiveCamera>
					<T.AmbientLight intensity={0.1} color="#334466" />
					<T.DirectionalLight position={[5, 10, 5]} intensity={0.5} color="#ffffff" />
					<T.GridHelper args={[20, 20, '#1a1a2a', '#111118']} />
					<SpatialField
						ghosts={getGhosts()} {tensor}
						observerId={getCurrentObserverId()}
						selectedId={selectedId}
						oncollapseGhost={handleCollapseGhost}
					/>
					<PostFX bloomIntensity={0.8} bloomThreshold={0.3} bloomRadius={0.5} />

				{:else if viewMode === 'cosmos'}
					<Cosmos flightEnabled={true} />

				{:else if viewMode === 'flight'}
					<T.AmbientLight intensity={0.03} color="#222244" />
					<T.DirectionalLight position={[10, 20, 5]} intensity={0.3} color="#8899bb" />
					<T.PointLight position={[0, 10, 0]} intensity={0.8} color="#00ffcc" distance={30} decay={2} />
					<T.Fog args={['#020208', 20, 80]} attach="fog" />

					<EnvironmentMap />
					<FlightController active={viewMode === 'flight'} />
					<ScanGrid />
					<ParticleField />
					<PostFX bloomIntensity={1.6} bloomThreshold={0.12} bloomRadius={0.75} />
				{/if}
			</Canvas>

			{#if viewMode === 'spatial'}
				<SystemHud
					observerId={getCurrentObserverId()}
					ghostCount={getGhosts().length}
					collapsedCount={collapsedIds.size}
				/>
				<RadarMinimap
					ghosts={getGhosts()}
					getState={getGhostState}
				/>
			{:else if viewMode === 'orrery' && introComplete}
				<PlanetaryHud
					earthRotation={0}
					moonPhase={0.5}
					currentPhase={7}
					onnavigate={(mode) => {
						if (mode === 'spatial') viewMode = 'spatial';
						else if (mode === 'flight') viewMode = 'flight';
						else if (mode === 'dashboard') showDashboard = true;
					}}
				/>
			{/if}

			<DeviceIndicator />
			<ViewportBar
				{viewMode} {selectedId}
				ghostCount={getGhosts().length}
				collapsedCount={collapsedIds.size}
				{entanglementEnabled} {fogNear} {fogFar}
			/>
		</div>

		<PropertiesPanel
			visible={showProperties}
			{selectedId}
			ghost={selectedGhost}
			triState={selectedTriState}
		/>
	</div>

	{#if booted && showControls}
		<DreamfieldPane
			bind:collapseThreshold bind:entanglementEnabled bind:observerMode
			bind:fogNear bind:fogFar bind:autoRotate bind:particleOpacity
		/>
	{/if}

	<FileImportModal
		visible={showImportModal}
		onclose={() => showImportModal = false}
		onimport={handleImport}
	/>

	<EventToast bind:this={toastRef} />

	<Dashboard
		visible={showDashboard}
		onclose={() => showDashboard = false}
		ghostCount={getGhosts().length}
		collapsedCount={collapsedIds.size}
		observerCount={3}
	/>

	<SceneSettings
		visible={showSceneSettings}
		onclose={() => showSceneSettings = false}
	/>

	<LayersPanel
		visible={showLayers}
		onclose={() => showLayers = false}
	/>

	<CommandPalette
		visible={showCommandPalette}
		onclose={() => showCommandPalette = false}
		onaction={handleMenuAction}
	/>
</div>

<style>
	.app-shell {
		display: flex;
		flex-direction: column;
		width: 100vw;
		height: 100vh;
		opacity: 0;
		transition: opacity 1s ease;
		background: #030308;
	}

	.app-shell.visible { opacity: 1; }

	.workspace {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.viewport {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		transition: margin 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.view-tabs {
		position: absolute;
		top: 6px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 1px;
		z-index: 50;
		background: rgba(12, 12, 20, 0.9);
		border-radius: 4px;
		border: 1px solid #1a1a24;
		overflow: hidden;
		backdrop-filter: blur(8px);
	}

	.tab {
		padding: 0.3rem 0.8rem;
		background: none;
		border: none;
		color: #444;
		font-family: inherit;
		font-size: 0.5rem;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.tab:hover { color: #888; background: #ffffff06; }

	.tab.active {
		color: #00ffcc;
		background: #00ffcc08;
		text-shadow: 0 0 8px #00ffcc33;
	}

	.tab-key {
		font-size: 0.45rem;
		background: #ffffff08;
		padding: 0.1rem 0.25rem;
		border-radius: 2px;
		color: #555;
	}

	.tab.active .tab-key {
		background: #00ffcc12;
		color: #00ffcc88;
	}
</style>
