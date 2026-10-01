# How the AI thinks

Every opponent implements one interface:

```ts
type Strategy = {
  level: Level;
  chooseShot: (knowledge: Knowledge, rng: Rng) => ShotDecision; // { coord, heatmap?, reason }
};
```

`Knowledge` is the only thing an AI ever sees: for each cell, `unknown | miss | hit | sunk`, plus the list of ships still afloat. It is produced by `knowledgeOf(board)`, which hides unsunk ships. The AI cannot cheat because it never receives the opponent's ship positions; a unit test checks this.

Every decision includes a plain-language `reason`. The **AI Brain** toggle shows that reason with the heatmap overlaid on your sea, and the Cadet **Hint** button uses the Admiral's map to explain the best shot to you.

## Deckhand (Easy): random

Fires at a uniformly random unknown cell.

## Captain (Medium): hunt and target

- **Hunt:** fires only on a checkerboard parity. The smallest ship is 2 long, so every ship must cover at least one cell of each colour.
- **Target:** after a hit, it fires at the neighbouring cells. After two hits in a line it keeps going along that line until the ship sinks, then goes back to hunting.

## Admiral (Hard): probability density

For every ship still afloat, it enumerates every horizontal and vertical position the ship could occupy given what is known:

- Positions through a miss or a sunk ship are impossible.
- While unresolved hits exist, only positions that pass through at least one hit count. Each one is weighted `40^hits`, so lines through several hits dominate.

Each cell's score is the number of (weighted) positions covering it. The AI fires at the highest-scoring unknown cell, breaking ties randomly. On an empty board this naturally favours the centre. After a hit, it concentrates fire around the wound and infers the ship's orientation without any special-case rules.

## Benchmark

`npm run benchmark -- 2000` plays 2,000 seeded games per AI against random fleets and counts the shots needed to sink all 5 ships (fewer is better):

| AI | Mean | Median | P90 | Best | Worst |
|---|---|---|---|---|---|
| Deckhand (random) | 95.5 | 97 | 100 | 65 | 100 |
| Captain (hunt/target) | 50.3 | 50 | 62 | 21 | 75 |
| Admiral (probability) | 45.0 | 45 | 58 | 23 | 71 |

The unit tests also check that each AI finishes within 100 shots, never repeats a cell, and ranks Hard < Medium < Easy in mean shots.
