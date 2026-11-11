import type { Player } from './supercup';

export type PitchRole = Player['position'];

export interface FormationOption {
  id: string;
  label: string;
}

export interface FormationGroup {
  label: string;
  formations: FormationOption[];
}

export const FORMATION_GROUPS: FormationGroup[] = [
  {
    label: '4 Defenders (Back 4)',
    formations: [
      { id: '4-3-3', label: '4-3-3 (Classic / Attack)' },
      { id: '4-2-3-1', label: '4-2-3-1 (Wide / Modern)' },
      { id: '4-4-2', label: '4-4-2 (Flat)' },
      { id: '4-1-4-1', label: '4-1-4-1 (Holding Pivot)' },
      { id: '4-4-1-1', label: '4-4-1-1 (Second Striker)' },
      { id: '4-3-1-2', label: '4-3-1-2 (Central Diamond)' },
      { id: '4-1-2-1-2', label: '4-1-2-1-2 (Narrow Diamond)' },
      { id: '4-2-2-2', label: '4-2-2-2 (Double Pivot Box)' },
      { id: '4-3-2-1', label: '4-3-2-1 (Christmas Tree)' },
      { id: '4-1-3-2', label: '4-1-3-2 (Attacking Trio)' },
      { id: '4-5-1', label: '4-5-1 (Flat 5 Midfield)' },
      { id: '4-2-4', label: '4-2-4 (Classic Attacking)' },
    ],
  },
  {
    label: '3 Defenders (Back 3)',
    formations: [
      { id: '3-5-2', label: '3-5-2 (Wingback Standard)' },
      { id: '3-4-3', label: '3-4-3 (Flat / Wide)' },
      { id: '3-4-2-1', label: '3-4-2-1 (Twin #10s)' },
      { id: '3-4-1-2', label: '3-4-1-2 (Playmaker & Dual Strikers)' },
      { id: '3-1-4-2', label: '3-1-4-2 (Single Pivot & Dual 8s)' },
      { id: '3-2-4-1', label: '3-2-4-1 (Box Midfield)' },
      { id: '3-5-1-1', label: '3-5-1-1 (Packed Midfield)' },
      { id: '3-3-3-1', label: '3-3-3-1 (High Press)' },
      { id: '3-1-3-3', label: '3-1-3-3 (Cruyff Diamond)' },
      { id: '3-3-1-3', label: '3-3-1-3 (Bielsa Diamond)' },
    ],
  },
  {
    label: '5 Defenders (Back 5)',
    formations: [
      { id: '5-3-2', label: '5-3-2 (Classic 5-3-2)' },
      { id: '5-4-1', label: '5-4-1 (Solid Counter Block)' },
      { id: '5-2-3', label: '5-2-3 (Wingbacks & Wingers)' },
      { id: '5-2-1-2', label: '5-2-1-2 (Playmaker & Dual Strikers)' },
      { id: '5-2-2-1', label: '5-2-2-1 (Dual Attacking Mids)' },
      { id: '5-1-2-2', label: '5-1-2-2 (Anchor & Central Pairs)' },
      { id: '5-3-1-1', label: '5-3-1-1 (Counter & Shadow Striker)' },
    ],
  },
];

export const FORMATIONS = FORMATION_GROUPS.flatMap((g) => g.formations.map((f) => f.id));

export function isValidFormation(formation?: string | null): boolean {
  if (!formation) return false;
  const clean = formation.split(' ')[0].trim();
  const shape = clean.split('-').map(Number);
  if (shape.length < 2 || shape.some((n) => !Number.isInteger(n) || n <= 0)) return false;
  const total = shape.reduce((sum, n) => sum + n, 0);
  return total === 10;
}

export function formationPlan(formation: string): PitchRole[][] {
  const clean = String(formation ?? '').split(' ')[0].trim();
  const shape = clean.split('-').map((part) => Number(part)).filter((count) => Number.isInteger(count) && count > 0);
  const counts = shape.length >= 2 ? shape : [4, 3, 3];
  const lines: PitchRole[][] = [['GK'], Array.from({ length: counts[0] }, () => 'DEF')];
  counts.slice(1, -1).forEach((count) => lines.push(Array.from({ length: count }, () => 'MID')));
  lines.push(Array.from({ length: counts[counts.length - 1] }, () => 'FWD'));
  return lines;
}

export function seatPlayers(ids: string[], formation: string, roster: Player[]) {
  const byId = new Map(roster.map((player) => [player.id, player]));
  const roles = formationPlan(formation).flat();
  const slots: Array<string | null> = roles.map(() => null);
  const unplaced: string[] = [];

  // Pass 1: Try seating matching natural positions first
  ids.forEach((id) => {
    const player = byId.get(id);
    if (!player) return;
    const index = slots.findIndex((taken, slot) => !taken && roles[slot] === player.position);
    if (index >= 0) {
      slots[index] = player.id;
    } else {
      unplaced.push(player.id);
    }
  });

  // Pass 2: Place any remaining players into any open slots regardless of position
  unplaced.forEach((id) => {
    const emptyIndex = slots.findIndex((taken) => !taken);
    if (emptyIndex >= 0) {
      slots[emptyIndex] = id;
    }
  });

  return slots;
}
