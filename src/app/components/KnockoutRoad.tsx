import { useNavigate } from 'react-router';
import { DepartmentMark } from './DepartmentMark';
import { knockoutRoad, stageLabel, type RoadSide, type RoadTie } from '../../data/knockout';

const ROUNDS = [
  { stage: 'r16' as const, title: 'Round of 16', teams: 16 },
  { stage: 'qf' as const, title: 'Quarter-finals', teams: 8 },
  { stage: 'sf' as const, title: 'Semi-finals', teams: 4 },
  { stage: 'final' as const, title: 'Final', teams: 2 },
];

export function KnockoutRoad() {
  const navigate = useNavigate();
  const ties = knockoutRoad();

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-[#10192b] p-4">
        <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">AFTER THE GROUPS</p>
        <h2 className="mt-1 text-xl font-black">Road to the final</h2>
        <p className="mt-1 text-sm text-white/50">Each group sends its top two. The four best third-placed teams join them, 16 down to 2.</p>
        <ol className="mt-4 grid grid-cols-4 gap-2">
          {ROUNDS.map((round) => (
            <li key={round.stage} className="rounded-2xl bg-white/5 px-2 py-3 text-center">
              <p className="text-2xl font-black text-[#f5c518]">{round.teams}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/45">{round.title}</p>
            </li>
          ))}
        </ol>
      </div>

      {ROUNDS.map((round) => (
        <section key={round.stage}>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-base font-black">{round.title}</h3>
            <span className="text-[11px] font-bold text-white/35">{round.teams} teams</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {ties.filter((tie) => tie.stage === round.stage).map((tie) => (
              <TieCard key={`${tie.stage}-${tie.slot}`} tie={tie} onOpen={(id) => navigate(`/match/${id}`)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TieCard({ tie, onOpen }: { tie: RoadTie; onOpen: (id: string) => void }) {
  const fixture = tie.fixture;
  const body = (
    <>
      <div className="flex items-center justify-between text-[11px] font-bold text-white/40">
        <span>{stageLabel(tie.stage)} · Tie {tie.slot}</span>
        <span>{fixture ? `${fixture.date.slice(5)} ${fixture.time}` : 'Open'}</span>
      </div>
      <SideRow side={tie.home} score={fixture && fixture.status !== 'upcoming' ? fixture.homeScore : undefined} />
      <SideRow side={tie.away} score={fixture && fixture.status !== 'upcoming' ? fixture.awayScore : undefined} />
    </>
  );
  const className = 'w-full rounded-2xl border border-white/10 bg-[#10192b] p-3 text-left';
  if (!fixture) return <div className={className}>{body}</div>;
  return (
    <button type="button" className={`${className} transition-colors hover:border-white/25`} onClick={() => onOpen(fixture.id)}>
      {body}
    </button>
  );
}

function SideRow({ side, score }: { side: RoadSide; score?: number }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      {side.team ? (
        <DepartmentMark shortName={side.team.shortName} color={side.team.color} size={28} src={side.team.crestUrl || undefined} />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-white/15 text-[10px] text-white/30">?</span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-bold">{side.team?.shortName || side.label}</span>
      {score != null && <span className="font-mono text-sm font-black">{score}</span>}
    </div>
  );
}
