<script lang="ts">
	import { getPins, toggleCategory, addPin, type PinCategory, PIN_COLORS, initDefaultPins } from '$lib/navigation/pins.js';
	import { onMount } from 'svelte';

	interface Props {
		visible: boolean;
		onclose: () => void;
		onaddpin?: (lat: number, lon: number, name: string) => void;
	}

	let { visible, onclose, onaddpin }: Props = $props();

	let layers = $state([
		{ id: 'cities', label: 'Cities', category: 'city' as PinCategory, enabled: true, color: PIN_COLORS.city },
		{ id: 'landmarks', label: 'Landmarks', category: 'landmark' as PinCategory, enabled: true, color: PIN_COLORS.landmark },
		{ id: 'custom', label: 'Custom Pins', category: 'custom' as PinCategory, enabled: true, color: PIN_COLORS.custom },
		{ id: 'gps', label: 'GPS Markers', category: 'gps' as PinCategory, enabled: true, color: PIN_COLORS.gps },
		{ id: 'events', label: 'Events', category: 'event' as PinCategory, enabled: true, color: PIN_COLORS.event },
		{ id: 'players', label: 'Players', category: 'player' as PinCategory, enabled: false, color: PIN_COLORS.player },
	]);

	// Add pin form
	let showAddForm = $state(false);
	let newPinName = $state('');
	let newPinLat = $state(0);
	let newPinLon = $state(0);

	const pinCount = $derived(getPins().length);
	const visibleCount = $derived(getPins().filter(p => p.visible).length);

	onMount(() => {
		if (getPins().length === 0) initDefaultPins();
	});

	function toggleLayer(idx: number) {
		layers[idx].enabled = !layers[idx].enabled;
		toggleCategory(layers[idx].category, layers[idx].enabled);
	}

	function handleAddPin() {
		if (!newPinName.trim()) return;
		addPin({
			name: newPinName,
			category: 'custom',
			lat: newPinLat,
			lon: newPinLon,
			alt: 0,
			color: PIN_COLORS.custom,
			createdBy: 'user',
			visible: true,
		});
		onaddpin?.(newPinLat, newPinLon, newPinName);
		newPinName = '';
		newPinLat = 0;
		newPinLon = 0;
		showAddForm = false;
	}
</script>

