<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		visible: boolean;
		onclose: () => void;
		ghostCount?: number;
		collapsedCount?: number;
		observerCount?: number;
		testsPass?: number;
		serverOnline?: boolean;
		ionConnected?: boolean;
	}

	let {
		visible, onclose,
		ghostCount = 0, collapsedCount = 0, observerCount = 3,
		testsPass = 92, serverOnline = true, ionConnected = true
	}: Props = $props();

	// Phase timeline data
	const phases = [
		{ id: 1, name: 'Foundation', status: 'complete' as const, desc: 'Spatial module, octree, boot screen' },
		{ id: 2, name: '3D Rendering', status: 'complete' as const, desc: 'Renderers, entanglement, breath voxels' },
		{ id: 3, name: 'Backend API', status: 'complete' as const, desc: 'REST, WebSocket, Eden client' },
		{ id: 4, name: 'Geospatial', status: 'complete' as const, desc: 'WGS84, orbits, celestial orrery' },
		{ id: 5, name: 'GUI Polish', status: 'complete' as const, desc: 'MenuBar, Outliner, HUD, PostFX' },
		{ id: 6, name: 'Advanced', status: 'complete' as const, desc: 'Cesium Ion, camera rig, perception' },
		{ id: 7, name: 'INCONTROL', status: 'active' as const, desc: 'Flight system, pressure curves, ship physics' },
		{ id: 8, name: 'Multiplayer', status: 'planned' as const, desc: 'Accounts, plugins, shared worlds' },
		{ id: 9, name: 'AI Agents', status: 'planned' as const, desc: 'Observer AI, autonomous entities' },
	];

	// Information channels
	const channels = [
		{ name: 'Observation Tensor', icon: 'Ω', active: true, bandwidth: 'real-time' },
		{ name: 'WebSocket Spatial', icon: '◈', active: serverOnline, bandwidth: '~60fps' },
		{ name: 'Cesium Ion Stream', icon: '◉', active: ionConnected, bandwidth: 'on-demand' },
		{ name: 'Entanglement Bus', icon: '⟡', active: true, bandwidth: 'event-driven' },
		{ name: 'Breath Field Sync', icon: 'β', active: true, bandwidth: '30fps' },
	];

	// Interface views
	const views = [
		{ name: 'Spatial Field', key: '1', desc: 'Primary 3D observation space' },
		{ name: 'Orrery', key: '2', desc: 'Planetary/celestial mechanics' },
		{ name: 'Terrain', key: '3', desc: 'Cesium ion terrain streaming' },
		{ name: 'Dashboard', key: 'D', desc: 'System overview (this panel)' },
	];

	// Future: plugin/account system
	const pluginSlots = [
		{ name: 'Observer Module', status: 'core', desc: 'Human/AI/Satellite perception' },
		{ name: 'Cesium Ion', status: 'active', desc: 'Geospatial data streaming' },
		{ name: 'Multiplayer Sync', status: 'planned', desc: 'Shared world state via WebRTC' },
		{ name: 'AI Perception', status: 'planned', desc: 'Autonomous observation agents' },
		{ name: 'Asset Marketplace', status: 'future', desc: 'Community splats, terrains, models' },
	];

	// Player interaction modes
	const playerModes = [
		{ role: 'Observer', desc: 'View and collapse quantum states', color: '#00ffcc' },
		{ role: 'Builder', desc: 'Place primitives, sculpt terrain', color: '#4466ff' },
		{ role: 'Navigator', desc: 'Fly through, mark waypoints', color: '#ff44aa' },
		{ role: 'Architect', desc: 'Design entanglement networks', color: '#ffcc44' },
	];

	let elapsed = $state(0);
	let animFrame: number;

	onMount(() => {
		const start = Date.now();
		function tick() {
			elapsed = (Date.now() - start) / 1000;
			animFrame = requestAnimationFrame(tick);
		}
		tick();
		return () => cancelAnimationFrame(animFrame);
	});

	const consciousness = $derived(ghostCount > 0 ? Math.round((collapsedCount / ghostCount) * 100) : 0);
</script>

