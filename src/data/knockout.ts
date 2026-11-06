import {
  GROUPS,
  fixtures,
  getDepartment,
  standingsFor,
  type Department,
  type Fixture,
  type GroupId,
} from './supercup';

export type Stage = 'group' | 'r16' | 'qf' | 'sf' | 'final';

export const STAGE_OPTIONS: Array<{ id: Stage; label: string; ties: number }> = [
  { id: 'group', label: 'Group', ties: 0 },
  { id: 'r16', label: 'Round of 16', ties: 8 },
  { id: 'qf', label: 'Quarter-final', ties: 4 },
  { id: 'sf', label: 'Semi-final', ties: 2 },
  { id: 'final', label: 'Final', ties: 1 },
];

export interface R16TieConfig {
  slot: number;
  homeGroup: GroupId;
  homeRank: number;
  awayGroup: GroupId;
  awayRank: number;
  homeCode: string;
  awayCode: string;
}

export const R16_TIES: R16TieConfig[] = [
  { slot: 1, homeGroup: 'A', homeRank: 1, awayGroup: 'C', awayRank: 3, homeCode: '1A', awayCode: '3C' },
  { slot: 2, homeGroup: 'B', homeRank: 1, awayGroup: 'D', awayRank: 3, homeCode: '1B', awayCode: '3D' },
  { slot: 3, homeGroup: 'C', homeRank: 1, awayGroup: 'E', awayRank: 3, homeCode: '1C', awayCode: '3E' },
  { slot: 4, homeGroup: 'D', homeRank: 1, awayGroup: 'A', awayRank: 3, homeCode: '1D', awayCode: '3A' },
  { slot: 5, homeGroup: 'E', homeRank: 1, awayGroup: 'B', awayRank: 3, homeCode: '1E', awayCode: '3B' },
  { slot: 6, homeGroup: 'A', homeRank: 2, awayGroup: 'D', awayRank: 2, homeCode: '2A', awayCode: '2D' },
  { slot: 7, homeGroup: 'B', homeRank: 2, awayGroup: 'E', awayRank: 2, homeCode: '2B', awayCode: '2E' },
  { slot: 8, homeGroup: 'C', homeRank: 2, awayGroup: 'E', awayRank: 4, homeCode: '2C', awayCode: '4E' },
];

export const R16: Array<[string, string]> = R16_TIES.map((tie) => [tie.homeCode, tie.awayCode]);

export interface RoadSide {
  label: string;
  team?: Department;
}

export interface RoadTie {
  stage: Exclude<Stage, 'group'>;
  slot: number;
  home: RoadSide;
  away: RoadSide;
  fixture?: Fixture;
}

export function stageLabel(stage?: string) {
  return STAGE_OPTIONS.find((item) => item.id === stage)?.label ?? 'Group';
}

export function tieCount(stage: Stage) {
  return STAGE_OPTIONS.find((item) => item.id === stage)?.ties ?? 0;
}

export function qualifyingSpotsForGroup(group: GroupId): number {
  return group === 'E' ? 4 : 3;
}

export function isTeamQualified(group: GroupId, position: number): boolean {
  return position >= 1 && position <= qualifyingSpotsForGroup(group);
}

export function getQualifiedTeams(settledOnly = false): Department[] {
  const result: Department[] = [];
  for (const group of GROUPS) {
    if (settledOnly && !groupSettled(group)) continue;
    const table = standingsFor(group);
    const spots = qualifyingSpotsForGroup(group);
    for (let index = 0; index < spots && index < table.length; index += 1) {
      const row = table[index];
      if (row && (settledOnly || row.played > 0)) {
        result.push(row.department);
      }
    }
  }
  return result;
}

export function groupSettled(group: GroupId) {
  const table = standingsFor(group);
  if (table.length < 2 || table.some((row) => row.played < table.length - 1)) return false;
  return !fixtures.some((fixture) =>
    (fixture.stage ?? 'group') === 'group'
    && fixture.group === group
    && fixture.detail !== 'finished'
    && fixture.detail !== 'cancelled'
    && fixture.detail !== 'abandoned'
  );
}

