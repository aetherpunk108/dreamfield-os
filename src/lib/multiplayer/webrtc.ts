/**
 * WebRTC Multiplayer — Peer-to-peer connections for real-time multiplayer.
 * Uses a simple signaling approach via the existing WebSocket server.
 */

import type { Vec3 } from '$lib/spatial/types.js';
import type { SyncEvent } from './sync.js';

export interface PeerConnection {
	id: string;
	name: string;
	connection: RTCPeerConnection | null;
	dataChannel: RTCDataChannel | null;
	connected: boolean;
	latency: number;
	lastSeen: number;
}

export interface MultiplayerConfig {
	serverUrl: string;
	roomId: string;
	playerName: string;
	maxPeers: number;
}

export interface RemotePlayer {
	id: string;
	name: string;
	position: Vec3;
	rotation: { pitch: number; yaw: number; roll: number };
	speed: number;
	shipClass: string;
	shipColor: string;
	lastUpdate: number;
}

const ICE_SERVERS: RTCIceServer[] = [
	{ urls: 'stun:stun.l.google.com:19302' },
	{ urls: 'stun:stun1.l.google.com:19302' },
];

let peers: Map<string, PeerConnection> = new Map();
let remotePlayers: Map<string, RemotePlayer> = new Map();
let ws: WebSocket | null = null;
let localId = '';
let onRemoteUpdate: ((players: RemotePlayer[]) => void) | null = null;
let onPeerJoin: ((name: string) => void) | null = null;
let onPeerLeave: ((name: string) => void) | null = null;

/**
 * Connect to the multiplayer signaling server.
 */
export function connectMultiplayer(config: MultiplayerConfig): void {
	localId = `${config.playerName}-${Date.now().toString(36)}`;

	ws = new WebSocket(config.serverUrl);
	ws.onopen = () => {
		ws?.send(JSON.stringify({
			type: 'join',
			roomId: config.roomId,
			playerId: localId,
			playerName: config.playerName,
		}));
	};

	ws.onmessage = (event) => {
		try {
			const msg = JSON.parse(event.data);
			handleSignal(msg, config);
		} catch {}
	};

	ws.onclose = () => {
		// Attempt reconnect after 3s
		setTimeout(() => {
			if (!ws || ws.readyState === WebSocket.CLOSED) {
				connectMultiplayer(config);
			}
		}, 3000);
	};
}

/**
 * Disconnect from multiplayer.
 */
export function disconnectMultiplayer(): void {
	for (const [id, peer] of peers) {
		peer.dataChannel?.close();
		peer.connection?.close();
	}
	peers.clear();
	remotePlayers.clear();
	ws?.close();
	ws = null;
}

/**
 * Send player state to all peers.
 */
export function broadcastPlayerState(
	position: Vec3,
	rotation: { pitch: number; yaw: number; roll: number },
	speed: number,
	shipClass: string,
	shipColor: string
): void {
	const msg = JSON.stringify({
		type: 'state',
		id: localId,
		position, rotation, speed, shipClass, shipColor,
		timestamp: Date.now(),
	});

	for (const [id, peer] of peers) {
		if (peer.connected && peer.dataChannel?.readyState === 'open') {
			peer.dataChannel.send(msg);
		}
	}
}

/**
 * Send a game event to all peers.
 */
export function broadcastEvent(event: SyncEvent): void {
	const msg = JSON.stringify({ type: 'event', event });
	for (const [id, peer] of peers) {
		if (peer.connected && peer.dataChannel?.readyState === 'open') {
			peer.dataChannel.send(msg);
		}
	}
}

/**
 * Get all remote players.
 */
export function getRemotePlayers(): RemotePlayer[] {
	// Prune stale (>5s no update)
	const now = Date.now();
	for (const [id, p] of remotePlayers) {
		if (now - p.lastUpdate > 5000) remotePlayers.delete(id);
	}
	return Array.from(remotePlayers.values());
}

/**
 * Get peer count.
 */
