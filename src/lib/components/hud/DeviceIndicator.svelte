<script lang="ts">
	import { getDevices, getPreferred, getVRReady } from '$lib/stores/devices.svelte.js';

	const devices = $derived(getDevices());
	const preferred = $derived(getPreferred());
	const vrReady = $derived(getVRReady());

	const icons: Record<string, string> = {
		keyboard: '⌨',
		gamepad: '🎮',
		vr: '🥽',
		touch: '👆',
	};
</script>

<div class="device-indicator">
	{#each devices as device}
		{#if device.connected}
			<div class="device-chip" class:preferred={device.type === preferred} title={device.name}>
				<span class="device-icon">{icons[device.type] ?? '◈'}</span>
				<span class="device-label">{device.type.toUpperCase()}</span>
			</div>
		{/if}
	{/each}

	{#if vrReady}
		<div class="vr-badge">VR READY</div>
	{/if}

	{#if devices.length === 0}
		<div class="device-chip">
			<span class="device-icon">⌨</span>
			<span class="device-label">KB+MOUSE</span>
		</div>
	{/if}
</div>

<style>
	.device-indicator {
		position: absolute;
		top: 36px;
		right: 12px;
		display: flex;
		gap: 4px;
		align-items: center;
		pointer-events: none;
		z-index: 50;
	}

	.device-chip {
		display: flex;
		align-items: center;
		gap: 3px;
		padding: 2px 6px;
		background: rgba(10, 10, 18, 0.8);
		border: 1px solid #1a1a2a;
		border-radius: 3px;
		font-size: 0.45rem;
		color: #555;
		backdrop-filter: blur(4px);
	}

	.device-chip.preferred {
		border-color: #00ffcc44;
		color: #00ffcc88;
	}

	.device-icon { font-size: 0.6rem; }
	.device-label { letter-spacing: 0.08em; }

	.vr-badge {
		padding: 2px 6px;
		background: #4466ff15;
		border: 1px solid #4466ff44;
		border-radius: 3px;
		font-size: 0.4rem;
		color: #4466ff;
		letter-spacing: 0.1em;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
</style>
