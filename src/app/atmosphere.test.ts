import { describe, expect, it } from 'vitest';
import { atmosphereLabel, resolveAtmosphere } from './atmosphere.ts';

const fixed = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length]!;
};

describe('resolveAtmosphere', () => {
  it('keeps explicit choices', () => {
    expect(resolveAtmosphere('sunset', 'fog')).toEqual({ time: 'sunset', weather: 'fog' });
  });

  it('rolls random settings with clear skies most likely', () => {
    expect(resolveAtmosphere('random', 'random', fixed(0, 0.1))).toEqual({ time: 'dawn', weather: 'clear' });
    expect(resolveAtmosphere('random', 'random', fixed(0.99, 0.6))).toEqual({ time: 'night', weather: 'fog' });
    expect(resolveAtmosphere('day', 'random', fixed(0.9))).toEqual({ time: 'day', weather: 'storm' });
  });
});

describe('atmosphereLabel', () => {
  it('names the sky', () => {
    expect(atmosphereLabel({ time: 'night', weather: 'clear' })).toBe('Starry night');
    expect(atmosphereLabel({ time: 'night', weather: 'storm' })).toBe('Stormy night');
    expect(atmosphereLabel({ time: 'dawn', weather: 'fog' })).toBe('Foggy dawn');
  });
});
