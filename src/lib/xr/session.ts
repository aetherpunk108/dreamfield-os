/**
 * WebXR Session Manager — VR/AR session lifecycle and controller mapping.
 */

export interface XRControllerState {
	position: [number, number, number];
	rotation: [number, number, number, number]; // quaternion
	grip: number; // 0-1
	trigger: number; // 0-1
	thumbstick: [number, number]; // x, y
	buttons: boolean[];
}

export interface XRSessionState {
	active: boolean;
	mode: 'immersive-vr' | 'immersive-ar' | 'inline' | null;
	leftController: XRControllerState | null;
	rightController: XRControllerState | null;
	headPosition: [number, number, number];
	headRotation: [number, number, number, number];
}

let session: XRSession | null = null;
let refSpace: XRReferenceSpace | null = null;
let xrState: XRSessionState = {
	active: false,
	mode: null,
	leftController: null,
	rightController: null,
	headPosition: [0, 0, 0],
	headRotation: [0, 0, 0, 1],
};

let onFrameCallback: ((state: XRSessionState, frame: XRFrame) => void) | null = null;

/**
 * Check if WebXR is available.
 */
export async function isXRSupported(mode: 'immersive-vr' | 'immersive-ar' = 'immersive-vr'): Promise<boolean> {
	if (!navigator.xr) return false;
	try { return await navigator.xr.isSessionSupported(mode); } catch { return false; }
}

/**
 * Start an XR session.
 */
export async function startXRSession(
	mode: 'immersive-vr' | 'immersive-ar' = 'immersive-vr',
	onFrame?: (state: XRSessionState, frame: XRFrame) => void
): Promise<boolean> {
	if (!navigator.xr) return false;
	onFrameCallback = onFrame ?? null;

	try {
		session = await navigator.xr.requestSession(mode, {
			requiredFeatures: ['local-floor'],
			optionalFeatures: ['hand-tracking', 'bounded-floor'],
		});

		refSpace = await session.requestReferenceSpace('local-floor');

		session.addEventListener('end', () => {
			xrState.active = false;
			xrState.mode = null;
			session = null;
			refSpace = null;
		});

		xrState.active = true;
		xrState.mode = mode;

		// Start frame loop
		session.requestAnimationFrame(xrFrameLoop);

		return true;
	} catch (e) {
		console.warn('XR session failed:', e);
		return false;
	}
}

/**
 * End the XR session.
 */
export async function endXRSession(): Promise<void> {
	if (session) {
		await session.end();
		session = null;
		refSpace = null;
		xrState.active = false;
		xrState.mode = null;
	}
}

/**
 * Get current XR state.
 */
export function getXRState(): XRSessionState { return xrState; }

/**
 * Map XR controllers to flight input.
 */
export function xrToFlightInput(state: XRSessionState): {
	pitch: number; yaw: number; roll: number;
	throttle: number; boost: boolean; brake: boolean; fire: boolean;
} {
	const right = state.rightController;
	const left = state.leftController;

	return {
		// Right stick = pitch/yaw
		pitch: right?.thumbstick[1] ?? 0,
		yaw: right?.thumbstick[0] ?? 0,
		// Left stick X = roll
		roll: left?.thumbstick[0] ?? 0,
		// Right trigger = throttle
		throttle: right?.trigger ?? 0,
		// Left trigger = brake
		brake: (left?.trigger ?? 0) > 0.5,
		// Right grip = boost
		boost: (right?.grip ?? 0) > 0.7,
		// Left grip = fire
		fire: (left?.grip ?? 0) > 0.7,
	};
}

// --- Internal ---

function xrFrameLoop(time: number, frame: XRFrame) {
	if (!session || !refSpace) return;

	const pose = frame.getViewerPose(refSpace);
	if (pose) {
		const p = pose.transform.position;
		const q = pose.transform.orientation;
		xrState.headPosition = [p.x, p.y, p.z];
		xrState.headRotation = [q.x, q.y, q.z, q.w];
	}

	// Read controllers
	for (const source of session.inputSources) {
		if (!source.gripSpace) continue;
		const gripPose = frame.getPose(source.gripSpace, refSpace);
		if (!gripPose) continue;

		const pos = gripPose.transform.position;
		const rot = gripPose.transform.orientation;
		const gamepad = source.gamepad;

		const controllerState: XRControllerState = {
			position: [pos.x, pos.y, pos.z],
			rotation: [rot.x, rot.y, rot.z, rot.w],
			grip: gamepad?.buttons[1]?.value ?? 0,
			trigger: gamepad?.buttons[0]?.value ?? 0,
			thumbstick: [gamepad?.axes[2] ?? 0, gamepad?.axes[3] ?? 0],
			buttons: gamepad?.buttons.map(b => b.pressed) ?? [],
		};

		if (source.handedness === 'left') xrState.leftController = controllerState;
		else if (source.handedness === 'right') xrState.rightController = controllerState;
	}

	onFrameCallback?.(xrState, frame);
	session.requestAnimationFrame(xrFrameLoop);
}
