import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { GroupTable } from '../components/GroupTable';
import { MatchCard } from '../components/MatchCard';
import { GROUPS, cardTeam, fixtures, type GroupId } from '../../data/supercup';

export function GroupsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('group')?.toUpperCase() ?? 'A';
  const group = (GROUPS as string[]).includes(requested) ? (requested as GroupId) : 'A';

  const groupFixtures = useMemo(
    () => fixtures.filter((fixture) => fixture.group === group),
    [group],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      <h1 className="text-3xl font-black text-white">Groups</h1>
      <p className="mt-1 text-sm text-white/50">Four departments in each group. The top two advance.</p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {GROUPS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setParams({ group: item })}
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              item === group ? 'bg-[#f5c518] text-[#102018]' : 'bg-white/5 text-white/70'
            }`}
          >
            Group {item}
          </button>
        ))}
      </div>

      <div className="mt-3">
        <GroupTable group={group} />
      </div>

      <h2 className="mb-3 mt-6 text-lg font-black text-white">Group {group} fixtures</h2>
      <div className="space-y-3">
        {groupFixtures.map((fixture) => (
          <MatchCard
            key={fixture.id}
            id={fixture.id}
            homeTeam={cardTeam(fixture.homeId)}
            awayTeam={cardTeam(fixture.awayId)}
            homeScore={fixture.homeScore}
            awayScore={fixture.awayScore}
            status={fixture.status}
            time={`MD${fixture.matchday} · ${fixture.time}`}
            stadium={fixture.stadium}
            matchMinute={fixture.minute}
          />
        ))}
      </div>
    </div>
  );
}
