import { BOARD_SIZE, type Coord } from './types.ts';

export const toIndex = ({ row, col }: Coord): number => row * BOARD_SIZE + col;

export const fromIndex = (index: number): Coord => ({
  row: Math.floor(index / BOARD_SIZE),
  col: index % BOARD_SIZE,
});

export const inBounds = ({ row, col }: Coord): boolean =>
  row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;

export const sameCoord = (a: Coord, b: Coord): boolean => a.row === b.row && a.col === b.col;

const ROW_LABELS = 'ABCDEFGHIJ';

/** Human-readable label, e.g. `{row: 2, col: 6}` -> "C7". */
export const coordLabel = ({ row, col }: Coord): string => `${ROW_LABELS[row]}${col + 1}`;

export const rowLabel = (row: number): string => ROW_LABELS[row] ?? '?';

export const neighbors = (coord: Coord): Coord[] =>
  [
    { row: coord.row - 1, col: coord.col },
    { row: coord.row + 1, col: coord.col },
    { row: coord.row, col: coord.col - 1 },
    { row: coord.row, col: coord.col + 1 },
  ].filter(inBounds);
