<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		oncomplete?: () => void;
	}

	let { oncomplete }: Props = $props();

	const bootLines = [
		{ text: '> DREAMFIELD OS v0.0.1', delay: 0 },
		{ text: '> ================================', delay: 100 },
		{ text: '> [CORE] Trinary state engine............ OK', delay: 200 },
		{ text: '> [CORE] Observation tensor.............. OK', delay: 320 },
		{ text: '> [CORE] Entanglement map................ LINKED', delay: 420 },
		{ text: '> [SPATIAL] Ghost primitives (5)......... LOADED', delay: 540 },
		{ text: '> [SPATIAL] Octree field................. MAPPED', delay: 640 },
		{ text: '> [SPATIAL] Breath voxels (15)........... SEEDED', delay: 720 },
		{ text: '> [GEO] WGS84 coordinate system.......... INIT', delay: 820 },
		{ text: '> [GEO] Orbital mechanics................ ACTIVE', delay: 920 },
		{ text: '> [GEO] Celestial bodies................. POSITIONED', delay: 1020 },
		{ text: '> [NET] Encrypted comms.................. STANDBY', delay: 1120 },
		{ text: '> [NET] WebSocket bridge................. READY', delay: 1200 },
		{ text: '> [AUTH] IdentiKey agents................ AUTHENTICATED', delay: 1300 },
		{ text: '> [XR] OpenXR bridge.................... STANDBY', delay: 1400 },
		{ text: '> [RENDER] PostFX pipeline............... BLOOM + VIGNETTE', delay: 1500 },
		{ text: '> [RENDER] Scan grid.................... ACTIVE', delay: 1580 },
		{ text: '> [HUD] Radar minimap................... ONLINE', delay: 1660 },
		{ text: '> ================================', delay: 1760 },
		{ text: '> ALL SYSTEMS NOMINAL', delay: 1860 },
		{ text: '> ENTERING THE FIELD...', delay: 2000 },
	];

	let visibleLines = $state<string[]>([]);
	let bootComplete = $state(false);
	let showCursor = $state(true);
	let glitchActive = $state(false);
	let progress = $state(0);

	onMount(() => {
		const timers: ReturnType<typeof setTimeout>[] = [];

		for (const line of bootLines) {
			timers.push(setTimeout(() => {
				visibleLines = [...visibleLines, line.text];
				progress = visibleLines.length / bootLines.length;
			}, line.delay));
		}

		// Glitch flicker at end
		timers.push(setTimeout(() => { glitchActive = true; }, 2100));
		timers.push(setTimeout(() => { glitchActive = false; }, 2150));
		timers.push(setTimeout(() => { glitchActive = true; }, 2200));
		timers.push(setTimeout(() => { glitchActive = false; }, 2220));

		timers.push(setTimeout(() => {
			bootComplete = true;
			setTimeout(() => oncomplete?.(), 600);
		}, 2400));

		const cursorBlink = setInterval(() => { showCursor = !showCursor; }, 530);

		return () => {
			timers.forEach(clearTimeout);
			clearInterval(cursorBlink);
		};
	});
</script>

<div class="boot" class:fade-out={bootComplete} class:glitch={glitchActive}>
	<div class="boot-inner">
		<div class="terminal">
			{#each visibleLines as line, i}
				<p class="line" class:success={line.includes('OK') || line.includes('LINKED') || line.includes('ACTIVE') || line.includes('NOMINAL')}
					class:highlight={line.includes('ENTERING')}>
					{line}
				</p>
			{/each}
			{#if !bootComplete}
				<span class="cursor" class:visible={showCursor}>_</span>
			{/if}
		</div>

		<div class="progress-container">
			<div class="progress-bar" style="width: {progress * 100}%"></div>
		</div>
		<p class="progress-label">{Math.round(progress * 100)}%</p>
	</div>

	<!-- Decorative scan line -->
	<div class="scan-line"></div>
</div>

<style>
	.boot {
		position: fixed;
		inset: 0;
		background: #030308;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: opacity 0.6s ease, transform 0.6s ease;
		overflow: hidden;
	}

	.boot.fade-out {
		opacity: 0;
		transform: scale(1.05);
		pointer-events: none;
	}

	.boot.glitch {
		filter: hue-rotate(90deg) saturate(2);
		transform: translateX(2px);
	}

	.boot-inner {
		max-width: 550px;
		width: 90%;
	}

	.terminal {
		max-height: 60vh;
		overflow-y: auto;
	}

	.line {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 0.65rem;
		color: #00ffcc88;
		margin: 0;
		padding: 0.1rem 0;
		animation: typeIn 0.1s ease-out forwards;
		white-space: nowrap;
	}

	.line.success {
		color: #00ffcc;
		text-shadow: 0 0 6px #00ffcc33;
	}

	.line.highlight {
		color: #ffffff;
		text-shadow: 0 0 12px #00ffcc66;
		font-weight: 300;
	}

	.cursor {
		font-family: 'JetBrains Mono', monospace;
		color: #00ffcc;
		font-size: 0.65rem;
		opacity: 0;
	}

	.cursor.visible { opacity: 1; }

	.progress-container {
		margin-top: 1.2rem;
		height: 2px;
		background: #111;
		border-radius: 1px;
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		background: linear-gradient(90deg, #00ffcc, #4488ff);
		transition: width 0.15s ease-out;
		box-shadow: 0 0 8px #00ffcc44;
	}

	.progress-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.5rem;
		color: #333;
		text-align: right;
		margin-top: 0.3rem;
		letter-spacing: 0.1em;
	}

	.scan-line {
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		background: linear-gradient(90deg, transparent, #00ffcc11, transparent);
		animation: scanDown 2s linear infinite;
		pointer-events: none;
	}

	@keyframes typeIn {
		from { opacity: 0; transform: translateX(-6px); }
		to { opacity: 1; transform: translateX(0); }
	}

	@keyframes scanDown {
		from { top: -2px; }
		to { top: 100%; }
	}
</style>
