import type { Coord, Placement, Side } from '../engine/index.ts';
import { shipSpec } from '../engine/index.ts';

/** Half the gap-inclusive spacing between the two board centers along X. */
export const BOARD_OFFSET = 6.6;
export const GRID_Y = 0.1;

export const boardX = (side: Side) => (side === 'player' ? -BOARD_OFFSET : BOARD_OFFSET);

export function cellPosition(side: Side, { row, col }: Coord): [number, number, number] {
  return [boardX(side) + col - 4.5, 0, row - 4.5];
}

export function shipTransform(side: Side, p: Placement): { position: [number, number, number]; rotationY: number } {
  const { length } = shipSpec(p.type);
  const ox = boardX(side);
  return p.orientation === 'h'
    ? { position: [ox + p.col + length / 2 - 5, 0, p.row + 0.5 - 5], rotationY: 0 }
    : { position: [ox + p.col + 0.5 - 5, 0, p.row + length / 2 - 5], rotationY: -Math.PI / 2 };
}

/** Same wave function as the ocean shader (damped over the boards) so ships bob in sync. */
export function waveHeight(x: number, z: number, t: number): number {
  const h =
    Math.sin(x * 0.35 + t * 0.9) * 0.12 + Math.sin(z * 0.5 + t * 1.1) * 0.08 + Math.sin((x + z) * 0.8 + t * 1.7) * 0.04;
  return h * damping(x, z);
}

export function damping(x: number, z: number): number {
  const d = Math.min(
    Math.max(Math.abs(x + BOARD_OFFSET) - 5, Math.abs(z) - 5),
    Math.max(Math.abs(x - BOARD_OFFSET) - 5, Math.abs(z) - 5),
  );
  const s = Math.min(1, Math.max(0, d / 4));
  const smooth = s * s * (3 - 2 * s);
  return 0.25 + 0.75 * smooth;
}
