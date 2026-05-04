/**
 * Mission / Objective System — gives players goals in the cosmos.
 */

import type { Vec3 } from '$lib/spatial/types.js';

export type MissionType = 'explore' | 'scan' | 'deliver' | 'dock' | 'survive' | 'race' | 'salvage';
export type MissionStatus = 'available' | 'active' | 'complete' | 'failed';

export interface Mission {
	id: string;
	name: string;
	description: string;
	type: MissionType;
	status: MissionStatus;
	targetId?: string;
	targetPosition?: Vec3;
	reward: { xp: number; credits: number };
	timeLimit?: number; // seconds, optional
	progress: number; // 0-1
	objectives: Objective[];
}

export interface Objective {
	id: string;
	text: string;
	complete: boolean;
}

let missions: Mission[] = [];
let activeMission: Mission | null = null;
let playerXP = 0;
let playerCredits = 100;
let playerLevel = 1;

/** Starting missions */
export function initMissions(): void {
	activeMission = null;
	playerXP = 0;
	playerCredits = 100;
	playerLevel = 1;
	missions = [
		{
			id: 'tutorial-1', name: 'First Flight', description: 'Reach orbit altitude above Terra',
			type: 'explore', status: 'available', reward: { xp: 50, credits: 25 }, progress: 0,
			objectives: [
				{ id: 'obj-1', text: 'Engage flight controls (click viewport)', complete: false },
				{ id: 'obj-2', text: 'Reach altitude 5km above Terra', complete: false },
				{ id: 'obj-3', text: 'Use afterburner (Shift)', complete: false },
			],
		},
		{
			id: 'tutorial-2', name: 'Station Run', description: 'Dock at ISS ALPHA station',
			type: 'dock', status: 'available', targetId: 'station-0', reward: { xp: 100, credits: 50 }, progress: 0,
			objectives: [
				{ id: 'obj-1', text: 'Navigate to ISS ALPHA', complete: false },
				{ id: 'obj-2', text: 'Approach within 3 units', complete: false },
			],
		},
		{
			id: 'explore-moon', name: 'Lunar Approach', description: 'Fly to Luna and scan its surface',
			type: 'scan', status: 'available', targetId: 'luna', reward: { xp: 200, credits: 100 }, progress: 0,
			objectives: [
				{ id: 'obj-1', text: 'Reach Luna (within 5 units)', complete: false },
				{ id: 'obj-2', text: 'Scan Luna', complete: false },
			],
		},
		{
			id: 'explore-sun', name: 'Solar Expedition', description: 'Brave the journey to Sol Prime',
			type: 'explore', status: 'available', targetId: 'sun', reward: { xp: 500, credits: 250 }, progress: 0,
			timeLimit: 180,
			objectives: [
				{ id: 'obj-1', text: 'Reach within 50 units of Sol Prime', complete: false },
				{ id: 'obj-2', text: 'Survive solar proximity (don\'t get too close)', complete: false },
			],
		},
		{
			id: 'salvage-1', name: 'Salvage Op', description: 'Find and scan a derelict wreck',
			type: 'salvage', status: 'available', reward: { xp: 150, credits: 200 }, progress: 0,
			objectives: [
				{ id: 'obj-1', text: 'Locate a wreck', complete: false },
				{ id: 'obj-2', text: 'Complete a scan', complete: false },
			],
		},
		{
			id: 'gate-1', name: 'Gateway', description: 'Find and approach a jump gate',
			type: 'explore', status: 'available', reward: { xp: 300, credits: 150 }, progress: 0,
			objectives: [
				{ id: 'obj-1', text: 'Locate a jump gate', complete: false },
				{ id: 'obj-2', text: 'Approach within 5 units', complete: false },
			],
		},
		{
			id: 'race-1', name: 'Speed Demon', description: 'Reach maximum speed with afterburner',
			type: 'race', status: 'available', reward: { xp: 100, credits: 75 }, progress: 0,
			objectives: [
				{ id: 'obj-1', text: 'Reach speed 100+', complete: false },
				{ id: 'obj-2', text: 'Maintain for 3 seconds', complete: false },
			],
		},
	];
}

export function getMissions(): Mission[] { return missions; }
export function getActiveMission(): Mission | null { return activeMission; }
export function getPlayerXP(): number { return playerXP; }
export function getPlayerCredits(): number { return playerCredits; }
export function getPlayerLevel(): number { return playerLevel; }

export function acceptMission(id: string): boolean {
	const mission = missions.find(m => m.id === id);
	if (!mission || mission.status !== 'available') return false;
	if (activeMission) return false; // one at a time
	mission.status = 'active';
	activeMission = mission;
	return true;
}

export function completeMission(id: string): void {
	const mission = missions.find(m => m.id === id);
	if (!mission) return;
	mission.status = 'complete';
	mission.progress = 1;
	playerXP += mission.reward.xp;
	playerCredits += mission.reward.credits;
	playerLevel = Math.floor(playerXP / 500) + 1;
	if (activeMission?.id === id) activeMission = null;
}

export function failMission(id: string): void {
	const mission = missions.find(m => m.id === id);
	if (!mission) return;
	mission.status = 'failed';
	if (activeMission?.id === id) activeMission = null;
}

export function completeObjective(missionId: string, objectiveId: string): void {
	const mission = missions.find(m => m.id === missionId);
	if (!mission) return;
	const obj = mission.objectives.find(o => o.id === objectiveId);
	if (obj) obj.complete = true;
	// Update progress
	const done = mission.objectives.filter(o => o.complete).length;
	mission.progress = done / mission.objectives.length;
	// Auto-complete if all objectives done
	if (mission.progress >= 1) completeMission(missionId);
}

export function getAvailableMissions(): Mission[] {
	return missions.filter(m => m.status === 'available');
}

export function getCompletedMissions(): Mission[] {
	return missions.filter(m => m.status === 'complete');
}
