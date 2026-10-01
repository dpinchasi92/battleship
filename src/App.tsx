import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { bestShot } from './ai/index.ts';
import { cellViews, ghostFor, normalizeHeat, setupViews } from './app/cells.ts';
import { loadRecord, saveRecord } from './app/record.ts';
import { levelTitle, loadSettings, saveSettings, type Settings } from './app/settings.ts';
import { turnText } from './app/text.ts';
import { nextStepIndex, TUTORIAL, type TutorialContext } from './app/tutorial.ts';
import { seededRng, useBattle, type ShotEvent } from './app/useBattle.ts';
import { supportsWebGL } from './app/webgl.ts';
import { sfx } from './audio/sfx.ts';
import {
  BOARD_SIZE,
  FLEET,
  isFleetComplete,
  isShipSunk,
  knowledgeOf,
  placeShip,
  randomFleet,

  shipCells,
  statsFor,
  toIndex,
  type Board,
  type Coord,
  type GameState,
  type Orientation,
  type Placement,
  type ShipType,
  type Side,
} from './engine/index.ts';
import type { ShipVisual } from './scene/types.ts';
import { Board2D } from './ui/Board2D.tsx';
import { Coach } from './ui/Coach.tsx';
import { FleetStatus } from './ui/FleetStatus.tsx';
import { GameOver } from './ui/GameOver.tsx';
import { Logbook } from './ui/Logbook.tsx';
import { Menu } from './ui/Menu.tsx';
import { SetupPanel } from './ui/SetupPanel.tsx';
import { Toggle } from './ui/Toggle.tsx';

const Scene3D = lazy(() => import('./scene/Scene3D.tsx'));

type Screen = 'menu' | 'setup' | 'battle';

const shipVisuals = (board: Board, filter: (sunk: boolean) => boolean): ShipVisual[] =>
  board.placements
    .map((placement) => ({
      placement,
      sunk: isShipSunk(board, placement),
      hits: shipCells(placement).filter((c) => board.shots[toIndex(c)]).length,
    }))
    .filter((s) => filter(s.sunk));

