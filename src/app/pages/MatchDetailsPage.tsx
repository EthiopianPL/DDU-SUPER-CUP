// src/app/pages/MatchDetailsPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Share2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../context/LanguageContext';

interface Team {
  id: number;
  name: string;
  short_name: string;
  color: string;
  stadium?: string;
  logo_url?: string;
}

interface MatchEvent {
  id: number;
  match_id: number;
  type: string;
  minute: number;
  minute_extra?: number;
  player_id: number;
  player_name: string;
  team_id: number;
  assisted_by?: string;
  is_penalty?: boolean;
  is_own_goal?: boolean;
  is_second_yellow?: boolean;   
}
interface MatchDetails {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
  matchweek: number;
  date: string;
  time: string;
  stadium: string;
  attendance: number | null;
  referee: string | null;
  match_minute?: number;
  match_second?: number;
  match_half?: string;
  injury_time_first_half?: number;
  injury_time_second_half?: number;
  homeTeam?: Team;
  awayTeam?: Team;
}

export function MatchDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [match, setMatch] = useState<MatchDetails | null>(null);
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [homeLogoError, setHomeLogoError] = useState(false);
  const [awayLogoError, setAwayLogoError] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // Fetch initial data
  useEffect(() => {
    if (id) {
      fetchMatchDetails();
      fetchMatchEvents();
    }
  }, [id]);

  // Real-time subscription for match updates
  useEffect(() => {
    if (!id) return;

    const matchSubscription = supabase
      .channel(`match_${id}_updates`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          console.log('Match update received:', payload);
          const updatedMatch = payload.new;
          setMatch(prev => prev ? { ...prev, ...updatedMatch } : null);
          setRealtimeConnected(true);
        }
      )
      .subscribe();

    const eventsSubscription = supabase
      .channel(`match_${id}_events`)
     .on(
       'postgres_changes',
       {
          event: 'INSERT',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${id}`,
        },
      (payload) => {
       console.log('New event received:', payload);
        const newEvent = payload.new as MatchEvent;   // ✅ cast to MatchEvent
        setEvents(prev => [...prev, newEvent].sort((a, b) => a.minute - b.minute));
        setRealtimeConnected(true);
      }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'match_events',
          filter: `match_id=eq.${id}`,
        },
        () => {
          console.log('Event deleted, refreshing events');
          fetchMatchEvents();
          setRealtimeConnected(true);
        }
      )
      .subscribe();

    return () => {
      matchSubscription.unsubscribe();
      eventsSubscription.unsubscribe();
    };
  }, [id]);

  // Poll for updates every 3 seconds as fallback
  useEffect(() => {
    if (!id) return;

    const interval = setInterval(async () => {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single();

      if (!matchError && matchData) {
        setMatch(prev => prev ? { ...prev, ...matchData } : null);
      }

      const { data: eventsData, error: eventsError } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', id)
        .order('minute', { ascending: true });

      if (!eventsError && eventsData) {
        setEvents(eventsData);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [id]);

  const fetchMatchDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          homeTeam:home_team_id(id, name, short_name, color, stadium, logo_url),
          awayTeam:away_team_id(id, name, short_name, color, stadium, logo_url)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setMatch(data);
    } catch (error) {
      console.error('Error fetching match details:', error);
    }
  };

  const fetchMatchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('match_events')
        .select('*')
        .eq('match_id', id)
        .order('minute', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'goal': return '⚽';
      case 'yellow_card': return '🟨';
      case 'red_card': return '🟥';
      case 'substitution': return '🔄';
      case 'offside': return '🚩';
      case 'foul': return '⚠️';
      case 'penalty': return '🔴';
      case 'corner': return '⤴️';
      case 'red_card': return event.is_second_yellow ? '🟨➡️🟥' : '🟥';
      default: return '📋';
    }
  };
const mergeCardEvents = (events: MatchEvent[]) => {
  const merged: MatchEvent[] = [];
  const used = new Set<number>();

  for (let i = 0; i < events.length; i++) {
    if (used.has(i)) continue;
    const event = events[i];

    // Only try to merge if this is a yellow card
    if (event.type === 'yellow_card') {
      let redIndex = -1;
      // Look for a red card by the same player at the EXACT SAME minute
      for (let j = i + 1; j < events.length; j++) {
        const other = events[j];
        if (
          other.type === 'red_card' &&
          other.player_id === event.player_id &&
          other.minute === event.minute
        ) {
          redIndex = j;
          break;
        }
      }
      if (redIndex !== -1) {
        // This is a second yellow that caused an immediate red (same minute)
        used.add(redIndex);
        used.add(i);
        const combined: MatchEvent = {
          ...events[redIndex],
          type: 'red_card',
          is_second_yellow: true,
        };
        merged.push(combined);
        continue;
      }
    }
    // All other events (including normal yellow cards) remain unchanged
    merged.push(event);
  }
  return merged;
};
  
const getEventText = (event: MatchEvent) => {
  switch (event.type) {
    case 'goal':
      let text = t(event.player_name);
      if (event.is_penalty) text += ` (${t('Penalty')})`;
      if (event.is_own_goal) text += ` (${t('OG')})`;
      if (!event.is_penalty && event.assisted_by) {
        const assistPlayer = events.find(e => e.player_id === Number(event.assisted_by));
        if (assistPlayer) text += ` (${t(assistPlayer.player_name)})`;
      }
      return text;
    case 'yellow_card':
      return t(event.player_name);   // just the name
    case 'red_card':
      if (event.is_second_yellow) {
        return `${t(event.player_name)} (YC → RC)`;
      }
      return `${t(event.player_name)} (Direct red)`;
    default:
      return t(event.player_name);
  }
};
  const computeScoresFromEvents = (events: MatchEvent[], homeTeamId: number, awayTeamId: number) => {
  let homeScore = 0;
  let awayScore = 0;
  events.forEach(event => {
    if (event.type === 'goal') {
      if (event.is_own_goal) {
        if (event.team_id === homeTeamId) awayScore++;
        else homeScore++;
      } else {
        if (event.team_id === homeTeamId) homeScore++;
        else awayScore++;
      }
    }
  });
  return { homeScore, awayScore };
};

  const formatTime = () => {
    if (!match) return 'TBD';

    if (match.status === 'finished') {
      return t('FT');
    }
    if (match.status === 'scheduled') {
      return match.time || 'TBD';
    }

    const minute = match.match_minute || 0;
    const second = match.match_second || 0;
    const injuryTimeFirst = match.injury_time_first_half || 0;
    const injuryTimeSecond = match.injury_time_second_half || 0;
    const injuryTime = minute >= 45 ? injuryTimeSecond : injuryTimeFirst;

    if (minute >= 90) {
      return t('FT');
    }
    if (minute === 45 && injuryTimeFirst > 0) {
      return `${t('HT')} +${injuryTimeFirst}`;
    }
    if (minute === 45) {
      return t('HT');
    }

    let displayMinute = minute;
    let extra = '';

    if (minute >= 45 && injuryTimeSecond > 0) {
      extra = ` +${injuryTimeSecond}`;
    } else if (minute < 45 && injuryTimeFirst > 0 && minute === 44) {
      extra = ` +${injuryTimeFirst}`;
    }

    return `${displayMinute}:${second.toString().padStart(2, '0')}${extra}`;
  };

  const getLivePercentage = () => {
    if (!match) return 0;
    const minute = match.match_minute || 0;
    if (minute >= 90) return 100;
    return (minute / 90) * 100;
  };

  const handleShare = async () => {
    if (!match) return;
    const shareData = {
      title: `${t(match.homeTeam?.name || '')} vs ${t(match.awayTeam?.name || '')}`,
      text: t('Follow the latest Ethiopian Premier League match details.'),
      url: window.location.href,
    };
    if (navigator.share) {
      await navigator.share(shareData);
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareData.url);
      alert(t('Link copied to clipboard!'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-400 mb-4">{t('Match not found')}</p>
          <button onClick={() => navigate('/matches')} className="px-4 py-2 bg-[#ffd700] text-black rounded-lg font-semibold">
            {t('Back to Matches')}
          </button>
        </div>
      </div>
    );
  }

  const mergedEvents = mergeCardEvents(events);
  const homeEvents = mergedEvents.filter(e => e.team_id === match.home_team_id);
  const awayEvents = mergedEvents.filter(e => e.team_id === match.away_team_id);
  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  // Translate team names
  const translatedHomeTeam = match.homeTeam ? {
    ...match.homeTeam,
    name: t(match.homeTeam.name),
    short_name: t(match.homeTeam.short_name)
  } : undefined;

  const translatedAwayTeam = match.awayTeam ? {
    ...match.awayTeam,
    name: t(match.awayTeam.name),
    short_name: t(match.awayTeam.short_name)
  } : undefined;
 const getCardIcon = (type: string) => {
  if (type === 'yellow_card') {
    return <div className="w-8 h-10 bg-yellow-500 rounded-sm shadow-md" />;
  }
  if (type === 'red_card') {
    return <div className="w-8 h-10 bg-red-600 rounded-sm shadow-md" />;
  }
  return null;
};

const processEventsForDisplay = (events: MatchEvent[]): MatchEvent[] => {
  const result: MatchEvent[] = [];
  const skipIndices = new Set<number>();

  for (let i = 0; i < events.length; i++) {
    if (skipIndices.has(i)) continue;
    const event = events[i];

    if (event.type === 'yellow_card') {
      // Look for a red card by the same player at the same minute
      const redIndex = events.findIndex((other, idx) =>
        idx !== i &&
        other.type === 'red_card' &&
        other.player_id === event.player_id &&
        other.minute === event.minute
      );
      if (redIndex !== -1) {
        // Merge: skip both, add a single red card flagged as second yellow
        skipIndices.add(redIndex);
        skipIndices.add(i);
        const mergedRed: MatchEvent = {
          ...events[redIndex],
          is_second_yellow: true,
        };
        result.push(mergedRed);
        continue;
      }
    }
    result.push(event);
  }
  return result;
};
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e1a] to-[#0a0e1a]">
      {/* Realtime Connection Status */}
      {realtimeConnected && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-500 text-xs">{t('Live Updates Active')}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/80 border-b border-white/10">
        <div className="px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/matches')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>{t('Back')}</span>
          </button>
          <div className="flex gap-2">
            <button onClick={handleShare} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <Share2 className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Score Header */}
      <div className="px-4 pt-6 pb-4 bg-gradient-to-b from-[#1a1f2e]/50 to-transparent">
        <div className="flex items-center justify-between gap-2 mb-6">
          {/* Home Team */}
          <div className="flex-1 text-center">
            <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden flex items-center justify-center shadow-xl" style={{
              background: `${match.homeTeam?.color}20`,
              border: `3px solid ${match.homeTeam?.color}`
            }}>
              {match.homeTeam?.logo_url && !homeLogoError ? (
                <img
                  src={match.homeTeam.logo_url}
                  alt={match.homeTeam.name}
                  className="w-full h-full object-cover"
                  onError={() => setHomeLogoError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black" style={{ background: match.homeTeam?.color, color: '#000' }}>
                  {match.homeTeam?.short_name?.charAt(0) || match.homeTeam?.name?.charAt(0)}
                </div>
              )}
            </div>
            <h2 className="text-white font-bold text-lg mb-1">{translatedHomeTeam?.name || match.homeTeam?.name}</h2>
            <p className="text-xs text-gray-400">{translatedHomeTeam?.short_name || match.homeTeam?.short_name}</p>
          </div>

          {/* Score */}
          <div className="text-center">
            <div className="text-5xl font-black text-white mb-2">
              {(() => {
                  const computed = computeScoresFromEvents(events, match.home_team_id, match.away_team_id);
                  return `${computed.homeScore} - ${computed.awayScore}`;
              })()}
            </div>
            {isLive && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 text-xs font-semibold">{t('LIVE')}</span>
                <span className="text-red-400 text-xs font-mono">{formatTime()}</span>
              </div>
            )}
            {isFinished && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-500/20">
                <span className="text-gray-400 text-xs font-semibold">{t('FULL TIME')}</span>
              </span>
            )}
            {!isLive && !isFinished && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20">
                <span className="text-blue-400 text-xs font-semibold">{match.time}</span>
              </span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex-1 text-center">
            <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden flex items-center justify-center shadow-xl" style={{
              background: `${match.awayTeam?.color}20`,
              border: `3px solid ${match.awayTeam?.color}`
            }}>
              {match.awayTeam?.logo_url && !awayLogoError ? (
                <img
                  src={match.awayTeam.logo_url}
                  alt={match.awayTeam.name}
                  className="w-full h-full object-cover"
                  onError={() => setAwayLogoError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black" style={{ background: match.awayTeam?.color, color: '#000' }}>
                  {match.awayTeam?.short_name?.charAt(0) || match.awayTeam?.name?.charAt(0)}
                </div>
              )}
            </div>
            <h2 className="text-white font-bold text-lg mb-1">{translatedAwayTeam?.name || match.awayTeam?.name}</h2>
            <p className="text-xs text-gray-400">{translatedAwayTeam?.short_name || match.awayTeam?.short_name}</p>
          </div>
        </div>

        {/* Live Progress Bar */}
        {isLive && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('1st Half')}</span>
              <span className="font-mono">{formatTime()}</span>
              <span>{t('2nd Half')}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-red-500 to-red-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${getLivePercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Match Info */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{new Date(match.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{match.time || 'TBD'}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{match.stadium}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{t('Ref:')} {match.referee || 'TBD'}</span>
          </div>
        </div>
      </div>

      {/* Match Events */}
      <div className="px-4 py-6">
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          {/* Home Team Events */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
              {match.homeTeam?.logo_url && !homeLogoError ? (
                <img src={match.homeTeam.logo_url} alt="" className="w-5 h-5 rounded-full" />
              ) : (
                <div className="w-3 h-3 rounded-full" style={{ background: match.homeTeam?.color }} />
              )}
              <h3 className="text-white font-bold">{translatedHomeTeam?.name || match.homeTeam?.name}</h3>
            </div>
            <div className="space-y-3">
              {homeEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">{t('No events yet')}</div>
              ) : (
                homeEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-end gap-2">
                    <div className="text-right">
                      <p className={`font-semibold text-sm ${event.is_own_goal ? 'text-red-500' : 'text-white'}`}>
                        {getEventText(event)}
                      </p>
                      {event.type === 'goal' && event.assisted_by && (
                        <p className="text-xs text-gray-500">{t('Assist')}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
  <span className="text-[#ffd700] font-bold text-sm">{event.minute}'</span>
  {event.type === 'yellow_card' || event.type === 'red_card' ? (
    getCardIcon(event.type)
  ) : (
    <span className="text-2xl">{getEventIcon(event.type)}</span>
  )}
</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Away Team Events */}
          <div>
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
              {match.awayTeam?.logo_url && !awayLogoError ? (
                <img src={match.awayTeam.logo_url} alt="" className="w-5 h-5 rounded-full" />
              ) : (
                <div className="w-3 h-3 rounded-full" style={{ background: match.awayTeam?.color }} />
              )}
              <h3 className="text-white font-bold">{translatedAwayTeam?.name || match.awayTeam?.name}</h3>
            </div>
            <div className="space-y-3">
              {awayEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">{t('No events yet')}</div>
              ) : (
                awayEvents.map((event) => (
                  <div key={event.id} className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
  <span className="text-[#ffd700] font-bold text-sm">{event.minute}'</span>
  {event.type === 'yellow_card' || event.type === 'red_card' ? (
    getCardIcon(event.type)
  ) : (
    <span className="text-2xl">{getEventIcon(event.type)}</span>
  )}
</div>
                    <div className="text-left">
                      <p className={`font-semibold text-sm ${event.is_own_goal ? 'text-red-500' : 'text-white'}`}>
                        {getEventText(event)}
                      </p>
                      {event.type === 'goal' && event.assisted_by && (
                        <p className="text-xs text-gray-500">{t('Assist')}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden">
          <div className="relative">
            <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gradient-to-b from-[#ffd700]/50 via-[#ffd700] to-[#ffd700]/50" />
            {events.length === 0 ? (
              <div className="text-center py-12 text-gray-500">{t('No events recorded')}</div>
            ) : (
              events.map((event) => {
                const isHome = event.team_id === match.home_team_id;
                return (
                  <div key={event.id} className={`flex items-center gap-3 mb-4 ${isHome ? 'flex-row' : 'flex-row-reverse'}`}>
                    <div className={`flex-1 ${isHome ? 'text-right' : 'text-left'}`}>
                      <p className={`font-semibold text-sm ${event.is_own_goal ? 'text-red-500' : 'text-white'}`}>
                        {getEventText(event)}
                      </p>
                      {event.type === 'goal' && event.assisted_by && (
                        <p className="text-xs text-gray-500">{t('Assist')}</p>
                      )}
                    </div>
                   {event.type === 'yellow_card' || event.type === 'red_card' ? (
  <div className="w-5 h-7">{getCardIcon(event.type)}</div>
) : (
  <span className="text-sm">{getEventIcon(event.type)}</span>
)}
                    <div className="flex-1" />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Match Stats */}
        <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(26, 31, 46, 0.5)' }}>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              {match.homeTeam?.logo_url && !homeLogoError ? (
                <img src={match.homeTeam.logo_url} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <div className="w-3 h-3 rounded-full" style={{ background: match.homeTeam?.color }} />
              )}
              <span className="text-gray-400 text-sm">{translatedHomeTeam?.short_name || match.homeTeam?.short_name}</span>
            </div>
            <span className="text-[#ffd700] text-xs font-semibold">{t('MATCH STATS')}</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">{translatedAwayTeam?.short_name || match.awayTeam?.short_name}</span>
              {match.awayTeam?.logo_url && !awayLogoError ? (
                <img src={match.awayTeam.logo_url} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <div className="w-3 h-3 rounded-full" style={{ background: match.awayTeam?.color }} />
              )}
            </div>
          </div>

          {/* Possession */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t('Possession')}</span>
              <span>50% | 50%</span>
            </div>
            <div className="flex h-1.5 rounded-full overflow-hidden">
              <div className="h-full" style={{ width: '50%', background: match.homeTeam?.color }} />
              <div className="h-full" style={{ width: '50%', background: match.awayTeam?.color }} />
            </div>
          </div>

          {/* Shots */}
          <div className="flex justify-between text-xs text-gray-500">
            <div className="flex gap-2">
              <span>{t('Shots')}: {events.filter(e => e.type === 'goal' && e.team_id === match.home_team_id).length}</span>
              <span>{t('On Target')}: {events.filter(e => e.type === 'goal' && e.team_id === match.home_team_id).length}</span>
            </div>
            <div className="flex gap-2">
              <span>{t('On Target')}: {events.filter(e => e.type === 'goal' && e.team_id === match.away_team_id).length}</span>
              <span>{t('Shots')}: {events.filter(e => e.type === 'goal' && e.team_id === match.away_team_id).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}