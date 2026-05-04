import type { Ray } from './ray.js';
import { intersectGaussian } from './ray.js';
import type { ObservationTensor } from './observation.js';
import type { Ghost } from './primitives/ghost.js';
import type { EntanglementMap } from './entanglement.js';

export interface CollapseResult {
	collapsed: string[];
	propagated: string[];
}

/**
 * Collapse ray: cast a ray from an observer, find intersections with Ghost primitives,
 * set their state to 1, and propagate through entanglement.
 */
export function collapseRay(
	ray: Ray,
	ghosts: Ghost[],
	tensor: ObservationTensor,
	entanglement?: EntanglementMap,
	threshold = 10
): CollapseResult {
	const collapsed: string[] = [];
	const propagated: string[] = [];

	for (const ghost of ghosts) {
		const dist = intersectGaussian(ray, ghost.position, ghost.sigma);
		if (dist !== null && dist <= threshold) {
			tensor.collapse(ray.observerId, ghost.id);
			collapsed.push(ghost.id);

			if (entanglement) {
				const linked = entanglement.getLinked(ghost.id);
				for (const linkedId of linked) {
					tensor.collapse(ray.observerId, linkedId);
					propagated.push(linkedId);
				}
			}
		}
	}

	return { collapsed, propagated };
}
