/**
 * All sound is synthesized with the Web Audio API: no audio files to load or license.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let ambience: { stop: () => void } | null = null;
let enabled = true;

function audio(): { ctx: AudioContext; out: GainNode } | null {
  if (!enabled || typeof window === 'undefined' || !('AudioContext' in window)) return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, out: master! };
}

function noiseBuffer(context: AudioContext, seconds: number, brown = false): AudioBuffer {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    } else data[i] = white;
  }
  return buffer;
}

function burst(opts: { duration: number; freq: number; q?: number; gain: number; type?: BiquadFilterType; delay?: number }) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + (opts.delay ?? 0);
  const src = a.ctx.createBufferSource();
  src.buffer = noiseBuffer(a.ctx, opts.duration);
  const filter = a.ctx.createBiquadFilter();
  filter.type = opts.type ?? 'lowpass';
  filter.frequency.setValueAtTime(opts.freq, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.freq / 6), t + opts.duration);
  filter.Q.value = opts.q ?? 1;
  const gain = a.ctx.createGain();
  gain.gain.setValueAtTime(opts.gain, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + opts.duration);
  src.connect(filter).connect(gain).connect(a.out);
  src.start(t);
  src.stop(t + opts.duration);
}

function thump(freq: number, duration: number, gain: number, delay = 0) {
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + delay;
  const osc = a.ctx.createOscillator();
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq / 3, t + duration);
  const g = a.ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(g).connect(a.out);
  osc.start(t);
  osc.stop(t + duration);
}

export const sfx = {
  setEnabled(on: boolean) {
    enabled = on;
    if (master && ctx) master.gain.setTargetAtTime(on ? 0.6 : 0, ctx.currentTime, 0.05);
    if (!on) sfx.stopAmbience();
  },
  cannon() {
    thump(90, 0.5, 0.9);
    burst({ duration: 0.6, freq: 1800, gain: 0.8 });
  },
  splash() {
    burst({ duration: 0.9, freq: 3000, gain: 0.5, type: 'bandpass', q: 0.6 });
  },
  explosion() {
    thump(60, 1.2, 1);
    burst({ duration: 1.4, freq: 1200, gain: 1 });
    burst({ duration: 0.4, freq: 5000, gain: 0.3, type: 'highpass', delay: 0.05 });
  },
  sink() {
    thump(45, 2.2, 0.9);
    burst({ duration: 2.4, freq: 600, gain: 0.7 });
  },
  click() {
    thump(660, 0.08, 0.15);
  },
  fanfare(win: boolean) {
    const a = audio();
    if (!a) return;
    const notes = win ? [392, 494, 587, 784] : [392, 370, 349, 294];
    notes.forEach((f, i) => {
      const t = a.ctx.currentTime + i * 0.22;
      const osc = a.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      const g = a.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(g).connect(a.out);
      osc.start(t);
      osc.stop(t + 0.55);
    });
  },
  startAmbience() {
    const a = audio();
    if (!a || ambience) return;
    const src = a.ctx.createBufferSource();
    src.buffer = noiseBuffer(a.ctx, 6, true);
    src.loop = true;
    const filter = a.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    const lfo = a.ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = a.ctx.createGain();
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain).connect(filter.frequency);
    const g = a.ctx.createGain();
    g.gain.value = 0.12;
    src.connect(filter).connect(g).connect(a.out);
    src.start();
    lfo.start();
    ambience = {
      stop: () => {
        src.stop();
        lfo.stop();
      },
    };
  },
  stopAmbience() {
    ambience?.stop();
    ambience = null;
  },
};
