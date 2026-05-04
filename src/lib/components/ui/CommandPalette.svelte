<script lang="ts">
	interface Command {
		id: string;
		label: string;
		shortcut?: string;
		category: string;
		action: string;
	}

	interface Props {
		visible: boolean;
		onclose: () => void;
		onaction: (action: string) => void;
	}

	let { visible, onclose, onaction }: Props = $props();

	let query = $state('');
	let selectedIdx = $state(0);
	let inputRef: HTMLInputElement;

	const commands: Command[] = [
		{ id: 'v-spatial', label: 'Spatial Field', shortcut: '1', category: 'Views', action: 'view:spatial' },
		{ id: 'v-orrery', label: 'Orrery View', shortcut: '2', category: 'Views', action: 'view:orrery' },
		{ id: 'v-earth', label: 'Earth View', shortcut: '3', category: 'Views', action: 'view:earth' },
		{ id: 'v-flight', label: 'Flight Mode', shortcut: '4', category: 'Views', action: 'view:flight' },
		{ id: 'p-dashboard', label: 'Open Dashboard', shortcut: 'D', category: 'Panels', action: 'view:dashboard' },
		{ id: 'p-layers', label: 'Open Layers & Pins', shortcut: 'L', category: 'Panels', action: 'view:layers' },
		{ id: 'p-scene', label: 'Open Scene Settings', category: 'Panels', action: 'view:sceneSettings' },
		{ id: 'p-outliner', label: 'Toggle Outliner', shortcut: 'N', category: 'Panels', action: 'view:outliner' },
		{ id: 'p-props', label: 'Toggle Properties', shortcut: 'P', category: 'Panels', action: 'view:properties' },
		{ id: 'p-controls', label: 'Toggle Controls', shortcut: 'T', category: 'Panels', action: 'view:controls' },
		{ id: 'a-collapse', label: 'Collapse All Ghosts', category: 'Actions', action: 'spatial:collapseAll' },
		{ id: 'a-reset', label: 'Reset Tensor', category: 'Actions', action: 'spatial:resetTensor' },
		{ id: 'a-import', label: 'Import 3D Model', category: 'Actions', action: 'file:import' },
		{ id: 's-infinite', label: 'Infinite Clipping (Space)', category: 'Settings', action: 'settings:infiniteClip' },
		{ id: 's-hdri', label: 'Load Galaxy HDRI', category: 'Settings', action: 'settings:loadHdri' },
	];

	const filtered = $derived.by(() => {
		if (!query.trim()) return commands.slice(0, 8);
		const q = query.toLowerCase();
		return commands
			.filter(c => c.label.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
			.slice(0, 8);
	});

	$effect(() => {
		if (visible) {
			query = '';
			selectedIdx = 0;
			setTimeout(() => inputRef?.focus(), 50);
		}
	});

	function handleKeydown(e: KeyboardEvent) {
		if (!visible) return;
		switch (e.key) {
			case 'ArrowDown': e.preventDefault(); selectedIdx = Math.min(selectedIdx + 1, filtered.length - 1); break;
			case 'ArrowUp': e.preventDefault(); selectedIdx = Math.max(selectedIdx - 1, 0); break;
			case 'Enter':
				e.preventDefault();
				if (filtered[selectedIdx]) execute(filtered[selectedIdx]);
				break;
			case 'Escape': e.preventDefault(); onclose(); break;
		}
	}

	function execute(cmd: Command) {
		onaction(cmd.action);
		onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if visible}
<div class="palette-overlay" onclick={onclose}>
	<div class="palette" onclick={(e) => e.stopPropagation()}>
		<div class="search-row">
			<span class="search-icon">⌘</span>
			<input
				bind:this={inputRef}
				bind:value={query}
				class="search-input"
				placeholder="Search commands..."
				type="text"
			/>
		</div>

		<div class="results">
			{#each filtered as cmd, i}
				{#if i === 0 || filtered[i - 1]?.category !== cmd.category}
					<div class="category-header">{cmd.category}</div>
				{/if}
				<button
					class="result-item"
					class:selected={i === selectedIdx}
					onclick={() => execute(cmd)}
					onmouseenter={() => selectedIdx = i}
				>
					<span class="result-label">{cmd.label}</span>
					{#if cmd.shortcut}
						<span class="result-shortcut">{cmd.shortcut}</span>
					{/if}
				</button>
			{/each}
			{#if filtered.length === 0}
				<div class="no-results">No commands found</div>
			{/if}
		</div>
	</div>
</div>
{/if}

<style>
	.palette-overlay {
		position: fixed;
		inset: 0;
		background: rgba(3, 3, 8, 0.7);
		backdrop-filter: blur(6px);
		z-index: 2000;
		display: flex;
		justify-content: center;
		padding-top: 15vh;
	}

	.palette {
		width: 440px;
		max-height: 400px;
		background: #0a0a12;
		border: 1px solid #1a1a2a;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 0 0 1px #00ffcc22;
		height: fit-content;
	}

	.search-row {
		display: flex;
		align-items: center;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid #1a1a2a;
		gap: 0.5rem;
	}

	.search-icon { color: #00ffcc55; font-size: 0.8rem; }

	.search-input {
		flex: 1;
		background: none;
		border: none;
		color: #e0e0e8;
		font-family: inherit;
		font-size: 0.7rem;
		outline: none;
		letter-spacing: 0.02em;
	}

	.search-input::placeholder { color: #444; }

	.results {
		max-height: 320px;
		overflow-y: auto;
		padding: 0.3rem 0;
	}

	.category-header {
		padding: 0.3rem 1rem;
		font-size: 0.45rem;
		color: #555;
		letter-spacing: 0.12em;
		font-weight: 400;
	}

	.result-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.5rem 1rem;
		background: none;
		border: none;
		color: #aaa;
		font-family: inherit;
		font-size: 0.6rem;
		cursor: pointer;
		text-align: left;
		transition: all 0.08s;
	}

	.result-item:hover, .result-item.selected {
		background: #00ffcc0a;
		color: #00ffcc;
	}

	.result-shortcut {
		font-size: 0.5rem;
		background: #ffffff08;
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
		color: #555;
		border: 1px solid #1a1a2a;
	}

	.result-item.selected .result-shortcut {
		border-color: #00ffcc33;
		color: #00ffcc88;
	}

	.no-results {
		padding: 1.5rem;
		text-align: center;
		color: #444;
		font-size: 0.55rem;
	}
</style>
