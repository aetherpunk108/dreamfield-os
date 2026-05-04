<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Pane } from 'tweakpane';

	interface Props {
		collapseThreshold: number;
		entanglementEnabled: boolean;
		observerMode: string;
		fogNear: number;
		fogFar: number;
		autoRotate: boolean;
		particleOpacity: number;
		onchange?: (params: DreamfieldParams) => void;
	}

	export interface DreamfieldParams {
		collapseThreshold: number;
		entanglementEnabled: boolean;
		observerMode: string;
		fogNear: number;
		fogFar: number;
		autoRotate: boolean;
		particleOpacity: number;
	}

	let {
		collapseThreshold = $bindable(10),
		entanglementEnabled = $bindable(true),
		observerMode = $bindable('human'),
		fogNear = $bindable(8),
		fogFar = $bindable(25),
		autoRotate = $bindable(true),
		particleOpacity = $bindable(0.6),
		onchange,
	}: Props = $props();

	let container: HTMLDivElement;
	let pane: Pane | undefined;

	function emitChange() {
		onchange?.({
			collapseThreshold,
			entanglementEnabled,
			observerMode,
			fogNear,
			fogFar,
			autoRotate,
			particleOpacity,
		});
	}

	onMount(() => {
		pane = new Pane({ container, title: 'DREAMFIELD CONTROLS', expanded: true });

		const spatial = pane.addFolder({ title: 'Spatial Engine' });
		spatial.addBinding({ collapseThreshold }, 'collapseThreshold', {
			min: 1, max: 50, step: 0.5, label: 'Collapse Range'
		}).on('change', (e) => { collapseThreshold = e.value; emitChange(); });

		spatial.addBinding({ entanglementEnabled }, 'entanglementEnabled', {
			label: 'Entanglement'
		}).on('change', (e) => { entanglementEnabled = e.value; emitChange(); });

		const observer = pane.addFolder({ title: 'Observer' });
		observer.addBinding({ observerMode }, 'observerMode', {
			label: 'Mode',
			options: { Human: 'human', AI: 'ai', Satellite: 'satellite' }
		}).on('change', (e) => { observerMode = e.value; emitChange(); });

		const scene = pane.addFolder({ title: 'Scene' });
		scene.addBinding({ autoRotate }, 'autoRotate', {
			label: 'Auto Rotate'
		}).on('change', (e) => { autoRotate = e.value; emitChange(); });

		scene.addBinding({ fogNear }, 'fogNear', {
			min: 1, max: 20, step: 0.5, label: 'Fog Near'
		}).on('change', (e) => { fogNear = e.value; emitChange(); });

		scene.addBinding({ fogFar }, 'fogFar', {
			min: 10, max: 50, step: 1, label: 'Fog Far'
		}).on('change', (e) => { fogFar = e.value; emitChange(); });

		scene.addBinding({ particleOpacity }, 'particleOpacity', {
			min: 0, max: 1, step: 0.05, label: 'Particles'
		}).on('change', (e) => { particleOpacity = e.value; emitChange(); });

		const actions = pane.addFolder({ title: 'Actions' });
		actions.addButton({ title: 'Reset All States' }).on('click', () => {
			collapseThreshold = 10;
			entanglementEnabled = true;
			observerMode = 'human';
			fogNear = 8;
			fogFar = 25;
			autoRotate = true;
			particleOpacity = 0.6;
			pane?.refresh();
			emitChange();
		});
	});

	onDestroy(() => {
		pane?.dispose();
	});
</script>

<div bind:this={container} class="pane-container"></div>

<style>
	.pane-container {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 200;
		max-width: 280px;
	}

	.pane-container :global(.tp-dfwv) {
		background-color: rgba(5, 5, 10, 0.85) !important;
		border: 1px solid rgba(0, 255, 204, 0.15) !important;
		backdrop-filter: blur(8px);
	}
</style>
