<script lang="ts">
	import { onMount } from 'svelte';
	import {
		SHIP_CLASSES, type PlayerState, type ShipClass,
		type GPSMission, getDockingServices, type DockingService
	} from '$lib/game/engine.js';
	import { getAvailableMissions, getActiveMission, acceptMission, getMissions, getCompletedMissions, initMissions } from '$lib/cosmos/missions.js';

	interface Props {
		player: PlayerState;
		visible: boolean;
		gpsMissions: GPSMission[];
		onclose: () => void;
		onwarp?: (targetPos: [number,number,number], name: string) => void;
		onshipchange?: (classId: string) => void;
		ondock?: (action: string) => void;
	}

	let { player, visible, gpsMissions, onclose, onwarp, onshipchange, ondock }: Props = $props();

	let activeTab = $state<'ship' | 'missions' | 'dock' | 'map'>('ship');

	const currentShip = $derived(SHIP_CLASSES.find(s => s.id === player.shipClass) ?? SHIP_CLASSES[0]);
	const hullPct = $derived(Math.round((player.hull / currentShip.hull) * 100));
	const shieldPct = $derived(Math.round((player.shield / currentShip.shield) * 100));
	const fuelPct = $derived(Math.round(player.fuel));

	onMount(() => {
		if (getMissions().length === 0) initMissions();
	});
</script>

