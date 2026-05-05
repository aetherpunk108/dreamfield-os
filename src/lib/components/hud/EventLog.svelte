<script lang="ts">
	import { onMount } from 'svelte';
	import { getEvents, onEvent, type GameEvent } from '$lib/game/events.js';

	interface Props {
		maxVisible?: number;
	}

	let { maxVisible = 6 }: Props = $props();

	let visible = $state<GameEvent[]>([]);
	let expanded = $state(false);

	onMount(() => {
		visible = getEvents(maxVisible);
		const unsub = onEvent((event) => {
			visible = [...visible.slice(-(maxVisible - 1)), event];
		});
		return unsub;
	});

	const importanceColor: Record<string, string> = {
		low: '#555',
		medium: '#888',
		high: '#00ffcc',
		critical: '#ff44aa',
	};

	function timeAgo(ts: number): string {
		const s = Math.floor((Date.now() - ts) / 1000);
		if (s < 5) return 'now';
		if (s < 60) return `${s}s`;
		return `${Math.floor(s / 60)}m`;
	}
</script>

<div class="event-log" class:expanded>
	<button class="log-header" onclick={() => expanded = !expanded}>
		<span class="log-icon">◈</span>
		<span class="log-title">EVENT LOG</span>
		<span class="log-count">{visible.length}</span>
	</button>

	{#if expanded || visible.length > 0}
		<div class="log-entries">
			{#each visible.slice(-maxVisible).reverse() as event}
				<div class="log-entry" style:border-left-color={importanceColor[event.importance]}>
					<span class="entry-time">{timeAgo(event.timestamp)}</span>
					<span class="entry-msg">{event.message}</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.event-log {
		position: absolute;
		bottom: 60px;
		left: 16px;
		max-width: 280px;
		z-index: 45;
		pointer-events: all;
	}

	.log-header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 3px 8px;
		background: rgba(8, 8, 14, 0.8);
		border: 1px solid #1a1a2a;
		border-radius: 3px;
		cursor: pointer;
		font-family: inherit;
		backdrop-filter: blur(4px);
		transition: all 0.15s;
	}

	.log-header:hover { border-color: #00ffcc33; }
	.log-icon { color: #00ffcc66; font-size: 0.6rem; }
	.log-title { font-size: 0.4rem; color: #555; letter-spacing: 0.1em; }
	.log-count { font-size: 0.4rem; color: #333; margin-left: auto; }

	.log-entries {
		margin-top: 3px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		max-height: 150px;
		overflow-y: auto;
	}

	.log-entry {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 3px 6px;
		background: rgba(8, 8, 14, 0.85);
		border-left: 2px solid #333;
		border-radius: 0 2px 2px 0;
		font-size: 0.45rem;
		animation: slideIn 0.2s ease;
	}

	@keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: none; } }

	.entry-time { color: #444; min-width: 22px; font-variant-numeric: tabular-nums; }
	.entry-msg { color: #999; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
