// src/app/components/MatchCard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MapPin } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface Team {
  id: number;
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
  injuryTime = 0
}: MatchCardProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [currentMinute, setCurrentMinute] = useState(matchMinute);
  const [currentSecond, setCurrentSecond] = useState(matchSecond);
  const [currentHalf, setCurrentHalf] = useState<'first' | 'second'>(matchMinute < 45 ? 'first' : 'second');
  const [homeImageError, setHomeImageError] = useState(false);
  const [awayImageError, setAwayImageError] = useState(false);

  // Update when props change (realtime updates)
  useEffect(() => {
    setCurrentMinute(matchMinute);
    setCurrentSecond(matchSecond);
    setCurrentHalf(matchMinute < 45 ? 'first' : 'second');
  }, [matchMinute, matchSecond]);

  // Local timer for smooth ticking on live matches
  useEffect(() => {
    if (status !== 'live') return;

    const interval = setInterval(() => {
      setCurrentSecond(prev => {
        if (prev >= 59) {
          setCurrentMinute(m => {
            const newMinute = m + 1;
            if (newMinute === 45) {
              setCurrentHalf('second');
            }
            return newMinute;
          });
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const formatTime = () => {
    let displayMinute = currentMinute;
    let displayExtra = '';

    // Add injury time only after 45 minutes
    if (currentMinute >= 45 && injuryTime > 0) {
      displayExtra = ` +${injuryTime}`;
    }

    if (currentMinute >= 90) {
      return t('FT');
    }
    if (currentMinute === 45) {
      return t('HT') + displayExtra;
    }

    return `${displayMinute}:${currentSecond.toString().padStart(2, '0')}${displayExtra}`;
  };

  const getProgressPercentage = () => {
    if (currentMinute >= 90) return 100;
    return (currentMinute / 90) * 100;
  };

  const homeTeamName = homeTeam.short_name || homeTeam.name;
  const awayTeamName = awayTeam.short_name || awayTeam.name;

  const handleClick = () => {
    navigate(`/match/${id}`);
  };

  // Get the current display time for live matches
  const liveDisplay = status === 'live' ? formatTime() : null;
  const progressPercentage = status === 'live' ? getProgressPercentage() : 0;

  return (
    <div
      onClick={handleClick}
      className="rounded-xl overflow-hidden transition-all hover:scale-[1.02] cursor-pointer group"
      style={{
        background: 'rgba(26, 31, 46, 0.8)',
        border: status === 'live' ? '1px solid #e63946' : '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          {status === 'live' && (
            <>
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 text-xs font-semibold">{t('LIVE')}</span>
              <span className="text-red-400 text-xs font-mono">{liveDisplay}</span>
            </>
          )}
          {status === 'finished' && (
            <span className="text-gray-400 text-xs font-semibold">{t('FULL TIME')}</span>
          )}
          {status === 'upcoming' && time && (
            <span className="text-blue-400 text-xs font-semibold">{time}</span>
          )}
        </div>
        {stadium && (
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-500">{stadium}</span>
          </div>
        )}
      </div>

      {/* Match Content */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-3 mb-3">
              <span className="text-white font-bold text-base sm:text-lg">{homeTeamName}</span>
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shadow-md">
                {homeTeam.logo_url && !homeImageError ? (
                  <img
                    src={homeTeam.logo_url}
                    alt={homeTeam.name}
                    className="w-full h-full object-cover"
                    onError={() => setHomeImageError(true)}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-base font-bold text-black"
                    style={{ background: homeTeam.color }}
                  >
                    {homeTeam.short_name?.charAt(0) || homeTeam.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>
            {(status === 'live' || status === 'finished') && (
              <div className="text-3xl sm:text-4xl font-black text-white">
                {homeScore !== null && homeScore !== undefined ? homeScore : '-'}
              </div>
            )}
          </div>

          {/* VS Divider */}
          <div className="text-center">
            {status === 'live' ? (
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-red-500 text-xs font-bold">{t('LIVE')}</span>
              </div>
            ) : status === 'finished' ? (
              <div className="text-gray-500 font-bold text-sm">{t('FT')}</div>
            ) : (
              <div className="text-gray-500 font-bold text-sm">{t('VS')}</div>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shadow-md">
                {awayTeam.logo_url && !awayImageError ? (
                  <img
                    src={awayTeam.logo_url}
                    alt={awayTeam.name}
                    className="w-full h-full object-cover"
                    onError={() => setAwayImageError(true)}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-base font-bold text-black"
                    style={{ background: awayTeam.color }}
                  >
                    {awayTeam.short_name?.charAt(0) || awayTeam.name.charAt(0)}
                  </div>
                )}
              </div>
              <span className="text-white font-bold text-base sm:text-lg">{awayTeamName}</span>
            </div>
            {(status === 'live' || status === 'finished') && (
              <div className="text-3xl sm:text-4xl font-black text-white">
                {awayScore !== null && awayScore !== undefined ? awayScore : '-'}
              </div>
            )}
          </div>
        </div>

        {/* Live Match Progress Bar */}
        {status === 'live' && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>{currentHalf === 'first' ? t('1st Half') : t('2nd Half')}</span>
              <span className="font-mono">{liveDisplay}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-red-500 h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}