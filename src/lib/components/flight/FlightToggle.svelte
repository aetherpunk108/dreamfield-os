<script lang="ts">
	import { getDevices, getPreferred } from '$lib/stores/devices.svelte.js';

	interface Props {
		active: boolean;
		locked: boolean;
		ontoggle: () => void;
		onlock: () => void;
	}

	let { active, locked, ontoggle, onlock }: Props = $props();

	const devices = $derived(getDevices());
	const preferred = $derived(getPreferred());
	const hasGamepad = $derived(devices.some(d => d.type === 'gamepad' && d.connected));
	const hasVR = $derived(devices.some(d => d.type === 'vr' && d.connected));

	const deviceLabel = $derived(
		hasVR ? 'VR' :
		hasGamepad ? 'GAMEPAD' :
		'KB+MOUSE'
	);
</script>

<div class="flight-toggle" class:active class:locked>
	<button class="wing-btn" onclick={ontoggle} title={active ? 'Disable flight (F)' : 'Enable flight (F)'}>
		<svg class="wing-icon" viewBox="0 0 24 24" width="18" height="18">
			<path d="M12 2L4 12l2 2 4-3v9h4v-9l4 3 2-2z" fill="currentColor" opacity={active ? 1 : 0.4}/>
			<path d="M3 14l3 3 2-1.5M21 14l-3 3-2-1.5" stroke="currentColor" fill="none" stroke-width="1.2" opacity={active ? 0.8 : 0.2}/>
		</svg>
	</button>

	{#if active}
		<div class="flight-info">
			<span class="flight-label">FLIGHT</span>
			<span class="device-chip">{deviceLabel}</span>
			{#if !locked}
				<button class="engage-btn" onclick={onlock}>ENGAGE</button>
			{:else}
				<span class="active-dot"></span>
			{/if}
		</div>
	{/if}

	<!-- Controller status dots -->
	<div class="device-dots">
		{#if hasGamepad}
			<span class="dot gamepad" title="Gamepad connected">🎮</span>
		{/if}
		{#if hasVR}
			<span class="dot vr" title="VR ready">🥽</span>
		{/if}
	</div>
</div>

<style>
	.flight-toggle {
		position: absolute;
		bottom: 16px;
		left: 16px;
		display: flex;
		align-items: center;
		gap: 6px;
		z-index: 50;
		pointer-events: all;
	}

	.wing-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: rgba(10, 10, 18, 0.85);
		border: 1px solid #1a1a2a;
		color: #555;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
		backdrop-filter: blur(4px);
	}

	.wing-btn:hover {
		border-color: #00ffcc44;
		color: #00ffcc88;
		box-shadow: 0 0 12px #00ffcc11;
	}

	.flight-toggle.active .wing-btn {
		border-color: #00ffcc66;
		color: #00ffcc;
		background: rgba(0, 255, 204, 0.05);
		box-shadow: 0 0 12px #00ffcc22;
	}

	.flight-toggle.locked .wing-btn {
		border-color: #00ffcc;
		color: #00ffcc;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse { 0%, 100% { box-shadow: 0 0 8px #00ffcc22; } 50% { box-shadow: 0 0 16px #00ffcc44; } }

	.flight-info {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 4px 8px;
		background: rgba(10, 10, 18, 0.85);
		border: 1px solid #1a1a2a;
		border-radius: 4px;
		backdrop-filter: blur(4px);
	}

	.flight-label {
		font-size: 0.4rem;
		color: #00ffcc88;
		letter-spacing: 0.12em;
	}

	.device-chip {
		font-size: 0.38rem;
		color: #555;
		background: #ffffff06;
		padding: 1px 4px;
		border-radius: 2px;
		letter-spacing: 0.08em;
	}

	.engage-btn {
		font-size: 0.38rem;
		padding: 2px 6px;
		background: #00ffcc10;
		border: 1px solid #00ffcc33;
		border-radius: 3px;
		color: #00ffcc;
		font-family: inherit;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.15s;
	}

	.engage-btn:hover {
		background: #00ffcc20;
		border-color: #00ffcc66;
	}

	.active-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #00ffcc;
		box-shadow: 0 0 6px #00ffcc88;
		animation: pulse 1.5s infinite;
	}

	.device-dots {
		display: flex;
		gap: 3px;
		position: absolute;
		top: -8px;
		left: 28px;
	}

	.dot {
		font-size: 0.6rem;
		opacity: 0.8;
	}

	.wing-icon { transition: all 0.2s; }
</style>
