import { Elysia, t } from 'elysia';
import { ObservationTensor } from '../lib/spatial/observation.js';
import { EntanglementMap } from '../lib/spatial/entanglement.js';

const tensor = new ObservationTensor();
tensor.addObserver('human');
tensor.addObserver('ai');
tensor.addObserver('satellite');

const entanglement = new EntanglementMap();

const connectedClients = new Set<{ send: (data: string) => void }>();

function broadcast(event: string, data: unknown) {
	const msg = JSON.stringify({ event, data, timestamp: Date.now() });
	for (const client of connectedClients) {
		try { client.send(msg); } catch { connectedClients.delete(client); }
	}
}

const app = new Elysia()
	.get('/health', () => ({
		status: 'online',
		system: 'DREAMFIELD OS',
		version: '0.0.1',
		observers: tensor.getObservers(),
		timestamp: Date.now()
	}))
	.get('/state/:observerId', ({ params }) => ({
		observerId: params.observerId,
		states: Object.fromEntries(tensor.getObserverStates(params.observerId))
	}))
	.get('/state', () => tensor.toJSON())
	.post(
		'/collapse',
		({ body }) => {
			tensor.collapse(body.observerId, body.primitiveId);
			const result = {
				collapsed: true,
				observerId: body.observerId,
				primitiveId: body.primitiveId,
				state: tensor.getState(body.observerId, body.primitiveId)
			};
			broadcast('collapse', result);
			return result;
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
			const result = {
				observerId: body.observerId,
				primitiveId: body.primitiveId,
				state: 0
			};
			broadcast('reset', result);
			return result;
		},
		{
			body: t.Object({
				observerId: t.String(),
				primitiveId: t.String()
			})
		}
	)
	.post(
		'/entangle',
		({ body }) => {
			entanglement.link(body.a, body.b);
			broadcast('entangle', { a: body.a, b: body.b });
			return { linked: true, a: body.a, b: body.b };
		},
		{
			body: t.Object({
				a: t.String(),
				b: t.String()
			})
		}
	)
	.post(
		'/observer/add',
		({ body }) => {
			tensor.addObserver(body.observerId);
			broadcast('observer:add', { observerId: body.observerId });
			return { added: true, observerId: body.observerId };
		},
		{
			body: t.Object({
				observerId: t.String()
			})
		}
	)
	// Cesium Ion proxy routes
	.get('/ion/assets', async () => {
		const token = Bun.env.VITE_CESIUM_ION_TOKEN;
		const res = await fetch('https://api.cesium.com/v1/assets/1/endpoint', {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (!res.ok) return { error: `Ion API: ${res.status}` };
		const terrain = await res.json() as { type: string; url: string };
		return { items: [{ id: 1, type: terrain.type, url: terrain.url }] };
	})
	.get('/ion/terrain', async ({ query }) => {
		const token = Bun.env.VITE_CESIUM_ION_TOKEN;
		const lat = parseFloat(query.lat as string || '0');
		const lon = parseFloat(query.lon as string || '0');
		const res = await fetch('https://api.cesium.com/v1/assets/1/endpoint', {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (!res.ok) return { error: `Terrain endpoint: ${res.status}` };
		const endpoint = await res.json() as { url: string; type: string };
		return { lat, lon, endpoint: endpoint.url, type: endpoint.type };
	})
	.get('/ion/asset/:id', async ({ params }) => {
		const token = Bun.env.VITE_CESIUM_ION_TOKEN;
		const res = await fetch(`https://api.cesium.com/v1/assets/${params.id}/endpoint`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (!res.ok) return { error: `Asset ${params.id}: ${res.status}` };
		return res.json();
	})
	.ws('/spatial', {
		open(ws) {
			connectedClients.add(ws);
			ws.send(JSON.stringify({
				event: 'connected',
				data: { observers: tensor.getObservers(), states: tensor.toJSON() },
				timestamp: Date.now()
			}));
		},
		message(ws, message) {
			try {
				const msg = typeof message === 'string' ? JSON.parse(message) : message;
				if (msg.event === 'collapse' && msg.observerId && msg.primitiveId) {
					tensor.collapse(msg.observerId, msg.primitiveId);
					broadcast('collapse', {
						observerId: msg.observerId,
						primitiveId: msg.primitiveId,
						state: 1
					});
				} else if (msg.event === 'reset' && msg.observerId && msg.primitiveId) {
					tensor.reset(msg.observerId, msg.primitiveId);
					broadcast('reset', {
						observerId: msg.observerId,
						primitiveId: msg.primitiveId,
						state: 0
					});
				} else if (msg.event === 'ping') {
					ws.send(JSON.stringify({ event: 'pong', timestamp: Date.now() }));
				}
			} catch {
				ws.send(JSON.stringify({ event: 'error', data: 'Invalid message format' }));
			}
		},
		close(ws) {
			connectedClients.delete(ws);
		}
	})
	.listen(3001);

console.log(`DREAMFIELD API running at http://localhost:${app.server?.port}`);
console.log(`WebSocket endpoint: ws://localhost:${app.server?.port}/spatial`);

export type DreamFieldApp = typeof app;
