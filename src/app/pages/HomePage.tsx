import { useNavigate } from 'react-router';
import { ChevronRight, Flame, Calendar } from 'lucide-react';
import { MatchCard } from '../components/MatchCard';
import { GroupTable } from '../components/GroupTable';
import { GROUPS, cardTeam, fixtures, topScorers } from '../../data/supercup';
import { DepartmentMark } from '../components/DepartmentMark';

export function HomePage() {
  const navigate = useNavigate();
  const live = fixtures.filter((fixture) => fixture.status === 'live');
  const upcoming = fixtures.filter((fixture) => fixture.status === 'upcoming').slice(0, 4);
  const leader = topScorers(1)[0];

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#10192b] px-5 py-6">
        <img
          src="/brand/ddu-logo.png"
          alt=""
          className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 object-contain opacity-30"
        />
        <p className="text-[11px] font-semibold tracking-[0.22em] text-[#f5c518]">DIRE DAWA UNIVERSITY</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Super Cup</h1>
        <p className="mt-2 max-w-sm text-sm text-white/60">
          Department football. Six groups, four teams in each group.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-[#2450c8]/20 px-3 py-1 text-[#9eb6f5]">6 groups</span>
          <span className="rounded-full bg-[#f5c518]/15 px-3 py-1 text-[#f5c518]">24 departments</span>
          <span className="rounded-full bg-[#2f9e44]/15 px-3 py-1 text-[#7ddea0]">Top 2 advance</span>
        </div>
      </section>

      {live.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black text-white">
              <Flame className="h-5 w-5 text-red-500" />
              Live now
            </h2>
            <button type="button" onClick={() => navigate('/matches')} className="flex items-center text-sm font-semibold text-[#f5c518]">
              Matches <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3">
            {live.map((fixture) => (
              <MatchCard
                key={fixture.id}
                id={fixture.id}
                homeTeam={cardTeam(fixture.homeId)}
                awayTeam={cardTeam(fixture.awayId)}
                homeScore={fixture.homeScore}
                awayScore={fixture.awayScore}
                status="live"
                stadium={fixture.stadium}
                matchMinute={fixture.minute}
              />
            ))}
          </div>
        </section>
      )}

      {leader?.department && (
        <button
          type="button"
          onClick={() => navigate(`/team/${leader.departmentId}`)}
          className="mb-6 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#10192b] px-4 py-4 text-left"
        >
          <span>
            <span className="text-[11px] font-semibold tracking-[0.16em] text-[#f5c518]">TOP SCORER</span>
            <span className="mt-1 block text-lg font-black text-white">{leader.name}</span>
            <span className="mt-1 flex items-center gap-2 text-xs text-white/50">
              <DepartmentMark shortName={leader.department.shortName} color={leader.department.color} size={22} />
              {leader.department.name}
            </span>
          </span>
          <span className="text-right">
            <span className="block text-3xl font-black text-[#f5c518]">{leader.goals}</span>
            <span className="text-xs text-white/40">goals</span>
          </span>
        </button>
      )}

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black text-white">Groups</h2>
          <button type="button" onClick={() => navigate('/groups')} className="flex items-center text-sm font-semibold text-[#f5c518]">
            Full tables <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid gap-3">
          {GROUPS.map((group) => (
            <GroupTable key={group} group={group} compact />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <Calendar className="h-5 w-5 text-[#f5c518]" />
            Next fixtures
          </h2>
        </div>
        <div className="space-y-3">
          {upcoming.map((fixture) => (
            <MatchCard
              key={fixture.id}
              id={fixture.id}
              homeTeam={cardTeam(fixture.homeId)}
              awayTeam={cardTeam(fixture.awayId)}
              status="upcoming"
              time={`${fixture.time} · Group ${fixture.group}`}
              stadium={fixture.stadium}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
