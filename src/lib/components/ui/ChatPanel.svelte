<script lang="ts">
	import { tick } from 'svelte';

	interface ChatMessage {
		sender: string;
		text: string;
		color: string;
		timestamp: number;
		system: boolean;
	}

	type Channel = 'GLOBAL' | 'TEAM' | 'LOCAL';

	interface Props {
		messages: ChatMessage[];
		visible?: boolean;
		onsend?: (text: string) => void;
		ontoggle?: () => void;
	}

	let { messages, visible = true, onsend, ontoggle }: Props = $props();

	let inputText = $state('');
	let channel = $state<Channel>('GLOBAL');
	let inputEl = $state<HTMLInputElement | null>(null);
	let scrollEl = $state<HTMLDivElement | null>(null);

	const MAX_MESSAGES = 20;
	const displayMessages = $derived(messages.slice(-MAX_MESSAGES));

	function formatTime(ts: number): string {
		const d = new Date(ts);
		const h = String(d.getHours()).padStart(2, '0');
		const m = String(d.getMinutes()).padStart(2, '0');
		const s = String(d.getSeconds()).padStart(2, '0');
		return `${h}:${m}:${s}`;
	}

	async function handleSend() {
		const text = inputText.trim();
		if (!text) return;
		onsend?.(text);
		inputText = '';
		await tick();
		scrollToBottom();
	}

	function scrollToBottom() {
		if (scrollEl) {
			scrollEl.scrollTop = scrollEl.scrollHeight;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSend();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			ontoggle?.();
		}
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (!visible && (e.key === 'Enter' || e.key === '/')) {
			e.preventDefault();
			ontoggle?.();
		}
	}

	$effect(() => {
		if (visible && inputEl) {
			inputEl.focus();
		}
	});

	$effect(() => {
		// Auto-scroll when new messages arrive
		if (displayMessages.length) {
			tick().then(scrollToBottom);
		}
	});
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if visible}
	<div class="chat-panel">
		<div class="channel-tabs">
			{#each (['GLOBAL', 'TEAM', 'LOCAL'] as Channel[]) as ch}
				<button
					class="tab"
					class:active={channel === ch}
					onclick={() => { channel = ch; }}
				>{ch}</button>
			{/each}
		</div>

		<div class="messages" bind:this={scrollEl}>
			{#if displayMessages.length === 0}
				<div class="empty">No messages yet...</div>
			{:else}
				{#each displayMessages as msg (msg.timestamp + msg.sender + msg.text)}
					<div class="message" class:system={msg.system}>
						<span class="time">{formatTime(msg.timestamp)}</span>
						{#if msg.system}
							<span class="system-text">{msg.text}</span>
						{:else}
							<span class="sender" style="color: {msg.color}">{msg.sender}:</span>
							<span class="text">{msg.text}</span>
						{/if}
					</div>
				{/each}
			{/if}
		</div>

		<div class="input-row">
			<span class="prompt">&gt;</span>
			<input
				bind:this={inputEl}
				bind:value={inputText}
				class="chat-input"
				type="text"
				placeholder="type a message..."
				maxlength={200}
				onkeydown={handleKeydown}
			/>
		</div>
	</div>
{/if}

<style>
	.chat-panel {
		position: absolute;
		bottom: 2rem;
		left: 0;
		width: 320px;
		background: #0a0a12cc;
		border: 1px solid #1a1a24;
		border-left: none;
		display: flex;
		flex-direction: column;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.5rem;
		z-index: 110;
		backdrop-filter: blur(4px);
	}

	.channel-tabs {
		display: flex;
		border-bottom: 1px solid #1a1a24;
	}

	.tab {
		flex: 1;
		background: none;
		border: none;
		border-right: 1px solid #1a1a24;
		color: #444;
		cursor: pointer;
		font-family: inherit;
		font-size: 0.45rem;
		letter-spacing: 0.1em;
		padding: 0.3rem 0;
		transition: color 0.1s, background 0.1s;
	}

	.tab:last-child { border-right: none; }

	.tab:hover { color: #666; background: #ffffff04; }

	.tab.active {
		color: #00ffcc;
		background: #00ffcc08;
	}

	.messages {
		max-height: 160px;
		overflow-y: auto;
		padding: 0.4rem 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		scrollbar-width: thin;
		scrollbar-color: #1a1a24 transparent;
	}

	.messages::-webkit-scrollbar { width: 3px; }
	.messages::-webkit-scrollbar-track { background: transparent; }
	.messages::-webkit-scrollbar-thumb { background: #1a1a24; }

	.empty {
		color: #2a2a36;
		font-size: 0.45rem;
		text-align: center;
		padding: 0.5rem 0;
		letter-spacing: 0.08em;
	}

	.message {
		display: flex;
		gap: 0.35rem;
		align-items: baseline;
		line-height: 1.5;
		flex-wrap: wrap;
	}

	.time {
		color: #2d2d3a;
		font-size: 0.42rem;
		flex-shrink: 0;
	}

	.sender {
		font-size: 0.5rem;
		flex-shrink: 0;
	}

	.text {
		color: #999;
		font-size: 0.5rem;
		word-break: break-word;
	}

	.system .time { color: #252530; }

	.system-text {
		color: #444;
		font-size: 0.45rem;
		font-style: italic;
		letter-spacing: 0.04em;
	}

	.input-row {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.3rem 0.5rem;
		border-top: 1px solid #1a1a24;
	}

	.prompt {
		color: #00ffcc;
		font-size: 0.55rem;
		flex-shrink: 0;
	}

	.chat-input {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		color: #ccc;
		font-family: inherit;
		font-size: 0.5rem;
		caret-color: #00ffcc;
	}

	.chat-input::placeholder {
		color: #2a2a36;
	}
</style>
