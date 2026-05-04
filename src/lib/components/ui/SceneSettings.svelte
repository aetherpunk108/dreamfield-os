<script lang="ts">
	import {
		HDRI_PRESETS,
		getHdriPath, setHdriPath,
		getHdriIntensity, setHdriIntensity,
		getHdriRotation, setHdriRotation,
		getHdriBlur, setHdriBlur,
		getBackgroundEnabled, setBackgroundEnabled,
		getNearClip, setNearClip,
		getFarClip, setFarClip,
		getFogEnabled, setFogEnabled,
		getFogNear, setFogNear,
		getFogFar, setFogFar,
		getToneMapping, setToneMapping,
		getExposure, setExposure,
	} from '$lib/stores/environment.svelte.js';

	interface Props {
		visible: boolean;
		onclose: () => void;
	}

	let { visible, onclose }: Props = $props();

	let customHdriInput: HTMLInputElement;
	let loading = $state(false);

	function handlePresetSelect(path: string | null) {
		setHdriPath(path);
		if (path) setBackgroundEnabled(true);
	}

	function handleCustomLoad() {
		customHdriInput?.click();
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		loading = true;
		const url = URL.createObjectURL(file);
		setHdriPath(url);
		setBackgroundEnabled(true);
		loading = false;
	}

	function setInfiniteClipping() {
		setNearClip(0.001);
		setFarClip(9999999);
	}

	function setDefaultClipping() {
		setNearClip(0.1);
		setFarClip(1000);
	}
</script>

