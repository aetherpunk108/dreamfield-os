import { treaty } from '@elysiajs/eden';
import type { DreamFieldApp } from '../../server/index.js';

export const api = treaty<DreamFieldApp>('localhost:3001');

export interface SpatialEvent {
	event: string;
	data: unknown;
	timestamp: number;
}

export type SpatialEventHandler = (event: SpatialEvent) => void;

export function createSpatialSocket(onEvent: SpatialEventHandler): {
	send: (event: string, data: Record<string, unknown>) => void;
	close: () => void;
} {
	const ws = new WebSocket('ws://localhost:3001/spatial');

	ws.onmessage = (e) => {
		try {
			const event = JSON.parse(e.data) as SpatialEvent;
			onEvent(event);
		} catch { /* ignore malformed */ }
	};

	ws.onerror = () => { /* silent reconnect later */ };

	return {
		send(event: string, data: Record<string, unknown>) {
			if (ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ event, ...data }));
			}
		},
		close() {
			ws.close();
		}
	};
}
