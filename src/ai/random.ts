import { unknownCells } from '../engine/index.ts';
import type { Strategy } from './types.ts';

export const randomStrategy: Strategy = {
  level: 'easy',
  chooseShot: (knowledge, rng) => ({
    coord: rng.pick(unknownCells(knowledge)),
    heatmap: knowledge.cells.map((c) => (c === 'unknown' ? 1 : 0)),
    reason: 'Firing blind into the fog: every unexplored cell looks the same to me.',
  }),
};
