import type { Level } from '../engine/index.ts';

export type Record_ = Record<Level, { wins: number; losses: number }>;

const KEY = 'broadsides.record.v1';
const empty = (): Record_ => ({
  cadet: { wins: 0, losses: 0 },
  easy: { wins: 0, losses: 0 },
  medium: { wins: 0, losses: 0 },
  hard: { wins: 0, losses: 0 },
});

export function loadRecord(): Record_ {
  try {
    return { ...empty(), ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Record_>) };
  } catch {
    return empty();
  }
}

export function saveRecord(record: Record_) {
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // Ignore: stats are a nice-to-have.
  }
}
