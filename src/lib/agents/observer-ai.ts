/**
 * Autonomous AI Observer Agent (Phase 9)
 *
 * An AI entity that autonomously observes and collapses ghosts in the spatial field.
 * It has its own perception, attention, and decision-making loop.
 */

import type { Vec3 } from '$lib/spatial/types.js';

export interface AIObserverConfig {
	id: string;
	name: string;
	/** How many observations per second */
	observationRate: number;
	/** Probability of collapsing vs just observing */
	collapseThreshold: number;
	/** Maximum attention radius */
	attentionRadius: number;
	/** Movement speed */
	speed: number;
	/** Curiosity: tendency to explore vs focus */
	curiosity: number;
	/** Personality color */
	color: string;
}

export interface AIObserverState {
	position: Vec3;
	target: Vec3 | null;
	attention: string | null; // ghost ID being attended to
	energy: number; // 0-1, depletes with actions, regenerates over time
	mood: 'curious' | 'focused' | 'resting' | 'excited';
	observationCount: number;
	collapseCount: number;
	path: Vec3[]; // wandering path
}

export const DEFAULT_AI_CONFIG: AIObserverConfig = {
	id: 'ai-observer-alpha',
	name: 'ALPHA',
	observationRate: 2,
	collapseThreshold: 0.4,
	attentionRadius: 8,
	speed: 1.5,
	curiosity: 0.7,
	color: '#4466ff',
};

export function createAIObserver(config: Partial<AIObserverConfig> = {}): AIObserverConfig & { state: AIObserverState } {
	const cfg = { ...DEFAULT_AI_CONFIG, ...config };
	return {
		...cfg,
		state: {
			position: [
				(Math.random() - 0.5) * 6,
				1 + Math.random() * 3,
				(Math.random() - 0.5) * 6,
			],
			target: null,
			attention: null,
			energy: 1.0,
			mood: 'curious',
			observationCount: 0,
			collapseCount: 0,
			path: [],
		},
	};
}

interface Ghost {
	id: string;
	position: Vec3;
}

/**
 * AI decision loop — called each tick.
 * Returns actions the AI wants to take.
 */
export function tickAIObserver(
	agent: AIObserverConfig & { state: AIObserverState },
	ghosts: Ghost[],
	collapsedIds: Set<string>,
	dt: number
): AIAction[] {
	const actions: AIAction[] = [];
	const s = agent.state;

	// Energy regeneration
	s.energy = Math.min(1, s.energy + dt * 0.05);

	// If resting, wait for energy
	if (s.mood === 'resting') {
		if (s.energy > 0.5) s.mood = 'curious';
		return actions;
	}

	// Find uncollapsed ghosts within attention radius
	const visible = ghosts.filter(g => {
		if (collapsedIds.has(g.id)) return false;
		const dist = distance(s.position, g.position);
		return dist < agent.attentionRadius;
	});

	// Decision: what to focus on
	if (visible.length === 0) {
		// Nothing nearby — wander
		s.mood = 'curious';
		s.attention = null;
		wander(s, agent, dt);
	} else if (s.attention && visible.find(g => g.id === s.attention)) {
		// Continue focusing on current target
		const target = visible.find(g => g.id === s.attention)!;
		s.target = target.position;
		moveToward(s, target.position, agent.speed * 0.5, dt);

		// Decide whether to collapse
		if (s.energy > 0.2 && Math.random() < agent.collapseThreshold * dt * agent.observationRate) {
			actions.push({ type: 'collapse', ghostId: target.id });
			s.collapseCount++;
			s.energy -= 0.15;
			s.mood = 'excited';
			s.attention = null;

			// After collapse, briefly rest
			setTimeout(() => { if (s.mood === 'excited') s.mood = 'curious'; }, 1000);
		} else {
			actions.push({ type: 'observe', ghostId: target.id });
			s.observationCount++;
		}
	} else {
		// Pick a new target based on curiosity
		const choice = pickTarget(visible, s, agent.curiosity);
		s.attention = choice.id;
		s.target = choice.position;
		s.mood = 'focused';
	}

	// Energy depletion from movement
	if (s.target) s.energy -= dt * 0.02;
	if (s.energy < 0.1) s.mood = 'resting';

	return actions;
}

export interface AIAction {
	type: 'collapse' | 'observe' | 'move' | 'idle';
	ghostId?: string;
	position?: Vec3;
}

// --- Internal helpers ---

function distance(a: Vec3, b: Vec3): number {
	const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function moveToward(s: AIObserverState, target: Vec3, speed: number, dt: number) {
	const dx = target[0] - s.position[0];
	const dy = target[1] - s.position[1];
	const dz = target[2] - s.position[2];
	const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
	if (dist < 0.3) return;

	const factor = Math.min(1, speed * dt / dist);
	s.position = [
		s.position[0] + dx * factor,
		s.position[1] + dy * factor,
		s.position[2] + dz * factor,
	];
}

function wander(s: AIObserverState, agent: AIObserverConfig, dt: number) {
	// Generate new path point if needed
	if (s.path.length === 0 || distance(s.position, s.path[0]) < 0.5) {
		s.path = [
			[
				(Math.random() - 0.5) * agent.attentionRadius * 2,
				1 + Math.random() * 3,
				(Math.random() - 0.5) * agent.attentionRadius * 2,
			],
		];
	}
	moveToward(s, s.path[0], agent.speed, dt);
}

function pickTarget(ghosts: Ghost[], s: AIObserverState, curiosity: number): Ghost {
	// High curiosity = prefer farther targets; low = prefer nearest
	const sorted = [...ghosts].sort((a, b) => {
		const da = distance(s.position, a.position);
		const db = distance(s.position, b.position);
		return curiosity > 0.5 ? db - da : da - db;
	});
	// Some randomness
	const idx = Math.min(sorted.length - 1, Math.floor(Math.random() * Math.min(3, sorted.length)));
	return sorted[idx];
}
