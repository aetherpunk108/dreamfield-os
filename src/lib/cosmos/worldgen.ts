/**
 * Cosmos World Generator — procedural content for the space game.
 * Generates planets, moons, stations, anomalies, wrecks, and jump gates.
 */

import type { Vec3 } from '$lib/spatial/types.js';

export interface CelestialBody {
	id: string;
	name: string;
	type: 'star' | 'planet' | 'moon' | 'station' | 'asteroid' | 'anomaly' | 'gate' | 'wreck' | 'beacon';
	position: Vec3;
	radius: number;
	color: string;
	emissive?: string;
	rotationSpeed: number;
	orbitRadius?: number;
	orbitSpeed?: number;
	orbitCenter?: Vec3;
	description: string;
	hazard: boolean;
	scannable: boolean;
	dockable: boolean;
}

export interface WorldConfig {
	seed: number;
	density: 'sparse' | 'normal' | 'dense';
	scale: number;
}

// Pseudo-random from seed
function seededRandom(seed: number): () => number {
	let s = seed;
	return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

const NAMES = {
	prefixes: ['Nova', 'Void', 'Quantum', 'Nether', 'Flux', 'Phantom', 'Drift', 'Echo', 'Pulse', 'Zenith', 'Aether', 'Prism', 'Omega', 'Nexus', 'Arc'],
	suffixes: ['Prime', 'Deep', 'Gate', 'Haven', 'Reach', 'Spire', 'Core', 'Edge', 'Wake', 'Drift', 'Veil', 'Fall', 'Rise', 'Rift', 'Forge'],
	greek: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Theta', 'Iota', 'Kappa', 'Lambda', 'Sigma', 'Omega'],
};

function genName(rng: () => number): string {
	const style = rng();
	if (style < 0.4) return NAMES.prefixes[Math.floor(rng() * NAMES.prefixes.length)] + ' ' + NAMES.suffixes[Math.floor(rng() * NAMES.suffixes.length)];
	if (style < 0.7) return NAMES.prefixes[Math.floor(rng() * NAMES.prefixes.length)] + '-' + NAMES.greek[Math.floor(rng() * NAMES.greek.length)];
	return NAMES.greek[Math.floor(rng() * NAMES.greek.length)] + ' ' + Math.floor(rng() * 999 + 1);
}

const PLANET_COLORS = ['#1a4a2a', '#2a1a4a', '#4a2a1a', '#1a2a4a', '#3a3a1a', '#1a4a4a', '#4a1a3a'];
const ANOMALY_COLORS = ['#ff44aa', '#44ffaa', '#aa44ff', '#ffaa44', '#44aaff'];

/**
 * Generate a full cosmos world from seed.
 */
export function generateWorld(config: WorldConfig = { seed: 42, density: 'normal', scale: 1 }): CelestialBody[] {
	const rng = seededRandom(config.seed);
	const bodies: CelestialBody[] = [];
	const s = config.scale;
	const count = config.density === 'sparse' ? 1 : config.density === 'dense' ? 3 : 2;

	// Central star (Sun)
	bodies.push({
		id: 'sun', name: 'SOL PRIME', type: 'star',
		position: [400 * s, 50 * s, -200 * s],
		radius: 30 * s, color: '#ffcc44', emissive: '#ffaa22',
		rotationSpeed: 0.005, description: 'Central star of the Dreamfield system',
		hazard: true, scannable: true, dockable: false,
	});

	// Home planet (Earth)
	bodies.push({
		id: 'earth', name: 'TERRA', type: 'planet',
		position: [0, 0, 0],
		radius: 6 * s, color: '#1a4a2a', emissive: '#0a2a1a',
		rotationSpeed: 0.01, description: 'Homeworld — Cesium-mapped surface',
		hazard: false, scannable: true, dockable: false,
	});

	// Home moon
	bodies.push({
		id: 'luna', name: 'LUNA', type: 'moon',
		position: [60 * s, 0, 0],
		radius: 1.6 * s, color: '#888888',
		rotationSpeed: 0.003, orbitRadius: 60 * s, orbitSpeed: 0.02, orbitCenter: [0, 0, 0],
		description: 'Natural satellite — mineral rich',
		hazard: false, scannable: true, dockable: false,
	});

	// Additional planets
	for (let i = 0; i < 3 * count; i++) {
		const angle = rng() * Math.PI * 2;
		const dist = (120 + rng() * 300) * s;
		const y = (rng() - 0.5) * 40 * s;
		bodies.push({
			id: `planet-${i}`, name: genName(rng), type: 'planet',
			position: [Math.cos(angle) * dist, y, Math.sin(angle) * dist],
			radius: (2 + rng() * 5) * s,
			color: PLANET_COLORS[Math.floor(rng() * PLANET_COLORS.length)],
			rotationSpeed: 0.005 + rng() * 0.02,
			description: 'Uncharted world',
			hazard: rng() > 0.7, scannable: true, dockable: false,
		});
	}

	// Space stations
	const stationConfigs = [
		{ name: 'ISS ALPHA', pos: [0, 8 * s, 9 * s] as Vec3, color: '#00ffcc', desc: 'Low orbit station — resupply & repair' },
		{ name: 'LUNAR GATE', pos: [55 * s, 3 * s, 15 * s] as Vec3, color: '#4466ff', desc: 'Moon approach waystation' },
		{ name: 'SUN OUTPOST', pos: [200 * s, 20 * s, -100 * s] as Vec3, color: '#ffcc44', desc: 'Solar research platform' },
		{ name: 'VOID HARBOR', pos: [-80 * s, -10 * s, 60 * s] as Vec3, color: '#aa44ff', desc: 'Deep space trading post' },
	];
	for (let i = 0; i < stationConfigs.length; i++) {
		const st = stationConfigs[i];
		bodies.push({
			id: `station-${i}`, name: st.name, type: 'station',
			position: st.pos, radius: 0.6 * s, color: st.color,
			rotationSpeed: 0.5, description: st.desc,
			hazard: false, scannable: true, dockable: true,
		});
	}

	// Additional procedural stations
	for (let i = 0; i < 2 * count; i++) {
		const angle = rng() * Math.PI * 2;
		const dist = (40 + rng() * 200) * s;
		bodies.push({
			id: `station-proc-${i}`, name: genName(rng) + ' DOCK', type: 'station',
			position: [Math.cos(angle) * dist, (rng() - 0.5) * 30 * s, Math.sin(angle) * dist],
			radius: 0.5 * s, color: ANOMALY_COLORS[Math.floor(rng() * ANOMALY_COLORS.length)],
			rotationSpeed: 0.3 + rng() * 0.5, description: 'Automated relay station',
			hazard: false, scannable: true, dockable: true,
		});
	}

	// Jump gates
	for (let i = 0; i < 2 * count; i++) {
		const angle = rng() * Math.PI * 2;
		const dist = (80 + rng() * 250) * s;
		bodies.push({
			id: `gate-${i}`, name: `GATE ${NAMES.greek[i % NAMES.greek.length]}`, type: 'gate',
			position: [Math.cos(angle) * dist, (rng() - 0.5) * 20 * s, Math.sin(angle) * dist],
			radius: 2 * s, color: '#44ffaa', emissive: '#22ff88',
			rotationSpeed: 1.0, description: 'Hyperspace jump gate — destination unknown',
			hazard: false, scannable: true, dockable: false,
		});
	}

	// Anomalies (dangerous/interesting)
	for (let i = 0; i < 3 * count; i++) {
		const angle = rng() * Math.PI * 2;
		const dist = (50 + rng() * 300) * s;
		bodies.push({
			id: `anomaly-${i}`, name: genName(rng) + ' ANOMALY', type: 'anomaly',
			position: [Math.cos(angle) * dist, (rng() - 0.5) * 50 * s, Math.sin(angle) * dist],
			radius: (1 + rng() * 3) * s,
			color: ANOMALY_COLORS[Math.floor(rng() * ANOMALY_COLORS.length)],
			rotationSpeed: 2 + rng() * 3, description: 'Spacetime distortion — approach with caution',
			hazard: true, scannable: true, dockable: false,
		});
	}

	// Wrecks (salvageable)
	for (let i = 0; i < 4 * count; i++) {
		const angle = rng() * Math.PI * 2;
		const dist = (30 + rng() * 150) * s;
		bodies.push({
			id: `wreck-${i}`, name: `WRECK ${Math.floor(rng() * 9999)}`, type: 'wreck',
			position: [Math.cos(angle) * dist, (rng() - 0.5) * 25 * s, Math.sin(angle) * dist],
			radius: 0.3 * s, color: '#666644',
			rotationSpeed: rng() * 0.5, description: 'Derelict vessel — salvage possible',
			hazard: false, scannable: true, dockable: false,
		});
	}

	// Beacons (navigation aids)
	for (let i = 0; i < 5 * count; i++) {
		const angle = rng() * Math.PI * 2;
		const dist = (20 + rng() * 250) * s;
		bodies.push({
			id: `beacon-${i}`, name: `BCN-${(i + 1).toString().padStart(3, '0')}`, type: 'beacon',
			position: [Math.cos(angle) * dist, (rng() - 0.5) * 15 * s, Math.sin(angle) * dist],
			radius: 0.15 * s, color: '#00ffcc',
			rotationSpeed: 3, description: 'Navigation beacon',
			hazard: false, scannable: false, dockable: false,
		});
	}

	// Asteroids
	for (let i = 0; i < 50 * count; i++) {
		const angle = (i / (50 * count)) * Math.PI * 2 + rng() * 0.4;
		const dist = (20 + rng() * 20) * s;
		const y = (rng() - 0.5) * 8 * s;
		bodies.push({
			id: `asteroid-${i}`, name: `AST-${i}`, type: 'asteroid',
			position: [Math.cos(angle) * dist, y, Math.sin(angle) * dist],
			radius: (0.1 + rng() * 0.5) * s, color: '#444444',
			rotationSpeed: (rng() - 0.5) * 2, description: 'Rocky debris',
			hazard: false, scannable: false, dockable: false,
		});
	}

	return bodies;
}

/**
 * Get bodies within scanner range of a position.
 */
export function scanNearby(bodies: CelestialBody[], position: Vec3, range: number): CelestialBody[] {
	return bodies.filter(b => {
		if (!b.scannable) return false;
		const dx = b.position[0] - position[0];
		const dy = b.position[1] - position[1];
		const dz = b.position[2] - position[2];
		return Math.sqrt(dx * dx + dy * dy + dz * dz) <= range;
	});
}

/**
 * Find dockable bodies in range.
 */
export function findDockable(bodies: CelestialBody[], position: Vec3, range = 3): CelestialBody[] {
	return bodies.filter(b => {
		if (!b.dockable) return false;
		const dx = b.position[0] - position[0];
		const dy = b.position[1] - position[1];
		const dz = b.position[2] - position[2];
		return Math.sqrt(dx * dx + dy * dy + dz * dz) <= range;
	});
}
