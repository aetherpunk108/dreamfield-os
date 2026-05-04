<script lang="ts">
	interface ToastEvent {
		id: string;
		type: 'collapse' | 'entangle' | 'reset' | 'info' | 'warning';
		message: string;
		timestamp: number;
	}

	let toasts = $state<ToastEvent[]>([]);

	export function push(type: ToastEvent['type'], message: string) {
		const toast: ToastEvent = {
			id: crypto.randomUUID(),
			type,
			message,
			timestamp: Date.now()
		};
		toasts = [toast, ...toasts].slice(0, 5);

		setTimeout(() => {
			toasts = toasts.filter(t => t.id !== toast.id);
		}, 3000);
	}

	const typeColors: Record<string, string> = {
		collapse: '#00ffcc',
		entangle: '#4488ff',
		reset: '#888888',
		info: '#aaaacc',
		warning: '#ffaa44',
	};

	const typeIcons: Record<string, string> = {
		collapse: '\u25C9',
		entangle: '\u2194',
		reset: '\u21BA',
		info: '\u2139',
		warning: '\u26A0',
	};
</script>

<div class="toast-container">
	{#each toasts as toast (toast.id)}
		<div
			class="toast"
			style="border-left-color: {typeColors[toast.type]}"
		>
			<span class="toast-icon" style="color: {typeColors[toast.type]}">{typeIcons[toast.type]}</span>
			<span class="toast-msg">{toast.message}</span>
			<span class="toast-time">{new Date(toast.timestamp).toLocaleTimeString()}</span>
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		z-index: 300;
		display: flex;
		flex-direction: column-reverse;
		gap: 0.4rem;
		pointer-events: none;
		max-width: 280px;
	}

	.toast {
		background: rgba(10, 10, 18, 0.9);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-left-width: 2px;
		border-radius: 3px;
		padding: 0.4rem 0.6rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.55rem;
		backdrop-filter: blur(8px);
		animation: slideIn 0.2s ease-out;
	}

	.toast-icon { font-size: 0.65rem; }
	.toast-msg { color: #ccc; flex: 1; }
	.toast-time { color: #444; font-size: 0.45rem; font-variant-numeric: tabular-nums; }

	@keyframes slideIn {
		from { opacity: 0; transform: translateX(20px); }
		to { opacity: 1; transform: translateX(0); }
	}
</style>
