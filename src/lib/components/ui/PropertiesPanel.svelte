<script lang="ts">
	import type { Ghost } from '$lib/spatial/primitives/ghost.js';
	import type { TrinaryState } from '$lib/spatial/state.js';

	interface Props {
		visible?: boolean;
		selectedId?: string | null;
		ghost?: Ghost | null;
		triState?: TrinaryState;
	}

	let { visible = true, selectedId = null, ghost = null, triState = 0 }: Props = $props();

	const stateLabels: Record<number, string> = {
		[-1]: 'ABSENT',
		0: 'POTENTIAL',
		1: 'PRESENT',
	};

	const stateColors: Record<number, string> = {
		[-1]: '#ff4466',
		0: '#888888',
		1: '#00ffcc',
	};
</script>

{#if visible}
	<div class="properties">
		<div class="header">
			<span class="title">PROPERTIES</span>
		</div>

		<div class="content">
			{#if ghost}
				<div class="section">
					<span class="section-title">IDENTITY</span>
					<div class="prop-row">
						<span class="prop-label">ID</span>
						<span class="prop-value mono">{ghost.id}</span>
					</div>
					<div class="prop-row">
						<span class="prop-label">Type</span>
						<span class="prop-value">Ghost (\u03C8)</span>
					</div>
				</div>

				<div class="section">
					<span class="section-title">TRANSFORM</span>
					<div class="prop-row">
						<span class="prop-label">X</span>
						<span class="prop-value num">{ghost.position[0].toFixed(3)}</span>
					</div>
					<div class="prop-row">
						<span class="prop-label">Y</span>
						<span class="prop-value num">{ghost.position[1].toFixed(3)}</span>
					</div>
					<div class="prop-row">
						<span class="prop-label">Z</span>
						<span class="prop-value num">{ghost.position[2].toFixed(3)}</span>
					</div>
					<div class="prop-row">
						<span class="prop-label">Sigma (\u03C3)</span>
						<span class="prop-value num">{ghost.sigma.toFixed(3)}</span>
					</div>
				</div>

				<div class="section">
					<span class="section-title">APPEARANCE</span>
					<div class="prop-row">
						<span class="prop-label">Color</span>
						<div class="color-swatch" style="background: rgb({ghost.color[0]*255},{ghost.color[1]*255},{ghost.color[2]*255})"></div>
						<span class="prop-value num">
							{ghost.color.slice(0,3).map(c => c.toFixed(2)).join(', ')}
						</span>
					</div>
					<div class="prop-row">
						<span class="prop-label">Opacity</span>
						<span class="prop-value num">{ghost.opacity.toFixed(2)}</span>
					</div>
				</div>

				<div class="section">
					<span class="section-title">OBSERVATION</span>
					<div class="prop-row">
						<span class="prop-label">State</span>
						<span class="state-badge" style="color: {stateColors[triState]}">
							{stateLabels[triState]}
						</span>
					</div>
				</div>
			{:else if selectedId}
				<div class="empty">
					<p>Selected: {selectedId}</p>
					<p class="hint">Non-ghost properties coming in Phase 5</p>
				</div>
			{:else}
				<div class="empty">
					<p>No selection</p>
					<p class="hint">Select an object in the Outliner or viewport</p>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.properties {
		position: absolute;
		top: 0;
		right: 0;
		width: 240px;
		height: 100%;
		background: #0d0d14;
		border-left: 1px solid #1a1a24;
		display: flex;
		flex-direction: column;
		font-size: 0.6rem;
		z-index: 100;
		overflow-y: auto;
	}

	.header {
		padding: 0.5rem 0.6rem;
		border-bottom: 1px solid #1a1a24;
	}

	.title {
		letter-spacing: 0.15em;
		color: #666;
		font-size: 0.55rem;
	}

	.content {
		flex: 1;
		padding: 0.5rem;
	}

	.section {
		margin-bottom: 0.8rem;
	}

	.section-title {
		display: block;
		color: #555;
		font-size: 0.5rem;
		letter-spacing: 0.12em;
		padding-bottom: 0.3rem;
		border-bottom: 1px solid #1a1a20;
		margin-bottom: 0.3rem;
	}

	.prop-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.2rem 0;
	}

	.prop-label {
		color: #555;
		min-width: 50px;
	}

	.prop-value {
		color: #aaa;
	}

	.prop-value.num {
		font-variant-numeric: tabular-nums;
		color: #88aacc;
	}

	.prop-value.mono {
		font-size: 0.5rem;
		color: #666;
	}

	.color-swatch {
		width: 12px;
		height: 12px;
		border-radius: 2px;
		border: 1px solid #333;
	}

	.state-badge {
		font-weight: 400;
		letter-spacing: 0.08em;
	}

	.empty {
		padding: 1rem 0.5rem;
		text-align: center;
		color: #444;
	}

	.hint {
		font-size: 0.5rem;
		color: #333;
		margin-top: 0.3rem;
	}
</style>
