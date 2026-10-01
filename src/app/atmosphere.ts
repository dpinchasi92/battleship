export type TimeOfDay = 'dawn' | 'day' | 'sunset' | 'night';
export type Weather = 'clear' | 'fog' | 'storm';
export type Atmosphere = { time: TimeOfDay; weather: Weather };

export const TIMES: readonly TimeOfDay[] = ['dawn', 'day', 'sunset', 'night'];
export const WEATHERS: readonly Weather[] = ['clear', 'fog', 'storm'];

const WEATHER_ODDS: readonly [Weather, number][] = [
  ['clear', 0.55],
  ['fog', 0.2],
  ['storm', 0.25],
];

export const isTime = (v: unknown): v is TimeOfDay => TIMES.includes(v as TimeOfDay);
export const isWeather = (v: unknown): v is Weather => WEATHERS.includes(v as Weather);

/** Picks the battle's sky, rolling any setting left on "random". Clear skies are the most likely. */
export function resolveAtmosphere(time: TimeOfDay | 'random', weather: Weather | 'random', rand = Math.random): Atmosphere {
  const t = time === 'random' ? TIMES[Math.floor(rand() * TIMES.length)]! : time;
  let w: Weather = 'clear';
  if (weather !== 'random') w = weather;
  else {
    let roll = rand();
    for (const [option, odds] of WEATHER_ODDS) {
      if (roll < odds) {
        w = option;
        break;
      }
      roll -= odds;
    }
  }
  return { time: t, weather: w };
}

const CLEAR_LABELS: Record<TimeOfDay, string> = {
  dawn: 'Clear dawn',
  day: 'Fair skies',
  sunset: 'Golden sunset',
  night: 'Starry night',
};

export function atmosphereLabel({ time, weather }: Atmosphere): string {
  if (weather === 'clear') return CLEAR_LABELS[time];
  return `${weather === 'fog' ? 'Foggy' : 'Stormy'} ${time}`;
}
