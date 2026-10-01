import { shipSpec, type ShotResult } from '../engine/index.ts';

export type TutorialContext = {
  screen: 'setup' | 'battle';
  placed: number;
  ready: boolean;
  playerShots: number;
  playerHits: number;
  playerSunk: number;
  aiShots: number;
  lastPlayerResult: ShotResult | null;
  over: boolean;
};

export type TutorialStep = {
  id: string;
  title: string;
  text: (ctx: TutorialContext) => string;
  /** 'next' waits for the player to click Next; a predicate auto-advances once true. */
  advance: 'next' | ((ctx: TutorialContext) => boolean);
  showHint?: boolean;
};

export const TUTORIAL: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Ahoy, Cadet!',
    text: () =>
      "I'm your Quartermaster. You and the enemy each hide 5 ships on a 10×10 sea. Squares are named by row and column: rows A–J, columns 1–10, so the top-left square is A1.",
    advance: 'next',
  },
  {
    id: 'place',
    title: 'Position a ship',
    text: () =>
      "Choose a ship from the list (bigger ships are easier to find but take more hits to sink). Point at your sea and click to drop it. Press R or the Rotate button to turn it.",
    advance: (c) => c.placed >= 1,
  },
  {
    id: 'fleet',
    title: 'Complete the fleet',
    text: () => 'Place the rest of your ships. In a hurry? Click Randomize and the crew will do it for you.',
    advance: (c) => c.ready,
  },
  {
    id: 'start',
    title: 'Ready for battle',
    text: () => 'Ships may touch, but never overlap. Your fleet is ready: press Start Battle!',
    advance: (c) => c.screen === 'battle',
  },
  {
    id: 'fire',
    title: 'Your first broadside',
    text: () => "This is the enemy's sea. Their ships are hidden. Click any square to fire a cannonball.",
    advance: (c) => c.playerShots >= 1,
  },
  {
    id: 'result',
    title: 'Reading the result',
    text: (c) =>
      c.lastPlayerResult?.kind === 'miss' || !c.lastPlayerResult
        ? 'Splash! A white marker means a miss: no ship there. Every miss still tells you something: no ship crosses that square.'
        : 'Fire and smoke means a HIT! Part of an enemy ship is on that square.',
    advance: 'next',
  },
  {
    id: 'enemy',
    title: 'The enemy fires back',
    text: () =>
      'After every shot, the enemy fires one back at your fleet. Watch your own sea: white markers are their misses, flames are hits on your ships.',
    advance: (c) => c.aiShots >= 1,
  },
  {
    id: 'hunt',
    title: 'Hunting strategy',
    text: () =>
      'Every ship is at least 2 squares long, so you only need to search every other square, like the dark squares of a checkerboard. Stuck? Press Hint and I will show you the best square and explain why.',
    advance: (c) => c.playerHits >= 1,
    showHint: true,
  },
  {
    id: 'target',
    title: 'Finish it off',
    text: () =>
      'You have a hit! Now fire at the squares next to it (up, down, left, right). Once you get a second hit, keep going in that line.',
    advance: (c) => c.playerSunk >= 1,
    showHint: true,
  },
  {
    id: 'sunk',
    title: 'Ship sunk!',
    text: (c) =>
      `${c.lastPlayerResult?.kind === 'sunk' ? `You sank their ${shipSpec(c.lastPlayerResult.ship).name}! ` : ''}Sunk ships are revealed. Sink all 5 to win. Tip: turn on "AI Brain" to see where the enemy thinks your ships are.`,
    advance: 'next',
  },
];

export function nextStepIndex(index: number, ctx: TutorialContext): number {
  let i = index;
  while (i < TUTORIAL.length) {
    const step = TUTORIAL[i]!;
    if (step.advance === 'next' || !step.advance(ctx)) return i;
    i++;
  }
  return i;
}
