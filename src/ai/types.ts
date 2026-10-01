import type { Coord, Knowledge, Level, Rng } from '../engine/index.ts';

export type ShotDecision = {
  coord: Coord;
  /** Optional per-cell score (length 100) explaining the choice; higher = more likely a ship. */
  heatmap?: number[];
  /** Short plain-language reason, used by the "AI brain" panel and Cadet hints. */
  reason: string;
};

/**
 * An AI only ever receives `Knowledge` (shot results + remaining ship sizes),
 * never the opponent's board, so it cannot cheat.
 */
export type Strategy = {
  level: Level;
  chooseShot: (knowledge: Knowledge, rng: Rng) => ShotDecision;
};
