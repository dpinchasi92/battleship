import {
  fromIndex,
  inBounds,
  neighbors,
  toIndex,
  unknownCells,
  type Coord,
  type Knowledge,
} from '../engine/index.ts';
import type { Strategy } from './types.ts';

const isUnknown = (k: Knowledge, c: Coord) => inBounds(c) && k.cells[toIndex(c)] === 'unknown';
const isHit = (k: Knowledge, c: Coord) => inBounds(c) && k.cells[toIndex(c)] === 'hit';

/** Cells adjacent to unresolved hits, preferring cells that extend a line of two or more hits. */
export function targetCandidates(k: Knowledge): Coord[] {
  const hits = k.cells.flatMap((c, i) => (c === 'hit' ? [fromIndex(i)] : []));
  const lineEnds: Coord[] = [];
  for (const hit of hits) {
    for (const [dr, dc] of [
      [0, 1],
      [1, 0],
    ] as const) {
      const prev = { row: hit.row - dr, col: hit.col - dc };
      const next = { row: hit.row + dr, col: hit.col + dc };
      if (isHit(k, prev) || !isHit(k, next)) continue;
      let end = next;
      while (isHit(k, { row: end.row + dr, col: end.col + dc })) end = { row: end.row + dr, col: end.col + dc };
      const after = { row: end.row + dr, col: end.col + dc };
      if (isUnknown(k, prev)) lineEnds.push(prev);
      if (isUnknown(k, after)) lineEnds.push(after);
    }
  }
  if (lineEnds.length) return lineEnds;
  return hits.flatMap((h) => neighbors(h).filter((n) => isUnknown(k, n)));
}

export const huntTargetStrategy: Strategy = {
  level: 'medium',
  chooseShot: (k, rng) => {
    const targets = targetCandidates(k);
    const mapOf = (cells: Coord[]) => {
      const heatmap = Array<number>(k.cells.length).fill(0);
      for (const c of cells) heatmap[toIndex(c)]! += 1;
      return heatmap;
    };
    if (targets.length) {
      return { coord: rng.pick(targets), heatmap: mapOf(targets), reason: 'Closing in on a wounded ship.' };
    }
    const smallest = Math.min(...k.remaining.map((s) => s.length));
    const unknown = unknownCells(k);
    const parity = unknown.filter((c) => (c.row + c.col) % smallest === 0);
    const pool = parity.length ? parity : unknown;
    return {
      coord: rng.pick(pool),
      heatmap: mapOf(pool),
      reason: `Sweeping a checkerboard pattern: every ship of length ${smallest}+ must cross one of these cells.`,
    };
  },
};
