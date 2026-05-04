/**
 * Achievements & Progression System
 */

export interface Achievement {
	id: string;
	name: string;
	description: string;
	icon: string;
	unlocked: boolean;
	unlockedAt?: number;
	category: 'observation' | 'navigation' | 'flight' | 'social' | 'discovery';
}

export interface ProgressContext {
	collapseCount: number;
	entanglementCount: number;
	ghostCount: number;
	collapsedCount: number;
	pinsVisited: number;
	pinsCreated: number;
	maxSpeed: number;
	boostCount: number;
	timeInOrrery: number;
	timeInFlight: number;
	earthViewOpened: boolean;
	dashboardOpened: boolean;
	playerNameSet: boolean;
	aiCollapseWitnessed: boolean;
}

let achievements: Achievement[] = [
	// Observation
	{ id: 'first-collapse', name: 'First Collapse', description: 'Collapse your first ghost', icon: '◈', unlocked: false, category: 'observation' },
	{ id: 'mass-observer', name: 'Mass Observer', description: 'Collapse 10 ghosts', icon: '◉', unlocked: false, category: 'observation' },
	{ id: 'entangler', name: 'Entangler', description: 'Create 3 entanglements', icon: '⟡', unlocked: false, category: 'observation' },
	{ id: 'full-awareness', name: 'Full Awareness', description: 'Reach 100% consciousness', icon: 'Ω', unlocked: false, category: 'observation' },

	// Navigation
	{ id: 'globe-trotter', name: 'Globe Trotter', description: 'Visit 5 different pins', icon: '◎', unlocked: false, category: 'navigation' },
	{ id: 'pin-dropper', name: 'Pin Dropper', description: 'Place 3 custom pins', icon: '📍', unlocked: false, category: 'navigation' },
	{ id: 'pole-position', name: 'Pole Position', description: 'Navigate to a pole', icon: '🧭', unlocked: false, category: 'navigation' },

	// Flight
	{ id: 'liftoff', name: 'Liftoff', description: 'Reach speed 10', icon: '🚀', unlocked: false, category: 'flight' },
	{ id: 'mach-1', name: 'Mach 1', description: 'Reach speed 50', icon: '💨', unlocked: false, category: 'flight' },
	{ id: 'afterburner', name: 'Afterburner', description: 'Use boost 5 times', icon: '🔥', unlocked: false, category: 'flight' },
	{ id: 'cruise', name: 'Cruise Control', description: 'Fly for 60 seconds', icon: '✈', unlocked: false, category: 'flight' },

	// Discovery
	{ id: 'stargazer', name: 'Stargazer', description: 'Spend 60s in orrery view', icon: '✦', unlocked: false, category: 'discovery' },
	{ id: 'terrain-scanner', name: 'Terrain Scanner', description: 'Open Earth view', icon: '🌍', unlocked: false, category: 'discovery' },
	{ id: 'dashboard-detective', name: 'Dashboard Detective', description: 'Open the dashboard', icon: '📊', unlocked: false, category: 'discovery' },
	{ id: 'soundscape', name: 'Soundscape', description: 'Enable audio', icon: '🔊', unlocked: false, category: 'discovery' },

	// Social
	{ id: 'identity', name: 'Identity', description: 'Set your player name', icon: '👤', unlocked: false, category: 'social' },
	{ id: 'ai-friend', name: 'AI Friend', description: 'Watch AI collapse a ghost', icon: '🤖', unlocked: false, category: 'social' },
];

let context: ProgressContext = {
	collapseCount: 0, entanglementCount: 0, ghostCount: 0, collapsedCount: 0,
	pinsVisited: 0, pinsCreated: 0, maxSpeed: 0, boostCount: 0,
	timeInOrrery: 0, timeInFlight: 0, earthViewOpened: false,
	dashboardOpened: false, playerNameSet: false, aiCollapseWitnessed: false,
};

export function getAchievements(): Achievement[] { return achievements; }
export function getProgressContext(): ProgressContext { return context; }
export function updateContext(updates: Partial<ProgressContext>) { context = { ...context, ...updates }; }

export function getUnlockedCount(): number { return achievements.filter(a => a.unlocked).length; }
export function getTotalCount(): number { return achievements.length; }
export function getProgress(): number { return getUnlockedCount() / getTotalCount(); }

/**
 * Check all conditions and unlock new achievements.
 * Returns newly unlocked achievements.
 */
export function checkAchievements(): Achievement[] {
	const newly: Achievement[] = [];

	const checks: Record<string, boolean> = {
		'first-collapse': context.collapseCount >= 1,
		'mass-observer': context.collapseCount >= 10,
		'entangler': context.entanglementCount >= 3,
		'full-awareness': context.ghostCount > 0 && context.collapsedCount >= context.ghostCount,
		'globe-trotter': context.pinsVisited >= 5,
		'pin-dropper': context.pinsCreated >= 3,
		'liftoff': context.maxSpeed >= 10,
		'mach-1': context.maxSpeed >= 50,
		'afterburner': context.boostCount >= 5,
		'cruise': context.timeInFlight >= 60,
		'stargazer': context.timeInOrrery >= 60,
		'terrain-scanner': context.earthViewOpened,
		'dashboard-detective': context.dashboardOpened,
		'identity': context.playerNameSet,
		'ai-friend': context.aiCollapseWitnessed,
	};

	for (const a of achievements) {
		if (a.unlocked) continue;
		if (checks[a.id]) {
			a.unlocked = true;
			a.unlockedAt = Date.now();
			newly.push(a);
		}
	}

	return newly;
}

export function resetProgress() {
	achievements = achievements.map(a => ({ ...a, unlocked: false, unlockedAt: undefined }));
	context = {
		collapseCount: 0, entanglementCount: 0, ghostCount: 0, collapsedCount: 0,
		pinsVisited: 0, pinsCreated: 0, maxSpeed: 0, boostCount: 0,
		timeInOrrery: 0, timeInFlight: 0, earthViewOpened: false,
		dashboardOpened: false, playerNameSet: false, aiCollapseWitnessed: false,
	};
}
