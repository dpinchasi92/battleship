import { createBoard, fireAt, hasBeenFiredAt, isFleetSunk } from './board.ts';
import { inBounds } from './coords.ts';
import type { Board, Coord, Placement, ShotResult } from './types.ts';

export type Level = 'cadet' | 'easy' | 'medium' | 'hard';
export type Side = 'player' | 'ai';

export const opponent = (side: Side): Side => (side === 'player' ? 'ai' : 'player');

export type TurnRecord = {
  by: Side;
  coord: Coord;
  result: ShotResult;
  /** AI-only: the probability map the AI used to choose this shot, for replay/"AI brain". */
  heatmap?: readonly number[];
};

export type GameState = {
  level: Level;
  phase: 'battle' | 'over';
  /** The player's own fleet (the AI fires at this). */
  player: Board;
  /** The AI's fleet (the player fires at this). */
  enemy: Board;
  turn: Side;
  winner: Side | null;
  history: readonly TurnRecord[];
};

export type NewGameOptions = {
  level: Level;
  playerPlacements: readonly Placement[];
  enemyPlacements: readonly Placement[];
  first: Side;
};

export function newGame({ level, playerPlacements, enemyPlacements, first }: NewGameOptions): GameState {
  return {
    level,
    phase: 'battle',
    player: createBoard(playerPlacements),
    enemy: createBoard(enemyPlacements),
    turn: first,
    winner: null,
    history: [],
  };
}

export type FireAction = { by: Side; coord: Coord; heatmap?: readonly number[] };

/** The board that `side` fires upon. */
export const targetBoard = (state: GameState, side: Side): Board => (side === 'player' ? state.enemy : state.player);

export function canFire(state: GameState, { by, coord }: FireAction): boolean {
  return (
    state.phase === 'battle' &&
    state.turn === by &&
    inBounds(coord) &&
    !hasBeenFiredAt(targetBoard(state, by), coord)
  );
}

/** Applies a shot. Invalid shots (wrong turn, game over, repeat cell) leave the state untouched. */
export function applyFire(state: GameState, action: FireAction): GameState {
  if (!canFire(state, action)) return state;
  const { board, result } = fireAt(targetBoard(state, action.by), action.coord);
  const record: TurnRecord = { by: action.by, coord: action.coord, result };
  if (action.heatmap) record.heatmap = action.heatmap;
  const won = isFleetSunk(board);
  return {
    ...state,
    player: action.by === 'ai' ? board : state.player,
    enemy: action.by === 'player' ? board : state.enemy,
    history: [...state.history, record],
    phase: won ? 'over' : 'battle',
    winner: won ? action.by : null,
    turn: won ? state.turn : opponent(action.by),
  };
}

export type SideStats = { shots: number; hits: number; sunk: number; accuracy: number };

export function statsFor(history: readonly TurnRecord[], side: Side): SideStats {
  const mine = history.filter((t) => t.by === side);
  const hits = mine.filter((t) => t.result.kind !== 'miss').length;
  const sunk = mine.filter((t) => t.result.kind === 'sunk').length;
  return { shots: mine.length, hits, sunk, accuracy: mine.length ? hits / mine.length : 0 };
}
