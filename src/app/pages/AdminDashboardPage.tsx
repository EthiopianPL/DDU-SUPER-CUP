// src/app/pages/AdminDashboardPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import {
  Newspaper, Calendar, Trophy, TrendingUp,
  Plus, ArrowRight, Loader2, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';

interface DashboardStats {
  totalNews: number;
  totalMatches: number;
  scheduledMatches: number;
  finishedMatches: number;
  liveMatches: number;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalNews: 0, totalMatches: 0, scheduledMatches: 0, finishedMatches: 0, liveMatches: 0
  });
  const [recentNews, setRecentNews] = useState<any[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const timeout = setTimeout(() => {
      setTimedOut(true);
    }, 8000);
    return () => clearTimeout(timeout);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    setTimedOut(false);
    try {
      // Fetch news count & recent news
      const { data: newsData, count: newsCount, error: newsError } = await supabase
        .from('news')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5);

      if (newsError) throw newsError;

      // Fetch all matches for stats
      const { data: matchesData, count: matchesCount, error: matchesError } = await supabase
        .from('matches')
        .select('*, homeTeam:home_team_id(*), awayTeam:away_team_id(*)', { count: 'exact' });

      if (matchesError) throw matchesError;

      const scheduled = matchesData?.filter(m => m.status === 'scheduled') || [];
      const finished = matchesData?.filter(m => m.status === 'finished') || [];
      const live = matchesData?.filter(m => m.status === 'live') || [];

      // Upcoming matches (next 5 scheduled)
      const upcoming = scheduled
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

      setStats({
        totalNews: newsCount || 0,
        totalMatches: matchesCount || 0,
        scheduledMatches: scheduled.length,
        finishedMatches: finished.length,
        liveMatches: live.length,
      });
      setRecentNews(newsData || []);
      setUpcomingMatches(upcoming);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err?.message || 'Failed to load dashboard data. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-[#ffd700] animate-spin" />
        {timedOut && (
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-3">Taking longer than expected...</p>
            <button
              onClick={() => { setTimedOut(false); fetchDashboardData(); }}
              className="px-4 py-2 rounded-lg bg-[#ffd700] text-black font-semibold text-sm hover:brightness-110 transition-all"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-red-400 text-sm text-center max-w-md">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 rounded-lg bg-[#ffd700] text-black font-semibold text-sm hover:brightness-110 transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  const statCards = [
    { label: 'Total News', value: stats.totalNews, icon: Newspaper, color: '#ffd700', bg: 'rgba(255, 215, 0, 0.1)' },
    { label: 'Total Matches', value: stats.totalMatches, icon: Calendar, color: '#0077b6', bg: 'rgba(0, 119, 182, 0.1)' },
    { label: 'Upcoming', value: stats.scheduledMatches, icon: Clock, color: '#2d6a4f', bg: 'rgba(45, 106, 79, 0.1)' },
    { label: 'Finished', value: stats.finishedMatches, icon: CheckCircle2, color: '#6a4c93', bg: 'rgba(106, 76, 147, 0.1)' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
        <p className="text-sm text-gray-400">Quick summary of your league management</p>
      </div>

      {/* Live Match Banner */}
      {stats.liveMatches > 0 && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center justify-between"
          style={{
            background: 'linear-gradient(135deg, rgba(230, 57, 70, 0.2), rgba(230, 57, 70, 0.05))',
            border: '1px solid rgba(230, 57, 70, 0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white font-semibold">
              {stats.liveMatches} Match{stats.liveMatches > 1 ? 'es' : ''} Live Now
            </span>
          </div>
          <button
            onClick={() => navigate('/admin/matches')}
            className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
          >
            Manage <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg"
            style={{
              background: 'rgba(26, 31, 46, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ background: stat.bg }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-black text-white">{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/news')}
          className="flex items-center gap-4 p-5 rounded-xl transition-all hover:scale-[1.01] group"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.03))',
            border: '1px solid rgba(255, 215, 0, 0.2)',
          }}
        >
          <div className="w-12 h-12 rounded-xl bg-[#ffd700]/20 flex items-center justify-center group-hover:bg-[#ffd700]/30 transition-colors">
            <Plus className="w-6 h-6 text-[#ffd700]" />
          </div>
          <div className="text-left">
            <p className="text-white font-bold">Post News Article</p>
            <p className="text-xs text-gray-400">Create a new news post</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500 ml-auto group-hover:text-[#ffd700] transition-colors" />
        </button>

        <button
          onClick={() => navigate('/admin/matches')}
          className="flex items-center gap-4 p-5 rounded-xl transition-all hover:scale-[1.01] group"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 119, 182, 0.1), rgba(0, 119, 182, 0.03))',
            border: '1px solid rgba(0, 119, 182, 0.2)',
          }}
        >
          <div className="w-12 h-12 rounded-xl bg-[#0077b6]/20 flex items-center justify-center group-hover:bg-[#0077b6]/30 transition-colors">
            <Trophy className="w-6 h-6 text-[#0077b6]" />
          </div>
          <div className="text-left">
            <p className="text-white font-bold">Create Match</p>
            <p className="text-xs text-gray-400">Schedule a new fixture</p>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-500 ml-auto group-hover:text-[#0077b6] transition-colors" />
        </button>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent News */}
        <div
          className="rounded-xl p-5"
          style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-[#ffd700]" />
              Recent News
            </h3>
            <button
              onClick={() => navigate('/admin/news')}
              className="text-xs text-[#ffd700] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {recentNews.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No news articles yet</p>
          ) : (
            <div className="space-y-3">
              {recentNews.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors"
                >
                  {item.image && (
                    <img src={item.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  )}
                  {!item.image && (
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Newspaper className="w-5 h-5 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</p>
                  </div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={{ background: item.team_color || '#ffd700', color: '#000' }}
                  >
                    {item.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Matches */}
        <div
          className="rounded-xl p-5"
          style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#0077b6]" />
              Upcoming Matches
            </h3>
            <button
              onClick={() => navigate('/admin/matches')}
              className="text-xs text-[#ffd700] hover:underline flex items-center gap-1"
            >
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {upcomingMatches.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">No upcoming matches</p>
          ) : (
            <div className="space-y-3">
              {upcomingMatches.map((match) => (
                <div
                  key={match.id}
                  className="p-3 rounded-lg hover:bg-white/5 transition-colors"
                  style={{ borderLeft: `3px solid ${match.homeTeam?.color || '#ffd700'}` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-white font-semibold">
                        {match.homeTeam?.name || 'TBD'} vs {match.awayTeam?.name || 'TBD'}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          {new Date(match.date).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-gray-400">{match.time}</span>
                        <span className="text-xs text-gray-500">MW {match.matchweek}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-1 rounded-full bg-[#2d6a4f]/20 text-[#2d6a4f] font-semibold">
                      Scheduled
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
