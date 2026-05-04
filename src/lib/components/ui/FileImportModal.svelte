<script lang="ts">
	interface Props {
		visible?: boolean;
		onclose?: () => void;
		onimport?: (file: File, type: string) => void;
	}

	let { visible = false, onclose, onimport }: Props = $props();

	let dragOver = $state(false);
	let selectedFile = $state<File | null>(null);
	let importType = $state('auto');

	const SUPPORTED_FORMATS = [
		{ ext: '.glb', label: 'glTF Binary (.glb)' },
		{ ext: '.gltf', label: 'glTF (.gltf)' },
		{ ext: '.obj', label: 'Wavefront (.obj)' },
		{ ext: '.ply', label: 'Point Cloud (.ply)' },
		{ ext: '.fbx', label: 'Autodesk FBX (.fbx)' },
		{ ext: '.stl', label: 'Stereolithography (.stl)' },
	];

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) selectedFile = file;
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.[0]) selectedFile = input.files[0];
	}

	function handleImport() {
		if (selectedFile) {
			onimport?.(selectedFile, importType);
			selectedFile = null;
			onclose?.();
		}
	}

	function detectType(filename: string): string {
		const ext = filename.split('.').pop()?.toLowerCase() ?? '';
		return SUPPORTED_FORMATS.find(f => f.ext.endsWith(ext))?.ext ?? 'unknown';
	}
</script>

{#if visible}
	<div class="modal-overlay" onclick={onclose}>
		<div class="modal" onclick={(e: MouseEvent) => e.stopPropagation()}>
			<div class="modal-header">
				<span>IMPORT 3D MODEL</span>
				<button class="close-btn" onclick={onclose}>\u2715</button>
			</div>

			<div class="modal-body">
				<div
					class="drop-zone"
					class:active={dragOver}
					ondragover={(e: DragEvent) => { e.preventDefault(); dragOver = true; }}
					ondragleave={() => dragOver = false}
					ondrop={handleDrop}
				>
					{#if selectedFile}
						<div class="file-info">
							<span class="file-icon">\u25A0</span>
							<span class="file-name">{selectedFile.name}</span>
							<span class="file-size">{(selectedFile.size / 1024).toFixed(1)} KB</span>
							<span class="file-type">{detectType(selectedFile.name)}</span>
						</div>
					{:else}
						<p class="drop-text">Drop 3D file here</p>
						<p class="drop-sub">or click to browse</p>
					{/if}
					<input
						type="file"
						accept=".glb,.gltf,.obj,.ply,.fbx,.stl"
						class="file-input"
						onchange={handleFileInput}
					/>
				</div>

				<div class="format-list">
					<span class="section-label">SUPPORTED FORMATS</span>
					{#each SUPPORTED_FORMATS as fmt}
						<span class="format">{fmt.label}</span>
					{/each}
				</div>

				<div class="import-options">
					<label class="option">
						<span>Import As</span>
						<select bind:value={importType}>
							<option value="auto">Auto-detect</option>
							<option value="ghost">Ghost (Point Cloud)</option>
							<option value="tether">Tether (Mesh)</option>
							<option value="scene">Full Scene</option>
						</select>
					</label>
				</div>
			</div>

			<div class="modal-footer">
				<button class="btn secondary" onclick={onclose}>Cancel</button>
				<button
					class="btn primary"
					disabled={!selectedFile}
					onclick={handleImport}
				>
					Import
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(4px);
	}

	.modal {
		background: #111118;
		border: 1px solid #1a1a28;
		border-radius: 6px;
		width: 420px;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		font-size: 0.65rem;
		box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.7rem 1rem;
		border-bottom: 1px solid #1a1a28;
		letter-spacing: 0.12em;
		color: #888;
		font-size: 0.6rem;
	}

	.close-btn {
		background: none;
		border: none;
		color: #555;
		cursor: pointer;
		font-size: 0.8rem;
	}
	.close-btn:hover { color: #ff4466; }

	.modal-body {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.drop-zone {
		border: 1px dashed #2a2a38;
		border-radius: 4px;
		padding: 1.5rem;
		text-align: center;
		position: relative;
		cursor: pointer;
		transition: all 0.15s;
	}

	.drop-zone.active, .drop-zone:hover {
		border-color: #00ffcc44;
		background: #00ffcc08;
	}

	.file-input {
		position: absolute;
		inset: 0;
		opacity: 0;
		cursor: pointer;
	}

	.drop-text {
		color: #666;
		margin-bottom: 0.3rem;
	}

	.drop-sub {
		color: #444;
		font-size: 0.55rem;
	}

	.file-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.3rem;
	}

	.file-icon { color: #00ffcc; font-size: 1.2rem; }
	.file-name { color: #ccc; }
	.file-size { color: #666; font-size: 0.55rem; }
	.file-type { color: #00ffcc; font-size: 0.55rem; text-transform: uppercase; }

	.format-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem 0.6rem;
		align-items: center;
	}

	.section-label {
		color: #444;
		font-size: 0.5rem;
		letter-spacing: 0.1em;
		width: 100%;
		margin-bottom: 0.1rem;
	}

	.format {
		color: #555;
		font-size: 0.5rem;
		background: #1a1a24;
		padding: 0.15rem 0.4rem;
		border-radius: 2px;
	}

	.import-options {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.option {
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: #888;
	}

	.option select {
		background: #1a1a24;
		border: 1px solid #2a2a38;
		color: #ccc;
		padding: 0.2rem 0.4rem;
		border-radius: 3px;
		font-family: inherit;
		font-size: inherit;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		padding: 0.7rem 1rem;
		border-top: 1px solid #1a1a28;
	}

	.btn {
		padding: 0.35rem 1rem;
		border-radius: 3px;
		border: 1px solid #2a2a38;
		font-family: inherit;
		font-size: inherit;
		cursor: pointer;
		letter-spacing: 0.05em;
	}

	.btn.secondary {
		background: #1a1a24;
		color: #888;
	}

	.btn.primary {
		background: #00ffcc18;
		color: #00ffcc;
		border-color: #00ffcc33;
	}

	.btn.primary:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.btn:hover:not(:disabled) {
		filter: brightness(1.2);
	}
</style>
