import type { Atmosphere, TimeOfDay } from '../app/atmosphere.ts';

export type SkyLook = {
  sun: [number, number, number];
  sky: { turbidity: number; rayleigh: number; mie: number; mieG: number } | null;
  background: string;
  fog: { color: string; near: number; far: number };
  hemi: { sky: string; ground: string; intensity: number };
  key: { color: string; intensity: number };
  fill: { color: string; intensity: number };
  ocean: {
    deep: string;
    shallow: string;
    sky: string;
    spec: string;
    specStrength: number;
    horizon: number;
    glow: number;
    cloud: number;
    mist: number;
  };
  stars: boolean;
  moon: boolean;
  rain: boolean;
  lightning: boolean;
};

type TimeLook = Omit<SkyLook, 'fog' | 'rain' | 'lightning' | 'sky'> & {
  sky: NonNullable<SkyLook['sky']> | null;
  fogColor: string;
  overcast: string;
};

const TIMES: Record<TimeOfDay, TimeLook> = {
  dawn: {
    sun: [-90, 7, -100],
    sky: { turbidity: 8, rayleigh: 3, mie: 0.01, mieG: 0.9 },
    background: '#e8b9a6',
    fogColor: '#dcb4a8',
    overcast: '#8f8a93',
    hemi: { sky: '#f3d1c4', ground: '#1a3550', intensity: 0.8 },
    key: { color: '#ffb08a', intensity: 1.35 },
    fill: { color: '#c6b6ff', intensity: 0.4 },
    ocean: { deep: '#0b2a40', shallow: '#2f6f87', sky: '#e6b8b0', spec: '#ffc7a0', specStrength: 1.4, horizon: 0.6, glow: 0.3, cloud: 0.1, mist: 0.18 },
    stars: false,
    moon: false,
  },
  day: {
    sun: [-60, 18, -100],
    sky: { turbidity: 6, rayleigh: 1.6, mie: 0.006, mieG: 0.85 },
    background: '#b9cbd6',
    fogColor: '#b9cbd6',
    overcast: '#8d9aa3',
    hemi: { sky: '#dbe9f4', ground: '#0b3a53', intensity: 0.9 },
    key: { color: '#ffe2b8', intensity: 1.6 },
    fill: { color: '#bcd6ff', intensity: 0.5 },
    ocean: { deep: '#06283d', shallow: '#1d6b85', sky: '#9fc3d8', spec: '#ffdb99', specStrength: 1.4, horizon: 0.35, glow: 0.12, cloud: 0.25, mist: 0 },
    stars: false,
    moon: false,
  },
  sunset: {
    sun: [80, 5, -100],
    sky: { turbidity: 10, rayleigh: 3.5, mie: 0.012, mieG: 0.93 },
    background: '#f0a070',
    fogColor: '#d9906c',
    overcast: '#7d6a6a',
    hemi: { sky: '#ffcf9e', ground: '#1d2a44', intensity: 0.75 },
    key: { color: '#ff8a4a', intensity: 1.55 },
    fill: { color: '#9db0ff', intensity: 0.35 },
    ocean: { deep: '#13213a', shallow: '#3d5a78', sky: '#f2a37a', spec: '#ff9c5a', specStrength: 2, horizon: 0.7, glow: 0.55, cloud: 0.15, mist: 0 },
    stars: false,
    moon: false,
  },
  night: {
    sun: [45, 30, -110],
    sky: null,
    background: '#050b1a',
    fogColor: '#0a1428',
    overcast: '#0d131c',
    hemi: { sky: '#6a80b4', ground: '#03081a', intensity: 0.75 },
    key: { color: '#b8c8ff', intensity: 1.05 },
    fill: { color: '#3a4f80', intensity: 0.3 },
    ocean: { deep: '#020a16', shallow: '#0c2a44', sky: '#1a2a4c', spec: '#dfe8ff', specStrength: 1.2, horizon: 0.45, glow: 0.22, cloud: 0.2, mist: 0 },
    stars: true,
    moon: true,
  },
};

/** Points the water's glitter path so its reflection lands in the upper part of the tilted battle view. */
export const glintDirection = ([x]: SkyLook['sun']): [number, number, number] => [x * 0.3, 60, -100];

/** Resolves a time of day and weather into the lights, fog, sky and ocean palette for the 3D scene. */
export function skyLook({ time, weather }: Atmosphere): SkyLook {
  const { fogColor, overcast, ...base } = TIMES[time];
  if (weather === 'clear') {
    return { ...base, fog: { color: fogColor, near: 35, far: 110 }, rain: false, lightning: false };
  }
  const dim = weather === 'fog' ? 0.75 : 0.55;
  const color = weather === 'fog' ? mix(fogColor, '#a3aeb5', time === 'night' ? 0.15 : 0.5) : overcast;
  return {
    ...base,
    sky: null,
    background: color,
    fog: weather === 'fog' ? { color, near: 26, far: 60 } : { color, near: 30, far: 90 },
    hemi: { ...base.hemi, intensity: base.hemi.intensity * (weather === 'fog' ? 0.95 : 0.8) },
    key: { color: mix(base.key.color, '#c8d2dc', 0.5), intensity: base.key.intensity * dim },
    fill: { ...base.fill, intensity: base.fill.intensity * dim },
    ocean: {
      ...base.ocean,
      deep: mix(base.ocean.deep, '#1a2228', 0.35),
      sky: color,
      specStrength: base.ocean.specStrength * (weather === 'fog' ? 0.3 : 0.15),
      horizon: 0.8,
      glow: weather === 'fog' ? base.ocean.glow * 0.25 : 0,
      cloud: weather === 'fog' ? 0.15 : 0.65,
      mist: weather === 'fog' ? 0.6 : 0.12,
    },
    stars: false,
    moon: base.moon && weather === 'fog',
    rain: weather === 'storm',
    lightning: weather === 'storm',
  };
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
