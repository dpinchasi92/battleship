import type { Level } from '../engine/index.ts';
import { huntTargetStrategy } from './huntTarget.ts';
import { probabilityStrategy } from './probability.ts';
import { randomStrategy } from './random.ts';
import type { Strategy } from './types.ts';

export type { ShotDecision, Strategy } from './types.ts';
export { bestShot, probabilityMap } from './probability.ts';

export const strategyFor = (level: Level): Strategy => {
  switch (level) {
    case 'cadet':
    case 'easy':
      return randomStrategy;
    case 'medium':
      return huntTargetStrategy;
    case 'hard':
      return probabilityStrategy;
  }
};

export { randomStrategy, huntTargetStrategy, probabilityStrategy };
