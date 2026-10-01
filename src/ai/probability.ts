import { BOARD_SIZE, CELL_COUNT, fromIndex, type Knowledge } from '../engine/index.ts';
import type { ShotDecision, Strategy } from './types.ts';

/** Weight for a placement that passes through N unresolved hits; strongly favors finishing wounded ships. */
const HIT_WEIGHT = 40;

/**
 * For every ship still afloat, enumerate every position it could legally occupy
 * given what we know, and count how many of those positions cover each cell.
 * While there are unresolved hits, only placements that pass through a hit count.
 */
export function probabilityMap(k: Knowledge): number[] {
  const scores = Array<number>(CELL_COUNT).fill(0);
  const hasOpenHits = k.cells.includes('hit');
  for (const ship of k.remaining) {
    for (const vertical of [false, true]) {
      const maxRow = vertical ? BOARD_SIZE - ship.length : BOARD_SIZE - 1;
      const maxCol = vertical ? BOARD_SIZE - 1 : BOARD_SIZE - ship.length;
      for (let row = 0; row <= maxRow; row++) {
        for (let col = 0; col <= maxCol; col++) {
          const cells: number[] = [];
          let hits = 0;
          let blocked = false;
          for (let i = 0; i < ship.length; i++) {
            const index = vertical ? (row + i) * BOARD_SIZE + col : row * BOARD_SIZE + col + i;
            const state = k.cells[index];
            if (state === 'miss' || state === 'sunk') {
              blocked = true;
              break;
            }
            if (state === 'hit') hits++;
            cells.push(index);
          }
          if (blocked || (hasOpenHits && hits === 0)) continue;
          const weight = hits ? HIT_WEIGHT ** hits : 1;
          for (const index of cells) if (k.cells[index] === 'unknown') scores[index]! += weight;
        }
      }
    }
  }
  return scores;
}

/** Highest-scoring unknown cell (random tie-break) plus the map that produced it. */
export function bestShot(k: Knowledge, next: () => number): ShotDecision {
  const heatmap = probabilityMap(k);
  let best = -1;
  let ties: number[] = [];
  heatmap.forEach((score, index) => {
    if (k.cells[index] !== 'unknown') return;
    if (score > best) {
      best = score;
      ties = [index];
    } else if (score === best) ties.push(index);
  });
  const index = ties[Math.floor(next() * ties.length)];
  if (index === undefined) throw new Error('No cells left to fire at');
  const wounded = k.cells.includes('hit');
  return {
    coord: fromIndex(index),
    heatmap,
    reason: wounded
      ? 'A wounded ship must extend through here: this cell has the most possible positions passing through the hit.'
      : `The remaining ships could be positioned through this cell in ${best} different ways, more than any other.`,
  };
}

export const probabilityStrategy: Strategy = {
  level: 'hard',
  chooseShot: (k, rng) => bestShot(k, rng.next),
};
