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

const R16: Array<[string, string]> = [
  ['1A', '2B'],
  ['1C', '2D'],
  ['1E', '2F'],
  ['1B', '2A'],
  ['1D', '2C'],
  ['1F', '2E'],
  ['3-1', '3-4'],
  ['3-2', '3-3'],
];

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

function bestThirds() {
  return GROUPS
    .map((group) => standingsFor(group)[2])
    .filter((row) => row && row.played > 0)
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.department.name.localeCompare(b.department.name))
    .slice(0, 4)
    .map((row) => row.department);
}

function teamFromCode(code: string, thirds: Department[]) {
  const place = code.match(/^([12])([A-F])$/);
  if (place) {
    const row = standingsFor(place[2] as GroupId)[Number(place[1]) - 1];
    return row && row.played > 0 ? row.department : undefined;
  }
  const third = code.match(/^3-(\d)$/);
  return third ? thirds[Number(third[1]) - 1] : undefined;
}

function codeLabel(code: string) {
  if (code === '3-1') return 'Best 3rd';
  if (code === '3-2') return '2nd best 3rd';
  if (code === '3-3') return '3rd best 3rd';
  if (code === '3-4') return '4th best 3rd';
  const place = code.match(/^([12])([A-F])$/);
  if (!place) return code;
  return `${place[1] === '1' ? 'Winner' : 'Runner-up'} ${place[2]}`;
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

const LATER: Array<{ stage: Exclude<Stage, 'group'>; ties: number; feed: Exclude<Stage, 'group'>; feedName: string }> = [
  { stage: 'qf', ties: 4, feed: 'r16', feedName: 'R16' },
  { stage: 'sf', ties: 2, feed: 'qf', feedName: 'QF' },
  { stage: 'final', ties: 1, feed: 'sf', feedName: 'SF' },
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
    home: side('SF 1', loser(left)),
    away: side('SF 2', loser(right)),
  };
}

export function knockoutRoad(): RoadTie[] {
  const thirds = bestThirds();
  const ties: RoadTie[] = R16.map(([homeCode, awayCode], index) => ({
    stage: 'r16',
    slot: index + 1,
    home: { label: codeLabel(homeCode), team: teamFromCode(homeCode, thirds) },
    away: { label: codeLabel(awayCode), team: teamFromCode(awayCode, thirds) },
    fixture: tieFixture('r16', index + 1),
  }));

  for (const round of LATER) {
    for (let slot = 1; slot <= round.ties; slot += 1) {
      const left = (slot - 1) * 2 + 1;
      const right = left + 1;
      ties.push({
        stage: round.stage,
        slot,
        home: side(`Winner ${round.feedName} ${left}`, winnerId(tieFixture(round.feed, left))),
        away: side(`Winner ${round.feedName} ${right}`, winnerId(tieFixture(round.feed, right))),
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
