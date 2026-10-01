import type { Level, Side } from '../engine/index.ts';
import { isTime, isWeather, type TimeOfDay, type Weather } from './atmosphere.ts';

export type ViewMode = '3d' | '2d';
export type FirstMove = Side | 'coin';

export type Settings = {
  level: Level;
  view: ViewMode;
  sound: boolean;
  music: boolean;
  showBrain: boolean;
  first: FirstMove;
  time: TimeOfDay | 'random';
  weather: Weather | 'random';
};

const KEY = 'broadsides.settings.v1';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function loadSettings(): Settings {
  const params = new URLSearchParams(window.location.search);
  const defaults: Settings = {
    level: 'cadet',
    view: prefersReducedMotion() ? '2d' : '3d',
    sound: true,
    music: true,
    showBrain: false,
    first: 'player',
    time: 'random',
    weather: 'random',
  };
  let stored: Partial<Settings>;
  try {
    stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>;
  } catch {
    stored = {};
  }
  const view = params.get('view');
  const time = params.get('time');
  const weather = params.get('weather');
  return {
    ...defaults,
    ...stored,
    ...(view === '2d' || view === '3d' ? { view } : {}),
    ...(isTime(time) ? { time } : {}),
    ...(isWeather(weather) ? { weather } : {}),
  };
}

export function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable (private mode); settings just won't persist.
  }
}

export const LEVELS: { level: Level; title: string; difficulty?: string; blurb: string }[] = [
  { level: 'cadet', title: 'Cadet', blurb: 'Teach me how to play. A guided first voyage with hints.' },
  { level: 'easy', title: 'Deckhand', difficulty: 'Easy', blurb: 'The enemy fires blindly into the fog.' },
  { level: 'medium', title: 'Captain', difficulty: 'Medium', blurb: 'Hunts methodically and finishes wounded ships.' },
  { level: 'hard', title: 'Admiral', difficulty: 'High', blurb: 'Calculates the odds of every square. Show no mercy.' },
];

export const levelTitle = (level: Level) => LEVELS.find((l) => l.level === level)?.title ?? level;
