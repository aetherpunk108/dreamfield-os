export interface AudioConfig {
	masterVolume: number; // 0-1
	ambientEnabled: boolean;
	sfxEnabled: boolean;
	spatialEnabled: boolean;
}

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

// Ambient state
let ambientNodes: AudioNode[] = [];
let ambientGain: GainNode | null = null;
let twinkleTimeout: ReturnType<typeof setTimeout> | null = null;
let currentAmbientMode: 'space' | 'flight' | 'earth' | null = null;

// Listener state
let listenerX = 0;
let listenerY = 0;
let listenerZ = 0;

function getCtx(): AudioContext {
	if (!ctx) throw new Error('AudioContext not initialized. Call initAudio() first.');
	return ctx;
}

export function initAudio(): void {
	if (ctx) return;
	ctx = new AudioContext();
	masterGain = ctx.createGain();
	masterGain.gain.value = 0.8;
	masterGain.connect(ctx.destination);
}

export function getMasterVolume(): number {
	return masterGain?.gain.value ?? 0.8;
}

export function setMasterVolume(v: number): void {
	if (!masterGain) return;
	const clamped = Math.max(0, Math.min(1, v));
	masterGain.gain.setTargetAtTime(clamped, getCtx().currentTime, 0.01);
}

export function setListenerPosition(x: number, y: number, z: number): void {
	listenerX = x;
	listenerY = y;
	listenerZ = z;
	if (!ctx) return;
	const listener = ctx.listener;
	if (listener.positionX) {
		listener.positionX.value = x;
		listener.positionY.value = y;
		listener.positionZ.value = z;
	} else {
		// Fallback for older browsers
		listener.setPosition(x, y, z);
	}
}

export function playCollapseSFX(position: { x: number; y: number; z: number }): void {
	const c = getCtx();
	if (!masterGain) return;

	const panner = c.createPanner();
	panner.panningModel = 'HRTF';
	panner.distanceModel = 'inverse';
	panner.refDistance = 1;
	panner.maxDistance = 100;
	panner.rolloffFactor = 1;
	if (panner.positionX) {
		panner.positionX.value = position.x;
		panner.positionY.value = position.y;
		panner.positionZ.value = position.z;
	} else {
		panner.setPosition(position.x, position.y, position.z);
	}

	const gain = c.createGain();
	const osc = c.createOscillator();
	osc.type = 'sine';
	osc.frequency.value = 1200 + Math.random() * 600;

	const now = c.currentTime;
	gain.gain.setValueAtTime(0.4, now);
	gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
	osc.frequency.exponentialRampToValueAtTime(osc.frequency.value * 0.5, now + 0.4);

	osc.connect(gain);
	gain.connect(panner);
	panner.connect(masterGain);

	osc.start(now);
	osc.stop(now + 0.4);
	osc.onended = () => {
		gain.disconnect();
		panner.disconnect();
	};
}

export function playEntangleSFX(): void {
	const c = getCtx();
	if (!masterGain) return;

	const now = c.currentTime;
	const gain = c.createGain();
	gain.gain.setValueAtTime(0, now);
	gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
	gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
	gain.connect(masterGain);

	const freqs = [261.63, 392.0]; // C4 + G4 perfect fifth
	freqs.forEach((freq) => {
		const osc = c.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = freq;
		osc.connect(gain);
		osc.start(now);
		osc.stop(now + 1.2);
		osc.onended = () => osc.disconnect();
	});

	const osc3 = c.createOscillator();
	osc3.type = 'triangle';
	osc3.frequency.value = 523.25; // C5 octave
	osc3.connect(gain);
	osc3.start(now);
	osc3.stop(now + 0.8);
	osc3.onended = () => {
		osc3.disconnect();
		gain.disconnect();
	};
}

export function playBoostSFX(): void {
	const c = getCtx();
	if (!masterGain) return;

	const now = c.currentTime;

	// Noise burst (whoosh)
	const bufferSize = c.sampleRate * 0.5;
	const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) {
		data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
	}
	const noise = c.createBufferSource();
	noise.buffer = buffer;

	const filter = c.createBiquadFilter();
	filter.type = 'bandpass';
	filter.frequency.setValueAtTime(400, now);
	filter.frequency.exponentialRampToValueAtTime(3200, now + 0.5);
	filter.Q.value = 0.8;

	const gain = c.createGain();
	gain.gain.setValueAtTime(0.35, now);
	gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

	// Rising tone
	const osc = c.createOscillator();
	osc.type = 'sawtooth';
	osc.frequency.setValueAtTime(80, now);
	osc.frequency.exponentialRampToValueAtTime(640, now + 0.5);

	const oscGain = c.createGain();
	oscGain.gain.setValueAtTime(0.15, now);
	oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

	noise.connect(filter);
	filter.connect(gain);
	gain.connect(masterGain);

	osc.connect(oscGain);
	oscGain.connect(masterGain);

	noise.start(now);
	osc.start(now);
	osc.stop(now + 0.5);
	osc.onended = () => {
		osc.disconnect();
		oscGain.disconnect();
		gain.disconnect();
		filter.disconnect();
	};
}

