# PRD: Battleship vs. AI

**Owner:** Dan Pinchasi | **Builder:** Dan + Devin | **Status:** Approved v1.0 | **Date:** 2026-10-01

---

## 1. Summary

A browser-based Battleship game where a single player battles an AI opponent. Deployed at a public URL (zero install, zero login) with a public GitHub repo. The goal: a clean, tested game engine, a genuinely smart and *explainable* AI, polished UX.

### Assignment (verbatim requirements) → how we satisfy them
| Requirement | Deliverable |
|---|---|
| Battleship game playable online against an AI; send a link | GitHub Pages URL (`https://dpinchasi92.github.io/battleship/`) 
| document on bugs found and how they were fixed | `BUGS.md` in the repo (linked from README) |

## 2. Goals & Non-Goals

### Goals
1. **Playable in under 10 seconds** from clicking the link: no sign-up, no install, works on desktop and mobile.
2. **An AI that feels smart and is provably smart**: multiple difficulty levels, backed by a benchmark (average shots-to-win over thousands of simulated games).
3. **The "wow" moment**: the player can toggle **"Show AI's brain"** to see the AI's live probability heatmap and why it chose each shot.
4. **Repo that reads like a senior engineer wrote it**: clear architecture, typed code, unit + end-to-end tests, CI, a strong README with a demo GIF.
5. **Bug log** (Google Doc) documenting real bugs found during development: symptom, root cause, fix, and lesson. Material for the face-to-face interview.

### Non-Goals (for v1)
- Accounts, persistence across devices, leaderboards with a backend.
- Real-time human-vs-human multiplayer (listed as a stretch goal).
- Native mobile apps.

## 3. Audience & Use Case

| Persona | What they do | What they need |
|---|---|---|
| User | Clicks link, plays 1 game (2–5 min) | Instant load, obvious controls, fun, looks professional |
| Engineer | Plays, then opens the repo | Readable code, tests, AI design rationale, bug write-ups |

## 4. Game Rules (Classic)

- Two 10×10 grids (rows A–J, columns 1–10).
- Fleet per player: Carrier (5), Battleship (4), Cruiser (3), Submarine (3), Destroyer (2).
- Ships placed horizontally or vertically, no overlap, fully inside the grid. Adjacency allowed (configurable "no touching" rule as an option).
- Players alternate single shots. Result: **Miss**, **Hit**, or **Hit and sunk "<Ship>"**.
- Classic rule: one shot per turn regardless of hit (optional "hit = shoot again" variant).
- Game ends when all of one fleet's ships are sunk.

## 4b. Theme & Visual Direction: "Medieval Naval, Modern 3D"

Medieval/age-of-sail **content** rendered with a modern, stylized 3D **look** (think clean low-poly + soft lighting, not gritty realism).

- **Scene:** two fleets on a stylized animated 3D ocean (shader water, gentle waves, fog, time-of-day lighting). Each board is a 10×10 grid of sea tiles with a subtle rope/brass grid border.
- **Ships:** low-poly galleons/carracks sized to the classic fleet, renamed in theme: *Man-o'-War* (5), *Galleon* (4), *Frigate* (3), *Brigantine* (3), *Sloop* (2). Sails flutter; ships bob on the waves.
- **Combat feedback:** cannonball arc from the firing fleet → splash particles on miss, fire + smoke on hit, ship lists and sinks when sunk, camera shake on big moments.
- **UI chrome:** parchment/wood/brass panels, wax-seal buttons, a captain's logbook for the battle log, a medieval display font for headings only (body stays highly readable).
- **AI's brain overlay:** rendered as glowing "sea chart" heat on the player's ocean tiles.
- **Audio:** cannon fire, splash, creaking wood, ambient sea; mute toggle. CC0/royalty-free assets only, credited in README.

**Guardrails so 3D doesn't hurt the game:**
- The game engine is 100% independent of rendering; 3D is a view layer.
- 3D scene is lazy-loaded; a polished **2D "chart table" mode** is the fallback (low-end devices, `prefers-reduced-motion`, or user toggle) and is also what end-to-end tests drive.
- Performance budget: 60fps on a mid-range laptop, ≥30fps on a modern phone; initial JS < 500 KB gzipped before the 3D chunk.
- Assets: CC0 low-poly models (e.g., Kenney Pirate Kit / Quaternius) compressed with glTF + Draco/meshopt; licenses listed in README.

## 5. Functional Requirements

