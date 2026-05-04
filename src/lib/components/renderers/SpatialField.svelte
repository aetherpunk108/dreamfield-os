<script lang="ts">
	import type { Ghost } from '$lib/spatial/primitives/ghost.js';
	import type { ObservationTensor } from '$lib/spatial/observation.js';
	import GhostRenderer from './GhostRenderer.svelte';

	interface Props {
		ghosts: Ghost[];
		tensor: ObservationTensor;
		observerId: string;
		selectedId?: string | null;
		oncollapseGhost?: (ghostId: string) => void;
	}

	let { ghosts, tensor, observerId, selectedId = null, oncollapseGhost }: Props = $props();
</script>

{#each ghosts as ghost (ghost.id)}
	<GhostRenderer
		{ghost}
		triState={tensor.getState(observerId, ghost.id)}
		selected={selectedId === ghost.id}
		onclick={() => oncollapseGhost?.(ghost.id)}
	/>
{/each}
