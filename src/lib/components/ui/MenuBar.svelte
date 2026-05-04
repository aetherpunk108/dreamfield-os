<script lang="ts">
	interface MenuItem {
		label: string;
		items: { label: string; shortcut?: string; action: string; separator?: boolean }[];
	}

	interface Props {
		onaction?: (action: string) => void;
	}

	let { onaction }: Props = $props();

	let openMenu = $state<string | null>(null);

	const menus: MenuItem[] = [
		{
			label: 'File',
			items: [
				{ label: 'New Scene', shortcut: 'Ctrl+N', action: 'file:new' },
				{ label: 'Open File...', shortcut: 'Ctrl+O', action: 'file:open' },
				{ label: 'Import 3D Model', action: 'file:import' },
				{ label: 'separator', action: '', separator: true },
				{ label: 'Export Scene', action: 'file:export' },
				{ label: 'Save State', shortcut: 'Ctrl+S', action: 'file:save' },
			]
		},
		{
			label: 'Edit',
			items: [
				{ label: 'Undo', shortcut: 'Ctrl+Z', action: 'edit:undo' },
				{ label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: 'edit:redo' },
				{ label: 'separator', action: '', separator: true },
				{ label: 'Select All', shortcut: 'A', action: 'edit:selectAll' },
				{ label: 'Delete Selected', shortcut: 'Del', action: 'edit:delete' },
				{ label: 'Preferences', action: 'edit:prefs' },
			]
		},
		{
			label: 'View',
			items: [
				{ label: 'Spatial Field', action: 'view:spatial' },
				{ label: 'Orrery (Planetary)', action: 'view:orrery' },
				{ label: 'separator', action: '', separator: true },
				{ label: 'Toggle Outliner', shortcut: 'N', action: 'view:outliner' },
				{ label: 'Toggle Properties', shortcut: 'P', action: 'view:properties' },
				{ label: 'Toggle Controls', shortcut: 'T', action: 'view:controls' },
				{ label: 'Scene Settings', action: 'view:sceneSettings' },
				{ label: 'Layers & Pins', shortcut: 'L', action: 'view:layers' },
				{ label: 'separator', action: '', separator: true },
				{ label: 'Reset Camera', shortcut: 'Home', action: 'view:resetCamera' },
			]
		},
		{
			label: 'Spatial',
			items: [
				{ label: 'Add Ghost Primitive', action: 'spatial:addGhost' },
				{ label: 'Add Tether Primitive', action: 'spatial:addTether' },
				{ label: 'Add Breath Volume', action: 'spatial:addBreath' },
				{ label: 'separator', action: '', separator: true },
				{ label: 'Link Entanglement', action: 'spatial:entangle' },
				{ label: 'Collapse All', action: 'spatial:collapseAll' },
				{ label: 'Reset Tensor', action: 'spatial:resetTensor' },
			]
		},
		{
			label: 'Tools',
			items: [
				{ label: 'Ray Inspector', action: 'tools:rayInspect' },
				{ label: 'Tensor Visualizer', action: 'tools:tensorVis' },
				{ label: 'Coordinate Converter', action: 'tools:coords' },
				{ label: 'separator', action: '', separator: true },
				{ label: 'Performance Monitor', action: 'tools:perf' },
				{ label: 'WebSocket Console', action: 'tools:wsConsole' },
			]
		},
	];

	function handleClick(action: string) {
		openMenu = null;
		onaction?.(action);
	}

	function handleMenuToggle(label: string) {
		openMenu = openMenu === label ? null : label;
	}
</script>

<svelte:window onclick={() => openMenu = null} />

<nav class="menubar">
	<div class="logo">DF</div>

	{#each menus as menu}
		<div class="menu-wrapper">
			<button
				class="menu-trigger"
				class:active={openMenu === menu.label}
				onclick={(e: MouseEvent) => { e.stopPropagation(); handleMenuToggle(menu.label); }}
				onmouseenter={() => { if (openMenu) openMenu = menu.label; }}
			>
				{menu.label}
			</button>

			{#if openMenu === menu.label}
				<div class="dropdown" onclick={(e: MouseEvent) => e.stopPropagation()}>
					{#each menu.items as item}
						{#if item.separator}
							<div class="separator"></div>
						{:else}
							<button class="dropdown-item" onclick={() => handleClick(item.action)}>
								<span>{item.label}</span>
								{#if item.shortcut}
									<span class="shortcut">{item.shortcut}</span>
								{/if}
							</button>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
	{/each}

	<div class="spacer"></div>
	<button class="dash-btn" onclick={() => onaction?.('view:dashboard')}>
		<span class="dash-icon">◈</span> DASHBOARD
	</button>
	<div class="status-pill">
		<span class="dot active"></span>
		<span>DREAMFIELD OS v0.0.1</span>
	</div>
</nav>

<style>
	.menubar {
		display: flex;
		align-items: center;
		height: 28px;
		background: #111118;
		border-bottom: 1px solid #1a1a24;
		font-size: 0.65rem;
		letter-spacing: 0.03em;
		user-select: none;
		z-index: 500;
		position: relative;
	}

	.logo {
		padding: 0 0.7rem;
		color: #00ffcc;
		font-weight: 400;
		font-size: 0.7rem;
		letter-spacing: 0.15em;
		border-right: 1px solid #1a1a24;
		height: 100%;
		display: flex;
		align-items: center;
	}

	.menu-wrapper {
		position: relative;
	}

	.menu-trigger {
		background: none;
		border: none;
		color: #888;
		padding: 0 0.6rem;
		height: 28px;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
		letter-spacing: inherit;
		transition: all 0.1s;
	}

	.menu-trigger:hover, .menu-trigger.active {
		background: #1a1a28;
		color: #e0e0e8;
	}

	.dropdown {
		position: absolute;
		top: 28px;
		left: 0;
		min-width: 200px;
		background: #13131c;
		border: 1px solid #1a1a28;
		border-radius: 0 0 4px 4px;
		padding: 4px 0;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
		z-index: 600;
	}

	.dropdown-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		padding: 0.35rem 0.8rem;
		background: none;
		border: none;
		color: #ccc;
		font-family: inherit;
		font-size: inherit;
		cursor: pointer;
		text-align: left;
	}

	.dropdown-item:hover {
		background: #00ffcc15;
		color: #00ffcc;
	}

	.shortcut {
		color: #555;
		font-size: 0.55rem;
		margin-left: 1.5rem;
	}

	.separator {
		height: 1px;
		background: #1a1a28;
		margin: 4px 8px;
	}

	.spacer { flex: 1; }

	.dash-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0 0.8rem;
		height: 20px;
		background: #00ffcc0a;
		border: 1px solid #00ffcc22;
		border-radius: 3px;
		color: #00ffcc88;
		font-family: inherit;
		font-size: 0.55rem;
		letter-spacing: 0.1em;
		cursor: pointer;
		transition: all 0.15s;
		margin-right: 0.6rem;
	}

	.dash-btn:hover {
		background: #00ffcc15;
		border-color: #00ffcc44;
		color: #00ffcc;
		box-shadow: 0 0 8px #00ffcc22;
	}

	.dash-btn .dash-icon {
		font-size: 0.7rem;
	}

	.status-pill {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0 0.8rem;
		color: #555;
		font-size: 0.55rem;
		letter-spacing: 0.08em;
	}

	.dot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: #333;
	}

	.dot.active {
		background: #00ffcc;
		box-shadow: 0 0 4px #00ffcc66;
	}
</style>
