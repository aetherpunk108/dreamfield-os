/** Player identity and session management */

export interface PlayerProfile {
	id: string;
	name: string;
	role: 'observer' | 'builder' | 'navigator' | 'architect';
	color: string;
	avatar?: string;
	joinedAt: number;
}

export interface WorldSession {
	id: string;
	name: string;
	host: string;
	players: PlayerProfile[];
	maxPlayers: number;
	createdAt: number;
	isPublic: boolean;
}

const COLORS = ['#00ffcc', '#ff44aa', '#4466ff', '#ffcc44', '#44ff88', '#aa44ff', '#ff8844', '#44ddff'];

let playerIdCounter = 0;

/** Generate a unique player ID */
export function generatePlayerId(): string {
	return `player-${Date.now().toString(36)}-${(playerIdCounter++).toString(36)}`;
}

/** Create a new player profile */
export function createPlayer(name: string, role: PlayerProfile['role'] = 'observer'): PlayerProfile {
	const id = generatePlayerId();
	return {
		id,
		name,
		role,
		color: COLORS[Math.floor(Math.random() * COLORS.length)],
		joinedAt: Date.now(),
	};
}

/** Create a local player (the current user) */
export function createLocalPlayer(name = 'Pilot'): PlayerProfile {
	return createPlayer(name, 'observer');
}

/** Create a world session */
export function createWorldSession(host: PlayerProfile, name = 'Dreamfield World'): WorldSession {
	return {
		id: `world-${Date.now().toString(36)}`,
		name,
		host: host.id,
		players: [host],
		maxPlayers: 16,
		createdAt: Date.now(),
		isPublic: true,
	};
}

/** Serialize player for network transmission */
export function serializePlayer(player: PlayerProfile): string {
	return JSON.stringify(player);
}

/** Deserialize player from network */
export function deserializePlayer(data: string): PlayerProfile {
	return JSON.parse(data);
}
