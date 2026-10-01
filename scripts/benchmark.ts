import { huntTargetStrategy, probabilityStrategy, randomStrategy } from '../src/ai/index.ts';
import { shotsToWin } from '../src/ai/simulate.ts';

const games = Number(process.argv[2] ?? 2000);

const percentile = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

console.log(`Simulating ${games} games per AI (random fleets, seeded)\n`);
console.log('| AI | Strategy | Mean | Median | P90 | Best | Worst |');
console.log('|---|---|---|---|---|---|---|');
for (const [name, strategy] of [
  ['Easy', randomStrategy],
  ['Medium', huntTargetStrategy],
  ['Hard', probabilityStrategy],
] as const) {
  const results = Array.from({ length: games }, (_, seed) => shotsToWin(strategy, seed)).sort((a, b) => a - b);
  const mean = results.reduce((a, b) => a + b, 0) / games;
  console.log(
    `| ${name} | ${strategy.level} | ${mean.toFixed(1)} | ${percentile(results, 0.5)} | ${percentile(results, 0.9)} | ${results[0]} | ${results[games - 1]} |`,
  );
}
