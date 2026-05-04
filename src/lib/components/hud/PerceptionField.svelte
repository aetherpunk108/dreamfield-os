<script lang="ts">
	import { onMount } from 'svelte';
	import type { Ghost } from '$lib/spatial/primitives/ghost.js';

	interface Props {
		ghosts: Ghost[];
		collapsedIds: Set<string>;
		entanglementEnabled: boolean;
	}

	let { ghosts, collapsedIds, entanglementEnabled }: Props = $props();

	let canvas: HTMLCanvasElement;
	let width = $state(0);
	let height = $state(0);

	// Track previous collapsed count to detect new collapses
	let prevCollapsedCount = $state(0);
	let consciousnessLevel = $derived(ghosts.length > 0 ? collapsedIds.size / ghosts.length : 0);

	// Particle bursts for collapse events
	interface Particle {
		x: number;
		y: number;
		vx: number;
		vy: number;
		life: number;
		maxLife: number;
		color: string;
	}

	// Observation traces (fading visual memory)
	interface Trace {
		x: number;
		y: number;
		opacity: number;
		ghostId: string;
	}

	let particles: Particle[] = [];
	let traces: Trace[] = [];
	let animFrame: number;
	let time = 0;

	// Project ghost 3D position to 2D canvas coords
	function project(pos: [number, number, number]): [number, number] {
		// Simple orthographic projection scaled to canvas
		const scale = Math.min(width, height) * 0.12;
		const cx = width / 2;
		const cy = height / 2;
		const x = cx + pos[0] * scale;
		const y = cy - pos[1] * scale;
		return [x, y];
	}

	function spawnBurst(x: number, y: number, color: string) {
		for (let i = 0; i < 18; i++) {
			const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.3;
			const speed = 1.5 + Math.random() * 3;
			particles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				life: 1,
				maxLife: 1,
				color
			});
		}
	}

	function addTrace(x: number, y: number, ghostId: string) {
		// Keep last 30 traces
		if (traces.length >= 30) traces.shift();
		traces.push({ x, y, opacity: 0.7, ghostId });
	}

	$effect(() => {
		const currentCount = collapsedIds.size;
		if (currentCount > prevCollapsedCount) {
			// Find newly collapsed ghost and spawn burst
			for (const ghost of ghosts) {
				if (collapsedIds.has(ghost.id)) {
					const [px, py] = project(ghost.position);
					spawnBurst(px, py, '#00ffcc');
					addTrace(px, py, ghost.id);
				}
			}
		}
		prevCollapsedCount = currentCount;
	});

	onMount(() => {
		const ro = new ResizeObserver(() => {
			width = canvas.offsetWidth;
			height = canvas.offsetHeight;
			canvas.width = width;
			canvas.height = height;
		});
		ro.observe(canvas.parentElement!);
		width = canvas.offsetWidth;
		height = canvas.offsetHeight;
		canvas.width = width;
		canvas.height = height;

		function draw() {
			animFrame = requestAnimationFrame(draw);
			time += 0.016;

			const ctx = canvas.getContext('2d')!;
			ctx.clearRect(0, 0, width, height);

			if (ghosts.length === 0) return;

			// --- Ambient breathing glow based on activity ---
			const activity = consciousnessLevel;
			const breathPulse = 0.4 + 0.6 * Math.abs(Math.sin(time * (0.8 + activity * 1.2)));
			const glowRadius = Math.min(width, height) * 0.35;
			const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, glowRadius);
			grad.addColorStop(0, `rgba(0,255,204,${0.025 * breathPulse * (0.2 + activity * 0.8)})`);
			grad.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, width, height);

			// --- Fading observation traces ---
			for (let i = traces.length - 1; i >= 0; i--) {
				const t = traces[i];
				t.opacity -= 0.003;
				if (t.opacity <= 0) {
					traces.splice(i, 1);
					continue;
				}
				ctx.beginPath();
				ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(0,255,204,${t.opacity * 0.3})`;
				ctx.fill();
				ctx.beginPath();
				ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
				ctx.fillStyle = `rgba(0,255,204,${t.opacity * 0.7})`;
				ctx.fill();
			}

			// --- Neural network connections ---
			const positions: Array<[number, number, Ghost]> = ghosts.map((g) => {
				const [px, py] = project(g.position);
				return [px, py, g];
			});

			if (entanglementEnabled) {
				for (let i = 0; i < positions.length; i++) {
					for (let j = i + 1; j < positions.length; j++) {
						const [ax, ay, ga] = positions[i];
						const [bx, by, gb] = positions[j];
						const dist = Math.hypot(bx - ax, by - ay);
						if (dist > Math.min(width, height) * 0.55) continue;

						const aCollapsed = collapsedIds.has(ga.id);
						const bCollapsed = collapsedIds.has(gb.id);
						const bothCollapsed = aCollapsed && bCollapsed;
						const eitherCollapsed = aCollapsed || bCollapsed;

						const baseAlpha = eitherCollapsed ? 0.25 : 0.06;
						const pulse = bothCollapsed
							? 0.15 * Math.abs(Math.sin(time * 2.5 + i + j))
							: 0;
						const alpha = baseAlpha + pulse;

						const color = bothCollapsed
							? `rgba(255,68,170,${alpha})`
							: eitherCollapsed
								? `rgba(0,255,204,${alpha})`
								: `rgba(68,102,255,${alpha * 0.6})`;

						// Bezier curve control point (perp offset)
						const mx = (ax + bx) / 2;
						const my = (ay + by) / 2;
						const nx = -(by - ay) * 0.2;
						const ny = (bx - ax) * 0.2;

						ctx.beginPath();
						ctx.moveTo(ax, ay);
						ctx.quadraticCurveTo(mx + nx, my + ny, bx, by);
						ctx.strokeStyle = color;
						ctx.lineWidth = bothCollapsed ? 1.2 : 0.6;
						ctx.stroke();
					}
				}
			}

			// --- Ghost nodes ---
			for (const [px, py, ghost] of positions) {
				const isCollapsed = collapsedIds.has(ghost.id);
				const nodeColor = isCollapsed ? '#00ffcc' : '#4466ff';
				const glowColor = isCollapsed ? 'rgba(0,255,204,' : 'rgba(68,102,255,';
				const pulse = isCollapsed
					? 1 + 0.4 * Math.sin(time * 3 + ghost.id.charCodeAt(0) * 0.1)
					: 1;
				const r = (isCollapsed ? 5 : 3) * pulse;

				// Outer glow ring
				const ring = ctx.createRadialGradient(px, py, 0, px, py, r * 3.5);
				ring.addColorStop(0, glowColor + (isCollapsed ? '0.25)' : '0.12)'));
				ring.addColorStop(1, glowColor + '0)');
				ctx.beginPath();
				ctx.arc(px, py, r * 3.5, 0, Math.PI * 2);
				ctx.fillStyle = ring;
				ctx.fill();

				// Core dot
				ctx.beginPath();
				ctx.arc(px, py, r, 0, Math.PI * 2);
				ctx.fillStyle = nodeColor;
				ctx.fill();
			}

			// --- Consciousness level bar (top right) ---
			const barW = 120;
			const barH = 4;
			const barX = width - barW - 16;
			const barY = 16;
			ctx.fillStyle = 'rgba(0,255,204,0.08)';
			ctx.fillRect(barX, barY, barW, barH);
			ctx.fillStyle = `rgba(0,255,204,${0.5 + 0.5 * breathPulse})`;
			ctx.fillRect(barX, barY, barW * consciousnessLevel, barH);

			ctx.font = '9px JetBrains Mono, monospace';
			ctx.fillStyle = 'rgba(0,255,204,0.4)';
			ctx.textAlign = 'right';
			ctx.fillText(`ψ ${Math.round(consciousnessLevel * 100)}%`, barX + barW, barY - 3);

			// --- Particle bursts ---
			for (let i = particles.length - 1; i >= 0; i--) {
				const p = particles[i];
				p.x += p.vx;
				p.y += p.vy;
				p.vx *= 0.92;
				p.vy *= 0.92;
				p.life -= 0.025;
				if (p.life <= 0) {
					particles.splice(i, 1);
					continue;
				}
				const alpha = p.life * 0.9;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.life * 2.5, 0, Math.PI * 2);
				ctx.fillStyle = p.color.replace(')', `,${alpha})`).replace('rgb', 'rgba');
				ctx.fill();
			}

			// Synaptic firing flash when activity > 80%
			if (activity > 0.8) {
				const flashAlpha = 0.03 * Math.abs(Math.sin(time * 8));
				ctx.fillStyle = `rgba(0,255,204,${flashAlpha})`;
				ctx.fillRect(0, 0, width, height);
			}
		}

		draw();

		return () => {
			cancelAnimationFrame(animFrame);
			ro.disconnect();
		};
	});
</script>

<canvas bind:this={canvas} class="perception-canvas"></canvas>

<style>
	.perception-canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 5;
	}
</style>
