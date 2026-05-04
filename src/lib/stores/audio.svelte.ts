/** Audio settings store */

let audioEnabled = $state(false);
let audioMode = $state<'space' | 'flight' | 'earth'>('space');
let volume = $state(0.5);

export function getAudioEnabled() { return audioEnabled; }
export function setAudioEnabled(v: boolean) { audioEnabled = v; }

export function getAudioMode() { return audioMode; }
export function setAudioMode(v: 'space' | 'flight' | 'earth') { audioMode = v; }

export function getVolume() { return volume; }
export function setVolume(v: number) { volume = v; }