export default function App() {
  const webgl = useMemo(() => supportsWebGL(), []);
  const [settings, setSettingsState] = useState<Settings>(() => {
    const s = loadSettings();
    return webgl ? s : { ...s, view: '2d' };
  });
  const setSettings = useCallback((s: Settings) => {
    setSettingsState(s);
    saveSettings(s);
    sfx.setEnabled(s.sound);
  }, []);
  const view = webgl ? settings.view : '2d';
  const rng = useMemo(() => seededRng(), []);
  const [record, setRecord] = useState(loadRecord);
  const [screen, setScreen] = useState<Screen>('menu');

  // Setup
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<ShipType | null>('manOWar');
  const [orientation, setOrientation] = useState<Orientation>('h');
  const [hover, setHover] = useState<Coord | null>(null);

  // Battle
  const [cursor, setCursor] = useState<Coord | null>(null);
  const [hint, setHint] = useState<{ coord: Coord; reason: string } | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [tutorialIndex, setTutorialIndex] = useState(0);
  const [tutorialOn, setTutorialOn] = useState(false);

  useEffect(() => {
    sfx.setEnabled(settings.sound);
  }, [settings.sound]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen]);

  const onImpact = useCallback(
    (event: ShotEvent, state: GameState) => {
      if (event.result.kind === 'miss') sfx.splash();
      else if (event.result.kind === 'hit') sfx.explosion();
      else sfx.sink();
      setAnnouncement(turnText(event));
      if (event.by === 'player') setHint(null);
      if (state.phase === 'over') {
        const won = state.winner === 'player';
        setTimeout(() => sfx.fanfare(won), 600);
        setRecord((r) => {
          const prev = r[state.level];
          const next = {
            ...r,
            [state.level]: { wins: prev.wins + (won ? 1 : 0), losses: prev.losses + (won ? 0 : 1) },
          };
          saveRecord(next);
          return next;
        });
      }
    },
    [],
  );

  const battle = useBattle({
    rng,
    flightMs: view === '3d' ? 900 : 350,
    thinkMs: settings.level === 'cadet' ? 1100 : 650,
    onLaunch: () => sfx.cannon(),
    onImpact,
  });
  const game = battle.state;

  // ---- Setup actions
  const pendingPlacement: Placement | null =
    screen === 'setup' && selected && hover ? { type: selected, orientation, row: hover.row, col: hover.col } : null;

  const selectNextUnplaced = (next: Placement[]) => {
    const remaining = FLEET.find((s) => !next.some((p) => p.type === s.type));
    setSelected(remaining?.type ?? null);
  };

  const onSetupCell = (coord: Coord) => {
    if (selected) {
      const next = placeShip(placements, { type: selected, orientation, row: coord.row, col: coord.col });
      if (!next) return;
      sfx.click();
      setPlacements(next);
      selectNextUnplaced(next);
      return;
    }
    const existing = placements.find((p) => shipCells(p).some((c) => c.row === coord.row && c.col === coord.col));
    if (existing) {
      setPlacements(placements.filter((p) => p !== existing));
      setSelected(existing.type);
      setOrientation(existing.orientation);
    }
  };

  const onSetupPick = (type: ShipType) => {
    const existing = placements.find((p) => p.type === type);
    if (existing) {
      setPlacements(placements.filter((p) => p.type !== type));
      setOrientation(existing.orientation);
    }
    setSelected(type);
  };

  const rotate = useCallback(() => setOrientation((o) => (o === 'h' ? 'v' : 'h')), []);

  const goSetup = () => {
    battle.reset();
    setScreen('setup');
    setReviewing(false);
    setHint(null);
    if (placements.length === 0) setSelected('manOWar');
    if (settings.level === 'cadet') {
      setTutorialOn(true);
      setTutorialIndex(0);
    } else setTutorialOn(false);
  };

  const startBattle = () => {
    if (!isFleetComplete(placements)) return;
    const first: Side = settings.first === 'coin' ? (rng.next() < 0.5 ? 'player' : 'ai') : settings.first;
    battle.start({
      level: settings.level,
      playerPlacements: placements,
      enemyPlacements: randomFleet(rng),
      first,
    });
    setCursor({ row: 4, col: 4 });
    setScreen('battle');
    setAnnouncement(first === 'player' ? 'You have the first broadside.' : 'The enemy fires first!');
    if (settings.sound) sfx.startAmbience();
  };

  const toMenu = () => {
    battle.reset();
    sfx.stopAmbience();
    setScreen('menu');
    setTutorialOn(false);
  };

  // ---- Battle actions
  const fireAt = useCallback(
    (coord: Coord) => {
      if (!game || game.phase !== 'battle' || game.turn !== 'player') return;
      battle.fire(coord);
    },
    [battle, game],
  );

  const requestHint = useCallback(() => {
    if (!game || game.phase !== 'battle') return;
    const decision = bestShot(knowledgeOf(game.enemy), rng.next);
    setHint({ coord: decision.coord, reason: decision.reason });
    setCursor(decision.coord);
  }, [game, rng]);

  // ---- Keyboard: R rotates in setup; arrows + Enter aim and fire in the 3D view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [role="grid"]')) return;
      if (screen === 'setup' && (e.key === 'r' || e.key === 'R')) {
        rotate();
        return;
      }
      if (screen !== 'battle' || view !== '3d' || target?.closest('button')) return;
      const moves: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const move = moves[e.key];
      if (move) {
        e.preventDefault();
        setCursor((c) => {
          const base = c ?? { row: 4, col: 4 };
          return {
            row: Math.min(BOARD_SIZE - 1, Math.max(0, base.row + move[0])),
            col: Math.min(BOARD_SIZE - 1, Math.max(0, base.col + move[1])),
          };
        });
      } else if ((e.key === 'Enter' || e.key === ' ') && cursor) {
        e.preventDefault();
        fireAt(cursor);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, view, cursor, fireAt, rotate]);

  // ---- Tutorial
  const tutorialCtx: TutorialContext = useMemo(() => {
    const you = game ? statsFor(game.history, 'player') : { shots: 0, hits: 0, sunk: 0 };
    const lastPlayer = game ? [...game.history].reverse().find((t) => t.by === 'player') : undefined;
    return {
      screen: screen === 'battle' ? 'battle' : 'setup',
      placed: placements.length,
      ready: isFleetComplete(placements),
      playerShots: you.shots,
      playerHits: you.hits,
      playerSunk: you.sunk,
      aiShots: game ? statsFor(game.history, 'ai').shots : 0,
      lastPlayerResult: lastPlayer?.result ?? null,
      over: game?.phase === 'over',
    };
  }, [game, placements, screen]);
  const tutorialStep = tutorialOn ? nextStepIndex(tutorialIndex, tutorialCtx) : TUTORIAL.length;
  const coachVisible = tutorialOn && tutorialStep < TUTORIAL.length && screen !== 'menu' && game?.phase !== 'over';

  // ---- Derived views
  const playerViews = useMemo(
    () => (game ? cellViews(game.player, true) : setupViews(placements)),
    [game, placements],
  );
  const enemyViews = useMemo(() => (game ? cellViews(game.enemy, game.phase === 'over') : null), [game]);
  const lastAiHeat = game ? [...game.history].reverse().find((t) => t.by === 'ai')?.heatmap : undefined;
  const heat = settings.showBrain && game ? normalizeHeat(battle.aiDecision?.heatmap ?? lastAiHeat, playerViews) : null;
  const ghost = ghostFor(placements, pendingPlacement);
  const yourTurn = game?.phase === 'battle' && game.turn === 'player' && !battle.volley;
  const showHintButton = !!game && game.phase === 'battle' && (settings.level === 'cadet' || settings.level === 'easy');

  const statusText = !game
    ? ''
    : game.phase === 'over'
      ? game.winner === 'player'
        ? 'Victory!'
        : 'Defeat'
      : battle.volley
        ? battle.volley.by === 'player'
          ? 'Cannonball away…'
          : 'Incoming fire!'
        : game.turn === 'player'
          ? 'Your turn: choose a target'
          : 'The enemy is taking aim…';

  // ---- Rendering
  if (screen === 'menu') {
    return (
      <div className="app app-menu">
        <Menu settings={settings} onChange={setSettings} onStart={goSetup} record={record} />
        {!webgl && <p className="webgl-note">3D is unavailable on this device; using the 2D chart table.</p>}
      </div>
    );
  }

  const sceneProps =
    view === '3d'
      ? {
          mode: screen === 'battle' ? ('battle' as const) : ('setup' as const),
          playerViews,
          enemyViews,
          playerShips: game
            ? shipVisuals(game.player, () => true)
            : placements.map((placement) => ({ placement, sunk: false, hits: 0 })),
          enemyShips: game ? shipVisuals(game.enemy, (sunk) => sunk || game.phase === 'over') : [],
          ghost,
          ghostShip: ghost ? pendingPlacement : null,
          heat,
          aiTarget: game && battle.volley?.by === 'ai' ? battle.volley.coord : null,
          hint: hint?.coord ?? null,
          cursor: yourTurn ? cursor : null,
          volley: battle.volley,
          lastShot: battle.lastShot,
          focus:
            screen === 'setup'
              ? ('player' as const)
              : game?.phase === 'over'
                ? ('both' as const)
                : battle.volley?.by === 'ai' || (game?.turn === 'ai' && !battle.volley)
                  ? ('player' as const)
                  : ('enemy' as const),
          interactiveSide: screen === 'setup' ? ('player' as const) : yourTurn ? ('ai' as const) : null,
          onHover: (side: Side, coord: Coord | null) => {
            if (screen === 'setup' && side === 'player') setHover(coord);
            if (screen === 'battle' && side === 'ai' && coord) setCursor(coord);
          },
          onCell: (side: Side, coord: Coord) => {
            if (screen === 'setup' && side === 'player') onSetupCell(coord);
            if (screen === 'battle' && side === 'ai') fireAt(coord);
          },
        }
      : null;

  const topBar = (
    <header className="topbar">
      <button type="button" className="btn btn-ghost" onClick={toMenu}>
        ☰ Menu
      </button>
      <div className="topbar-title">
        <span className="brand">Broadsides</span>
        <span className="muted">vs {levelTitle(settings.level)}</span>
      </div>
      <div className="topbar-controls">
        {screen === 'battle' && (
          <Toggle
            compact
            label="AI Brain"
            checked={settings.showBrain}
            onChange={(showBrain) => setSettings({ ...settings, showBrain })}
          />
        )}
        {webgl && (
          <Toggle
            compact
            label="3D"
            checked={view === '3d'}
            onChange={(on) => setSettings({ ...settings, view: on ? '3d' : '2d' })}
          />
        )}
        <Toggle
          compact
          label="Sound"
          checked={settings.sound}
          onChange={(sound) => {
            setSettings({ ...settings, sound });
            if (sound && screen === 'battle') sfx.startAmbience();
          }}
        />
      </div>
    </header>
  );

  const setupPanel = (
    <SetupPanel
      placements={placements}
      selected={selected}
      orientation={orientation}
      onSelect={onSetupPick}
      onRotate={rotate}
      onRandomize={() => {
        const fleet = randomFleet(rng);
        setPlacements(fleet);
        setSelected(null);
      }}
      onClear={() => {
        setPlacements([]);
        setSelected('manOWar');
      }}
      onStart={startBattle}
      onBack={toMenu}
      ready={isFleetComplete(placements)}
    />
  );

  const coach = coachVisible ? (
    <Coach
      inline={view === '2d'}
      index={tutorialStep}
      ctx={tutorialCtx}
      hintReason={hint?.reason ?? null}
      onNext={() => setTutorialIndex(tutorialStep + 1)}
      onSkip={() => setTutorialOn(false)}
      onHint={yourTurn ? requestHint : null}
    />
  ) : null;

  const battleSide = game && (
    <div className="battle-side">
      <div className={`parchment status ${yourTurn ? 'status-yours' : ''}`} data-testid="status">
        <span className="status-text">{statusText}</span>
        {showHintButton && !coachVisible && (
          <button type="button" className="btn btn-small" onClick={requestHint} disabled={!yourTurn}>
            Hint
          </button>
        )}
      </div>
      {hint && !coachVisible && <div className="parchment hint-box">Hint: {hint.reason}</div>}
      <div className="parchment fleets">
        <FleetStatus title="Your fleet" board={game.player} own />
        <FleetStatus title="Enemy fleet" board={game.enemy} own={false} />
      </div>
      {settings.showBrain && battle.aiDecision && (
        <div className="parchment brain-box">
          <h3 className="panel-heading">AI Brain</h3>
          <p className="small">{battle.aiDecision.reason}</p>
          <p className="muted small">Brighter squares on your sea are where the enemy thinks your ships are.</p>
        </div>
      )}
      <div className="parchment">
        <Logbook history={game.history} />
      </div>
    </div>
  );


  const gameOver =
    game?.phase === 'over' && !reviewing && !battle.volley ? (
      <GameOver state={game} onAgain={goSetup} onMenu={toMenu} onReview={() => setReviewing(true)} />
    ) : null;

  return (
    <div className={`app app-${view} app-${screen} ${coachVisible ? 'app-coached' : ''}`}>
      <div className="sr-only" aria-live="assertive" data-testid="announcer">
        {announcement}
      </div>
      {view === '3d' && sceneProps && (
        <div className="scene-wrap">
          <Suspense fallback={<div className="scene-loading">Raising the sails…</div>}>
            <Scene3D {...sceneProps} />
          </Suspense>
        </div>
      )}
      {topBar}
      {view === '3d' ? (
        <div className="hud">
          {screen === 'setup' ? setupPanel : battleSide}
          {reviewing && game?.phase === 'over' && (
            <button type="button" className="btn btn-primary review-again" onClick={goSetup}>
              Play again
            </button>
          )}
        </div>
      ) : (
        <main className="layout-2d">
          {coach && <div className="coach-slot">{coach}</div>}
          {screen === 'setup' ? (
            <>
              <div className="boards">
                <div className="parchment board-card">
                  <Board2D
                    label="Your sea"
                    views={playerViews}
                    interactive
                    onCell={onSetupCell}
                    onHover={setHover}
                    ghost={ghost}
                    testId="own-board"
                    cursor={hover}
                  />
                </div>
              </div>
              <div className="battle-side">{setupPanel}</div>
            </>
          ) : (
            game && (
              <>
                <div className="boards">
                  <div className={`parchment board-card ${yourTurn ? 'board-active' : ''}`}>
                    <Board2D
                      label="Enemy sea"
                      views={enemyViews!}
                      interactive={yourTurn}
                      onCell={fireAt}
                      hint={hint?.coord ?? null}
                      highlight={battle.volley?.by === 'player' ? battle.volley.coord : null}
                      cursor={cursor}
                      onCursor={setCursor}
                      testId="enemy-board"
                    />
                  </div>
                  <div className={`parchment board-card ${!yourTurn && game.phase === 'battle' ? 'board-active' : ''}`}>
                    <Board2D
                      label="Your sea"
                      views={playerViews}
                      interactive={false}
                      heat={heat}
                      highlight={battle.volley?.by === 'ai' ? battle.volley.coord : null}
                      testId="own-board"
                    />
                  </div>
                </div>
                {battleSide}
                {reviewing && game.phase === 'over' && (
                  <button type="button" className="btn btn-primary review-again" onClick={goSetup}>
                    Play again
                  </button>
                )}
              </>
            )
          )}
        </main>
      )}
      {view === '3d' && coach}
      {gameOver}
    </div>
  );
}

