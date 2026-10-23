import { useMemo, useState } from 'react';
import { MatchCard } from '../components/MatchCard';
import { GROUPS, cardTeam, fixtures, type GroupId } from '../../data/supercup';

type GroupFilter = 'all' | GroupId;

export function MatchesPage() {
  const [group, setGroup] = useState<GroupFilter>('all');
  const [matchday, setMatchday] = useState<0 | 1 | 2 | 3>(0);

  const visible = useMemo(
    () => fixtures.filter((fixture) => {
      const groupMatch = group === 'all' || fixture.group === group;
      const dayMatch = matchday === 0 || fixture.matchday === matchday;
      return groupMatch && dayMatch;
    }),
    [group, matchday],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      <h1 className="text-3xl font-black text-white">Matches</h1>
      <p className="mt-1 text-sm text-white/50">Group stage · each department plays the other three in its group</p>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        <FilterChip active={group === 'all'} onClick={() => setGroup('all')}>All</FilterChip>
        {GROUPS.map((item) => (
          <FilterChip key={item} active={group === item} onClick={() => setGroup(item)}>
            {item}
          </FilterChip>
        ))}
      </div>
      <div className="mb-4 flex gap-2">
        <FilterChip active={matchday === 0} onClick={() => setMatchday(0)}>All days</FilterChip>
        {[1, 2, 3].map((day) => (
          <FilterChip key={day} active={matchday === day} onClick={() => setMatchday(day as 1 | 2 | 3)}>
            MD{day}
          </FilterChip>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((fixture) => (
          <div key={fixture.id}>
            <MatchCard
              id={fixture.id}
              homeTeam={cardTeam(fixture.homeId)}
              awayTeam={cardTeam(fixture.awayId)}
              homeScore={fixture.homeScore}
              awayScore={fixture.awayScore}
              status={fixture.status}
              time={fixture.time}
              stadium={fixture.stadium}
              matchMinute={fixture.minute}
            />
          </div>
        ))}
        {visible.length === 0 && (
          <p className="py-10 text-center text-sm text-white/40">No matches for this filter.</p>
        )}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
        active ? 'bg-[#f5c518] text-[#102018]' : 'bg-white/5 text-white/70'
      }`}
    >
      {children}
    </button>
  );
}
