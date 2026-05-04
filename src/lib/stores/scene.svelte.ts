import { createGhost, type Ghost } from '$lib/spatial/primitives/ghost.js';
import { EntanglementMap } from '$lib/spatial/entanglement.js';

let ghosts = $state<Ghost[]>([
	createGhost('ghost-alpha', [0, 1.5, 0], 0.6, [0, 1, 0.8, 1], 0.7),
	createGhost('ghost-beta', [-2.5, 0.8, -1], 0.35, [0.2, 0.6, 1, 1], 0.5),
	createGhost('ghost-gamma', [2, 2.5, -2], 0.45, [1, 0.3, 0.8, 1], 0.6),
	createGhost('ghost-delta', [-1, 3, 1.5], 0.3, [0.4, 1, 0.4, 1], 0.4),
	createGhost('ghost-epsilon', [1.5, 0.5, 2], 0.25, [1, 0.8, 0.2, 1], 0.5),
]);

const entanglement = new EntanglementMap();
entanglement.link('ghost-alpha', 'ghost-beta');
entanglement.link('ghost-gamma', 'ghost-delta');

export function getGhosts(): Ghost[] {
	return ghosts;
}

export function setGhosts(g: Ghost[]): void {
	ghosts = g;
}

export function addGhost(ghost: Ghost): void {
	ghosts = [...ghosts, ghost];
}

export function getEntanglement(): EntanglementMap {
	return entanglement;
}
