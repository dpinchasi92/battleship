export const BOARD_SIZE = 10;
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

export type Coord = { row: number; col: number };
export type Orientation = 'h' | 'v';

export type ShipType = 'manOWar' | 'galleon' | 'frigate' | 'brigantine' | 'sloop';

export type ShipSpec = { type: ShipType; name: string; length: number };

export const FLEET: readonly ShipSpec[] = [
  { type: 'manOWar', name: "Man-o'-War", length: 5 },
  { type: 'galleon', name: 'Galleon', length: 4 },
  { type: 'frigate', name: 'Frigate', length: 3 },
  { type: 'brigantine', name: 'Brigantine', length: 3 },
  { type: 'sloop', name: 'Sloop', length: 2 },
];

export type Placement = { type: ShipType; row: number; col: number; orientation: Orientation };

/** What is publicly known about a cell after shots have been fired at it. */
export type CellKnowledge = 'unknown' | 'miss' | 'hit' | 'sunk';

export type Board = {
  placements: readonly Placement[];
  /** Indexed by `toIndex(coord)`; true when that cell has been fired upon. */
  shots: readonly boolean[];
};

export type ShotResult =
  | { kind: 'miss' }
  | { kind: 'hit'; ship: ShipType }
  | { kind: 'sunk'; ship: ShipType };

/**
 * Everything an opponent is allowed to know about a board: the result of every
 * shot fired and the lengths of the ships still afloat. Positions of unsunk
 * ships are never included.
 */
export type Knowledge = {
  cells: readonly CellKnowledge[];
  remaining: readonly ShipSpec[];
};
