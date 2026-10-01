import type { CrewMember } from './Crew.tsx';

/** Deck positions and jobs for a crew sized to the ship. */
export function crewFor(length: number, mainMastX: number): CrewMember[] {
  const half = length / 2;
  const crew: CrewMember[] = [
    { role: 'helm', x: -half + 0.36, z: 0, onCabin: true },
    { role: 'wave', x: half - 0.55, z: 0.18 },
  ];
  if (length >= 3) crew.push({ role: 'walk', x: 0, z: -0.16, span: half - 0.8 });
  if (length >= 3) crew.push({ role: 'haul', x: mainMastX + 0.18, z: 0.17 });
  if (length >= 4) crew.push({ role: 'walk', x: 0.3, z: 0.12, span: half - 1 });
  if (length >= 4) crew.push({ role: 'lookout', x: mainMastX - 0.08, z: 0 });
  return crew;
}
