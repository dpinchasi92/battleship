export type Rng = {
  /** Uniform float in [0, 1). */
  next: () => number;
  /** Uniform integer in [0, max). */
  int: (max: number) => number;
  pick: <T>(items: readonly T[]) => T;
};

/** Small, fast, seedable PRNG (mulberry32) so games and bugs are reproducible. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (max: number) => Math.floor(next() * max);
  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) throw new Error('Cannot pick from an empty list');
    return items[int(items.length)] as T;
  };
  return { next, int, pick };
}

export const randomSeed = (): number => Math.floor(Math.random() * 2 ** 32);
