import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MapPin } from 'lucide-react';
import { formatKickoff, getFixture } from '../../data/supercup';

interface Team {
  id: string | number;
  name: string;
  short_name: string;
  color: string;
  logo_url?: string;
}

export interface MatchCardProps {
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
  matchSecond = 0,
  injuryTime = 0,
}: MatchCardProps) {
  const navigate = useNavigate();
  const [currentMinute, setCurrentMinute] = useState(matchMinute);
  const [, setCurrentSecond] = useState(matchSecond);

  // Sync state if props change
  useEffect(() => {
    setCurrentMinute(matchMinute);
    setCurrentSecond(matchSecond);
  }, [matchMinute, matchSecond]);

  // Live match second ticker
  useEffect(() => {
    if (status !== 'live') return;

    const interval = setInterval(() => {
      setCurrentSecond((prev) => {
        if (prev >= 59) {
          setCurrentMinute((m) => m + 1);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const fixture = getFixture(id);
  const venue = stadium ?? fixture?.stadium ?? 'DDU Campus Pitch';
  const kickoffTime = fixture?.time ?? time ?? '15:00';
  const matchDate = fixture?.date ?? '';

  const handleClick = () => {
    navigate(`/match/${id}`);
  };

  const isLive = status === 'live';
  const isFinished = status === 'finished';
  const isUpcoming = status === 'upcoming';

  const formattedLiveTime = `${currentMinute}'${currentMinute >= 45 && injuryTime > 0 ? ` +${injuryTime}` : ''}`;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${isLive ? `Live match ${formattedLiveTime}` : isFinished ? 'Finished match' : 'Upcoming match'}: ${homeTeam.name} ${isUpcoming ? 'vs' : `${homeScore ?? 0} - ${awayScore ?? 0}`} ${awayTeam.name}. View match details.`}
      className={`group relative overflow-hidden rounded-2xl border bg-[#121824] p-3.5 transition-all hover:border-white/20 hover:bg-[#161f30] active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070d18] ${
        isLive ? 'border-red-500/40 shadow-sm shadow-red-500/10' : 'border-white/[0.08] shadow-sm'
      }`}
    >
      {/* Three Horizontally Arranged Zones: Left (Home) · Center (Score/Time) · Right (Away) */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        {/* Left Zone — Home Team */}
        <div className="flex flex-col items-center justify-center text-center min-w-0">
          {/* Circular Badge (40–48px) */}
          <div
            className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full font-black text-xs sm:text-sm shadow-md transition-transform group-hover:scale-105"
            style={{
              background: homeTeam.color,
              color: homeTeam.color.toLowerCase() === '#f5c518' ? '#102018' : '#ffffff',
            }}
          >
            {homeTeam.short_name || homeTeam.name.charAt(0)}
          </div>
          {/* Department Name Centered Directly Below */}
          <span
            className="mt-2 block max-w-[110px] sm:max-w-[150px] truncate text-xs font-bold leading-tight text-white group-hover:text-[#f5c518] sm:text-sm transition-colors"
            title={homeTeam.name}
          >
            {homeTeam.name}
          </span>
        </div>

        {/* Center Zone — Match Details (Score / Kickoff Time / Status) */}
        <div className="flex min-w-[85px] sm:min-w-[120px] shrink-0 flex-col items-center justify-center text-center">
          {isLive || isFinished ? (
            <>
              {/* Prominent Score in Tournament Gold Accent */}
              <div className="flex items-center justify-center gap-1.5 font-mono text-2xl font-black tracking-tight text-[#f5c518] sm:text-3xl">
                <span>{homeScore ?? 0}</span>
                <span className="text-lg font-normal text-white/30 sm:text-xl">-</span>
                <span>{awayScore ?? 0}</span>
              </div>

              {/* Status beneath score */}
              {isLive ? (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  LIVE {formattedLiveTime}
                </span>
              ) : (
                <span className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                  FT
                </span>
              )}
            </>
          ) : (
            <>
              {/* Prominent Kickoff Time */}
              <span className="font-mono text-xl font-black text-white sm:text-2xl">
                {kickoffTime}
              </span>

              {/* VS indicator and Match date/status beneath */}
              <div className="mt-1 flex items-center justify-center gap-1">
                <span className="rounded bg-[#f5c518]/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#f5c518]">
                  VS
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#f5c518]">
                  {matchDate ? formatKickoff(matchDate, kickoffTime) : 'Upcoming'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Zone — Away Team */}
        <div className="flex flex-col items-center justify-center text-center min-w-0">
          {/* Circular Badge (40–48px) */}
          <div
            className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full font-black text-xs sm:text-sm shadow-md transition-transform group-hover:scale-105"
            style={{
              background: awayTeam.color,
              color: awayTeam.color.toLowerCase() === '#f5c518' ? '#102018' : '#ffffff',
            }}
          >
            {awayTeam.short_name || awayTeam.name.charAt(0)}
          </div>
          {/* Department Name Centered Directly Below */}
          <span
            className="mt-2 block max-w-[110px] sm:max-w-[150px] truncate text-xs font-bold leading-tight text-white group-hover:text-[#f5c518] sm:text-sm transition-colors"
            title={awayTeam.name}
          >
            {awayTeam.name}
          </span>
        </div>
      </div>

      {/* Subtle Footer: Venue Information */}
      <div className="mt-2.5 flex items-center justify-center border-t border-white/[0.04] pt-2 text-[10px] sm:text-[11px] text-white/40">
        <MapPin className="mr-1 h-3 w-3 shrink-0 text-white/30" />
        <span className="truncate">{venue}</span>
      </div>
    </div>
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