### 5.1 Setup phase
- **P0** Place ships by drag-and-drop or click-to-place; rotate with button / `R` key / tap.
- **P0** "Randomize" button for instant placement; "Clear" button.
- **P0** Live validation (invalid placements highlighted red, cannot start until fleet is valid).
- **P0** Choose level: Cadet (tutorial) / Easy / Medium / Hard.
- **P1** Who goes first: player / AI / coin flip.

### 5.2 Battle phase
- **P0** Click (or keyboard-navigate + Enter) on the enemy grid to fire. Already-fired cells are disabled.
- **P0** Clear hit / miss / sunk feedback on both boards, plus a fleet-status panel (which ships remain on each side).
- **P0** AI responds after a short "thinking" delay so the turn is readable.
- **P0** Battle log (e.g., "AI fires at C7: Hit!").
- **P1** "Show AI's brain" toggle: heatmap overlay of the AI's probability estimate on the player's board, with the chosen cell highlighted.
- **P1** Animations (shot, splash, explosion, sinking) and sound effects with a mute toggle.

### 5.3 End of game
- **P0** Win/lose screen with stats: shots, accuracy, turns, time.
- **P0** "Play again" (keeps difficulty) and "Change settings".
- **P1** Reveal the AI's fleet on loss.
- **P1** Step-through **replay** of the whole game, including what the AI was "thinking" each turn.
- **P2** Local stats (wins/losses per difficulty) in localStorage.

### 5.4 AI opponent

All AIs implement one interface: `chooseShot(knowledge) -> Coordinate` (+ optional `explain()` for the heatmap). The AI **only sees what a human would see** (its own shot history and results), never the player's ship positions. This is enforced by the type system and tested.

| Level | Strategy | Expected avg. shots to win* |
|---|---|---|
| Cadet (tutorial) | Gentle, telegraphed shots; game pauses for coaching | n/a |
| Easy | Random untried cells | ~95 |
| Medium | Hunt/Target: random with checkerboard parity until a hit, then probe neighbors, follow the line until sunk | ~60–65 |
| Hard | Probability density: for every unsunk ship, count all legal placements consistent with known hits/misses; fire at the highest-density cell; strongly weight placements through unresolved hits | ~40–45 |

\*To be confirmed by our benchmark script; the measured numbers go in the README.

### 5.4b "Cadet" tutorial level ("Teach me how to play")
- **P0** Selectable from the main menu as its own level.
- **P0** Guided, interactive walkthrough with a coach (the "Quartermaster") in a parchment speech panel; each step waits for the player to perform the action:
  1. The board and coordinates (A–J, 1–10). 2. The fleet and ship sizes. 3. Placing and rotating a ship (or Randomize). 4. Firing your first shot: miss. 5. Hit: what it means. 6. Sinking a ship. 7. The AI's turn and reading your own board. 8. Strategy tips: checkerboard hunting, then finishing a wounded ship along a line.
- **P0** "Hint" button (also available in Easy) that highlights the statistically best cell using the Hard AI's heatmap and explains *why* in plain language.
- **P1** Skippable at any step; progress remembered in localStorage; ends with "Ready for a real battle? → Easy".

- **P2** "Admiral" mode: Hard AI + a per-player memory that learns which board areas you favor for placement (localStorage).
- **P2** AI fleet placement that's harder to find (avoids naive patterns).

### 5.5 Stretch (only if core is excellent)
- LLM "admiral" trash-talk commentary on events (needs a small serverless proxy for the API key; off by default, graceful fallback to canned lines).
- Salvo variant (shots per turn = ships remaining).
- Human-vs-human via shareable room link (WebRTC/Supabase).

## 6. Non-Functional Requirements

- **Performance:** first load < 2s on 4G; AI move computed < 50ms (Hard AI in a Web Worker if needed).
- **Responsive:** usable from 360px phone width up to desktop.
- **Accessibility:** full keyboard play, ARIA labels on cells, screen-reader announcements for results, color-blind-safe hit/miss markers (shape + color, not color alone).
- **Reliability:** no backend required for core gameplay; deterministic seeded RNG so any bug can be reproduced from a seed.
- **Quality bar:** Lighthouse ≥ 90 on Performance/Accessibility/Best Practices.

## 7. Technical Approach (proposed)

