<script lang="ts">
	import type { PlayerProfile } from '$lib/multiplayer/identity.js';

	interface Props {
		players: PlayerProfile[];
		localPlayerId: string;
		visible?: boolean;
		maxPlayers?: number;
	}

	let { players, localPlayerId, visible = true, maxPlayers = 16 }: Props = $props();

	let collapsed = $state(false);
	let hoveredId = $state<string | null>(null);

	function getPingColor(ping: number): string {
		if (ping < 60) return '#00ffcc';
		if (ping < 120) return '#ffcc44';
		return '#ff4466';
	}

	function formatJoined(ts: number): string {
		const elapsed = Math.floor((Date.now() - ts) / 1000);
		if (elapsed < 60) return `${elapsed}s ago`;
		if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ago`;
		return `${Math.floor(elapsed / 3600)}h ago`;
	}

	const roleColors: Record<string, string> = {
		observer:  '#888',
		builder:   '#4466ff',
		navigator: '#00ffcc',
		architect: '#ff44aa',
	};

	const onlinePlayers = $derived(players.length);
</script>

{#if visible}
	<div class="player-list">
		<div class="panel-header">
			<div class="header-left">
				<span class="online-dot"></span>
				<span class="title">PLAYERS</span>
				<span class="count">({onlinePlayers}/{maxPlayers})</span>
			</div>
			<button class="collapse-btn" onclick={() => { collapsed = !collapsed; }}>
				{collapsed ? '\u25B6' : '\u25BC'}
			</button>
		</div>

		{#if !collapsed}
			<div class="player-rows">
				{#if players.length === 0}
					<div class="empty">Waiting for players...</div>
				{:else}
					{#each players as player (player.id)}
						{@const isLocal = player.id === localPlayerId}
						{@const isHovered = hoveredId === player.id}
						<div
							class="player-row"
							class:local={isLocal}
							role="listitem"
							onmouseenter={() => { hoveredId = player.id; }}
							onmouseleave={() => { hoveredId = null; }}
						>
							<span class="player-dot" style="background: {player.color}"></span>
							<span class="player-name" style="color: {isLocal ? player.color : '#aaa'}">{player.name}</span>
							{#if isLocal}
								<span class="you-badge">YOU</span>
							{/if}
							<span class="role-badge" style="color: {roleColors[player.role] ?? '#666'}">{player.role.toUpperCase()}</span>
							<span class="ping-dot" style="background: {getPingColor(40)}"></span>

							{#if isHovered}
								<div class="tooltip">
									<div class="tooltip-row">
										<span class="tooltip-label">Joined</span>
										<span class="tooltip-value">{formatJoined(player.joinedAt)}</span>
									</div>
									<div class="tooltip-row">
										<span class="tooltip-label">ID</span>
										<span class="tooltip-value mono">{player.id.slice(0, 12)}</span>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.player-list {
		position: absolute;
		top: 2rem;
		right: 0;
		width: 210px;
		background: #0d0d14;
		border-left: 1px solid #1a1a24;
		border-bottom: 1px solid #1a1a24;
		display: flex;
		flex-direction: column;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		z-index: 110;
	}

	.panel-header {
		padding: 0.4rem 0.5rem;
		border-bottom: 1px solid #1a1a24;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-left {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.online-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #00ffcc;
		box-shadow: 0 0 4px #00ffcc88;
		animation: pulse 2s ease-in-out infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.4; }
	}

	.title {
		letter-spacing: 0.15em;
		color: #666;
		font-size: 0.5rem;
	}

	.count {
		color: #444;
		font-size: 0.5rem;
	}

	.collapse-btn {
		background: none;
		border: none;
		color: #444;
		cursor: pointer;
		font-size: 0.45rem;
		padding: 0;
		line-height: 1;
	}

	.player-rows {
		display: flex;
		flex-direction: column;
	}

	.empty {
		padding: 0.6rem 0.5rem;
		color: #333;
		font-size: 0.5rem;
		text-align: center;
		letter-spacing: 0.08em;
	}

	.player-row {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.5rem;
		height: 24px;
		border-bottom: 1px solid #0f0f18;
		position: relative;
		transition: background 0.1s;
	}

	.player-row:hover { background: #ffffff05; }
	.player-row.local { background: #00ffcc06; }

	.player-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.player-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.you-badge {
		font-size: 0.4rem;
		color: #00ffcc;
		border: 1px solid #00ffcc44;
		padding: 0 3px;
		letter-spacing: 0.1em;
		line-height: 1.4;
		flex-shrink: 0;
	}

	.role-badge {
		font-size: 0.4rem;
		letter-spacing: 0.08em;
		flex-shrink: 0;
		opacity: 0.7;
	}

	.ping-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		flex-shrink: 0;
		opacity: 0.8;
	}

	.tooltip {
		position: absolute;
		right: calc(100% + 6px);
		top: 50%;
		transform: translateY(-50%);
		background: #0d0d14;
		border: 1px solid #1a1a24;
		padding: 0.35rem 0.45rem;
		white-space: nowrap;
		pointer-events: none;
		z-index: 200;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.tooltip-row {
		display: flex;
		gap: 0.4rem;
		align-items: center;
	}

	.tooltip-label {
		color: #444;
		min-width: 36px;
		font-size: 0.45rem;
	}

	.tooltip-value {
		color: #888;
		font-size: 0.45rem;
	}

	.tooltip-value.mono {
		color: #555;
		font-size: 0.4rem;
	}
</style>