export function playUIClick(): void {
	const c = getCtx();
	if (!masterGain) return;

	const now = c.currentTime;
	const osc = c.createOscillator();
	osc.type = 'sine';
	osc.frequency.value = 800;

	const gain = c.createGain();
	gain.gain.setValueAtTime(0.12, now);
	gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

	osc.connect(gain);
	gain.connect(masterGain);
	osc.start(now);
	osc.stop(now + 0.06);
	osc.onended = () => {
		osc.disconnect();
		gain.disconnect();
	};
}

function createLFO(c: AudioContext, rate: number, depth: number): OscillatorNode {
	const lfo = c.createOscillator();
	lfo.type = 'sine';
	lfo.frequency.value = rate;
	return lfo;
}

function scheduleSpaceTwinkle(): void {
	if (!ctx || !ambientGain || currentAmbientMode !== 'space') return;
	const delay = 2000 + Math.random() * 3000;
	twinkleTimeout = setTimeout(() => {
		if (!ctx || !masterGain || currentAmbientMode !== 'space') return;
		const c = ctx;
		const now = c.currentTime;
		const freq = 2000 + Math.random() * 4000;

		const osc = c.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = freq;

		const gain = c.createGain();
		gain.gain.setValueAtTime(0, now);
		gain.gain.linearRampToValueAtTime(0.06 + Math.random() * 0.04, now + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3 + Math.random() * 0.3);

		osc.connect(gain);
		gain.connect(masterGain!);
		osc.start(now);
		osc.stop(now + 0.6);
		osc.onended = () => {
			osc.disconnect();
			gain.disconnect();
		};

		scheduleSpaceTwinkle();
	}, delay);
}