export function getPeerCount(): number {
	return Array.from(peers.values()).filter(p => p.connected).length;
}

/**
 * Set callbacks.
 */
export function onRemotePlayerUpdate(cb: (players: RemotePlayer[]) => void): void { onRemoteUpdate = cb; }
export function onPlayerJoin(cb: (name: string) => void): void { onPeerJoin = cb; }
export function onPlayerLeave(cb: (name: string) => void): void { onPeerLeave = cb; }

// --- Internal ---

async function handleSignal(msg: any, config: MultiplayerConfig) {
	switch (msg.type) {
		case 'peer-joined': {
			if (msg.playerId === localId) return;
			await createPeerConnection(msg.playerId, msg.playerName, true, config);
			onPeerJoin?.(msg.playerName);
			break;
		}
		case 'peer-left': {
			const peer = peers.get(msg.playerId);
			if (peer) {
				peer.connection?.close();
				peers.delete(msg.playerId);
				remotePlayers.delete(msg.playerId);
				onPeerLeave?.(msg.playerName);
			}
			break;
		}
		case 'offer': {
			if (msg.target !== localId) return;
			await createPeerConnection(msg.from, msg.fromName, false, config);
			const peer = peers.get(msg.from);
			if (peer?.connection) {
				await peer.connection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
				const answer = await peer.connection.createAnswer();
				await peer.connection.setLocalDescription(answer);
				ws?.send(JSON.stringify({ type: 'answer', target: msg.from, from: localId, sdp: answer }));
			}
			break;
		}
		case 'answer': {
			if (msg.target !== localId) return;
			const peer = peers.get(msg.from);
			if (peer?.connection) {
				await peer.connection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
			}
			break;
		}
		case 'ice-candidate': {
			if (msg.target !== localId) return;
			const peer = peers.get(msg.from);
			if (peer?.connection && msg.candidate) {
				await peer.connection.addIceCandidate(new RTCIceCandidate(msg.candidate));
			}
			break;
		}
	}
}

async function createPeerConnection(peerId: string, peerName: string, initiator: boolean, config: MultiplayerConfig) {
	if (peers.has(peerId)) return;

	const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
	const peer: PeerConnection = { id: peerId, name: peerName, connection, dataChannel: null, connected: false, latency: 0, lastSeen: Date.now() };

	connection.onicecandidate = (event) => {
		if (event.candidate) {
			ws?.send(JSON.stringify({ type: 'ice-candidate', target: peerId, from: localId, candidate: event.candidate }));
		}
	};

	connection.onconnectionstatechange = () => {
		peer.connected = connection.connectionState === 'connected';
		if (connection.connectionState === 'failed' || connection.connectionState === 'closed') {
			peers.delete(peerId);
			remotePlayers.delete(peerId);
		}
	};

	if (initiator) {
		const dc = connection.createDataChannel('game', { ordered: false, maxRetransmits: 0 });
		setupDataChannel(dc, peerId);
		peer.dataChannel = dc;

		const offer = await connection.createOffer();
		await connection.setLocalDescription(offer);
		ws?.send(JSON.stringify({ type: 'offer', target: peerId, from: localId, fromName: config.playerName, sdp: offer }));
	} else {
		connection.ondatachannel = (event) => {
			setupDataChannel(event.channel, peerId);
			peer.dataChannel = event.channel;
		};
	}

	peers.set(peerId, peer);
}

function setupDataChannel(dc: RTCDataChannel, peerId: string) {
	dc.onmessage = (event) => {
		try {
			const msg = JSON.parse(event.data);
			if (msg.type === 'state') {
				remotePlayers.set(msg.id, {
					id: msg.id,
					name: msg.name ?? peerId,
					position: msg.position,
					rotation: msg.rotation,
					speed: msg.speed,
					shipClass: msg.shipClass,
					shipColor: msg.shipColor,
					lastUpdate: Date.now(),
				});
				onRemoteUpdate?.(getRemotePlayers());
			}
		} catch {}
	};
}
