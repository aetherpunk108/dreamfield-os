/**
 * Ship Upgrade System — enhance ship capabilities with credits.
 */

export interface ShipUpgrade {
	id: string;
	name: string;
	description: string;
	category: 'engine' | 'hull' | 'shield' | 'scanner' | 'cargo' | 'weapon' | 'special';
	tier: 1 | 2 | 3;
	cost: number;
	effect: Record<string, number>; // stat deltas
	installed: boolean;
	requiredLevel: number;
}

export const AVAILABLE_UPGRADES: ShipUpgrade[] = [
	// Engine
	{ id: 'engine-1', name: 'Ion Thrusters', description: '+20% max speed', category: 'engine', tier: 1, cost: 200, effect: { maxSpeed: 0.2 }, installed: false, requiredLevel: 1 },
	{ id: 'engine-2', name: 'Fusion Drive', description: '+40% max speed, +30% acceleration', category: 'engine', tier: 2, cost: 600, effect: { maxSpeed: 0.4, acceleration: 0.3 }, installed: false, requiredLevel: 3 },
	{ id: 'engine-3', name: 'Quantum Pulse', description: '+80% max speed, +50% boost', category: 'engine', tier: 3, cost: 1500, effect: { maxSpeed: 0.8, boostMultiplier: 0.5 }, installed: false, requiredLevel: 5 },

	// Hull
	{ id: 'hull-1', name: 'Reinforced Plating', description: '+30 hull', category: 'hull', tier: 1, cost: 150, effect: { hull: 30 }, installed: false, requiredLevel: 1 },
	{ id: 'hull-2', name: 'Composite Armor', description: '+60 hull', category: 'hull', tier: 2, cost: 500, effect: { hull: 60 }, installed: false, requiredLevel: 2 },
	{ id: 'hull-3', name: 'Nanoweave Hull', description: '+120 hull, auto-repair', category: 'hull', tier: 3, cost: 1200, effect: { hull: 120 }, installed: false, requiredLevel: 4 },

	// Shield
	{ id: 'shield-1', name: 'Basic Deflector', description: '+30 shield', category: 'shield', tier: 1, cost: 180, effect: { shield: 30 }, installed: false, requiredLevel: 1 },
	{ id: 'shield-2', name: 'Phase Shield', description: '+60 shield, faster recharge', category: 'shield', tier: 2, cost: 550, effect: { shield: 60 }, installed: false, requiredLevel: 3 },
	{ id: 'shield-3', name: 'Quantum Barrier', description: '+100 shield, reflects damage', category: 'shield', tier: 3, cost: 1400, effect: { shield: 100 }, installed: false, requiredLevel: 5 },

	// Scanner
	{ id: 'scan-1', name: 'Long-Range Antenna', description: '+50% scan range', category: 'scanner', tier: 1, cost: 120, effect: { scanRange: 0.5 }, installed: false, requiredLevel: 1 },
	{ id: 'scan-2', name: 'Deep Scanner', description: '+100% scan range, faster scan', category: 'scanner', tier: 2, cost: 400, effect: { scanRange: 1.0 }, installed: false, requiredLevel: 2 },
	{ id: 'scan-3', name: 'Quantum Resonator', description: '+200% range, reveals hidden objects', category: 'scanner', tier: 3, cost: 1000, effect: { scanRange: 2.0 }, installed: false, requiredLevel: 4 },

	// Cargo
	{ id: 'cargo-1', name: 'Cargo Expansion', description: '+5 cargo slots', category: 'cargo', tier: 1, cost: 100, effect: { cargo: 5 }, installed: false, requiredLevel: 1 },
	{ id: 'cargo-2', name: 'Cargo Bay', description: '+10 cargo slots', category: 'cargo', tier: 2, cost: 350, effect: { cargo: 10 }, installed: false, requiredLevel: 2 },
	{ id: 'cargo-3', name: 'Quantum Hold', description: '+20 cargo, items preserved on death', category: 'cargo', tier: 3, cost: 800, effect: { cargo: 20 }, installed: false, requiredLevel: 3 },

	// Special
	{ id: 'special-cloak', name: 'Cloaking Device', description: 'Become invisible for 10s', category: 'special', tier: 3, cost: 2000, effect: {}, installed: false, requiredLevel: 5 },
	{ id: 'special-warp', name: 'Warp Core Mk2', description: 'Faster warp, less fuel', category: 'special', tier: 2, cost: 800, effect: {}, installed: false, requiredLevel: 3 },
	{ id: 'special-tractor', name: 'Tractor Beam', description: 'Pull objects toward ship', category: 'special', tier: 1, cost: 300, effect: {}, installed: false, requiredLevel: 2 },
];

let installedUpgrades: ShipUpgrade[] = [];

export function getInstalledUpgrades(): ShipUpgrade[] { return installedUpgrades; }
export function getAvailableUpgrades(level: number): ShipUpgrade[] {
	return AVAILABLE_UPGRADES.filter(u => !u.installed && u.requiredLevel <= level);
}

export function purchaseUpgrade(upgradeId: string, credits: number, level: number): { success: boolean; cost: number; message: string } {
	const upgrade = AVAILABLE_UPGRADES.find(u => u.id === upgradeId);
	if (!upgrade) return { success: false, cost: 0, message: 'Upgrade not found' };
	if (upgrade.installed) return { success: false, cost: 0, message: 'Already installed' };
	if (level < upgrade.requiredLevel) return { success: false, cost: 0, message: `Requires level ${upgrade.requiredLevel}` };
	if (credits < upgrade.cost) return { success: false, cost: 0, message: 'Insufficient credits' };

	upgrade.installed = true;
	installedUpgrades.push(upgrade);
	return { success: true, cost: upgrade.cost, message: `Installed: ${upgrade.name}` };
}

/** Calculate total stat bonuses from installed upgrades */
export function getUpgradeBonuses(): Record<string, number> {
	const bonuses: Record<string, number> = {};
	for (const up of installedUpgrades) {
		for (const [key, val] of Object.entries(up.effect)) {
			bonuses[key] = (bonuses[key] ?? 0) + val;
		}
	}
	return bonuses;
}

export function resetUpgrades(): void {
	AVAILABLE_UPGRADES.forEach(u => u.installed = false);
	installedUpgrades = [];
}
