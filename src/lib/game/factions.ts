/**
 * Faction & Reputation System — relationships with groups in the cosmos.
 */

export interface Faction {
	id: string;
	name: string;
	description: string;
	color: string;
	icon: string;
	reputation: number; // -100 to 100
	tier: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied';
}

export interface FactionReward {
	factionId: string;
	tier: Faction['tier'];
	perks: string[];
}

const TIER_THRESHOLDS: { tier: Faction['tier']; min: number }[] = [
	{ tier: 'allied', min: 75 },
	{ tier: 'friendly', min: 25 },
	{ tier: 'neutral', min: -25 },
	{ tier: 'unfriendly', min: -75 },
	{ tier: 'hostile', min: -100 },
];

let factions: Faction[] = [];

export function initFactions(): void {
	factions = [
		{ id: 'terra-fed', name: 'TERRA FEDERATION', description: 'Earth government — law and order', color: '#00ffcc', icon: '◈', reputation: 20, tier: 'neutral' },
		{ id: 'void-runners', name: 'VOID RUNNERS', description: 'Free traders and smugglers', color: '#ffcc44', icon: '◇', reputation: 0, tier: 'neutral' },
		{ id: 'quantum-collective', name: 'QUANTUM COLLECTIVE', description: 'Scientists and researchers', color: '#4466ff', icon: '◉', reputation: 10, tier: 'neutral' },
		{ id: 'shadow-fleet', name: 'SHADOW FLEET', description: 'Pirates and raiders', color: '#ff44aa', icon: '☠', reputation: -30, tier: 'unfriendly' },
		{ id: 'stellar-corps', name: 'STELLAR CORPS', description: 'Mining and industrial conglomerate', color: '#44ff88', icon: '⛏', reputation: 5, tier: 'neutral' },
		{ id: 'dreamfield-order', name: 'DREAMFIELD ORDER', description: 'Keepers of the observation tensor', color: '#aa44ff', icon: 'Ω', reputation: 50, tier: 'friendly' },
	];
	updateAllTiers();
}

export function getFactions(): Faction[] { return factions; }

export function getFaction(id: string): Faction | undefined {
	return factions.find(f => f.id === id);
}

/** Modify reputation with a faction */
export function modifyReputation(factionId: string, amount: number): void {
	const f = factions.find(x => x.id === factionId);
	if (!f) return;
	f.reputation = Math.max(-100, Math.min(100, f.reputation + amount));
	updateTier(f);
}

/** Get current tier for a reputation value */
function computeTier(rep: number): Faction['tier'] {
	for (const t of TIER_THRESHOLDS) {
		if (rep >= t.min) return t.tier;
	}
	return 'hostile';
}

function updateTier(f: Faction): void {
	f.tier = computeTier(f.reputation);
}

function updateAllTiers(): void {
	factions.forEach(updateTier);
}

/** Get perks for current faction tier */
export function getFactionPerks(factionId: string): string[] {
	const f = factions.find(x => x.id === factionId);
	if (!f) return [];

	const perks: Record<Faction['tier'], string[]> = {
		allied: ['Exclusive missions', 'Free docking', 'Rare trade goods', 'Faction ship skin'],
		friendly: ['Discounted repairs', 'Priority missions', 'Trade bonuses'],
		neutral: ['Standard access', 'Basic missions'],
		unfriendly: ['Higher prices', 'Limited missions'],
		hostile: ['Attack on sight', 'No docking', 'Bounty placed'],
	};

	return perks[f.tier] ?? [];
}

/** Actions that affect reputation */
export function onMissionComplete(factionId: string): void { modifyReputation(factionId, 10); }
export function onMissionFail(factionId: string): void { modifyReputation(factionId, -5); }
export function onKillFactionMember(factionId: string): void { modifyReputation(factionId, -20); }
export function onTradeWith(factionId: string): void { modifyReputation(factionId, 3); }
export function onDockAt(factionId: string): void { modifyReputation(factionId, 1); }

/** Get all factions sorted by reputation */
export function getFactionsByReputation(): Faction[] {
	return [...factions].sort((a, b) => b.reputation - a.reputation);
}

/** Get factions that are hostile */
export function getHostileFactions(): Faction[] {
	return factions.filter(f => f.tier === 'hostile' || f.tier === 'unfriendly');
}

/** Get allied factions */
export function getAlliedFactions(): Faction[] {
	return factions.filter(f => f.tier === 'allied' || f.tier === 'friendly');
}
