import { fromIndex, inBounds, toIndex } from './coords.ts';
import type { Rng } from './rng.ts';
import {
  BOARD_SIZE,
  CELL_COUNT,
  FLEET,
  type Board,
  type CellKnowledge,
  type Coord,
  type Knowledge,
  type Orientation,
  type Placement,
  type ShipSpec,
  type ShipType,
  type ShotResult,
} from './types.ts';

export const shipSpec = (type: ShipType): ShipSpec => {
  const spec = FLEET.find((s) => s.type === type);
  if (!spec) throw new Error(`Unknown ship type: ${type}`);
  return spec;
};

export function shipCells(placement: Placement): Coord[] {
  const { length } = shipSpec(placement.type);
  return Array.from({ length }, (_, i) =>
    placement.orientation === 'h'
      ? { row: placement.row, col: placement.col + i }
      : { row: placement.row + i, col: placement.col },
  );
}

export type PlacementError = 'out-of-bounds' | 'overlap' | null;

/** Checks `placement` against the other ships already in `placements` (ignoring one of the same type). */
export function placementError(placements: readonly Placement[], placement: Placement): PlacementError {
  const cells = shipCells(placement);
  if (!cells.every(inBounds)) return 'out-of-bounds';
  const occupied = new Set(
    placements.filter((p) => p.type !== placement.type).flatMap((p) => shipCells(p).map(toIndex)),
  );
  if (cells.some((c) => occupied.has(toIndex(c)))) return 'overlap';
  return null;
}

/** Adds or moves a ship. Returns null if the placement is invalid. */
export function placeShip(placements: readonly Placement[], placement: Placement): Placement[] | null {
  if (placementError(placements, placement)) return null;
  return [...placements.filter((p) => p.type !== placement.type), placement];
}

export function isFleetComplete(placements: readonly Placement[]): boolean {
  if (placements.length !== FLEET.length) return false;
  if (!FLEET.every((spec) => placements.some((p) => p.type === spec.type))) return false;
  return placements.every((p) => placementError(placements, p) === null);
}

export function randomFleet(rng: Rng): Placement[] {
  let placements: Placement[] = [];
  for (const spec of FLEET) {
    for (;;) {
      const orientation: Orientation = rng.next() < 0.5 ? 'h' : 'v';
      const maxRow = orientation === 'v' ? BOARD_SIZE - spec.length : BOARD_SIZE - 1;
      const maxCol = orientation === 'h' ? BOARD_SIZE - spec.length : BOARD_SIZE - 1;
      const candidate: Placement = {
        type: spec.type,
        orientation,
        row: rng.int(maxRow + 1),
        col: rng.int(maxCol + 1),
      };
      const next = placeShip(placements, candidate);
      if (next) {
        placements = next;
        break;
      }
    }
  }
  return placements;
}

export function createBoard(placements: readonly Placement[]): Board {
  if (!isFleetComplete(placements)) throw new Error('Fleet is incomplete or invalid');
  return { placements: [...placements], shots: Array<boolean>(CELL_COUNT).fill(false) };
}

export function shipAt(board: Board, coord: Coord): Placement | undefined {
  const index = toIndex(coord);
  return board.placements.find((p) => shipCells(p).some((c) => toIndex(c) === index));
}

export const isShipSunk = (board: Board, placement: Placement): boolean =>
  shipCells(placement).every((c) => board.shots[toIndex(c)]);

export const isFleetSunk = (board: Board): boolean => board.placements.every((p) => isShipSunk(board, p));

export const hasBeenFiredAt = (board: Board, coord: Coord): boolean => board.shots[toIndex(coord)] === true;

export type FireOutcome = { board: Board; result: ShotResult };

/** Fires at `coord`. Throws on out-of-bounds or repeated shots: callers must validate first. */
export function fireAt(board: Board, coord: Coord): FireOutcome {
  if (!inBounds(coord)) throw new Error(`Shot out of bounds: ${JSON.stringify(coord)}`);
  if (hasBeenFiredAt(board, coord)) throw new Error(`Cell already fired upon: ${JSON.stringify(coord)}`);
  const shots = [...board.shots];
  shots[toIndex(coord)] = true;
  const next: Board = { ...board, shots };
  const ship = shipAt(next, coord);
  if (!ship) return { board: next, result: { kind: 'miss' } };
  return {
    board: next,
    result: isShipSunk(next, ship) ? { kind: 'sunk', ship: ship.type } : { kind: 'hit', ship: ship.type },
  };
}

/** The opponent's view of a board. Sunk ships are revealed; afloat ships are not. */
export function knowledgeOf(board: Board): Knowledge {
  const cells: CellKnowledge[] = board.shots.map((shot) => (shot ? 'miss' : 'unknown'));
  const remaining: ShipSpec[] = [];
  for (const placement of board.placements) {
    const sunk = isShipSunk(board, placement);
    if (!sunk) remaining.push(shipSpec(placement.type));
    for (const c of shipCells(placement)) {
      const i = toIndex(c);
      if (board.shots[i]) cells[i] = sunk ? 'sunk' : 'hit';
    }
  }
  return { cells, remaining };
}

export const unknownCells = (knowledge: Knowledge): Coord[] =>
  knowledge.cells.flatMap((c, i) => (c === 'unknown' ? [fromIndex(i)] : []));
