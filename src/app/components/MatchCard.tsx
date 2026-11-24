import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Clock, MapPin, Video } from 'lucide-react';
import { formatKickoff, formatLiveTime, getFixture, leagueRules, teamRedCards } from '../../data/supercup';
import { useLeagueVersion } from '../../data/live';
import { RedCards } from './RedCards';
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
  status: 'live' | 'upcoming' | 'finished' | 'postponed' | 'cancelled' | string;
  detail?: string;
  time?: string;
  date?: string;
  stadium?: string;
  matchMinute?: number;
  matchSecond?: number;
  injuryTime?: number;
  showDate?: boolean;
  competition?: string;
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
  detail,
  time,
  stadium,
  matchMinute = 0,
  injuryTime = 0,
  showDate = false,
  date,
  competition,
}: MatchCardProps) {
  const navigate = useNavigate();
  const version = useLeagueVersion();
  const clock = useMatchClock(status === 'live' ? id : undefined);
  const homeReds = useMemo(() => teamRedCards(id, String(homeTeam.id)), [id, homeTeam.id, version]);
  const awayReds = useMemo(() => teamRedCards(id, String(awayTeam.id)), [id, awayTeam.id, version]);
  const liveMinute = clock?.minute ?? matchMinute;

  const fixture = getFixture(id);
  const venue = stadium ?? fixture?.stadium ?? 'DDU Campus Pitch';
  const kickoffTime = fixture?.time ?? time ?? '15:00';
  const matchDate = fixture?.date ?? date ?? '';

  const rawDetail = (detail ?? fixture?.detail ?? '').toLowerCase();
  const rawStatus = (status ?? fixture?.status ?? '').toLowerCase();

  const isPostponed = rawStatus === 'postponed' || rawDetail === 'postponed';
  const isCancelled = rawStatus === 'cancelled' || rawDetail === 'cancelled';
  const isLive = !isPostponed && !isCancelled && rawStatus === 'live';
  const isFinished = !isPostponed && !isCancelled && rawStatus === 'finished';
  const isUpcoming = !isLive && !isFinished;

  const formattedDate = useMemo(() => {
    if (!matchDate) return '';
    try {
      const cleanTime = fixture?.time || (time && /^\d{1,2}:\d{2}$/.test(time) ? time : '15:00');
      return formatKickoff(matchDate, cleanTime);
    } catch {
      return matchDate;
    }
  }, [matchDate, fixture?.time, time]);

  const handleClick = () => {
    navigate(`/match/${id}`);
  };

  const halfMinute = Math.round((fixture?.halfSeconds ?? leagueRules.halfMinutes * 60) / 60);
  const formattedLiveTime = clock
    ? formatLiveTime(clock)
    : `${liveMinute}'${liveMinute >= halfMinute && injuryTime > 0 ? ` +${injuryTime}` : ''}`;

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
      aria-label={`${
        isLive
          ? `Live match ${formattedLiveTime}`
          : isPostponed
          ? 'Postponed match'
          : isCancelled
          ? 'Cancelled match'
          : isFinished
          ? 'Finished match'
          : 'Upcoming match'
      }: ${homeTeam.name} ${isUpcoming || isPostponed || isCancelled ? 'vs' : `${homeScore ?? 0} - ${awayScore ?? 0}`} ${awayTeam.name}. View match details.`}
      className={`group relative overflow-hidden rounded-2xl border bg-[#121824] p-3.5 transition-all hover:border-white/20 hover:bg-[#161f30] active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070d18] ${
        isLive
          ? 'border-red-500/40 shadow-sm shadow-red-500/10'
          : isPostponed
          ? 'border-amber-500/35 bg-[#141824] shadow-sm shadow-amber-500/5'
          : isCancelled
          ? 'border-red-500/30 bg-[#141824] shadow-sm'
          : 'border-white/[0.08] shadow-sm'
      }`}
    >
      {/* Postponed / Cancelled Banner */}
      {isPostponed && (
        <div className="mb-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
          <Clock className="h-3 w-3 shrink-0 text-amber-400" />
          <span>Match Postponed</span>
        </div>
      )}
      {isCancelled && (
        <div className="mb-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
          <span>Match Cancelled</span>
        </div>
      )}

      {/* Three Horizontally Arranged Zones: Left (Home) · Center (Score/Time) · Right (Away) */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        {/* Left Zone — Home Team */}
        <div className="flex flex-col items-center justify-center text-center min-w-0">
          {/* Circular Badge (40–48px) */}
          <TeamBadge team={homeTeam} />
          {/* Department Name Centered Directly Below */}
          <span className="mt-2 inline-flex max-w-full items-center justify-center gap-1">
            {homeReds > 0 && <RedCards count={homeReds} />}
            <span
              className="block max-w-[110px] truncate text-xs font-bold leading-tight text-white transition-colors group-hover:text-[#f5c518] sm:max-w-[150px] sm:text-sm"
              title={homeTeam.name}
            >
              {homeTeam.name}
            </span>
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
                <>
                  <span className="mt-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                    FT
                  </span>
                  {showDate && (
                    <span className="mt-1 max-w-[140px] text-[10px] font-semibold leading-tight text-white/45">
                      {date}{competition ? ` · ${competition}` : ''}
                    </span>
                  )}
                </>
              )}
            </>
          ) : isPostponed ? (
            <>
              {/* Prominent Postponed Badge */}
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-400 shadow-sm sm:text-[11px]">
                <Clock className="h-3 w-3 shrink-0 text-amber-400" />
                Postponed
              </span>

              {/* VS indicator and Match date/time beneath */}
              <div className="mt-1 flex items-center justify-center gap-1">
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/50">
                  VS
                </span>
                <span className="text-[10px] font-medium text-white/40 line-through">
                  {kickoffTime}
                </span>
                {formattedDate && (
                  <span className="text-[10px] font-medium text-white/40">
                    · {formattedDate}
                  </span>
                )}
              </div>
            </>
          ) : isCancelled ? (
            <>
              {/* Prominent Cancelled Badge */}
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-400 shadow-sm sm:text-[11px]">
                Cancelled
              </span>

              {/* VS indicator and Match date/time beneath */}
              <div className="mt-1 flex items-center justify-center gap-1">
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/50">
                  VS
                </span>
                <span className="text-[10px] font-medium text-white/40 line-through">
                  {kickoffTime}
                </span>
                {formattedDate && (
                  <span className="text-[10px] font-medium text-white/40">
                    · {formattedDate}
                  </span>
                )}
              </div>
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
                  {formattedDate || 'Upcoming'}
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
          <span className="mt-2 inline-flex max-w-full items-center justify-center gap-1">
            <span
              className="block max-w-[110px] truncate text-xs font-bold leading-tight text-white transition-colors group-hover:text-[#f5c518] sm:max-w-[150px] sm:text-sm"
              title={awayTeam.name}
            >
              {awayTeam.name}
            </span>
            {awayReds > 0 && <RedCards count={awayReds} />}
          </span>
        </div>
      </div>

      {/* Subtle Footer: Venue Information */}
      <div className="mt-2.5 flex items-center justify-center border-t border-white/[0.04] pt-2 text-[10px] sm:text-[11px] text-white/40">
        <MapPin className="mr-1 h-3 w-3 shrink-0 text-white/30" />
        <span className="truncate">{venue}</span>
      </div>

      {/* Live Streamer Badge in new line */}
      {fixture?.streamer && (
        <div className="mt-1.5 flex items-center justify-center">
          {isLive ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              <Video className="h-3 w-3 text-red-400 shrink-0" />
              <span className="uppercase tracking-wider">Streamer:</span>
              <span className="font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">{fixture.streamer}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] text-white/40">
              <Video className="h-3 w-3 text-white/30 shrink-0" />
              <span>Streamer: <strong className="font-semibold text-white/60 truncate max-w-[120px] sm:max-w-[160px]">{fixture.streamer}</strong></span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
