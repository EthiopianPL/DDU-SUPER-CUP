import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MapPin } from 'lucide-react';
import { DepartmentMark } from '../components/DepartmentMark';
import { formatKickoff, getDepartment, getFixture } from '../../data/supercup';

export function MatchDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fixture = id ? getFixture(id) : undefined;

  if (!fixture) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-white/60">Match not found.</p>
        <button type="button" onClick={() => navigate('/matches')} className="mt-4 text-[#f5c518]">Back to matches</button>
      </div>
    );
  }

  const home = getDepartment(fixture.homeId);
  const away = getDepartment(fixture.awayId);
  const played = fixture.status !== 'upcoming';

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      <button type="button" onClick={() => navigate('/matches')} className="mb-4 flex items-center gap-2 text-sm text-white/60">
        <ArrowLeft className="h-4 w-4" />
        Matches
      </button>

      <div className="rounded-3xl border border-white/10 bg-[#10192b] p-5">
        <p className="text-center text-[11px] font-semibold tracking-[0.16em] text-[#f5c518]">
          GROUP {fixture.group} · MATCHDAY {fixture.matchday}
        </p>
        <p className="mt-1 text-center text-sm text-white/50">
          {formatKickoff(fixture.date, fixture.time)} · {fixture.time}
          {fixture.status === 'live' && fixture.minute != null ? ` · ${fixture.minute}'` : ''}
          {fixture.status === 'finished' ? ' · Full time' : ''}
        </p>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamSide
            name={home?.name ?? 'Home'}
            shortName={home?.shortName ?? '?'}
            color={home?.color ?? '#334155'}
            onClick={() => home && navigate(`/team/${home.id}`)}
          />
          <div className="text-center">
            {played ? (
              <p className="text-4xl font-black text-white">
                {fixture.homeScore} <span className="text-white/30">-</span> {fixture.awayScore}
              </p>
            ) : (
              <p className="text-sm font-black tracking-[0.2em] text-white/40">VS</p>
            )}
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">{fixture.status}</p>
          </div>
          <TeamSide
            name={away?.name ?? 'Away'}
            shortName={away?.shortName ?? '?'}
            color={away?.color ?? '#334155'}
            align="left"
            onClick={() => away && navigate(`/team/${away.id}`)}
          />
        </div>

        <p className="mt-6 flex items-center justify-center gap-1 text-sm text-white/50">
          <MapPin className="h-4 w-4" />
          {fixture.stadium}
        </p>
      </div>
    </div>
  );
}

function TeamSide({
  name,
  shortName,
  color,
  align = 'right',
  onClick,
}: {
  name: string;
  shortName: string;
  color: string;
  align?: 'left' | 'right';
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-col gap-2 ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
      <DepartmentMark shortName={shortName} color={color} size={52} />
      <span className="text-sm font-bold text-white">{name}</span>
    </button>
  );
}