{#if visible}
<div class="game-overlay" onclick={onclose}>
	<div class="game-panel" onclick={(e) => e.stopPropagation()}>
		<header class="panel-header">
			<div class="player-info">
				<span class="player-name">{player.name}</span>
				<span class="player-level">LVL {player.level}</span>
				<span class="player-credits">{player.credits} CR</span>
			</div>
			<button class="close-btn" onclick={onclose}>✕</button>
		</header>

		<nav class="tabs">
			{#each ['ship', 'missions', 'dock', 'map'] as tab}
				<button
					class="tab" class:active={activeTab === tab}
					onclick={() => activeTab = tab as any}
				>{tab.toUpperCase()}</button>
			{/each}
		</nav>

		<div class="panel-body">
			{#if activeTab === 'ship'}
				<!-- Ship Status -->
				<div class="section">
					<h3>{currentShip.name} CLASS</h3>
					<p class="ship-desc">{currentShip.description}</p>
					<div class="stat-bars">
						<div class="bar-row">
							<span class="bar-label">HULL</span>
							<div class="bar"><div class="bar-fill hull" style:width="{hullPct}%"></div></div>
							<span class="bar-val">{player.hull.toFixed(0)}/{currentShip.hull}</span>
						</div>
						<div class="bar-row">
							<span class="bar-label">SHIELD</span>
							<div class="bar"><div class="bar-fill shield" style:width="{shieldPct}%"></div></div>
							<span class="bar-val">{player.shield.toFixed(0)}/{currentShip.shield}</span>
						</div>
						<div class="bar-row">
							<span class="bar-label">FUEL</span>
							<div class="bar"><div class="bar-fill fuel" style:width="{fuelPct}%"></div></div>
							<span class="bar-val">{fuelPct}%</span>
						</div>
					</div>
					<div class="stat-grid">
						<div class="stat"><span class="sv">{currentShip.maxSpeed}</span><span class="sl">MAX SPD</span></div>
						<div class="stat"><span class="sv">x{currentShip.boostMultiplier}</span><span class="sl">BOOST</span></div>
						<div class="stat"><span class="sv">{currentShip.scanRange}</span><span class="sl">SCAN</span></div>
						<div class="stat"><span class="sv">{currentShip.cargo}</span><span class="sl">CARGO</span></div>
					</div>
				</div>

				<!-- Ship Selection -->
				<div class="section">
					<h3>CHANGE VESSEL</h3>
					<div class="ship-list">
						{#each SHIP_CLASSES as ship}
							<button
								class="ship-option" class:active={ship.id === player.shipClass}
								onclick={() => onshipchange?.(ship.id)}
							>
								<span class="ship-dot" style:background={ship.color}></span>
								<span class="ship-name">{ship.name}</span>
								<span class="ship-brief">{ship.description.split('—')[0]}</span>
							</button>
						{/each}
					</div>
				</div>

			{:else if activeTab === 'missions'}
				<!-- Active Mission -->
				{#if getActiveMission()}
					<div class="section active-mission">
						<h3>ACTIVE MISSION</h3>
						<div class="mission-name">{getActiveMission()?.name}</div>
						<div class="mission-desc">{getActiveMission()?.description}</div>
						<div class="objectives">
							{#each getActiveMission()?.objectives ?? [] as obj}
								<div class="obj-row" class:done={obj.complete}>
									<span class="obj-check">{obj.complete ? '✓' : '○'}</span>
									{obj.text}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- GPS Missions -->
				{#if gpsMissions.length > 0}
					<div class="section">
						<h3>GPS CONTRACTS</h3>
						{#each gpsMissions.slice(0, 5) as m}
							<div class="mission-card">
								<div class="mc-head">
									<span class="mc-name">{m.name}</span>
									<span class="mc-diff">{'★'.repeat(m.difficulty)}</span>
								</div>
								<div class="mc-desc">{m.distanceKm} km — {m.reward.credits} CR / {m.reward.xp} XP</div>
								{#if m.type === 'race' && m.timeLimit}
									<div class="mc-time">Time limit: {m.timeLimit}s</div>
								{/if}
								<button class="mc-warp" onclick={() => onwarp?.(m.destPos as [number,number,number], m.name)}>
									WARP TO DESTINATION
								</button>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Standard Missions -->
				<div class="section">
					<h3>AVAILABLE</h3>
					{#each getAvailableMissions().slice(0, 4) as m}
						<div class="mission-row">
							<span class="mr-name">{m.name}</span>
							<span class="mr-reward">{m.reward.credits} CR</span>
							<button class="mr-accept" onclick={() => acceptMission(m.id)}>ACCEPT</button>
						</div>
					{/each}
				</div>

				{#if getCompletedMissions().length > 0}
					<div class="section">
						<h3>COMPLETED ({getCompletedMissions().length})</h3>
						{#each getCompletedMissions().slice(0, 3) as m}
							<div class="mission-row done"><span class="mr-name">✓ {m.name}</span></div>
						{/each}
					</div>
				{/if}

			{:else if activeTab === 'dock'}
				{#if player.docked}
					<div class="section">
						<h3>DOCKED AT {player.dockedAt?.toUpperCase()}</h3>
						<div class="dock-services">
							{#each getDockingServices(player.dockedAt ?? '') as svc}
								<button class="dock-btn" onclick={() => ondock?.(svc.id)}>
									<span class="dock-icon">{svc.icon}</span>
									<div>
										<span class="dock-name">{svc.name}</span>
										<span class="dock-desc">{svc.description}</span>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{:else}
					<div class="section">
						<h3>NOT DOCKED</h3>
						<p class="empty-state">Approach a station within 3 units to dock</p>
					</div>
				{/if}

			{:else if activeTab === 'map'}
				<div class="section">
					<h3>NAVIGATION</h3>
					<div class="map-info">
						<div class="coord-row"><span>X</span><span>{player.position[0].toFixed(1)}</span></div>
						<div class="coord-row"><span>Y</span><span>{player.position[1].toFixed(1)}</span></div>
						<div class="coord-row"><span>Z</span><span>{player.position[2].toFixed(1)}</span></div>
						<div class="coord-row"><span>ZONE</span><span>{player.scaleZone.toUpperCase()}</span></div>
						<div class="coord-row"><span>SPEED</span><span>{player.speed.toFixed(1)}</span></div>
					</div>
				</div>
				<div class="section">
					<h3>CARGO ({player.cargo.length}/{currentShip.cargo})</h3>
					{#if player.cargo.length === 0}
						<p class="empty-state">Cargo bay empty</p>
					{:else}
						{#each player.cargo as item}
							<div class="cargo-row">
								<span>{item.name}</span>
								<span>x{item.quantity}</span>
								<span class="cargo-val">{item.value} CR</span>
							</div>
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
	.game-overlay { position: fixed; inset: 0; background: rgba(3,3,8,0.85); backdrop-filter: blur(6px); z-index: 900; display: flex; align-items: center; justify-content: center; }
	.game-panel { width: 480px; max-height: 80vh; background: #0a0a12; border: 1px solid #1a1a2a; border-radius: 8px; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.8); }
	.panel-header { display: flex; justify-content: space-between; align-items: center; padding: 0.8rem 1rem; border-bottom: 1px solid #1a1a2a; }
	.player-info { display: flex; align-items: center; gap: 0.8rem; }
	.player-name { color: #00ffcc; font-size: 0.7rem; letter-spacing: 0.1em; }
	.player-level { background: #00ffcc15; border: 1px solid #00ffcc33; padding: 0.1rem 0.4rem; border-radius: 3px; font-size: 0.45rem; color: #00ffcc88; }
	.player-credits { color: #ffcc44; font-size: 0.6rem; }
	.close-btn { background: none; border: 1px solid #333; color: #666; width: 22px; height: 22px; border-radius: 3px; cursor: pointer; font-size: 0.55rem; }
	.close-btn:hover { border-color: #ff44aa; color: #ff44aa; }

	.tabs { display: flex; border-bottom: 1px solid #1a1a2a; }
	.tab { flex: 1; padding: 0.5rem; background: none; border: none; border-bottom: 2px solid transparent; color: #555; font-family: inherit; font-size: 0.5rem; letter-spacing: 0.1em; cursor: pointer; transition: all 0.15s; }
	.tab:hover { color: #888; }
	.tab.active { color: #00ffcc; border-bottom-color: #00ffcc; background: #00ffcc08; }

	.panel-body { padding: 0.5rem; }
	.section { padding: 0.8rem; background: #0d0d16; border: 1px solid #151520; border-radius: 4px; margin-bottom: 0.5rem; }
	.section h3 { font-size: 0.5rem; letter-spacing: 0.12em; color: #555; margin-bottom: 0.5rem; font-weight: 400; }

	.ship-desc { font-size: 0.5rem; color: #888; margin-bottom: 0.6rem; }

	.stat-bars { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 0.6rem; }
	.bar-row { display: flex; align-items: center; gap: 0.4rem; }
	.bar-label { font-size: 0.4rem; color: #555; min-width: 40px; letter-spacing: 0.08em; }
	.bar { flex: 1; height: 4px; background: #111; border-radius: 2px; overflow: hidden; }
	.bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
	.bar-fill.hull { background: linear-gradient(90deg, #ff444466, #ff4444); }
	.bar-fill.shield { background: linear-gradient(90deg, #4466ff66, #4466ff); }
	.bar-fill.fuel { background: linear-gradient(90deg, #00ffcc66, #00ffcc); }
	.bar-val { font-size: 0.45rem; color: #666; min-width: 50px; text-align: right; font-variant-numeric: tabular-nums; }

	.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.3rem; }
	.stat { text-align: center; padding: 0.3rem; background: #080810; border-radius: 3px; }
	.sv { display: block; font-size: 0.7rem; color: #ccc; }
	.sl { font-size: 0.35rem; color: #444; letter-spacing: 0.08em; }

	.ship-list { display: flex; flex-direction: column; gap: 3px; }
	.ship-option { display: flex; align-items: center; gap: 0.5rem; padding: 0.4rem 0.5rem; background: #080810; border: 1px solid #1a1a2a; border-radius: 3px; color: #888; font-family: inherit; font-size: 0.5rem; cursor: pointer; text-align: left; transition: all 0.15s; }
	.ship-option:hover { border-color: #00ffcc33; }
	.ship-option.active { border-color: #00ffcc; color: #00ffcc; }
	.ship-dot { width: 6px; height: 6px; border-radius: 50%; }
	.ship-name { min-width: 60px; }
	.ship-brief { color: #555; font-size: 0.45rem; }

	.active-mission { border-color: #00ffcc33; }
	.mission-name { font-size: 0.65rem; color: #00ffcc; margin-bottom: 0.2rem; }
	.mission-desc { font-size: 0.5rem; color: #888; margin-bottom: 0.5rem; }
	.objectives { display: flex; flex-direction: column; gap: 0.2rem; }
	.obj-row { font-size: 0.5rem; color: #888; display: flex; gap: 0.3rem; align-items: center; }
	.obj-row.done { color: #00ffcc88; }
	.obj-check { font-size: 0.6rem; }

	.mission-card { padding: 0.5rem; background: #080810; border: 1px solid #1a1a2a; border-radius: 3px; margin-bottom: 0.3rem; }
	.mc-head { display: flex; justify-content: space-between; }
	.mc-name { font-size: 0.55rem; color: #ccc; }
	.mc-diff { color: #ffcc44; font-size: 0.5rem; }
	.mc-desc { font-size: 0.45rem; color: #666; margin: 0.2rem 0; }
	.mc-time { font-size: 0.4rem; color: #ff44aa; }
	.mc-warp { margin-top: 0.3rem; width: 100%; padding: 0.3rem; background: #4466ff15; border: 1px solid #4466ff44; border-radius: 3px; color: #4466ff; font-family: inherit; font-size: 0.45rem; letter-spacing: 0.1em; cursor: pointer; }
	.mc-warp:hover { background: #4466ff25; }

	.mission-row { display: flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0; font-size: 0.5rem; border-bottom: 1px solid #0a0a14; }
	.mission-row.done { opacity: 0.5; }
	.mr-name { flex: 1; color: #aaa; }
	.mr-reward { color: #ffcc44; font-size: 0.45rem; }
	.mr-accept { padding: 0.2rem 0.5rem; background: #00ffcc10; border: 1px solid #00ffcc33; border-radius: 3px; color: #00ffcc; font-family: inherit; font-size: 0.4rem; cursor: pointer; }
	.mr-accept:hover { background: #00ffcc20; }

	.dock-services { display: flex; flex-direction: column; gap: 0.3rem; }
	.dock-btn { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem; background: #080810; border: 1px solid #1a1a2a; border-radius: 3px; color: #aaa; font-family: inherit; cursor: pointer; text-align: left; transition: all 0.15s; }
	.dock-btn:hover { border-color: #00ffcc44; }
	.dock-icon { font-size: 1rem; }
	.dock-name { display: block; font-size: 0.55rem; color: #ccc; }
	.dock-desc { font-size: 0.45rem; color: #555; }

	.empty-state { font-size: 0.5rem; color: #444; text-align: center; padding: 1rem; }

	.map-info { display: flex; flex-direction: column; gap: 0.2rem; }
	.coord-row { display: flex; justify-content: space-between; font-size: 0.5rem; color: #888; padding: 0.15rem 0; border-bottom: 1px solid #0a0a14; }
	.coord-row span:first-child { color: #555; }

	.cargo-row { display: flex; justify-content: space-between; font-size: 0.5rem; color: #888; padding: 0.2rem 0; }
	.cargo-val { color: #ffcc44; }
</style>
