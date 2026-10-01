import type { Atmosphere } from '../app/atmosphere.ts';
import type { CellView, Ghost } from '../app/cells.ts';
import type { ShotEvent, Volley } from '../app/useBattle.ts';
import type { Coord, Placement, Side } from '../engine/index.ts';

export type ShipVisual = { placement: Placement; sunk: boolean; hits: number };

export type SceneProps = {
  mode: 'setup' | 'battle';
  playerViews: readonly CellView[];
  enemyViews: readonly CellView[] | null;
  playerShips: readonly ShipVisual[];
  enemyShips: readonly ShipVisual[];
  ghost: Ghost | null;
  ghostShip: Placement | null;
  heat: readonly number[] | null;
  aiTarget: Coord | null;
  hint: Coord | null;
  cursor: Coord | null;
  volley: Volley | null;
  lastShot: ShotEvent | null;
  focus: 'player' | 'enemy' | 'both';
  interactiveSide: Side | null;
  onHover: (side: Side, coord: Coord | null) => void;
  onCell: (side: Side, coord: Coord) => void;
  atmosphere: Atmosphere;
  onLightning?: () => void;
};
