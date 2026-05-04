import { describe, it, expect } from 'vitest';
import { createAIObserver, tickAIObserver, DEFAULT_AI_CONFIG } from '$lib/agents/observer-ai.js';

describe('AI Observer Agent', () => {
	it('creates agent with default config', () => {
		const agent = createAIObserver();
		expect(agent.name).toBe('ALPHA');
		expect(agent.state.energy).toBe(1.0);
		expect(agent.state.mood).toBe('curious');
		expect(agent.state.position).toHaveLength(3);
	});

	it('creates agent with custom config', () => {
		const agent = createAIObserver({ name: 'BETA', curiosity: 0.9, color: '#ff44aa' });
		expect(agent.name).toBe('BETA');
		expect(agent.curiosity).toBe(0.9);
		expect(agent.color).toBe('#ff44aa');
	});

	it('wanders when no ghosts are nearby', () => {
		const agent = createAIObserver();
		const startPos = [...agent.state.position];
		const actions = tickAIObserver(agent, [], new Set(), 0.1);
		// Should return no collapse/observe actions
		expect(actions.filter(a => a.type === 'collapse')).toHaveLength(0);
		expect(agent.state.mood).toBe('curious');
	});

	it('focuses on visible ghosts', () => {
		const agent = createAIObserver();
		agent.state.position = [0, 2, 0];
		const ghosts = [
			{ id: 'ghost-1', position: [1, 2, 0] as [number, number, number] },
			{ id: 'ghost-2', position: [5, 2, 0] as [number, number, number] },
		];
		tickAIObserver(agent, ghosts, new Set(), 0.1);
		// Should pick a target
		expect(agent.state.attention).not.toBeNull();
		expect(agent.state.mood).toBe('focused');
	});

	it('ignores already-collapsed ghosts', () => {
		const agent = createAIObserver();
		agent.state.position = [0, 2, 0];
		const ghosts = [
			{ id: 'ghost-1', position: [1, 2, 0] as [number, number, number] },
		];
		const collapsed = new Set(['ghost-1']);
		tickAIObserver(agent, ghosts, collapsed, 0.1);
		// Should wander since the only ghost is collapsed
		expect(agent.state.attention).toBeNull();
		expect(agent.state.mood).toBe('curious');
	});

	it('rests when energy is depleted', () => {
		const agent = createAIObserver();
		agent.state.energy = 0.05;
		agent.state.mood = 'focused';
		agent.state.position = [0, 2, 0];
		const ghosts = [{ id: 'g1', position: [1, 2, 0] as [number, number, number] }];
		tickAIObserver(agent, ghosts, new Set(), 0.1);
		expect(agent.state.mood).toBe('resting');
	});

	it('regenerates energy over time', () => {
		const agent = createAIObserver();
		agent.state.energy = 0.3;
		agent.state.mood = 'resting';
		// Tick several times
		for (let i = 0; i < 50; i++) {
			tickAIObserver(agent, [], new Set(), 0.1);
		}
		expect(agent.state.energy).toBeGreaterThan(0.5);
		expect(agent.state.mood).toBe('curious');
	});
});
