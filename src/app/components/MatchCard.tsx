import { useNavigate } from 'react-router';
import { MapPin } from 'lucide-react';
import { formatKickoff, formatMatchClock, getFixture } from '../../data/supercup';
import { useMatchClock } from '../useMatchClock';

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

function TeamBadge({ team }: { team: Team }) {
  if (team.logo_url) {
    return <img src={team.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover shadow-md transition-transform group-hover:scale-105 sm:h-12 sm:w-12" />;
  }
  return (
    <div
      className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full font-black text-xs sm:text-sm shadow-md transition-transform group-hover:scale-105"
      style={{
        background: team.color,
        color: team.color.toLowerCase() === '#f5c518' ? '#102018' : '#ffffff',
      }}
    >
      {team.short_name || team.name.charAt(0)}
    </div>
  );
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
  injuryTime = 0,
}: MatchCardProps) {
  const navigate = useNavigate();
  const clock = useMatchClock(status === 'live' ? id : undefined);
  const liveMinute = clock?.minute ?? matchMinute;

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

  const formattedLiveTime = clock
    ? `${formatMatchClock(clock)}${clock.added > 0 ? ` +${clock.added}` : ''}`
    : `${liveMinute}'${liveMinute >= 45 && injuryTime > 0 ? ` +${injuryTime}` : ''}`;

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
          <TeamBadge team={homeTeam} />
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
          <TeamBadge team={awayTeam} />
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
