/** Pressure-sensitive response curve types */
export type CurveType = 'LINEAR' | 'SMOOTH_START' | 'SMOOTH_END' | 'S_SHAPE' | 'CUSTOM';

export interface CurveConfig {
	type: CurveType;
	gain: number;
	exponent: number;
	deadzone: number;
	ceiling: number;
}

/** Default curve presets */
export const CURVE_PRESETS: Record<CurveType, Omit<CurveConfig, 'type'>> = {
	LINEAR: { gain: 1.0, exponent: 1.0, deadzone: 0.05, ceiling: 0.95 },
	SMOOTH_START: { gain: 1.0, exponent: 2.0, deadzone: 0.03, ceiling: 1.0 },
	SMOOTH_END: { gain: 1.2, exponent: 0.5, deadzone: 0.05, ceiling: 0.95 },
	S_SHAPE: { gain: 1.0, exponent: 1.0, deadzone: 0.04, ceiling: 0.96 },
	CUSTOM: { gain: 1.0, exponent: 1.5, deadzone: 0.05, ceiling: 1.0 },
};

/**
 * Apply a response curve to raw input (0–1).
 * Returns shaped output (0–1).
 */
export function applyCurve(input: number, config: CurveConfig): number {
	const abs = Math.abs(input);
	const sign = input >= 0 ? 1 : -1;

	// Deadzone
	if (abs < config.deadzone) return 0;

	// Ceiling
	const clamped = Math.min(abs, config.ceiling);

	// Normalize to 0–1 within active range
	const range = config.ceiling - config.deadzone;
	const normalized = (clamped - config.deadzone) / range;

	let output: number;

	switch (config.type) {
		case 'LINEAR':
			output = normalized;
			break;
		case 'SMOOTH_START':
			output = Math.pow(normalized, config.exponent);
			break;
		case 'SMOOTH_END':
			output = 1 - Math.pow(1 - normalized, config.exponent + 0.5);
			break;
		case 'S_SHAPE':
			// Hermite S-curve
			output = normalized * normalized * (3 - 2 * normalized);
			break;
		case 'CUSTOM':
			output = Math.pow(normalized, config.exponent);
			break;
		default:
			output = normalized;
	}

	return sign * output * config.gain;
}

/**
 * Sample a curve for visualization (returns array of [x, y] points).
 */
export function sampleCurve(config: CurveConfig, resolution = 64): [number, number][] {
	const points: [number, number][] = [];
	for (let i = 0; i <= resolution; i++) {
		const x = i / resolution;
		const y = applyCurve(x, config);
		points.push([x, Math.min(1, Math.max(0, y))]);
	}
	return points;
}

/**
 * Create a full CurveConfig from a preset type.
 */
export function createCurve(type: CurveType, overrides?: Partial<Omit<CurveConfig, 'type'>>): CurveConfig {
	return { type, ...CURVE_PRESETS[type], ...overrides };
}

/**
 * Key hold duration to throttle value (SMOOTH_END curve).
 * holdTime in seconds, rampTime = time to reach full throttle.
 */
export function holdToThrottle(holdTime: number, rampTime = 1.0): number {
	if (holdTime <= 0) return 0;
	const t = Math.min(holdTime / rampTime, 1.0);
	// Smooth end curve: quick initial, dampened top
	return 1 - Math.pow(1 - t, 2.5);
}
