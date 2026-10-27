import type { Player } from './supercup';

export type PitchRole = Player['position'];

export function formationPlan(formation: string): PitchRole[][] {
  const shape = formation.split('-').map((part) => Number(part)).filter((count) => Number.isInteger(count) && count > 0);
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
  ids.forEach((id) => {
    const player = byId.get(id);
    if (!player) return;
    const index = slots.findIndex((taken, slot) => !taken && roles[slot] === player.position);
    if (index >= 0) slots[index] = player.id;
  });
  return slots;
}
