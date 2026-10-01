import { describe, expect, it } from 'vitest';
import {
  createBoard,
  fireAt,
  isFleetComplete,
  isFleetSunk,
  knowledgeOf,
  placeShip,
  placementError,
  randomFleet,
  shipCells,
} from './board.ts';
import { coordLabel, fromIndex, toIndex } from './coords.ts';
import { createRng } from './rng.ts';
import { FLEET, type Placement } from './types.ts';

const fixedFleet: Placement[] = [
  { type: 'manOWar', row: 0, col: 0, orientation: 'h' },
  { type: 'galleon', row: 2, col: 0, orientation: 'h' },
  { type: 'frigate', row: 4, col: 0, orientation: 'h' },
  { type: 'brigantine', row: 6, col: 0, orientation: 'h' },
  { type: 'sloop', row: 8, col: 0, orientation: 'v' },
];

describe('coords', () => {
  it('round-trips indices and labels cells like the physical game', () => {
    for (let i = 0; i < 100; i++) expect(toIndex(fromIndex(i))).toBe(i);
    expect(coordLabel({ row: 0, col: 0 })).toBe('A1');
    expect(coordLabel({ row: 9, col: 9 })).toBe('J10');
  });
});

describe('placement', () => {
  it('computes ship cells in both orientations', () => {
    expect(shipCells({ type: 'sloop', row: 3, col: 4, orientation: 'h' })).toEqual([
      { row: 3, col: 4 },
      { row: 3, col: 5 },
    ]);
    expect(shipCells({ type: 'sloop', row: 3, col: 4, orientation: 'v' })).toEqual([
      { row: 3, col: 4 },
      { row: 4, col: 4 },
    ]);
  });

  it('rejects ships hanging off the edge, including the last row/column', () => {
    expect(placementError([], { type: 'manOWar', row: 0, col: 6, orientation: 'h' })).toBe('out-of-bounds');
    expect(placementError([], { type: 'manOWar', row: 0, col: 5, orientation: 'h' })).toBeNull();
    expect(placementError([], { type: 'manOWar', row: 6, col: 9, orientation: 'v' })).toBe('out-of-bounds');
    expect(placementError([], { type: 'sloop', row: -1, col: 0, orientation: 'v' })).toBe('out-of-bounds');
  });

  it('rejects overlap but allows moving a ship onto its own old position', () => {
    const fleet = [fixedFleet[0]!];
    expect(placementError(fleet, { type: 'sloop', row: 0, col: 4, orientation: 'v' })).toBe('overlap');
    expect(placeShip(fleet, { type: 'manOWar', row: 0, col: 1, orientation: 'h' })).toEqual([
      { type: 'manOWar', row: 0, col: 1, orientation: 'h' },
    ]);
  });

  it('only accepts a complete fleet of exactly one of each ship', () => {
    expect(isFleetComplete(fixedFleet)).toBe(true);
    expect(isFleetComplete(fixedFleet.slice(1))).toBe(false);
    expect(isFleetComplete([...fixedFleet.slice(1), { ...fixedFleet[1]!, row: 9 }])).toBe(false);
  });

  it('generates valid random fleets deterministically from a seed', () => {
    for (let seed = 0; seed < 500; seed++) {
      const fleet = randomFleet(createRng(seed));
      expect(isFleetComplete(fleet)).toBe(true);
    }
    expect(randomFleet(createRng(42))).toEqual(randomFleet(createRng(42)));
  });
});

describe('firing', () => {
  it('reports miss, hit and sunk, and detects a sunk fleet', () => {
    let board = createBoard(fixedFleet);
    let outcome = fireAt(board, { row: 1, col: 1 });
    expect(outcome.result).toEqual({ kind: 'miss' });
    board = outcome.board;
    outcome = fireAt(board, { row: 8, col: 0 });
    expect(outcome.result).toEqual({ kind: 'hit', ship: 'sloop' });
    board = outcome.board;
    outcome = fireAt(board, { row: 9, col: 0 });
    expect(outcome.result).toEqual({ kind: 'sunk', ship: 'sloop' });
    board = outcome.board;
    expect(isFleetSunk(board)).toBe(false);
    for (const p of fixedFleet.filter((p) => p.type !== 'sloop')) {
      for (const c of shipCells(p)) board = fireAt(board, c).board;
    }
    expect(isFleetSunk(board)).toBe(true);
  });

  it('never mutates the original board', () => {
    const board = createBoard(fixedFleet);
    fireAt(board, { row: 0, col: 0 });
    expect(board.shots.every((s) => !s)).toBe(true);
  });

  it('refuses repeated and out-of-bounds shots', () => {
    const board = fireAt(createBoard(fixedFleet), { row: 5, col: 5 }).board;
    expect(() => fireAt(board, { row: 5, col: 5 })).toThrow();
    expect(() => fireAt(board, { row: 10, col: 0 })).toThrow();
  });
});

describe('knowledge (what the opponent may see)', () => {
  it('hides afloat ships, shows hits, and reveals sunk ships', () => {
    let board = createBoard(fixedFleet);
    board = fireAt(board, { row: 0, col: 0 }).board;
    board = fireAt(board, { row: 8, col: 0 }).board;
    board = fireAt(board, { row: 9, col: 0 }).board;
    board = fireAt(board, { row: 9, col: 9 }).board;
    const k = knowledgeOf(board);
    expect(k.cells[toIndex({ row: 0, col: 0 })]).toBe('hit');
    expect(k.cells[toIndex({ row: 0, col: 1 })]).toBe('unknown');
    expect(k.cells[toIndex({ row: 8, col: 0 })]).toBe('sunk');
    expect(k.cells[toIndex({ row: 9, col: 9 })]).toBe('miss');
    expect(k.remaining.map((s) => s.type)).toEqual(FLEET.filter((s) => s.type !== 'sloop').map((s) => s.type));
    expect(JSON.stringify(k)).not.toContain('row');
  });
});