{#if visible}
<div class="dashboard-overlay" onclick={onclose}>
	<div class="dashboard" onclick={(e) => e.stopPropagation()}>
		<header class="dash-header">
			<div class="dash-title">
				<span class="dash-icon">◈</span>
				DREAMFIELD OS — SYSTEM DASHBOARD
			</div>
			<button class="close-btn" onclick={onclose}>✕</button>
		</header>

		<div class="dash-grid">
			<!-- System Status -->
			<section class="card status-card">
				<h3>SYSTEM STATUS</h3>
				<div class="stat-grid">
					<div class="stat">
						<span class="stat-value">{ghostCount}</span>
						<span class="stat-label">Ghosts</span>
					</div>
					<div class="stat">
						<span class="stat-value">{collapsedCount}</span>
						<span class="stat-label">Collapsed</span>
					</div>
					<div class="stat">
						<span class="stat-value">{observerCount}</span>
						<span class="stat-label">Observers</span>
					</div>
					<div class="stat">
						<span class="stat-value">{consciousness}%</span>
						<span class="stat-label">Awareness</span>
					</div>
				</div>
				<div class="stat-bar">
					<div class="stat-bar-fill" style:width="{consciousness}%"></div>
				</div>
				<div class="stat-row">
					<span class="indicator" class:online={serverOnline}></span>
					<span>Backend API</span>
					<span class="badge">{serverOnline ? 'ONLINE' : 'OFFLINE'}</span>
				</div>
				<div class="stat-row">
					<span class="indicator" class:online={ionConnected}></span>
					<span>Cesium Ion</span>
					<span class="badge">{ionConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
				</div>
				<div class="stat-row">
					<span class="indicator online"></span>
					<span>Tests</span>
					<span class="badge">{testsPass} PASSING</span>
				</div>
			</section>

			<!-- Information Channels -->
			<section class="card">
				<h3>INFORMATION CHANNELS</h3>
				<div class="channel-list">
					{#each channels as ch}
						<div class="channel-row">
							<span class="channel-icon" class:active={ch.active}>{ch.icon}</span>
							<span class="channel-name">{ch.name}</span>
							<span class="channel-bw">{ch.bandwidth}</span>
							<span class="channel-dot" class:active={ch.active}
								style:animation-delay="{Math.random() * 2}s"></span>
						</div>
					{/each}
				</div>
			</section>

			<!-- Phase Timeline -->
			<section class="card timeline-card">
				<h3>DEVELOPMENT PHASES</h3>
				<div class="timeline">
					{#each phases as phase}
						<div class="timeline-item" class:complete={phase.status === 'complete'} class:active={phase.status === 'active'} class:planned={phase.status === 'planned'}>
							<div class="timeline-dot"></div>
							<div class="timeline-content">
								<div class="timeline-head">
									<span class="phase-num">P{phase.id}</span>
									<span class="phase-name">{phase.name}</span>
									<span class="phase-badge {phase.status}">{phase.status.toUpperCase()}</span>
								</div>
								<div class="phase-desc">{phase.desc}</div>
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- Interface Views -->
			<section class="card">
				<h3>INTERFACE VIEWS</h3>
				<div class="views-list">
					{#each views as view}
						<div class="view-item">
							<span class="view-key">{view.key}</span>
							<div>
								<div class="view-name">{view.name}</div>
								<div class="view-desc">{view.desc}</div>
							</div>
						</div>
					{/each}
				</div>

				<h3 style="margin-top: 1rem;">PLAYER ROLES</h3>
				<div class="roles-grid">
					{#each playerModes as pm}
						<div class="role-card" style:border-color="{pm.color}33" style:--role-color={pm.color}>
							<div class="role-name">{pm.role}</div>
							<div class="role-desc">{pm.desc}</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- Plugins & Accounts -->
			<section class="card plugins-card">
				<h3>PLUGINS & INTEGRATIONS</h3>
				<div class="plugin-list">
					{#each pluginSlots as plug}
						<div class="plugin-row">
							<span class="plugin-status {plug.status}"></span>
							<div class="plugin-info">
								<span class="plugin-name">{plug.name}</span>
								<span class="plugin-desc">{plug.desc}</span>
							</div>
							<span class="plugin-badge {plug.status}">{plug.status}</span>
						</div>
					{/each}
				</div>

				<div class="accounts-section">
					<h3>MULTIPLAYER (PLANNED)</h3>
					<div class="mp-preview">
						<div class="mp-row">
							<span class="mp-icon">◎</span>
							<span>Shared observation tensors across players</span>
						</div>
						<div class="mp-row">
							<span class="mp-icon">◈</span>
							<span>Collaborative world-building sessions</span>
						</div>
						<div class="mp-row">
							<span class="mp-icon">⟡</span>
							<span>Cross-player entanglement (paired observers)</span>
						</div>
						<div class="mp-row">
							<span class="mp-icon">◉</span>
							<span>Plugin marketplace & community assets</span>
						</div>
					</div>
				</div>
			</section>
		</div>

		<footer class="dash-footer">
			<span>DREAMFIELD OS v0.0.1 — Phase 6 Active</span>
			<span class="uptime">Uptime: {Math.floor(elapsed)}s</span>
		</footer>
	</div>
</div>
{/if}

<style>
	.dashboard-overlay {
		position: fixed;
		inset: 0;
		background: rgba(3, 3, 8, 0.85);
		backdrop-filter: blur(8px);
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		animation: fadeIn 0.2s ease;
	}

	@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

	.dashboard {
		width: 90vw;
		max-width: 1200px;
		max-height: 85vh;
		background: #0a0a12;
		border: 1px solid #1a1a2a;
		border-radius: 8px;
		overflow-y: auto;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 255, 204, 0.03);
	}

	.dash-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.8rem 1.2rem;
		border-bottom: 1px solid #1a1a2a;
		position: sticky;
		top: 0;
		background: #0a0a12;
		z-index: 10;
	}

	.dash-title {
		font-size: 0.65rem;
		letter-spacing: 0.15em;
		color: #00ffcc;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.dash-icon {
		font-size: 0.9rem;
		animation: pulse 3s ease-in-out infinite;
	}

	@keyframes pulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }

	.close-btn {
		background: none;
		border: 1px solid #333;
		color: #666;
		width: 24px;
		height: 24px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.6rem;
		transition: all 0.15s;
	}

	.close-btn:hover { border-color: #ff44aa; color: #ff44aa; }

	.dash-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1px;
		padding: 1px;
	}

	.card {
		padding: 1rem 1.2rem;
		background: #0d0d16;
		border: 1px solid #151520;
	}

	.card h3 {
		font-size: 0.55rem;
		letter-spacing: 0.12em;
		color: #555;
		margin-bottom: 0.8rem;
		font-weight: 400;
	}

	/* Status Card */
	.stat-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		margin-bottom: 0.8rem;
	}

	.stat { text-align: center; }
	.stat-value { display: block; font-size: 1.1rem; color: #00ffcc; font-weight: 300; }
	.stat-label { font-size: 0.5rem; color: #555; letter-spacing: 0.08em; }

	.stat-bar {
		height: 2px;
		background: #1a1a2a;
		border-radius: 1px;
		margin-bottom: 0.8rem;
		overflow: hidden;
	}

	.stat-bar-fill {
		height: 100%;
		background: linear-gradient(90deg, #00ffcc, #4466ff);
		transition: width 0.5s ease;
	}

	.stat-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.3rem 0;
		font-size: 0.6rem;
		color: #888;
	}

	.indicator {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #333;
	}

	.indicator.online { background: #00ffcc; box-shadow: 0 0 4px #00ffcc66; }

	.badge {
		margin-left: auto;
		font-size: 0.5rem;
		color: #555;
		letter-spacing: 0.05em;
	}

	/* Channels */
	.channel-list { display: flex; flex-direction: column; gap: 0.4rem; }

	.channel-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.35rem 0.5rem;
		border-radius: 3px;
		background: #0a0a14;
		font-size: 0.6rem;
	}

	.channel-icon {
		font-size: 0.8rem;
		color: #333;
		width: 1.2rem;
		text-align: center;
	}

	.channel-icon.active { color: #00ffcc; text-shadow: 0 0 6px #00ffcc44; }
	.channel-name { color: #aaa; flex: 1; }
	.channel-bw { color: #555; font-size: 0.5rem; }

	.channel-dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #222;
	}

	.channel-dot.active {
		background: #00ffcc;
		animation: blink 2s ease-in-out infinite;
	}

	@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

	/* Timeline */
	.timeline-card { grid-column: span 2; }

	.timeline {
		display: flex;
		gap: 0;
		overflow-x: auto;
		padding-bottom: 0.5rem;
	}

	.timeline-item {
		flex: 1;
		min-width: 130px;
		position: relative;
		padding-left: 1rem;
		border-left: 2px solid #1a1a2a;
	}

	.timeline-item.complete { border-left-color: #00ffcc33; }
	.timeline-item.active { border-left-color: #00ffcc; }

	.timeline-dot {
		position: absolute;
		left: -5px;
		top: 0;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #222;
		border: 2px solid #333;
	}

	.timeline-item.complete .timeline-dot { background: #00ffcc; border-color: #00ffcc; box-shadow: 0 0 6px #00ffcc44; }
	.timeline-item.active .timeline-dot { background: #030308; border-color: #00ffcc; box-shadow: 0 0 8px #00ffcc66; animation: pulse 2s infinite; }

	.timeline-head { display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.2rem; }
	.phase-num { font-size: 0.5rem; color: #555; }
	.phase-name { font-size: 0.6rem; color: #ccc; }

	.phase-badge {
		font-size: 0.4rem;
		padding: 0.1rem 0.3rem;
		border-radius: 2px;
		letter-spacing: 0.05em;
	}

	.phase-badge.complete { background: #00ffcc15; color: #00ffcc88; }
	.phase-badge.active { background: #00ffcc25; color: #00ffcc; animation: pulse 2s infinite; }
	.phase-badge.planned { background: #ffffff08; color: #444; }

	.phase-desc { font-size: 0.5rem; color: #555; }

	/* Views */
	.views-list { display: flex; flex-direction: column; gap: 0.4rem; }

	.view-item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.4rem 0.5rem;
		background: #0a0a14;
		border-radius: 3px;
	}

	.view-key {
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #ffffff08;
		border-radius: 3px;
		font-size: 0.55rem;
		color: #666;
		border: 1px solid #222;
	}

	.view-name { font-size: 0.6rem; color: #ccc; }
	.view-desc { font-size: 0.5rem; color: #555; }

	/* Roles */
	.roles-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }

	.role-card {
		padding: 0.5rem;
		background: #0a0a14;
		border-radius: 3px;
		border-left: 2px solid;
	}

	.role-name { font-size: 0.6rem; color: var(--role-color); margin-bottom: 0.15rem; }
	.role-desc { font-size: 0.5rem; color: #555; }

	/* Plugins */
	.plugin-list { display: flex; flex-direction: column; gap: 0.4rem; }

	.plugin-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 0.5rem;
		background: #0a0a14;
		border-radius: 3px;
	}

	.plugin-status {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}

	.plugin-status.core { background: #00ffcc; }
	.plugin-status.active { background: #4466ff; }
	.plugin-status.planned { background: #444; }
	.plugin-status.future { background: #222; }

	.plugin-info { flex: 1; }
	.plugin-name { font-size: 0.6rem; color: #aaa; display: block; }
	.plugin-desc { font-size: 0.5rem; color: #444; }

	.plugin-badge {
		font-size: 0.45rem;
		padding: 0.1rem 0.3rem;
		border-radius: 2px;
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}

	.plugin-badge.core { background: #00ffcc15; color: #00ffcc88; }
	.plugin-badge.active { background: #4466ff20; color: #4466ff; }
	.plugin-badge.planned { background: #ffffff08; color: #444; }
	.plugin-badge.future { background: #ffffff05; color: #333; }

	/* Multiplayer */
	.accounts-section { margin-top: 1rem; }

	.mp-preview { display: flex; flex-direction: column; gap: 0.3rem; }

	.mp-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.55rem;
		color: #555;
	}

	.mp-icon { color: #333; font-size: 0.7rem; }

	/* Footer */
	.dash-footer {
		display: flex;
		justify-content: space-between;
		padding: 0.6rem 1.2rem;
		border-top: 1px solid #1a1a2a;
		font-size: 0.5rem;
		color: #444;
		letter-spacing: 0.08em;
		position: sticky;
		bottom: 0;
		background: #0a0a12;
	}

	.uptime { color: #00ffcc66; }
</style>
