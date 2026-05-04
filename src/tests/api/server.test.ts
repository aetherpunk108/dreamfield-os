import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Elysia, t } from 'elysia';
import { ObservationTensor } from '$lib/spatial/observation.js';

describe('Dreamfield API', () => {
	const tensor = new ObservationTensor();
	tensor.addObserver('human');

	const app = new Elysia()
		.get('/health', () => ({
			status: 'online',
			system: 'DREAMFIELD OS',
			timestamp: Date.now()
		}))
		.get('/state/:observerId', ({ params }) => ({
			observerId: params.observerId,
			states: Object.fromEntries(tensor.getObserverStates(params.observerId))
		}))
		.post(
			'/collapse',
			({ body }) => {
				tensor.collapse(body.observerId, body.primitiveId);
				return {
					collapsed: true,
					observerId: body.observerId,
					primitiveId: body.primitiveId,
					state: tensor.getState(body.observerId, body.primitiveId)
				};
			},
			{
				body: t.Object({
					observerId: t.String(),
					primitiveId: t.String()
				})
			}
		)
		.post(
			'/reset',
			({ body }) => {
				tensor.reset(body.observerId, body.primitiveId);
				return {
					observerId: body.observerId,
					primitiveId: body.primitiveId,
					state: 0
				};
			},
			{
				body: t.Object({
					observerId: t.String(),
					primitiveId: t.String()
				})
			}
		);

	it('health check returns system info', async () => {
		const res = await app.handle(new Request('http://localhost/health'));
		const body = await res.json();
		expect(body.status).toBe('online');
		expect(body.system).toBe('DREAMFIELD OS');
	});

	it('returns empty state for new observer', async () => {
		const res = await app.handle(new Request('http://localhost/state/human'));
		const body = await res.json();
		expect(body.observerId).toBe('human');
		expect(body.states).toEqual({});
	});

	it('collapses a primitive via POST', async () => {
		const res = await app.handle(
			new Request('http://localhost/collapse', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ observerId: 'human', primitiveId: 'ghost-1' })
			})
		);
		const body = await res.json();
		expect(body.collapsed).toBe(true);
		expect(body.state).toBe(1);
	});

	it('state persists after collapse', async () => {
		const res = await app.handle(new Request('http://localhost/state/human'));
		const body = await res.json();
		expect(body.states['ghost-1']).toBe(1);
	});

	it('resets a primitive via POST', async () => {
		const res = await app.handle(
			new Request('http://localhost/reset', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ observerId: 'human', primitiveId: 'ghost-1' })
			})
		);
		const body = await res.json();
		expect(body.state).toBe(0);
	});
});
