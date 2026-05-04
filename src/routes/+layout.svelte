<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

{@render children()}

<style>
	:global(*) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		background: #0a0a0f;
		color: #e0e0e8;
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		-webkit-font-smoothing: antialiased;
		overflow: hidden;
	}
</style>
