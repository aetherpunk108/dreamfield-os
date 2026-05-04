export type ViewMode = 'spatial' | 'orrery' | 'earth' | 'flight';

export interface ViewModeEntry {
	id: ViewMode;
	label: string;
	key: string;
}

export const viewModes: ViewModeEntry[] = [
	{ id: 'spatial', label: 'Spatial', key: '1' },
	{ id: 'orrery', label: 'Orrery', key: '2' },
	{ id: 'earth', label: 'Earth', key: '3' },
	{ id: 'flight', label: 'Flight', key: '4' },
];

let currentMode = $state<ViewMode>('orrery');

export function getViewMode(): ViewMode {
	return currentMode;
}

export function setViewMode(mode: ViewMode): void {
	currentMode = mode;
}
