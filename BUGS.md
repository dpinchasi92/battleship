# Bug Log

Bugs found while building Broadsides: how each was found, its root cause, and the fix. Most were caught by automated checks (ESLint's React rules, Playwright e2e on desktop and a Pixel 7 profile) or by reviewing screenshots of every screen at desktop and mobile sizes.

| ID | Title | Severity | How found | Status |
|---|---|---|---|---|
| B1 | Menu → setup transition crashed the app | Critical | Playwright e2e | Fixed |
| B2 | Cadet coach covered the Start Battle button on mobile | High | Playwright e2e (Pixel 7) | Fixed |
| B3 | Cadet coach covered the bottom rows of the 2D board on desktop | Medium | Screenshot review | Fixed |
| B4 | 3D boards hidden behind the HUD panel on wide screens | High | Screenshot review | Fixed |
| B5 | Mobile 3D layout put the top bar under the scene | Medium | Screenshot review | Fixed |
| B6 | Explosion particles used `Math.random()` during render | Medium | ESLint (`react-hooks/purity`) | Fixed |
| B7 | Pending AI-turn timers could outlive the battle | Medium | ESLint (`react-hooks/exhaustive-deps`) | Fixed |
| B8 | Background gradient seam on long mobile pages | Low | Screenshot review | Fixed |
| B9 | E2E suite silently tested a stale build | Medium (tooling) | Investigating a passing-then-failing run | Fixed |

---

### B1: Menu → setup transition crashed the app
- **Symptom:** clicking *Set Sail* left a blank page, with `TypeError: destroy is not a function` in the console.
- **Root cause:** a new effect was written as an expression-bodied arrow, `useEffect(() => window.scrollTo(0, 0), [screen])`. In current Chromium (verified on 153), `window.scrollTo()` returns a **Promise**, so the arrow returned it. React treats any value an effect returns as its cleanup function. When the menu unmounted, React tried to call the Promise and crashed.
- **Fix:** effects with side-effect calls now use block bodies (`useEffect(() => { ... })`), so they never return a value by accident. Every e2e test starts with the menu → setup transition, so the suite now covers it.

### B2: Cadet coach covered the Start Battle button on mobile
- **Symptom:** in the tutorial on a phone, the fixed-position Quartermaster panel sat on top of *Start Battle*. Playwright reported `<aside data-testid="coach"> intercepts pointer events`.
- **Root cause:** the coach was `position: fixed` at the bottom of the viewport, which is exactly where the setup panel ends on narrow screens.
- **Fix:** in 2D the coach is now part of the page grid. On desktop it sits in its own area above the side panel; on mobile it is the first row, above the boards. It can never cover a control.

### B3: Cadet coach covered the bottom rows of the 2D board on desktop
- **Symptom:** the floating coach hid rows I–J of the setup board.
- **Fix:** same as B2: the coach lives in the layout instead of floating over it. The 3D view keeps the floating coach because the scene leaves open ocean there.

### B4: 3D boards hidden behind the HUD panel on wide screens
- **Symptom:** the camera centred the boards in the full canvas, so the right-hand HUD (fleet status, captain's log) covered most of the enemy board.
- **Fix:** `CameraRig` uses `PerspectiveCamera.setViewOffset` to shift the projection, centring the boards in the area left of the HUD. The camera distance is computed from the visible aspect ratio, so both boards always fit.

### B5: Mobile 3D layout put the top bar under the scene
- **Fix:** on narrow screens, flex `order` places the top bar first, then the scene, then the HUD.

### B6: Explosion particles used `Math.random()` during render
- **Root cause:** particle velocities were randomised inside render. That is impure: React may render more than once, and each render would give different particles.
- **Fix:** a deterministic hash `jitter(seed)` keyed by burst id and particle index. The output looks the same and renders are stable.

### B7: Pending AI-turn timers could outlive the battle
- **Root cause:** the effect cleanup in `useBattle` read `timers.current` at cleanup time instead of using the set captured when the effect ran. The lint rule flags this because the ref may already point somewhere else by then, which can leave scheduled impact/AI callbacks uncleared when the component unmounts.
- **Fix:** the cleanup captures the timer set when the effect runs (`const pending = timers.current`) and clears every timer in it. As a second line of defence, every scheduled callback checks a `gameId` and ignores events from a previous game.

### B8: Background gradient seam on long mobile pages
- **Root cause:** the body gradient was sized to the viewport and repeated below it.
- **Fix:** the gradient is now `fixed no-repeat` over a solid base colour.

### B9: E2E suite silently tested a stale build
- **Symptom:** layout fixes appeared to have no effect in e2e runs.
- **Root cause:** Playwright's `reuseExistingServer` attached to a `vite preview` process that was already serving an old `dist/`.
- **Fix:** the server is never reused in CI, and locally the old preview process is stopped before running the suite. CI now runs the e2e job on every PR.

### B10: Horizontal scroll on narrow screens in the Cadet tutorial
- **Symptom:** found by the recorded play-test. At 390×844 in the 2D Cadet setup the page scrolled sideways by about 8px, and the right edges of the cards were clipped.
- **Root cause:** a mobile media query set `.coach { width: calc(100vw - 1rem) }`. That rule came after `.coach-inline { width: auto }` with the same specificity, so it also sized the inline coach. With a classic (non-overlay) scrollbar, `100vw` includes the scrollbar, so the coach was wider than its column.
- **Fix:** the rule now targets only the floating coach (`.coach:not(.coach-inline)`) and uses `100%` instead of `100vw`.
