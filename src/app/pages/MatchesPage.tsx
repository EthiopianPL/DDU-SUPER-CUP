// src/app/pages/MatchesPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { MatchCard } from '../components/MatchCard';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../context/LanguageContext';

interface Team {
  id: number;
  name: string;
  short_name: string;
  color: string;
  logo_url?: string;
}

interface Match {
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
  match_minute?: number;
  match_second?: number;
  match_half?: string;
  injury_time_first_half?: number;
  injury_time_second_half?: number;
  homeTeam?: Team;
  awayTeam?: Team;
}

export function MatchesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'past' | 'current' | 'next'>('current');

  // Get start and end of week
  const getWeekRange = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  };

  const getDateRangeFilter = () => {
    const now = new Date();
    const currentWeek = getWeekRange(now);

    switch (dateRange) {
      case 'past':
        const pastStart = new Date(currentWeek.start);
        pastStart.setDate(pastStart.getDate() - 7);
        const pastEnd = new Date(currentWeek.start);
        pastEnd.setDate(pastEnd.getDate() - 1);
        return { start: pastStart, end: pastEnd };
      case 'current':
        return currentWeek;
      case 'next':
        const nextStart = new Date(currentWeek.end);
        nextStart.setDate(nextStart.getDate() + 1);
        const nextEnd = new Date(nextStart);
        nextEnd.setDate(nextStart.getDate() + 6);
        return { start: nextStart, end: nextEnd };
      default:
        return currentWeek;
    }
  };

  const formatDateRange = () => {
    const range = getDateRangeFilter();
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${range.start.toLocaleDateString(undefined, options)} - ${range.end.toLocaleDateString(undefined, options)}`;
  };

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          homeTeam:home_team_id(id, name, short_name, color, logo_url),
          awayTeam:away_team_id(id, name, short_name, color, logo_url)
        `)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter matches by date range
  const getFilteredMatches = () => {
    const range = getDateRangeFilter();
    return matches.filter(match => {
      const matchDate = new Date(match.date);
      return matchDate >= range.start && matchDate <= range.end;
    });
  };

  // Group matches by date
  const groupMatchesByDate = (matchesList: Match[]) => {
    const grouped: { [key: string]: Match[] } = {};

    matchesList.forEach(match => {
      const dateKey = new Date(match.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(match);
    });

    return grouped;
  };

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Real-time subscriptions for all changes
  useEffect(() => {
    const subscription = supabase
      .channel('matches_realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload) => {
          setMatches(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [payload.new as Match, ...prev];
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload) => {
          setMatches(prev => prev.map(match =>
            match.id === payload.new.id ? { ...match, ...payload.new } : match
          ));
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'matches' },
        (payload) => {
          setMatches(prev => prev.filter(match => match.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Poll for live match updates every second
  useEffect(() => {
    const interval = setInterval(async () => {
      const liveMatches = matches.filter(m => m.status === 'live');
      if (liveMatches.length === 0) return;

      for (const match of liveMatches) {
        const { data, error } = await supabase
          .from('matches')
          .select('match_minute, match_second, home_score, away_score')
          .eq('id', match.id)
          .single();

        if (!error && data) {
          setMatches(prev => prev.map(m =>
            m.id === match.id ? { ...m, ...data } : m
          ));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [matches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const timeFilteredMatches = getFilteredMatches();
  const groupedMatches = groupMatchesByDate(timeFilteredMatches);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl text-white flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>
          <Calendar className="w-8 h-8 text-[#ffd700]" />
          {t('Fixtures & Results')}
        </h1>
        <p className="text-gray-400">{t('Season 2025/26 • Ethiopian Premier League')}</p>
      </div>

      {/* Week Navigation */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between gap-2 bg-black/30 rounded-xl p-2 backdrop-blur-sm">
          <button
            onClick={() => setDateRange('past')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${dateRange === 'past' ? 'bg-[#ffd700] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            {t('Past Week')}
          </button>
          <button
            onClick={() => setDateRange('current')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${dateRange === 'current' ? 'bg-[#ffd700] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            {t('This Week')}
          </button>
          <button
            onClick={() => setDateRange('next')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${dateRange === 'next' ? 'bg-[#ffd700] text-black' : 'text-gray-400 hover:text-white'}`}
          >
            {t('Next Week')}
          </button>
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">{formatDateRange()}</p>
      </div>

      {/* Matches by Date */}
      <div className="px-4 space-y-6">
        {Object.keys(groupedMatches).length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">{t('No matches scheduled for this period')}</p>
          </div>
        ) : (
          Object.entries(groupedMatches).map(([dateKey, dateMatches]) => (
            <div key={dateKey}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-6 bg-[#ffd700] rounded-full" />
                <h2 className="text-white font-semibold text-lg">{dateKey}</h2>
              </div>
              <div className="space-y-3">
                {dateMatches.map((match) => {
                  let displayStatus: 'live' | 'upcoming' | 'finished' = 'upcoming';
                  if (match.status === 'live') displayStatus = 'live';
                  else if (match.status === 'finished') displayStatus = 'finished';

                  // Create translated team objects while preserving all required properties
                  const translatedHomeTeam: Team = match.homeTeam ? {
                    id: match.homeTeam.id,
                    name: t(match.homeTeam.name),
                    short_name: t(match.homeTeam.short_name),
                    color: match.homeTeam.color,
                    logo_url: match.homeTeam.logo_url
                  } : { id: 0, name: t('Unknown'), short_name: 'UNK', color: '#666' };

                  const translatedAwayTeam: Team = match.awayTeam ? {
                    id: match.awayTeam.id,
                    name: t(match.awayTeam.name),
                    short_name: t(match.awayTeam.short_name),
                    color: match.awayTeam.color,
                    logo_url: match.awayTeam.logo_url
                  } : { id: 0, name: t('Unknown'), short_name: 'UNK', color: '#666' };

                  return (
                    <MatchCard
                      key={match.id}
                      id={String(match.id)}
                      homeTeam={translatedHomeTeam}
                      awayTeam={translatedAwayTeam}
                      homeScore={match.home_score}
                      awayScore={match.away_score}
                      status={displayStatus}
                      time={match.time}
                      date={match.date}
                      stadium={match.stadium}
                      matchMinute={match.match_minute}
                      matchSecond={match.match_second}
                      injuryTime={match.injury_time_first_half || match.injury_time_second_half}
                    />
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}