{#if visible}
<div class="settings-overlay" onclick={onclose}>
	<div class="settings-panel" onclick={(e) => e.stopPropagation()}>
		<header class="panel-header">
			<span class="panel-title">SCENE SETTINGS</span>
			<button class="close-btn" onclick={onclose}>✕</button>
		</header>

		<div class="panel-body">
			<!-- Environment Map -->
			<section class="section">
				<h3>ENVIRONMENT MAP</h3>
				<div class="preset-grid">
					{#each HDRI_PRESETS as preset}
						<button
							class="preset-btn"
							class:active={getHdriPath() === preset.path}
							onclick={() => handlePresetSelect(preset.path)}
						>
							<span class="preset-dot" class:loaded={getHdriPath() === preset.path}></span>
							{preset.name}
						</button>
					{/each}
					<button class="preset-btn load-btn" onclick={handleCustomLoad}>
						<span class="preset-dot"></span>
						{loading ? 'Loading...' : 'Load Custom...'}
					</button>
				</div>
				<input
					bind:this={customHdriInput}
					type="file"
					accept=".exr,.hdr,.hdri"
					style="display:none"
					onchange={handleFileSelect}
				/>

				<div class="control-row">
					<label>Background</label>
					<button
						class="toggle"
						class:on={getBackgroundEnabled()}
						onclick={() => setBackgroundEnabled(!getBackgroundEnabled())}
					>{getBackgroundEnabled() ? 'ON' : 'OFF'}</button>
				</div>

				<div class="control-row">
					<label>Intensity</label>
					<input type="range" min="0" max="3" step="0.05"
						value={getHdriIntensity()}
						oninput={(e) => setHdriIntensity(parseFloat((e.target as HTMLInputElement).value))}
					/>
					<span class="val">{getHdriIntensity().toFixed(2)}</span>
				</div>

				<div class="control-row">
					<label>Rotation</label>
					<input type="range" min="0" max={String(Math.PI * 2)} step="0.01"
						value={getHdriRotation()}
						oninput={(e) => setHdriRotation(parseFloat((e.target as HTMLInputElement).value))}
					/>
					<span class="val">{(getHdriRotation() * 180 / Math.PI).toFixed(0)}°</span>
				</div>

				<div class="control-row">
					<label>Blur</label>
					<input type="range" min="0" max="1" step="0.01"
						value={getHdriBlur()}
						oninput={(e) => setHdriBlur(parseFloat((e.target as HTMLInputElement).value))}
					/>
					<span class="val">{getHdriBlur().toFixed(2)}</span>
				</div>
			</section>

			<!-- Camera Clipping -->
			<section class="section">
				<h3>CAMERA CLIPPING</h3>
				<div class="clip-presets">
					<button class="clip-btn" onclick={setInfiniteClipping}>INFINITE (Space)</button>
					<button class="clip-btn" onclick={setDefaultClipping}>DEFAULT (Scene)</button>
				</div>

				<div class="control-row">
					<label>Near</label>
					<input type="range" min="-3" max="2" step="0.1"
						value={Math.log10(getNearClip())}
						oninput={(e) => setNearClip(Math.pow(10, parseFloat((e.target as HTMLInputElement).value)))}
					/>
					<span class="val">{getNearClip().toFixed(4)}</span>
				</div>

				<div class="control-row">
					<label>Far</label>
					<input type="range" min="2" max="7" step="0.1"
						value={Math.log10(getFarClip())}
						oninput={(e) => setFarClip(Math.pow(10, parseFloat((e.target as HTMLInputElement).value)))}
					/>
					<span class="val">{getFarClip().toFixed(0)}</span>
				</div>

				<div class="clip-info">
					Ratio: {(getFarClip() / getNearClip()).toFixed(0)}:1
					{#if getFarClip() / getNearClip() > 1000000}
						<span class="warn">⚠ Z-fighting possible</span>
					{/if}
				</div>
			</section>

			<!-- Tone Mapping -->
			<section class="section">
				<h3>TONE MAPPING</h3>
				<div class="tone-grid">
					{#each ['linear', 'aces', 'reinhard', 'cineon'] as tone}
						<button
							class="tone-btn"
							class:active={getToneMapping() === tone}
							onclick={() => setToneMapping(tone as any)}
						>{tone.toUpperCase()}</button>
					{/each}
				</div>

				<div class="control-row">
					<label>Exposure</label>
					<input type="range" min="0.1" max="4" step="0.05"
						value={getExposure()}
						oninput={(e) => setExposure(parseFloat((e.target as HTMLInputElement).value))}
					/>
					<span class="val">{getExposure().toFixed(2)}</span>
				</div>
			</section>

			<!-- Fog -->
			<section class="section">
				<h3>FOG</h3>
				<div class="control-row">
					<label>Enabled</label>
					<button
						class="toggle"
						class:on={getFogEnabled()}
						onclick={() => setFogEnabled(!getFogEnabled())}
					>{getFogEnabled() ? 'ON' : 'OFF'}</button>
				</div>

				{#if getFogEnabled()}
					<div class="control-row">
						<label>Near</label>
						<input type="range" min="1" max="200" step="1"
							value={getFogNear()}
							oninput={(e) => setFogNear(parseFloat((e.target as HTMLInputElement).value))}
						/>
						<span class="val">{getFogNear()}</span>
					</div>
					<div class="control-row">
						<label>Far</label>
						<input type="range" min="10" max="500" step="5"
							value={getFogFar()}
							oninput={(e) => setFogFar(parseFloat((e.target as HTMLInputElement).value))}
						/>
						<span class="val">{getFogFar()}</span>
					</div>
				{/if}
			</section>

			<!-- Polar Coordinate Info -->
			<section class="section info-section">
				<h3>COORDINATE ALIGNMENT</h3>
				<div class="info-text">
					Galaxy map aligned to scene polar coordinates:<br/>
					• Galactic plane → scene XZ plane (62.87° tilt)<br/>
					• Galactic center → scene +Z axis<br/>
					• North galactic pole → scene +Y axis<br/>
					• Rotation slider adjusts galactic longitude offset
				</div>
			</section>
		</div>
	</div>
</div>
{/if}

<style>
	.settings-overlay {
		position: fixed;
		inset: 0;
		background: rgba(3, 3, 8, 0.8);
		backdrop-filter: blur(4px);
		z-index: 900;
		display: flex;
		justify-content: flex-end;
	}

	.settings-panel {
		width: 340px;
		height: 100vh;
		background: #0a0a12;
		border-left: 1px solid #1a1a2a;
		overflow-y: auto;
		box-shadow: -10px 0 40px rgba(0, 0, 0, 0.6);
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.8rem 1rem;
		border-bottom: 1px solid #1a1a2a;
		position: sticky;
		top: 0;
		background: #0a0a12;
		z-index: 10;
	}

	.panel-title {
		font-size: 0.6rem;
		letter-spacing: 0.15em;
		color: #00ffcc;
	}

	.close-btn {
		background: none;
		border: 1px solid #333;
		color: #666;
		width: 22px;
		height: 22px;
		border-radius: 3px;
		cursor: pointer;
		font-size: 0.55rem;
	}
	.close-btn:hover { border-color: #ff44aa; color: #ff44aa; }

	.panel-body { padding: 0.5rem; }

	.section {
		padding: 0.8rem;
		margin-bottom: 1px;
		background: #0d0d16;
		border: 1px solid #151520;
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}

	.section h3 {
		font-size: 0.5rem;
		letter-spacing: 0.12em;
		color: #555;
		margin-bottom: 0.6rem;
		font-weight: 400;
	}

	.preset-grid {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 0.8rem;
	}

	.preset-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.6rem;
		background: #080810;
		border: 1px solid #1a1a2a;
		border-radius: 3px;
		color: #888;
		font-family: inherit;
		font-size: 0.55rem;
		cursor: pointer;
		transition: all 0.15s;
		text-align: left;
	}

	.preset-btn:hover { border-color: #00ffcc44; color: #ccc; }
	.preset-btn.active { border-color: #00ffcc; color: #00ffcc; background: #00ffcc08; }

	.preset-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #333;
		flex-shrink: 0;
	}

	.preset-dot.loaded { background: #00ffcc; box-shadow: 0 0 4px #00ffcc66; }

	.load-btn { border-style: dashed; }

	.control-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.4rem;
	}

	.control-row label {
		font-size: 0.5rem;
		color: #666;
		min-width: 55px;
		letter-spacing: 0.05em;
	}

	.control-row input[type="range"] {
		flex: 1;
		height: 3px;
		appearance: none;
		background: #1a1a2a;
		border-radius: 2px;
		outline: none;
	}

	.control-row input[type="range"]::-webkit-slider-thumb {
		appearance: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #00ffcc;
		cursor: pointer;
		box-shadow: 0 0 4px #00ffcc44;
	}

	.val {
		font-size: 0.5rem;
		color: #00ffcc88;
		min-width: 40px;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.toggle {
		padding: 0.2rem 0.5rem;
		background: #1a1a2a;
		border: 1px solid #333;
		border-radius: 3px;
		color: #555;
		font-family: inherit;
		font-size: 0.5rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.toggle.on {
		background: #00ffcc15;
		border-color: #00ffcc44;
		color: #00ffcc;
	}

	.clip-presets {
		display: flex;
		gap: 4px;
		margin-bottom: 0.6rem;
	}

	.clip-btn {
		flex: 1;
		padding: 0.35rem 0.4rem;
		background: #080810;
		border: 1px solid #1a1a2a;
		border-radius: 3px;
		color: #888;
		font-family: inherit;
		font-size: 0.5rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.clip-btn:hover { border-color: #00ffcc44; color: #00ffcc; }

	.clip-info {
		font-size: 0.45rem;
		color: #555;
		margin-top: 0.3rem;
	}

	.warn { color: #ff44aa; margin-left: 0.5rem; }

	.tone-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
		margin-bottom: 0.6rem;
	}

	.tone-btn {
		padding: 0.3rem;
		background: #080810;
		border: 1px solid #1a1a2a;
		border-radius: 3px;
		color: #666;
		font-family: inherit;
		font-size: 0.45rem;
		cursor: pointer;
		transition: all 0.15s;
	}

	.tone-btn:hover { border-color: #4466ff44; color: #aaa; }
	.tone-btn.active { border-color: #4466ff; color: #4466ff; background: #4466ff10; }

	.info-section .info-text {
		font-size: 0.5rem;
		color: #555;
		line-height: 1.6;
	}
</style>