export function teamFromCode(code: string, settledOnly = false): Department | undefined {
  const place = code.match(/^([1-4])([A-E])$/);
  if (!place) return undefined;
  const rank = Number(place[1]);
  const group = place[2] as GroupId;
  if (settledOnly && !groupSettled(group)) return undefined;
  const row = standingsFor(group)[rank - 1];
  return row && (settledOnly || row.played > 0) ? row.department : undefined;
}

export function codeLabel(code: string) {
  const place = code.match(/^([1-4])([A-E])$/);
  if (!place) return code;
  const rank = place[1];
  const group = place[2];
  const suffix = rank === '1' ? '1st' : rank === '2' ? '2nd' : rank === '3' ? '3rd' : '4th';
  return `Group ${group} ${suffix}`;
}

function tieFixture(stage: string, slot: number) {
  return fixtures.find((fixture) => (fixture.stage || 'group') === stage && fixture.slot === slot && fixture.detail !== 'cancelled');
}

function winnerId(fixture?: Fixture) {
  if (!fixture || fixture.detail !== 'finished' || !fixture.confirmed) return undefined;
  if (fixture.pensHome != null && fixture.pensAway != null && fixture.pensHome !== fixture.pensAway) {
    return fixture.pensHome > fixture.pensAway ? fixture.homeId : fixture.awayId;
  }
  const home = fixture.homeScore ?? 0;
  const away = fixture.awayScore ?? 0;
  if (home === away) return undefined;
  return home > away ? fixture.homeId : fixture.awayId;
}

function side(label: string, teamId?: string): RoadSide {
  return { label, team: teamId ? getDepartment(teamId) : undefined };
}

function feedLabel(stage: Exclude<Stage, 'group'>, slot: number): string {
  if (stage === 'r16') return `Winner R16-${slot}`;
  if (stage === 'qf') return `Winner QF${slot}`;
  if (stage === 'sf') return `Winner SF${slot}`;
  return `Winner ${stage} ${slot}`;
}

const LATER: Array<{ stage: Exclude<Stage, 'group'>; ties: number; feed: Exclude<Stage, 'group'> }> = [
  { stage: 'qf', ties: 4, feed: 'r16' },
  { stage: 'sf', ties: 2, feed: 'qf' },
  { stage: 'final', ties: 1, feed: 'sf' },
];

export function thirdPlaceTie(): RoadTie {
  const left = tieFixture('sf', 1);
  const right = tieFixture('sf', 2);
  const loser = (fixture?: Fixture) => {
    const winner = winnerId(fixture);
    if (!fixture || !winner) return undefined;
    return winner === fixture.homeId ? fixture.awayId : fixture.homeId;
  };
  return {
    stage: 'final',
    slot: 0,
    home: side('Loser SF1', loser(left)),
    away: side('Loser SF2', loser(right)),
  };
}

export function knockoutRoad(): RoadTie[] {
  return buildRoad(false);
}

export function scheduleTie(stage: Exclude<Stage, 'group'>, slot: number): RoadTie | undefined {
  return buildRoad(stage === 'r16').find((tie) => tie.stage === stage && tie.slot === slot);
}

function buildRoad(settledOnly: boolean): RoadTie[] {
  const ties: RoadTie[] = R16.map(([homeCode, awayCode], index) => ({
    stage: 'r16',
    slot: index + 1,
    home: { label: codeLabel(homeCode), team: teamFromCode(homeCode, settledOnly) },
    away: { label: codeLabel(awayCode), team: teamFromCode(awayCode, settledOnly) },
    fixture: tieFixture('r16', index + 1),
  }));

  for (const round of LATER) {
    for (let slot = 1; slot <= round.ties; slot += 1) {
      const left = (slot - 1) * 2 + 1;
      const right = left + 1;
      ties.push({
        stage: round.stage,
        slot,
        home: side(feedLabel(round.feed, left), winnerId(tieFixture(round.feed, left))),
        away: side(feedLabel(round.feed, right), winnerId(tieFixture(round.feed, right))),
        fixture: tieFixture(round.stage, slot),
      });
    }
  }

  return ties.map((tie) => {
    if (!tie.fixture) return tie;
    return {
      ...tie,
      home: side(tie.home.label, tie.fixture.homeId),
      away: side(tie.away.label, tie.fixture.awayId),
    };
  });
}
