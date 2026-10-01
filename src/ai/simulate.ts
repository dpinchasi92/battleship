import { createBoard, createRng, fireAt, isFleetSunk, knowledgeOf, randomFleet, toIndex } from '../engine/index.ts';
import type { Strategy } from './types.ts';

/** Plays `strategy` against a random fleet until every ship is sunk; returns shots taken. */
export function shotsToWin(strategy: Strategy, seed: number): number {
  const rng = createRng(seed);
  let board = createBoard(randomFleet(rng));
  let shots = 0;
  while (!isFleetSunk(board)) {
    const knowledge = knowledgeOf(board);
    const { coord } = strategy.chooseShot(knowledge, rng);
    if (knowledge.cells[toIndex(coord)] !== 'unknown') {
      throw new Error(`${strategy.level} fired at a known cell ${JSON.stringify(coord)} (seed ${seed})`);
    }
    board = fireAt(board, coord).board;
    shots++;
    if (shots > 100) throw new Error(`${strategy.level} exceeded 100 shots (seed ${seed})`);
  }
  return shots;
}
