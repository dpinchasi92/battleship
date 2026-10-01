import { describe, expect, it } from 'vitest';
import { shipCells } from './board.ts';
import { applyFire, newGame, statsFor } from './game.ts';
import type { Placement } from './types.ts';

const fleet: Placement[] = [
  { type: 'manOWar', row: 0, col: 0, orientation: 'h' },
  { type: 'galleon', row: 2, col: 0, orientation: 'h' },
  { type: 'frigate', row: 4, col: 0, orientation: 'h' },
  { type: 'brigantine', row: 6, col: 0, orientation: 'h' },
  { type: 'sloop', row: 8, col: 0, orientation: 'v' },
];

const start = () => newGame({ level: 'easy', playerPlacements: fleet, enemyPlacements: fleet, first: 'player' });

describe('game state machine', () => {
  it('alternates turns after every shot, hit or miss', () => {
    let s = start();
    s = applyFire(s, { by: 'player', coord: { row: 0, col: 0 } });
    expect(s.turn).toBe('ai');
    s = applyFire(s, { by: 'ai', coord: { row: 9, col: 9 } });
    expect(s.turn).toBe('player');
  });

  it('ignores out-of-turn, repeated and out-of-bounds shots', () => {
    const s = start();
    expect(applyFire(s, { by: 'ai', coord: { row: 0, col: 0 } })).toBe(s);
    const s2 = applyFire(s, { by: 'player', coord: { row: 0, col: 0 } });
    const s3 = applyFire(s2, { by: 'ai', coord: { row: 0, col: 0 } });
    expect(applyFire(s3, { by: 'player', coord: { row: 0, col: 0 } })).toBe(s3);
    expect(applyFire(s3, { by: 'player', coord: { row: 0, col: 10 } })).toBe(s3);
  });

  it('ends the game when a fleet is sunk and rejects further shots', () => {
    let s = start();
    const targets = fleet.flatMap(shipCells);
    const misses = [...Array(100).keys()]
      .map((i) => ({ row: Math.floor(i / 10), col: i % 10 }))
      .filter((c) => !targets.some((t) => t.row === c.row && t.col === c.col));
    targets.forEach((coord, i) => {
      s = applyFire(s, { by: 'player', coord });
      if (s.phase === 'battle') s = applyFire(s, { by: 'ai', coord: misses[i]! });
    });
    expect(s.phase).toBe('over');
    expect(s.winner).toBe('player');
    expect(applyFire(s, { by: 'ai', coord: { row: 9, col: 9 } })).toBe(s);
    expect(statsFor(s.history, 'player')).toMatchObject({ shots: 17, hits: 17, sunk: 5, accuracy: 1 });
    expect(statsFor(s.history, 'ai').hits).toBe(0);
  });
});
