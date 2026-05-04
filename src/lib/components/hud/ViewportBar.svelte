<script lang="ts">
	interface Props {
		viewMode: string;
		selectedId: string | null;
		ghostCount: number;
		collapsedCount: number;
		entanglementEnabled: boolean;
		fogNear: number;
		fogFar: number;
	}

	let {
		viewMode, selectedId, ghostCount, collapsedCount,
		entanglementEnabled, fogNear, fogFar
	}: Props = $props();
</script>

<div class="viewport-bar">
	<div class="segment">
		<span class="label">VIEW</span>
		<span class="value accent">{viewMode.toUpperCase()}</span>
	</div>
	<div class="divider"></div>
	<div class="segment">
		<span class="label">SELECTED</span>
		<span class="value">{selectedId ?? 'none'}</span>
	</div>
	<div class="divider"></div>
	<div class="segment">
		<span class="label">GHOSTS</span>
		<span class="value">{collapsedCount}<span class="dim">/{ghostCount}</span></span>
	</div>
	<div class="divider"></div>
	<div class="segment">
		<span class="label">ENTANGLE</span>
		<span class="value" class:on={entanglementEnabled} class:off={!entanglementEnabled}>
			{entanglementEnabled ? 'ON' : 'OFF'}
		</span>
	</div>
	<div class="divider"></div>
	<div class="segment">
		<span class="label">FOG</span>
		<span class="value">{fogNear.toFixed(0)}-{fogFar.toFixed(0)}</span>
	</div>
	<div class="spacer"></div>
	<div class="segment">
		<span class="label">KEYS</span>
		<span class="value dim">N: Outliner  P: Props  T: Controls  1/2: View</span>
	</div>
</div>

<style>
	.viewport-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 22px;
		background: #0c0c14;
		border-top: 1px solid #1a1a24;
		display: flex;
		align-items: center;
		padding: 0 0.6rem;
		font-size: 0.5rem;
		letter-spacing: 0.05em;
		z-index: 60;
		gap: 0.5rem;
	}

	.segment {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}

	.label { color: #444; }
	.value { color: #888; font-variant-numeric: tabular-nums; }
	.value.accent { color: #00ffcc; }
	.value.on { color: #00ffcc; }
	.value.off { color: #ff4466; }
	.dim { color: #333; }

	.divider {
		width: 1px;
		height: 10px;
		background: #1a1a24;
	}

	.spacer { flex: 1; }
</style>