| Concern | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | Types encode game rules (e.g., AI can't see enemy ships) |
| UI | React + Vite | Fast, standard, easy for reviewers to read |
| 3D | three.js via React Three Fiber + drei, postprocessing | Declarative 3D in React; lazy-loaded chunk |
| Styling / motion | Tailwind CSS + Framer Motion | Polished 2D UI chrome quickly |
| State | `useReducer` game state machine (setup → battle → gameOver) | Explicit, testable transitions |
| Engine | Pure TS module, zero UI dependencies | Unit-testable, reused by benchmark + AI |
| Tests | Vitest (engine, AI, reducer) + Playwright (end-to-end game) | Confidence + a strong signal in the repo |
| CI | GitHub Actions: lint, typecheck, tests, build | Green badge on every PR |
| Hosting | **GitHub Pages** (deployed by GitHub Actions on merge to `main`) | Matches "deployed on GitHub", free, static |

### Repo layout
```
src/
  engine/     board, ships, placement validation, shot resolution, game reducer
  ai/         easy.ts, medium.ts, hard.ts, types.ts (AI interface)
  ui/         2D components (Board, Cell, FleetPanel, SetupScreen, GameOver, Logbook)
  scene/      3D view (Ocean, Ship, Cannonball, Effects, Heatmap) – reads game state only
  lib/        seeded RNG, utils
scripts/
  benchmark.ts   simulates N games per AI, prints shots-to-win stats
tests/
  e2e/           Playwright: place fleet, play to completion, replay
docs/
  AI.md          AI design and benchmark results
```
`BUGS.md` lives at the repo root (it's a submission deliverable).

## 8. Bug Log (`BUGS.md`)

Every real bug found (by tests, manual play, CI, or code review) gets an entry:

| Field | Example |
|---|---|
| ID / Title | BUG-007: Hard AI fires at an already-sunk ship's neighbor forever |
| Severity | High |
| How found | Benchmark run: game never terminated at seed 4821 |
| Repro | `npm run benchmark -- --seed 4821` |
| Root cause | Sunk ship cells weren't removed from "unresolved hits" set |
| Fix | Link to commit / PR |
| Lesson / prevention | Added regression test + invariant check |

Entries are added as bugs are found, not reconstructed at the end. The top of the file has a short summary table (ID, title, severity, status) so recruiters can skim it in a minute; details follow. The same file is what Dan presents in the face-to-face interview.

## 9. Milestones (1-week plan)

Devin build time is a few sessions; the week leaves room for Dan's review, playtesting, and interview prep.

| Day | Milestone | Done when |
|---|---|---|
| 1 | M0: Repo scaffold, CI, GitHub Pages deploy · M1: game engine + unit tests | Public URL live; engine fully tested |
| 2 | M2: Playable 2D game vs Easy AI · M3: Medium + Hard AI + benchmark · Cadet tutorial | Full game loop deployed; benchmark numbers in README; tutorial playable |
| 3 | M4: 3D scene: ocean, galleons, camera, placement in 3D | Can play a full game in 3D |
| 4 | M5: Combat effects, audio, AI-brain heatmap, parchment UI | "Wow" pass complete |
| 5 | M6: Mobile, accessibility, performance, Playwright e2e in CI, replay/stats | Lighthouse ≥ 90, e2e green |
| 6 | M7: Bug bash (Dan playtests + Devin), README + demo GIF, AI.md | 
| 7 | Buffer · interview talking points · submit links | Links sent |

## 10. Success Criteria

- Users can open the link and finish a game with no instructions.
- Hard AI average shots-to-win ≤ 50 over 10,000 simulated games.
- CI green; engine and AI test coverage ≥ 90%.
- Zero known P0/P1 bugs at submission; bug log has real, well-explained entries.
- README lets an engineer understand the architecture in < 5 minutes.

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Scope creep from "most impressive" | Strict P0 → P1 → P2 order; stretch only after M6 |
| AI "cheating" accusation | AI interface only receives shot history; tested; documented in AI.md |
| Drag-and-drop flaky on mobile | Tap-to-place fallback |
| Over-polished UI, thin engineering | Tests, benchmark, and docs are milestones, not afterthoughts |

## 12. Decisions Log
- Repo: `github.com/dpinchasi92/battleship` (public).
- Hosting: GitHub Pages via GitHub Actions.
- Bug document: `BUGS.md` in the repo.
- Timeline: 1 week.
- Theme: medieval naval content, modern stylized 3D look, 2D fallback.
- Added "Cadet" tutorial level (Dan's request).
- LLM commentary: deferred (would require a backend; GitHub Pages is static).
