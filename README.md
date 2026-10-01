# Broadsides: Battleship vs AI

A medieval naval duel against an explainable AI, rendered as a modern stylised 3D sea, with a fully accessible 2D chart-table mode.

**Play:** https://dpinchasi92.github.io/battleship/ · **Bug log:** [BUGS.md](BUGS.md) · **AI write-up:** [docs/AI.md](docs/AI.md) · **PRD:** [docs/PRD.md](docs/PRD.md)

## Features

- **Four opponents:** Cadet (an interactive "teach me how to play" tutorial), Deckhand (random), Captain (hunt/target) and Admiral (probability density).
- **Explainable AI:** turn on *AI Brain* to see the enemy's heatmap over your fleet and read why it chose each shot. In Cadet mode, *Hint* uses the Admiral's model to coach you.
- **3D scene** (React Three Fiber): a shader ocean, procedurally modelled galleons, cannonball arcs, splashes, explosions, fire and smoke, and animated crews who leap overboard and swim for it when their ship sinks. There is no external art; even the sound effects are synthesised with the Web Audio API.
- **2D fallback:** used automatically when WebGL is missing or the user prefers reduced motion, and available from a toggle at any time.
- **Accessible:** keyboard play (arrow keys steer ships in setup and aim in battle; Enter or Space places or fires at the aimed or hovered square; R rotates), screen-reader announcements, ARIA grid labels, and hit/miss markers that don't rely on colour alone.
- **Reproducible:** `?seed=123` makes fleets and AI choices deterministic, which is handy for bug reports and e2e tests. `?view=2d|3d` forces a view.

## Architecture

```
src/engine/   Pure, immutable TypeScript game rules (no React). Boards, placement, firing, turns, stats, seeded RNG.
src/ai/       Strategy interface + Easy/Medium/Hard, simulator, benchmark harness.
src/app/      React glue: battle hook (shot flight/impact timing, AI turn), tutorial script, settings, view-model mapping.
src/ui/       2D components: menu, setup, board, fleet status, captain's log, coach, game over.
src/scene/    Lazy-loaded 3D scene. It only renders view state derived from the engine and never owns game rules.
src/audio/    Synthesised sound effects.
e2e/          Playwright tests (desktop + mobile).
```

The engine is the single source of truth. Both renderers consume the same derived `CellView[]`, so 2D and 3D cannot disagree about the game state.

## Development

Requires Node 24 (`.nvmrc`).

```bash
npm install
npm run dev          # local dev server
npm test             # unit tests (engine + AI)
npm run test:e2e     # Playwright e2e (run `npx playwright install chromium` once)
npm run lint
npm run typecheck
npm run build
npm run benchmark -- 2000
```

CI runs lint, typecheck, unit tests, build and e2e on every PR. Each merge to `main` deploys to GitHub Pages.
