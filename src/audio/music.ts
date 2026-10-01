import { audioOut } from './sfx.ts';

/**
 * A synthesized sea-shanty jig in D minor (6/8): bodhrán, tambourine, bass, strummed chords and a
 * lute-like melody. Notes are scheduled slightly ahead of the audio clock so timing stays tight.
 */
const BPM = 116; // dotted-quarter beats per minute
const EIGHTH = 60 / BPM / 3;
const LOOKAHEAD = 0.15;
const VOLUME = 0.16;

const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);

// One chord root and triad per bar.
const CHORDS: { root: number; triad: [number, number, number] }[] = [
  { root: 38, triad: [62, 65, 69] }, // Dm
  { root: 38, triad: [62, 65, 69] }, // Dm
  { root: 36, triad: [60, 64, 67] }, // C
  { root: 36, triad: [60, 64, 67] }, // C
  { root: 34, triad: [58, 62, 65] }, // Bb
  { root: 36, triad: [60, 64, 67] }, // C
  { root: 38, triad: [62, 65, 69] }, // Dm
  { root: 33, triad: [61, 64, 69] }, // A
];

// Six eighth notes per bar; 0 = rest, -1 = hold the previous note.
const MELODY = [
  [69, 74, 74, 72, 69, 65],
  [67, 69, 70, 69, 67, 65],
  [64, 67, 72, 72, 70, 67],
  [64, 65, 67, 64, 60, 64],
  [65, 70, 74, 74, 72, 70],
  [72, 67, 64, 72, 70, 67],
  [69, 74, 77, 76, 74, 72],
  [73, 69, 64, 69, -1, -1],
];

let timer: ReturnType<typeof setInterval> | null = null;
let bus: GainNode | null = null;
let noise: AudioBuffer | null = null;
let step = 0;
let nextTime = 0;

function noiseBuffer(ctx: AudioContext) {
  if (noise) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function pluck(ctx: AudioContext, out: AudioNode, note: number, t: number, length: number, gain: number) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(3200, t);
  filter.frequency.exponentialRampToValueAtTime(700, t + length);
  for (const [type, detune] of [
    ['triangle', 0],
    ['sawtooth', 6],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = midi(note);
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }
  filter.connect(g).connect(out);
}

function drum(ctx: AudioContext, out: AudioNode, t: number, accent: boolean) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(accent ? 120 : 100, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.22);
  const g = ctx.createGain();
  g.gain.setValueAtTime(accent ? 0.9 : 0.55, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + 0.3);
}

function shaker(ctx: AudioContext, out: AudioNode, t: number, gain: number) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 6000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  src.connect(filter).connect(g).connect(out);
  src.start(t, Math.random() * 0.5, 0.08);
}

function scheduleStep(ctx: AudioContext, out: AudioNode, s: number, t: number) {
  const bar = Math.floor(s / 6) % 8;
  const beat = s % 6;
  const loop = Math.floor(s / 48);
  const chord = CHORDS[bar]!;
  // The first pass is rhythm only; the tune joins on the second, so the music builds gently.
  const withMelody = loop % 4 !== 0;

  if (beat === 0 || beat === 3) drum(ctx, out, t, beat === 0);
  if (beat === 2 || beat === 5) shaker(ctx, out, t, 0.12);
  if (beat === 0) pluck(ctx, out, chord.root, t, EIGHTH * 3, 0.5);
  if (beat === 3) pluck(ctx, out, chord.root + 7, t, EIGHTH * 3, 0.4);
  if (beat === 0 || beat === 3) chord.triad.forEach((n, i) => pluck(ctx, out, n - 12, t + i * 0.018, EIGHTH * 2.5, 0.12));

  if (withMelody) {
    const notes = MELODY[bar]!;
    const note = notes[beat]!;
    if (note > 0) {
      let length = 1;
      while (beat + length < 6 && notes[beat + length] === -1) length++;
      pluck(ctx, out, loop % 4 === 3 ? note - 12 : note, t, EIGHTH * length * 1.1, 0.22);
    }
  }
}

export const music = {
  start() {
    const a = audioOut();
    if (!a || timer) return;
    bus = a.ctx.createGain();
    bus.gain.setValueAtTime(0.0001, a.ctx.currentTime);
    bus.gain.exponentialRampToValueAtTime(VOLUME, a.ctx.currentTime + 2);
    bus.connect(a.out);
    step = 0;
    nextTime = a.ctx.currentTime + 0.1;
    const { ctx } = a;
    const out = bus;
    timer = setInterval(() => {
      while (nextTime < ctx.currentTime + LOOKAHEAD) {
        scheduleStep(ctx, out, step, nextTime);
        nextTime += EIGHTH;
        step++;
      }
    }, 40);
  },
  stop() {
    if (timer) clearInterval(timer);
    timer = null;
    const a = audioOut();
    const old = bus;
    bus = null;
    if (!old) return;
    if (a) {
      old.gain.setTargetAtTime(0.0001, a.ctx.currentTime, 0.3);
      setTimeout(() => old.disconnect(), 1500);
    } else old.disconnect();
  },
};