{#if visible}
<div class="layers-overlay" onclick={onclose}>
	<div class="layers-panel" onclick={(e) => e.stopPropagation()}>
		<header class="panel-header">
			<span class="panel-title">LAYERS & PINS</span>
			<span class="pin-count">{visibleCount}/{pinCount}</span>
			<button class="close-btn" onclick={onclose}>✕</button>
		</header>

		<div class="panel-body">
			<!-- Layer toggles -->
			<section class="section">
				<h3>MAP LAYERS</h3>
				{#each layers as layer, idx}
					<div class="layer-row">
						<button
							class="layer-toggle"
							class:enabled={layer.enabled}
							onclick={() => toggleLayer(idx)}
						>
							<span class="layer-dot" style:background={layer.enabled ? layer.color : '#333'}></span>
							{layer.label}
						</button>
						<span class="layer-count">
							{getPins().filter(p => p.category === layer.category).length}
						</span>
					</div>
				{/each}
			</section>

			<!-- Pin list -->
			<section class="section">
				<h3>LOCATION PINS</h3>
				<div class="pin-list">
					{#each getPins().filter(p => p.visible).slice(0, 15) as pin}
						<div class="pin-item">
							<span class="pin-dot" style:background={pin.color}></span>
							<span class="pin-name">{pin.name}</span>
							<span class="pin-coords">{pin.lat.toFixed(2)}° {pin.lon.toFixed(2)}°</span>
						</div>
					{/each}
				</div>
			</section>

			<!-- Add pin -->
			<section class="section">
				<h3>ADD PIN</h3>
				{#if !showAddForm}
					<button class="add-btn" onclick={() => showAddForm = true}>
						+ New Location Pin
					</button>
				{:else}
					<div class="add-form">
						<input
							class="input"
							type="text"
							placeholder="Pin name..."
							bind:value={newPinName}
						/>
						<div class="coord-inputs">
							<div class="coord-field">
								<label>LAT</label>
								<input class="input small" type="number" step="0.01" bind:value={newPinLat} />
							</div>
							<div class="coord-field">
								<label>LON</label>
								<input class="input small" type="number" step="0.01" bind:value={newPinLon} />
							</div>
						</div>
						<div class="form-actions">
							<button class="action-btn confirm" onclick={handleAddPin}>ADD</button>
							<button class="action-btn cancel" onclick={() => showAddForm = false}>CANCEL</button>
						</div>
					</div>
				{/if}
			</section>

			<!-- GPS -->
			<section class="section">
				<h3>GPS TRACKING</h3>
				<div class="gps-info">
					<span class="gps-icon">◎</span>
					<span>Use browser location to place your pin on the globe</span>
				</div>
				<button class="add-btn" onclick={() => {
					navigator.geolocation?.getCurrentPosition((pos) => {
						addPin({
							name: 'My Location',
							category: 'gps',
							lat: pos.coords.latitude,
							lon: pos.coords.longitude,
							alt: pos.coords.altitude ?? 0,
							color: PIN_COLORS.gps,
							createdBy: 'user',
							visible: true,
						});
					});
				}}>
					◎ Drop Pin at My Location
				</button>
			</section>
		</div>
	</div>
</div>
{/if}

<style>
	.layers-overlay {
		position: fixed;
		inset: 0;
		background: rgba(3, 3, 8, 0.75);
		backdrop-filter: blur(4px);
		z-index: 900;
		display: flex;
		justify-content: flex-start;
	}

	.layers-panel {
		width: 300px;
		height: 100vh;
		background: #0a0a12;
		border-right: 1px solid #1a1a2a;
		overflow-y: auto;
		box-shadow: 10px 0 40px rgba(0, 0, 0, 0.6);
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.8rem 1rem;
		border-bottom: 1px solid #1a1a2a;
		position: sticky;
		top: 0;
		background: #0a0a12;
		z-index: 10;
	}

	.panel-title { font-size: 0.6rem; letter-spacing: 0.15em; color: #00ffcc; }
	.pin-count { font-size: 0.5rem; color: #555; margin-left: auto; }
	.close-btn {
		background: none; border: 1px solid #333; color: #666;
		width: 22px; height: 22px; border-radius: 3px; cursor: pointer; font-size: 0.55rem;
	}
	.close-btn:hover { border-color: #ff44aa; color: #ff44aa; }

	.panel-body { padding: 0.5rem; }

	.section {
		padding: 0.8rem;
		background: #0d0d16;
		border: 1px solid #151520;
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}

	.section h3 { font-size: 0.5rem; letter-spacing: 0.12em; color: #555; margin-bottom: 0.6rem; font-weight: 400; }

	.layer-row {
		display: flex;
		align-items: center;
		margin-bottom: 4px;
	}

	.layer-toggle {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.5rem;
		background: #080810;
		border: 1px solid #1a1a2a;
		border-radius: 3px;
		color: #666;
		font-family: inherit;
		font-size: 0.55rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.layer-toggle.enabled { color: #ccc; border-color: #333; }
	.layer-toggle:hover { border-color: #00ffcc33; }

	.layer-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
	.layer-count { font-size: 0.45rem; color: #444; margin-left: 0.4rem; min-width: 15px; text-align: right; }

	.pin-list { max-height: 180px; overflow-y: auto; }

	.pin-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.3rem;
		font-size: 0.5rem;
		border-bottom: 1px solid #0a0a14;
	}

	.pin-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
	.pin-name { color: #aaa; flex: 1; }
	.pin-coords { color: #444; font-size: 0.45rem; font-variant-numeric: tabular-nums; }

	.add-btn {
		width: 100%;
		padding: 0.5rem;
		background: #080810;
		border: 1px dashed #1a1a2a;
		border-radius: 3px;
		color: #666;
		font-family: inherit;
		font-size: 0.55rem;
		cursor: pointer;
		transition: all 0.15s;
	}
	.add-btn:hover { border-color: #00ffcc44; color: #00ffcc; }

	.add-form { display: flex; flex-direction: column; gap: 0.4rem; }

	.input {
		width: 100%;
		padding: 0.4rem 0.5rem;
		background: #080810;
		border: 1px solid #1a1a2a;
		border-radius: 3px;
		color: #ccc;
		font-family: inherit;
		font-size: 0.55rem;
		outline: none;
	}
	.input:focus { border-color: #00ffcc44; }
	.input.small { width: 100%; }

	.coord-inputs { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem; }
	.coord-field label { display: block; font-size: 0.4rem; color: #555; margin-bottom: 2px; letter-spacing: 0.1em; }

	.form-actions { display: flex; gap: 0.3rem; }
	.action-btn {
		flex: 1;
		padding: 0.35rem;
		border: 1px solid #1a1a2a;
		border-radius: 3px;
		font-family: inherit;
		font-size: 0.5rem;
		cursor: pointer;
		transition: all 0.15s;
	}
	.action-btn.confirm { background: #00ffcc10; border-color: #00ffcc44; color: #00ffcc; }
	.action-btn.confirm:hover { background: #00ffcc20; }
	.action-btn.cancel { background: #080810; color: #666; }
	.action-btn.cancel:hover { color: #ff44aa; border-color: #ff44aa33; }

	.gps-info {
		display: flex; align-items: center; gap: 0.4rem;
		font-size: 0.5rem; color: #555; margin-bottom: 0.5rem;
	}
	.gps-icon { color: #44ff88; font-size: 0.8rem; }
</style>
