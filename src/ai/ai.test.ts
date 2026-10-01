import { describe, expect, it } from 'vitest';
import { createBoard, createRng, fireAt, knowledgeOf, toIndex, type Placement } from '../engine/index.ts';
import { huntTargetStrategy, probabilityStrategy, randomStrategy } from './index.ts';
import { probabilityMap } from './probability.ts';
import { targetCandidates } from './huntTarget.ts';
import { shotsToWin } from './simulate.ts';

const fleet: Placement[] = [
  { type: 'manOWar', row: 0, col: 0, orientation: 'h' },
  { type: 'galleon', row: 2, col: 0, orientation: 'h' },
  { type: 'frigate', row: 4, col: 4, orientation: 'h' },
  { type: 'brigantine', row: 6, col: 0, orientation: 'h' },
  { type: 'sloop', row: 8, col: 0, orientation: 'v' },
];

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe.each([randomStrategy, huntTargetStrategy, probabilityStrategy])('$level strategy', (strategy) => {
  it('always finishes within 100 shots and never repeats a cell', () => {
    for (let seed = 0; seed < 60; seed++) {
      const shots = shotsToWin(strategy, seed);
      expect(shots).toBeGreaterThanOrEqual(17);
      expect(shots).toBeLessThanOrEqual(100);
    }
  });
});

describe('strategy strength', () => {
  it('ranks hard < medium < easy by average shots to win', () => {
    const seeds = [...Array(150).keys()];
    const easy = mean(seeds.map((s) => shotsToWin(randomStrategy, s)));
    const medium = mean(seeds.map((s) => shotsToWin(huntTargetStrategy, s)));
    const hard = mean(seeds.map((s) => shotsToWin(probabilityStrategy, s)));
    expect(medium).toBeLessThan(easy);
    expect(hard).toBeLessThan(medium);
    expect(hard).toBeLessThan(55);
  });
});

describe('hunt/target', () => {
  it('follows a line of hits instead of probing sideways', () => {
    let board = createBoard(fleet);
    board = fireAt(board, { row: 4, col: 5 }).board;
    board = fireAt(board, { row: 4, col: 6 }).board;
    const candidates = targetCandidates(knowledgeOf(board));
    expect(candidates).toEqual(expect.arrayContaining([{ row: 4, col: 4 }, { row: 4, col: 7 }]));
    expect(candidates).toHaveLength(2);
  });
});

describe('probability map', () => {
  it('peaks in the center of an empty board', () => {
    const k = knowledgeOf(createBoard(fleet));
    const map = probabilityMap(k);
    expect(map[toIndex({ row: 4, col: 4 })]!).toBeGreaterThan(map[toIndex({ row: 0, col: 0 })]!);
  });

  it('targets next to an unresolved hit', () => {
    const board = fireAt(createBoard(fleet), { row: 4, col: 5 }).board;
    const { coord } = probabilityStrategy.chooseShot(knowledgeOf(board), createRng(1));
    expect(Math.abs(coord.row - 4) + Math.abs(coord.col - 5)).toBe(1);
  });

  it('never scores cells that are already known', () => {
    let board = createBoard(fleet);
    for (const c of [{ row: 0, col: 0 }, { row: 5, col: 5 }, { row: 8, col: 0 }, { row: 9, col: 0 }]) {
      board = fireAt(board, c).board;
    }
    const k = knowledgeOf(board);
    probabilityMap(k).forEach((score, i) => {
      if (k.cells[i] !== 'unknown') expect(score).toBe(0);
    });
  });
});
