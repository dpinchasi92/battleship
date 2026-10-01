import {
  CELL_COUNT,
  isShipSunk,
  placementError,
  shipAt,
  shipCells,
  toIndex,
  fromIndex,
  type Board,
  type Coord,
  type Placement,
  type ShipType,
} from '../engine/index.ts';

export type CellVisual = 'sea' | 'ship' | 'miss' | 'hit' | 'sunk';

export type CellView = { visual: CellVisual; ship?: ShipType };

/** Visual state for every cell. `reveal` shows unsunk ships (own board, or after the game). */
export function cellViews(board: Board, reveal: boolean): CellView[] {
  return Array.from({ length: CELL_COUNT }, (_, i) => {
    const coord = fromIndex(i);
    const ship = shipAt(board, coord);
    const fired = board.shots[i];
    if (!ship) return { visual: fired ? 'miss' : 'sea' };
    if (isShipSunk(board, ship)) return { visual: 'sunk', ship: ship.type };
    if (fired) return { visual: 'hit', ship: reveal ? ship.type : undefined };
    return reveal ? { visual: 'ship', ship: ship.type } : { visual: 'sea' };
  });
}

/** Cell views for the setup screen, where nothing has been fired yet. */
export function setupViews(placements: readonly Placement[]): CellView[] {
  const views: CellView[] = Array.from({ length: CELL_COUNT }, () => ({ visual: 'sea' }));
  for (const p of placements) for (const c of shipCells(p)) views[toIndex(c)] = { visual: 'ship', ship: p.type };
  return views;
}

export type Ghost = { cells: Coord[]; valid: boolean };

export function ghostFor(placements: readonly Placement[], placement: Placement | null): Ghost | null {
  if (!placement) return null;
  return {
    cells: shipCells(placement).filter((c) => c.row >= 0 && c.row < 10 && c.col >= 0 && c.col < 10),
    valid: placementError(placements, placement) === null,
  };
}

/** Normalizes a heatmap to 0..1, considering only cells that are still unknown. */
export function normalizeHeat(heat: readonly number[] | undefined, views: readonly CellView[]): number[] | null {
  if (!heat) return null;
  let max = 0;
  heat.forEach((h, i) => {
    if (views[i]?.visual === 'sea' || views[i]?.visual === 'ship') max = Math.max(max, h);
  });
  if (max <= 0) return null;
  return heat.map((h, i) => (views[i]?.visual === 'sea' || views[i]?.visual === 'ship' ? h / max : 0));
}