export function startAmbient(mode: 'space' | 'flight' | 'earth'): void {
	stopAmbient();
	const c = getCtx();
	if (!masterGain) return;

	currentAmbientMode = mode;
	ambientGain = c.createGain();
	ambientGain.gain.setValueAtTime(0, c.currentTime);
	ambientGain.gain.linearRampToValueAtTime(0.5, c.currentTime + 2);
	ambientGain.connect(masterGain);

	if (mode === 'space') {
		// Deep sub-bass drone
		const subOsc = c.createOscillator();
		subOsc.type = 'sine';
		subOsc.frequency.value = 40;

		const subGain = c.createGain();
		subGain.gain.value = 0.6;

		const lfo1 = createLFO(c, 0.05, 2);
		const lfoGain1 = c.createGain();
		lfoGain1.gain.value = 2;
		lfo1.connect(lfoGain1);
		lfoGain1.connect(subOsc.frequency);

		subOsc.connect(subGain);
		subGain.connect(ambientGain);
		subOsc.start();
		lfo1.start();

		// Filtered noise (wind)
		const noiseBuffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
		const noiseData = noiseBuffer.getChannelData(0);
		for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
		const noiseSource = c.createBufferSource();
		noiseSource.buffer = noiseBuffer;
		noiseSource.loop = true;

		const noiseFilter = c.createBiquadFilter();
		noiseFilter.type = 'bandpass';
		noiseFilter.frequency.value = 200;
		noiseFilter.Q.value = 0.5;

		const noiseGain = c.createGain();
		noiseGain.gain.value = 0.15;

		noiseSource.connect(noiseFilter);
		noiseFilter.connect(noiseGain);
		noiseGain.connect(ambientGain);
		noiseSource.start();

		// Second harmonic drone
		const harmOsc = c.createOscillator();
		harmOsc.type = 'triangle';
		harmOsc.frequency.value = 80;
		const harmGain = c.createGain();
		harmGain.gain.value = 0.3;

		const lfo2 = createLFO(c, 0.03, 1);
		const lfoGain2 = c.createGain();
		lfoGain2.gain.value = 1;
		lfo2.connect(lfoGain2);
		lfoGain2.connect(harmOsc.frequency);

		harmOsc.connect(harmGain);
		harmGain.connect(ambientGain);
		harmOsc.start();
		lfo2.start();

		ambientNodes.push(subOsc, lfo1, noiseSource, harmOsc, lfo2);

		scheduleSpaceTwinkle();
	} else if (mode === 'flight') {
		// Engine hum
		const engineOsc = c.createOscillator();
		engineOsc.type = 'sawtooth';
		engineOsc.frequency.value = 120;

		const engineFilter = c.createBiquadFilter();
		engineFilter.type = 'lowpass';
		engineFilter.frequency.value = 600;

		const engineGain = c.createGain();
		engineGain.gain.value = 0.4;

		const lfo = createLFO(c, 0.1, 3);
		const lfoGain = c.createGain();
		lfoGain.gain.value = 3;
		lfo.connect(lfoGain);
		lfoGain.connect(engineOsc.frequency);

		engineOsc.connect(engineFilter);
		engineFilter.connect(engineGain);
		engineGain.connect(ambientGain);
		engineOsc.start();
		lfo.start();

		// Wind noise
		const windBuffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
		const windData = windBuffer.getChannelData(0);
		for (let i = 0; i < windData.length; i++) windData[i] = Math.random() * 2 - 1;
		const windSource = c.createBufferSource();
		windSource.buffer = windBuffer;
		windSource.loop = true;

		const windFilter = c.createBiquadFilter();
		windFilter.type = 'highpass';
		windFilter.frequency.value = 800;

		const windGain = c.createGain();
		windGain.gain.value = 0.2;

		windSource.connect(windFilter);
		windFilter.connect(windGain);
		windGain.connect(ambientGain);
		windSource.start();

		ambientNodes.push(engineOsc, lfo, windSource);
	} else if (mode === 'earth') {
		// Warm pad chord: C3, E3, G3
		const padFreqs = [130.81, 164.81, 196.0];
		padFreqs.forEach((freq, i) => {
			const osc = c.createOscillator();
			osc.type = 'triangle';
			osc.frequency.value = freq;

			const filter = c.createBiquadFilter();
			filter.type = 'lowpass';
			filter.frequency.value = 1200;

			const gain = c.createGain();
			gain.gain.value = 0.25;

			const lfo = createLFO(c, 0.04 + i * 0.01, 1);
			const lfoGain = c.createGain();
			lfoGain.gain.value = 1;
			lfo.connect(lfoGain);
			lfoGain.connect(osc.frequency);

			osc.connect(filter);
			filter.connect(gain);
			gain.connect(ambientGain!);
			osc.start();
			lfo.start();
			ambientNodes.push(osc, lfo);
		});

		// Subtle filtered noise
		const noiseBuffer = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
		const noiseData = noiseBuffer.getChannelData(0);
		for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
		const noiseSource = c.createBufferSource();
		noiseSource.buffer = noiseBuffer;
		noiseSource.loop = true;

		const noiseFilter = c.createBiquadFilter();
		noiseFilter.type = 'lowpass';
		noiseFilter.frequency.value = 400;

		const noiseGain = c.createGain();
		noiseGain.gain.value = 0.08;

		noiseSource.connect(noiseFilter);
		noiseFilter.connect(noiseGain);
		noiseGain.connect(ambientGain);
		noiseSource.start();
		ambientNodes.push(noiseSource);
	}
}

export function stopAmbient(): void {
	if (twinkleTimeout !== null) {
		clearTimeout(twinkleTimeout);
		twinkleTimeout = null;
	}

	currentAmbientMode = null;

	if (ambientGain && ctx) {
		const now = ctx.currentTime;
		ambientGain.gain.setTargetAtTime(0, now, 0.3);
		const fadeGain = ambientGain;
		setTimeout(() => {
			ambientNodes.forEach((node) => {
				try {
					if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
						node.stop();
					}
					node.disconnect();
				} catch {
					// already stopped
				}
			});
			ambientNodes = [];
			try {
				fadeGain.disconnect();
			} catch {
				// already disconnected
			}
		}, 1500);
		ambientGain = null;
	} else {
		ambientNodes.forEach((node) => {
			try {
				if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
					node.stop();
				}
				node.disconnect();
			} catch {
				// already stopped
			}
		});
		ambientNodes = [];
	}
}

export function dispose(): void {
	stopAmbient();
	if (ctx) {
		ctx.close();
		ctx = null;
		masterGain = null;
	}
}
