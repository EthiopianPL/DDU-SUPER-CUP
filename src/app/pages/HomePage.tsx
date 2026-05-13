import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Trophy, Award, Flame, Calendar, TrendingUp } from 'lucide-react';
import { MatchCard } from '../components/MatchCard';
import { NewsCard } from '../components/NewsCard';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { formatRelativeTime } from '../i18n';

interface Team {
  id: number;
  name: string;
  short_name: string;
  color: string;
  logo_url?: string;
}

interface Player {
  id: number;
  name: string;
  goals: number;
  assists: number;
  position?: string;
  team?: { id: number; name: string; color: string; logo_url?: string };
}

interface NewsItem {
  id: string;
  title: string;
  category: string;
  time: string;
  image: string;
  teamColor: string;
}

interface Match {
  id: number;
  status: string;
  home_team_id: number;
  away_team_id: number;
  home_score: number;
  away_score: number;
  date: string;
  time: string;
  match_minute?: number;
  match_second?: number;
  homeTeam?: Team;
  awayTeam?: Team;
}

export function HomePage() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [liveMatches, setLiveMatches] = useState<Match[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [topScorers, setTopScorers] = useState<Player[]>([]);
  const [topAssists, setTopAssists] = useState<Player[]>([]);
  const [latestNews, setLatestNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          homeTeam:home_team_id(id, name, short_name, color, logo_url),
          awayTeam:away_team_id(id, name, short_name, color, logo_url)
        `)
        .order('date', { ascending: true });

      if (!matchesError && matches) {
        setLiveMatches(matches.filter((match) => match.status === 'live') as Match[]);
        setUpcomingMatches(matches.filter((match) => match.status === 'scheduled') as Match[]);
      }

      const { data: scorers, error: scorersError } = await supabase
        .from('players')
        .select('*, team:teams(id, name, color, logo_url)')
        .order('goals', { ascending: false })
        .limit(5);

      if (!scorersError && scorers) {
        setTopScorers(scorers as Player[]);
      }

      const { data: assists, error: assistsError } = await supabase
        .from('players')
        .select('*, team:teams(id, name, color, logo_url)')
        .order('assists', { ascending: false })
        .limit(5);

      if (!assistsError && assists) {
        setTopAssists(assists as Player[]);
      }

      const { data: news, error: newsError } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!newsError && news) {
        setLatestNews(
          news.map((item: any) => ({
            id: item.id,
            title: item.title,
            category: item.category,
            time: formatRelativeTime(item.created_at, t, language),
            image: item.image || 'https://images.unsplash.com/photo-1698844013403-b7c4cf0d3b2f',
            teamColor: item.team_color || '#ffd700',
          })),
        );
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  }, [language, t]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for live match updates every second
  useEffect(() => {
    const interval = setInterval(async () => {
      if (liveMatches.length === 0) return;

      for (const match of liveMatches) {
        const { data, error } = await supabase
          .from('matches')
          .select('match_minute, match_second, home_score, away_score, status')
          .eq('id', match.id)
          .single();

        if (!error && data) {
          setLiveMatches(prev => prev.map(m =>
            m.id === match.id ? { ...m, ...data } : m
          ));
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [liveMatches]);

  // Real-time subscriptions for all changes
  useEffect(() => {
    const subscription = supabase
      .channel('home_realtime')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'matches' },
        (payload) => {
          const updatedMatch = payload.new;

          setLiveMatches(prev => prev.map(m =>
            m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m
          ));

          setUpcomingMatches(prev => prev.map(m =>
            m.id === updatedMatch.id ? { ...m, ...updatedMatch } : m
          ));
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        (payload) => {
          const newMatch = payload.new;
          if (newMatch.status === 'scheduled') {
            setUpcomingMatches(prev => [newMatch as Match, ...prev]);
          } else if (newMatch.status === 'live') {
            setLiveMatches(prev => [newMatch as Match, ...prev]);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players' },
        async () => {
          const { data: scorers } = await supabase
            .from('players')
            .select('*, team:teams(id, name, color, logo_url)')
            .order('goals', { ascending: false })
            .limit(5);

          if (scorers) setTopScorers(scorers as Player[]);

          const { data: assists } = await supabase
            .from('players')
            .select('*, team:teams(id, name, color, logo_url)')
            .order('assists', { ascending: false })
            .limit(5);

          if (assists) setTopAssists(assists as Player[]);
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'news' },
        async () => {
          const { data: news } = await supabase
            .from('news')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(3);

          if (news) {
            setLatestNews(
              news.map((item: any) => ({
                id: item.id,
                title: item.title,
                category: item.category,
                time: formatRelativeTime(item.created_at, t, language),
                image: item.image || 'https://images.unsplash.com/photo-1698844013403-b7c4cf0d3b2f',
                teamColor: item.team_color || '#ffd700',
              })),
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [language, t]);

  const handleImageError = (playerId: number) => {
    setImageErrors((previous) => ({ ...previous, [playerId]: true }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Helper function to get translated team name
  const getTranslatedTeamName = (team: { name: string; color: string; logo_url?: string } | undefined) => {
    if (!team) return { name: t('Unknown'), color: '#666' };
    return {
      ...team,
      name: t(team.name),
    };
  };

  return (
    <div className="pb-20">
      <div className="relative mb-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#ffd700]/10 to-transparent" />
        <div className="px-4 pt-6 pb-4 relative">
          <h1 className="text-4xl text-white mb-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, letterSpacing: '-0.02em' }}>
            {t('Ethiopian Premier League')}
          </h1>
          <p className="text-gray-400">{t('Season 2025/26 • 20 Teams • 380 Matches')}</p>
        </div>
      </div>

      {liveMatches.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl text-white flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800 }}>
              <Flame className="w-5 h-5 text-red-500" />
              {t('Live Now')}
            </h2>
            <button onClick={() => navigate('/matches')} className="flex items-center gap-1 text-[#ffd700] text-sm font-semibold">
              {t('View All')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {liveMatches.map((match) => (
            <MatchCard
              key={match.id}
              id={String(match.id)}
              homeTeam={getTranslatedTeamName(match.homeTeam) as any}
              awayTeam={getTranslatedTeamName(match.awayTeam) as any}
              homeScore={match.home_score}
              awayScore={match.away_score}
              status="live"
              matchMinute={match.match_minute}
              matchSecond={match.match_second}
            />
          ))}
        </div>
      )}

      <div className="px-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Top Scorer Card */}
          <div className="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer" style={{ background: 'rgba(26, 31, 46, 0.8)' }} onClick={() => navigate('/stats')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#ffd700]" />
                <span className="text-xs text-gray-400">{t('Top Scorer')}</span>
              </div>
            </div>
            {topScorers[0] ? (
              <>
                <p className="text-white font-bold text-lg">{t(topScorers[0].name)}</p>
                <div className="flex items-center gap-2 mt-1">
                  {topScorers[0].team?.logo_url && !imageErrors[topScorers[0].id] ? (
                    <img src={topScorers[0].team.logo_url} alt="" className="w-4 h-4 rounded-full" onError={() => handleImageError(topScorers[0].id)} />
                  ) : (
                    <div className="w-4 h-4 rounded-full" style={{ background: topScorers[0].team?.color }} />
                  )}
                  <span className="text-xs text-gray-400">{t(topScorers[0].team?.name || '')}</span>
                </div>
                <p className="text-[#ffd700] font-black text-2xl mt-2">{topScorers[0].goals} {t('goals')}</p>
              </>
            ) : (
              <p className="text-gray-400 text-sm">N/A</p>
            )}
          </div>

          {/* Top Assists Card */}
          <div className="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer" style={{ background: 'rgba(26, 31, 46, 0.8)' }} onClick={() => navigate('/stats')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-500" />
                <span className="text-xs text-gray-400">{t('Top Assists')}</span>
              </div>
            </div>
            {topAssists[0] ? (
              <>
                <p className="text-white font-bold text-lg">{t(topAssists[0].name)}</p>
                <div className="flex items-center gap-2 mt-1">
                  {topAssists[0].team?.logo_url && !imageErrors[topAssists[0].id] ? (
                    <img src={topAssists[0].team.logo_url} alt="" className="w-4 h-4 rounded-full" onError={() => handleImageError(topAssists[0].id)} />
                  ) : (
                    <div className="w-4 h-4 rounded-full" style={{ background: topAssists[0].team?.color }} />
                  )}
                  <span className="text-xs text-gray-400">{t(topAssists[0].team?.name || '')}</span>
                </div>
                <p className="text-blue-500 font-black text-2xl mt-2">{topAssists[0].assists} {t('assists')}</p>
              </>
            ) : (
              <p className="text-gray-400 text-sm">N/A</p>
            )}
          </div>

          {/* League Table Card */}
          <div className="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer" style={{ background: 'rgba(26, 31, 46, 0.8)' }} onClick={() => navigate('/discover?section=table')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#ffd700]" />
                <span className="text-xs text-gray-400">{t('League Table')}</span>
              </div>
            </div>
            <p className="text-white font-bold text-lg">{t('View Full Standings')}</p>

            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-green-500 text-xs">{t('1st: Champions League')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-blue-500 text-xs">{t('2nd: CAF Confederation Cup')}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-500 text-xs">{t('18th–20th: Relegation')}</span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-white/10">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t('Click to see full table →')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {upcomingMatches.length > 0 && (
        <div className="px-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl text-white flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800 }}>
              <Calendar className="w-5 h-5 text-[#ffd700]" />
              {t('Upcoming Matches')}
            </h2>
            <button onClick={() => navigate('/matches')} className="flex items-center gap-1 text-[#ffd700] text-sm font-semibold">
              {t('View All')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {upcomingMatches.slice(0, 3).map((match) => (
            <MatchCard
              key={match.id}
              id={String(match.id)}
              homeTeam={getTranslatedTeamName(match.homeTeam) as any}
              awayTeam={getTranslatedTeamName(match.awayTeam) as any}
              status="upcoming"
              time={match.time}
            />
          ))}
        </div>
      )}

      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl text-white flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800 }}>
            <TrendingUp className="w-5 h-5 text-[#ffd700]" />
            {t('Latest News')}
          </h2>
          <button onClick={() => navigate('/news')} className="flex items-center gap-1 text-[#ffd700] text-sm font-semibold">
            {t('View All')} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {latestNews.map((item) => (
          <div key={item.id} onClick={() => navigate(`/news/${item.id}`)} className="cursor-pointer mb-3">
            <NewsCard
              id={item.id}
              title={t(item.title)}
              category={t(item.category)}
              time={item.time}
              image={item.image}
              teamColor={item.teamColor}
            />
          </div>
        ))}
      </div>
    </div>
  );
}