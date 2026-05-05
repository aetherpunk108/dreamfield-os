<script lang="ts">
	import { getFactions, type Faction } from '$lib/game/factions.js';

	const factions = $derived(getFactions());

	const tierColors: Record<string, string> = {
		allied: '#00ffcc',
		friendly: '#44ff88',
		neutral: '#888888',
		unfriendly: '#ffcc44',
		hostile: '#ff44aa',
	};
</script>

<div class="faction-bar">
	{#each factions.slice(0, 4) as faction}
		<div class="faction-chip" style:border-color="{tierColors[faction.tier]}33">
			<span class="faction-icon" style:color={faction.color}>{faction.icon}</span>
			<div class="faction-info">
				<span class="faction-name">{faction.name.split(' ')[0]}</span>
				<div class="rep-bar">
					<div
						class="rep-fill"
						style:width="{Math.max(2, (faction.reputation + 100) / 2)}%"
						style:background={tierColors[faction.tier]}
					></div>
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	.faction-bar {
		position: absolute;
		top: 36px;
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 3px;
		z-index: 45;
		pointer-events: none;
	}

	.faction-chip {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 2px 6px;
		background: rgba(8, 8, 14, 0.8);
		border: 1px solid #1a1a2a;
		border-radius: 3px;
		backdrop-filter: blur(4px);
	}

	.faction-icon { font-size: 0.6rem; }
	.faction-info { display: flex; flex-direction: column; gap: 1px; }
	.faction-name { font-size: 0.35rem; color: #666; letter-spacing: 0.05em; }

	.rep-bar {
		width: 40px;
		height: 2px;
		background: #111;
		border-radius: 1px;
		overflow: hidden;
	}

	.rep-fill {
		height: 100%;
		border-radius: 1px;
		transition: width 0.5s;
	}
</style>
