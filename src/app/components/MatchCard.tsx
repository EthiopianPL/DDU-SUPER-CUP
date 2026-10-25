import { useNavigate } from 'react-router';
import { DepartmentMark } from './DepartmentMark';
import { formatKickoff, formatMatchClock, getFixture, goalEvents } from '../../data/supercup';
import { useMatchClock } from '../useMatchClock';

interface Team {
  id: string | number;
  name: string;
  short_name: string;
  color: string;
  logo_url?: string;
}

interface MatchCardProps {
  id: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number | null;
  awayScore?: number | null;
  status: 'live' | 'upcoming' | 'finished';
  time?: string;
  date?: string;
  stadium?: string;
  matchMinute?: number;
  matchSecond?: number;
  injuryTime?: number;
  showDate?: boolean;
}

export function MatchCard({
  id,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  time,
  stadium,
  matchMinute = 0,
  showDate = true,
}: MatchCardProps) {
  const navigate = useNavigate();
  const fixture = getFixture(id);
  const clock = useMatchClock(status === 'live' ? id : undefined);
  const played = status === 'live' || status === 'finished';
  const scorers = fixture
    ? goalEvents(fixture).map((event) => `${event.minute}' ${event.playerName.split(' ').slice(-1)[0]}`).join(' · ')
    : '';
  const meta = fixture
    ? [`Group ${fixture.group}`, `MD${fixture.matchday}`, showDate ? formatKickoff(fixture.date, fixture.time) : '', stadium].filter(Boolean).join(' · ')
    : [time, stadium].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={() => navigate(`/match/${id}`)}
      className={`w-full rounded-2xl border bg-[#10192b] px-3.5 py-3 text-left ${
        status === 'live' ? 'border-red-500/40' : 'border-white/10'
      }`}
    >
      <Side name={homeTeam.name} shortName={homeTeam.short_name} color={homeTeam.color} score={played ? homeScore : null} />
      <div className="mt-2">
        <Side name={awayTeam.name} shortName={awayTeam.short_name} color={awayTeam.color} score={played ? awayScore : null} />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[11px] text-white/40">{meta}</p>
        <Stamp fixtureId={id} status={status} minute={clock?.minute ?? matchMinute} seconds={clock?.seconds} running={clock?.running} added={clock?.added} kickoff={fixture?.time ?? time} />
      </div>
      {scorers && <p className="mt-1 truncate text-[11px] text-white/55">{scorers}</p>}
    </button>
  );
}

function Side({
  name,
  shortName,
  color,
  score,
}: {
  name: string;
  shortName: string;
  color: string;
  score?: number | null;
}) {
  return (
    <span className="flex items-center gap-3">
      <DepartmentMark shortName={shortName} color={color} size={32} />
      <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">{name}</span>
      <span className="w-6 text-right text-lg font-black tabular-nums text-white">{score ?? ''}</span>
    </span>
  );
}

function Stamp({
  fixtureId,
  status,
  minute,
  seconds,
  running,
  added = 0,
  kickoff,
}: {
  fixtureId: string;
  status: MatchCardProps['status'];
  minute: number;
  seconds?: number;
  running?: boolean;
  added?: number;
  kickoff?: string;
}) {
  const fixture = getFixture(fixtureId);
  const detail = fixture?.detail;
  const period = fixture?.period;
  if (detail === 'postponed') return <span className="shrink-0 text-[11px] font-bold text-white/45">PST</span>;
  if (detail === 'cancelled') return <span className="shrink-0 text-[11px] font-bold text-white/35">CAN</span>;
  if (detail === 'abandoned') return <span className="shrink-0 text-[11px] font-bold text-white/35">ABD</span>;
  if (detail === 'suspended') return <span className="shrink-0 text-[11px] font-bold text-amber-200">SUS</span>;
  if (period === 'halftime') return <span className="shrink-0 text-[11px] font-bold text-white/70">HT</span>;
  if (detail === 'penalties' || period === 'penalties') return <span className="shrink-0 text-[11px] font-bold text-[#f5c518]">PEN</span>;
  if (status === 'live') {
    const label = seconds == null ? `${minute}'` : formatMatchClock({ minute, seconds });
    return (
      <span className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-bold ${running ? 'text-red-400' : 'text-white/70'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${running ? 'animate-pulse bg-red-500' : 'bg-white/30'}`} />
        {label}{added > 0 ? ` +${added}` : ''}
      </span>
    );
  }
  if (status === 'finished') return <span className="shrink-0 text-[11px] font-bold text-white/35">FT</span>;
  return <span className="shrink-0 text-[11px] font-bold text-[#f5c518]">{kickoff}</span>;
}
