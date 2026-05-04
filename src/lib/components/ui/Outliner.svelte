<script lang="ts">
	import type { Ghost } from '$lib/spatial/primitives/ghost.js';

	interface OutlinerNode {
		id: string;
		label: string;
		type: 'ghost' | 'tether' | 'breath' | 'celestial' | 'group' | 'light' | 'camera';
		children?: OutlinerNode[];
		visible?: boolean;
		selected?: boolean;
	}

	interface Props {
		nodes: OutlinerNode[];
		visible?: boolean;
		onselect?: (id: string) => void;
		ontoggleVisible?: (id: string) => void;
	}

	let { nodes, visible = true, onselect, ontoggleVisible }: Props = $props();

	let collapsed = $state<Set<string>>(new Set());
	let selectedId = $state<string | null>(null);

	function toggleCollapse(id: string) {
		const next = new Set(collapsed);
		if (next.has(id)) next.delete(id); else next.add(id);
		collapsed = next;
	}

	function handleSelect(id: string) {
		selectedId = id;
		onselect?.(id);
	}

	const typeIcons: Record<string, string> = {
		ghost: '\u25C9',    // ◉
		tether: '\u25B3',   // △
		breath: '\u2588',   // █
		celestial: '\u2609', // ☉
		group: '\u25A1',    // □
		light: '\u2600',    // ☀
		camera: '\u25CE',   // ◎
	};
</script>

{#if visible}
	<div class="outliner">
		<div class="outliner-header">
			<span class="title">OUTLINER</span>
		</div>
		<div class="tree">
			{#each nodes as node}
				{@const isCollapsed = collapsed.has(node.id)}
				{@const isSelected = selectedId === node.id}
				<div class="node" class:selected={isSelected}>
					{#if node.children?.length}
						<span class="toggle" role="button" tabindex="-1" onclick={(e: MouseEvent) => { e.stopPropagation(); toggleCollapse(node.id); }} onkeydown={() => {}}>
							{isCollapsed ? '\u25B6' : '\u25BC'}
						</span>
					{:else}
						<span class="toggle-spacer"></span>
					{/if}
					<button class="node-row" onclick={() => handleSelect(node.id)}>
						<span class="icon">{typeIcons[node.type] ?? '\u25CB'}</span>
						<span class="label">{node.label}</span>
					</button>
					<button
						class="visibility"
						class:hidden={node.visible === false}
						onclick={(e: MouseEvent) => { e.stopPropagation(); ontoggleVisible?.(node.id); }}
					>
						{node.visible !== false ? '\u25C9' : '\u25CB'}
					</button>
				</div>

				{#if node.children && !isCollapsed}
					{#each node.children as child}
						{@const childSelected = selectedId === child.id}
						<div class="node child" class:selected={childSelected}>
							<button class="node-row" onclick={() => handleSelect(child.id)}>
								<span class="toggle-spacer"></span>
								<span class="icon">{typeIcons[child.type] ?? '\u25CB'}</span>
								<span class="label">{child.label}</span>
							</button>
						</div>
					{/each}
				{/if}
			{/each}
		</div>
	</div>
{/if}

<style>
	.outliner {
		position: absolute;
		top: 0;
		left: 0;
		width: 220px;
		height: 100%;
		background: #0d0d14;
		border-right: 1px solid #1a1a24;
		display: flex;
		flex-direction: column;
		font-size: 0.6rem;
		z-index: 100;
		overflow: hidden;
	}

	.outliner-header {
		padding: 0.5rem 0.6rem;
		border-bottom: 1px solid #1a1a24;
		display: flex;
		align-items: center;
	}

	.title {
		letter-spacing: 0.15em;
		color: #666;
		font-size: 0.55rem;
	}

	.tree {
		flex: 1;
		overflow-y: auto;
		padding: 4px 0;
	}

	.node {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.4rem;
		height: 22px;
		transition: background 0.1s;
	}

	.node:hover { background: #ffffff06; }
	.node.selected { background: #00ffcc10; }
	.node.child { padding-left: 1.2rem; }

	.node-row {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		background: none;
		border: none;
		color: #aaa;
		font-family: inherit;
		font-size: inherit;
		cursor: pointer;
		flex: 1;
		text-align: left;
		padding: 0;
	}

	.selected .node-row { color: #00ffcc; }

	.toggle {
		background: none;
		border: none;
		color: #555;
		font-size: 0.5rem;
		width: 12px;
		cursor: pointer;
		padding: 0;
	}

	.toggle-spacer { width: 12px; display: inline-block; }

	.icon {
		font-size: 0.55rem;
		opacity: 0.6;
		width: 12px;
		text-align: center;
	}

	.label { opacity: 0.9; }

	.visibility {
		background: none;
		border: none;
		color: #444;
		cursor: pointer;
		font-size: 0.5rem;
		padding: 0 2px;
	}

	.visibility.hidden { color: #222; }
</style>
