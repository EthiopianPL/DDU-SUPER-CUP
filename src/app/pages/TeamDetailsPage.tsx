import { useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { MatchCard } from '../components/MatchCard';
import { DepartmentMark, Portrait } from '../components/DepartmentMark';
import {
  cardTeam,
  fixturesForDepartment,
  getDepartment,
  playersForDepartment,
  standingsFor,
} from '../../data/supercup';

export function TeamDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const department = id ? getDepartment(id) : undefined;

  if (!department) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-white/60">Department not found.</p>
        <button type="button" onClick={() => navigate('/discover?tab=groups')} className="mt-4 text-[#f5c518]">Back to Discover</button>
      </div>
    );
  }

  const row = standingsFor(department.group).find((entry) => entry.department.id === department.id);
  const squad = playersForDepartment(department.id);
  const captain = squad.find((player) => player.position === 'FWD') ?? squad[0];
  const matches = fixturesForDepartment(department.id);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      <button type="button" onClick={() => navigate('/discover?tab=groups')} className="mb-4 flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Discover
      </button>

      <div className="rounded-3xl border border-white/10 bg-[#10192b] p-5">
        <DepartmentMark shortName={department.shortName} color={department.color} size={56} src={department.crestUrl || undefined} />
        <p className="mt-4 text-[11px] font-semibold tracking-[0.16em] text-[#f5c518]">GROUP {department.group}</p>
        <h1 className="mt-1 text-3xl font-black text-white">{department.name}</h1>
        <p className="mt-1 text-sm text-white/50">{department.college}</p>
        <p className="mt-1 text-sm text-white/40">{department.pitch}</p>
        {captain && <p className="mt-3 text-sm text-white/70">Captain · {captain.name}</p>}

        {row && (
          <div className="mt-5 grid grid-cols-4 gap-2 text-center">
            {[
              ['P', row.played],
              ['W', row.won],
              ['GD', row.goalDifference],
              ['Pts', row.points],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-white/5 py-3">
                <p className="text-[10px] uppercase tracking-wide text-white/40">{label}</p>
                <p className="text-xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="mb-3 mt-6 text-lg font-black text-white">Fixtures</h2>
      <div className="space-y-3">
        {matches.map((fixture) => (
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

      <h2 className="mb-3 mt-6 text-lg font-black text-white">Squad</h2>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#10192b]">
        {squad.map((player) => (
          <div key={player.id} className="flex items-center justify-between border-b border-white/5 px-4 py-3 last:border-b-0">
            <div className="flex items-center gap-3">
              <Portrait name={player.name} src={player.photoUrl || undefined} size={36} />
              <span className="w-6 text-sm font-black text-white/40">{player.number}</span>
              <div>
                <p className="text-sm font-semibold text-white">{player.name}</p>
                <p className="text-xs text-white/40">{player.position}</p>
              </div>
            </div>
            <p className="text-sm text-white/70">{player.goals} {player.goals === 1 ? 'goal' : 'goals'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
