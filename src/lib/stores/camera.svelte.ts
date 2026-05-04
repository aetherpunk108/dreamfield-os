import type { Vec3 } from '$lib/spatial/types.js';

export type CameraMode = 'observer' | 'firstperson' | 'cinematic' | 'tensor';

const MODES: CameraMode[] = ['observer', 'firstperson', 'cinematic', 'tensor'];

let cameraMode = $state<CameraMode>('observer');
let cameraPosition = $state<Vec3>([0, 2.5, 7]);
let cameraTarget = $state<Vec3>([0, 1, 0]);

export function getCameraMode(): CameraMode {
	return cameraMode;
}

export function getCameraPosition(): Vec3 {
	return cameraPosition;
}

export function getCameraTarget(): Vec3 {
	return cameraTarget;
}

export function setCameraMode(mode: CameraMode): void {
	cameraMode = mode;
}

export function cycleCameraMode(): void {
	const idx = MODES.indexOf(cameraMode);
	cameraMode = MODES[(idx + 1) % MODES.length];
}

export function focusOn(position: Vec3): void {
	cameraTarget = position;
}

export function setCameraPosition(position: Vec3): void {
	cameraPosition = position;
}

export function setCameraTarget(target: Vec3): void {
	cameraTarget = target;
}
