import { useMemo, useState } from 'react';
import { MatchCard } from '../components/MatchCard';
import { GROUPS, cardTeam, fixtures, type GroupId } from '../../data/supercup';
import { useLeagueVersion } from '../../data/live';

type GroupFilter = 'all' | GroupId;
type StatusFilter = 'all' | 'live' | 'upcoming' | 'finished';

const STATUSES: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Live' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'finished', label: 'Finished' },
];

export function MatchesPage() {
  const [status, setStatus] = useState<StatusFilter>('all');
  const [group, setGroup] = useState<GroupFilter>('all');
  const [matchday, setMatchday] = useState<0 | 1 | 2 | 3>(0);
  const version = useLeagueVersion();

  const days = useMemo(() => {
    const visible = fixtures.filter((fixture) => {
      const statusMatch = status === 'all' || fixture.status === status;
      const groupMatch = group === 'all' || fixture.group === group;
      const dayMatch = matchday === 0 || fixture.matchday === matchday;
      return statusMatch && groupMatch && dayMatch;
    });
    const grouped = new Map<string, typeof visible>();
    visible.forEach((fixture) => {
      const list = grouped.get(fixture.date) ?? [];
      list.push(fixture);
      grouped.set(fixture.date, list);
    });
    return [...grouped.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, list]) => [date, [...list].sort((left, right) => left.time.localeCompare(right.time) || left.group.localeCompare(right.group))] as const);
  }, [status, group, matchday, version]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      <h1 className="text-3xl font-black text-white">Matches</h1>

      <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-[#10192b] p-1" role="tablist" aria-label="Match status">
        {STATUSES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStatus(item.id)}
            className={`rounded-xl py-2 text-xs font-bold sm:text-sm ${
              status === item.id ? 'bg-[#f5c518] text-[#102018]' : 'text-white/50'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="Group and matchday">
        <FilterChip active={group === 'all'} onClick={() => setGroup('all')}>All</FilterChip>
        {GROUPS.map((item) => (
          <FilterChip key={item} active={group === item} onClick={() => setGroup(item)}>{item}</FilterChip>
        ))}
        <span className="mx-1 w-px shrink-0 self-stretch bg-white/10" />
        <FilterChip active={matchday === 0} onClick={() => setMatchday(0)}>Days</FilterChip>
        {[1, 2, 3].map((day) => (
          <FilterChip key={day} active={matchday === day} onClick={() => setMatchday(day as 1 | 2 | 3)}>
            MD{day}
          </FilterChip>
        ))}
      </div>

      <div className="mt-4 space-y-5">
        {days.map(([date, list]) => (
          <section key={date}>
            <h2 className="mb-2 text-[11px] font-bold tracking-[0.14em] text-white/40">{dayLabel(date)}</h2>
            <div className="space-y-2">
              {list.map((fixture) => (
                <MatchCard
                  key={fixture.id}
                  id={fixture.id}
                  homeTeam={cardTeam(fixture.homeId)}
                  awayTeam={cardTeam(fixture.awayId)}
                  homeScore={fixture.homeScore}
                  awayScore={fixture.awayScore}
                  status={fixture.status}
                  time={fixture.time}
                  stadium={fixture.stadium}
                  matchMinute={fixture.minute}
                  showDate={false}
                />
              ))}
            </div>
          </section>
        ))}
        {days.length === 0 && (
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
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
        active ? 'bg-[#f5c518] text-[#102018]' : 'bg-white/5 text-white/60'
      }`}
    >
      {children}
    </button>
  );
}

function dayLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).toUpperCase();
}
