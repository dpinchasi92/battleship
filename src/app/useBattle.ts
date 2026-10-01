import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { strategyFor, type ShotDecision } from '../ai/index.ts';
import {
  applyFire,
  canFire,
  createRng,
  knowledgeOf,
  newGame,
  type Coord,
  type GameState,
  type NewGameOptions,
  type Rng,
  type ShotResult,
  type Side,
} from '../engine/index.ts';

export type Volley = { id: number; by: Side; coord: Coord; duration: number };
export type ShotEvent = { id: number; by: Side; coord: Coord; result: ShotResult };

type Options = {
  rng: Rng;
  flightMs: number;
  thinkMs: number;
  onLaunch?: (volley: Volley) => void;
  onImpact?: (event: ShotEvent, state: GameState) => void;
};

/**
 * Owns the game state and the timing of each turn: a shot is "launched"
 * (cannonball in flight) and only applied to the game state when it lands.
 */
export function useBattle({ rng, flightMs, thinkMs, onLaunch, onImpact }: Options) {
  const [state, setState] = useState<GameState | null>(null);
  const [volley, setVolley] = useState<Volley | null>(null);
  const [lastShot, setLastShot] = useState<ShotEvent | null>(null);
  const [aiDecision, setAiDecision] = useState<ShotDecision | null>(null);

  const stateRef = useRef<GameState | null>(null);
  const volleyRef = useRef<Volley | null>(null);
  const gameId = useRef(0);
  const nextId = useRef(1);
  const callbacks = useRef({ onLaunch, onImpact });
  useLayoutEffect(() => {
    callbacks.current = { onLaunch, onImpact };
  });
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  const later = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  }, []);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) clearTimeout(id);
    timers.current.clear();
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const launch = useCallback(
    (by: Side, coord: Coord, decision?: ShotDecision) => {
      const current = stateRef.current;
      if (!current || volleyRef.current || !canFire(current, { by, coord })) return false;
      const game = gameId.current;
      const v: Volley = { id: nextId.current++, by, coord, duration: flightMs };
      volleyRef.current = v;
      setVolley(v);
      callbacks.current.onLaunch?.(v);
      later(() => {
        if (game !== gameId.current) return;
        const before = stateRef.current;
        if (!before) return;
        const after = applyFire(before, { by, coord, heatmap: decision?.heatmap });
        const record = after.history[after.history.length - 1];
        stateRef.current = after;
        volleyRef.current = null;
        setState(after);
        setVolley(null);
        if (record && after !== before) {
          const event: ShotEvent = { id: v.id, by, coord, result: record.result };
          setLastShot(event);
          callbacks.current.onImpact?.(event, after);
        }
      }, flightMs);
      return true;
    },
    [flightMs, later],
  );

  const fire = useCallback((coord: Coord) => launch('player', coord), [launch]);

  const turn = state?.phase === 'battle' ? state.turn : null;
  const historyLength = state?.history.length ?? 0;
  useEffect(() => {
    if (turn !== 'ai' || volley) return;
    const current = stateRef.current;
    if (!current) return;
    const game = gameId.current;
    const pending = timers.current;
    const id = setTimeout(() => {
      pending.delete(id);
      if (game !== gameId.current) return;
      const decision = strategyFor(current.level).chooseShot(knowledgeOf(current.player), rng);
      setAiDecision(decision);
      launch('ai', decision.coord, decision);
    }, thinkMs);
    pending.add(id);
    return () => {
      clearTimeout(id);
      pending.delete(id);
    };
  }, [turn, historyLength, volley, thinkMs, rng, launch]);

  const start = useCallback(
    (options: NewGameOptions) => {
      clearTimers();
      gameId.current++;
      const game = newGame(options);
      stateRef.current = game;
      volleyRef.current = null;
      setState(game);
      setVolley(null);
      setLastShot(null);
      setAiDecision(null);
    },
    [clearTimers],
  );

  const reset = useCallback(() => {
    clearTimers();
    gameId.current++;
    stateRef.current = null;
    volleyRef.current = null;
    setState(null);
    setVolley(null);
    setLastShot(null);
    setAiDecision(null);
  }, [clearTimers]);

  const aiThinking = turn === 'ai' && !volley;

  return { state, volley, lastShot, aiDecision, aiThinking, fire, start, reset };
}

export const seededRng = (): Rng => {
  const seed = Number(new URLSearchParams(window.location.search).get('seed'));
  return createRng(Number.isFinite(seed) && seed > 0 ? seed : Math.floor(Math.random() * 2 ** 32));
};
