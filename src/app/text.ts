import { coordLabel, shipSpec, type ShotResult, type Side, type TurnRecord } from '../engine/index.ts';

export const resultText = (result: ShotResult): string => {
  switch (result.kind) {
    case 'miss':
      return 'Miss';
    case 'hit':
      return 'Hit!';
    case 'sunk':
      return `Sunk the ${shipSpec(result.ship).name}!`;
  }
};

export const actorText = (by: Side) => (by === 'player' ? 'You fire' : 'Enemy fires');

export const turnText = (record: Pick<TurnRecord, 'by' | 'coord' | 'result'>): string => {
  const base = `${actorText(record.by)} at ${coordLabel(record.coord)}: ${resultText(record.result)}`;
  if (record.result.kind === 'sunk' && record.by === 'ai') {
    return `${actorText(record.by)} at ${coordLabel(record.coord)}: your ${shipSpec(record.result.ship).name} is sunk!`;
  }
  return base;
};
