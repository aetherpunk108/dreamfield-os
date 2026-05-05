/**
 * Game Event Log — tracks everything that happens for narrative and history.
 */

export type GameEventType =
	| 'combat:kill' | 'combat:hit' | 'combat:damage'
	| 'mission:accept' | 'mission:complete' | 'mission:fail'
	| 'dock:enter' | 'dock:leave'
	| 'trade:buy' | 'trade:sell'
	| 'craft:success'
	| 'scan:complete'
	| 'warp:start' | 'warp:end'
	| 'level:up'
	| 'discovery:new'
	| 'faction:change'
	| 'system:alert';

export interface GameEvent {
	id: number;
	type: GameEventType;
	message: string;
	timestamp: number;
	data?: Record<string, unknown>;
	importance: 'low' | 'medium' | 'high' | 'critical';
}

let events: GameEvent[] = [];
let eventCounter = 0;
let listeners: ((event: GameEvent) => void)[] = [];
const MAX_EVENTS = 200;

/** Push a new event */
export function pushEvent(type: GameEventType, message: string, importance: GameEvent['importance'] = 'medium', data?: Record<string, unknown>): GameEvent {
	const event: GameEvent = {
		id: eventCounter++,
		type,
		message,
		timestamp: Date.now(),
		data,
		importance,
	};

	events.push(event);
	if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);

	// Notify listeners
	for (const listener of listeners) listener(event);

	return event;
}

/** Get recent events */
export function getEvents(count = 50): GameEvent[] {
	return events.slice(-count);
}

/** Get events by type */
export function getEventsByType(type: GameEventType): GameEvent[] {
	return events.filter(e => e.type === type);
}

/** Get critical/high importance events */
export function getImportantEvents(): GameEvent[] {
	return events.filter(e => e.importance === 'critical' || e.importance === 'high');
}

/** Subscribe to new events */
export function onEvent(callback: (event: GameEvent) => void): () => void {
	listeners.push(callback);
	return () => { listeners = listeners.filter(l => l !== callback); };
}

/** Clear all events */
export function clearEvents(): void {
	events = [];
	eventCounter = 0;
}

/** Get event stats */
export function getEventStats(): { total: number; kills: number; missions: number; trades: number; discoveries: number } {
	return {
		total: events.length,
		kills: events.filter(e => e.type === 'combat:kill').length,
		missions: events.filter(e => e.type === 'mission:complete').length,
		trades: events.filter(e => e.type === 'trade:buy' || e.type === 'trade:sell').length,
		discoveries: events.filter(e => e.type === 'discovery:new').length,
	};
}

// Convenience event creators
export function logKill(entityName: string): void { pushEvent('combat:kill', `Destroyed ${entityName}`, 'medium', { entity: entityName }); }
export function logDamage(amount: number): void { pushEvent('combat:damage', `Hull damage: -${amount}`, 'high'); }
export function logMissionComplete(name: string, reward: number): void { pushEvent('mission:complete', `Mission complete: ${name} (+${reward} CR)`, 'high', { reward }); }
export function logMissionFail(name: string): void { pushEvent('mission:fail', `Mission failed: ${name}`, 'critical'); }
export function logDock(station: string): void { pushEvent('dock:enter', `Docked at ${station}`, 'low'); }
export function logUndock(station: string): void { pushEvent('dock:leave', `Departed ${station}`, 'low'); }
export function logTrade(item: string, action: 'buy' | 'sell', credits: number): void { pushEvent(`trade:${action}`, `${action === 'buy' ? 'Bought' : 'Sold'} ${item} (${credits} CR)`, 'low'); }
export function logCraft(item: string): void { pushEvent('craft:success', `Crafted: ${item}`, 'medium'); }
export function logScan(target: string): void { pushEvent('scan:complete', `Scan complete: ${target}`, 'medium'); }
export function logWarpStart(dest: string): void { pushEvent('warp:start', `Warp initiated → ${dest}`, 'medium'); }
export function logWarpEnd(dest: string): void { pushEvent('warp:end', `Arrived at ${dest}`, 'medium'); }
export function logLevelUp(level: number): void { pushEvent('level:up', `LEVEL UP → ${level}`, 'critical'); }
export function logDiscovery(name: string): void { pushEvent('discovery:new', `Discovered: ${name}`, 'high'); }
export function logFactionChange(faction: string, tier: string): void { pushEvent('faction:change', `${faction} reputation: ${tier}`, 'high'); }
export function logAlert(message: string): void { pushEvent('system:alert', message, 'critical'); }
