import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BarChart3, Trophy, Award, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function StatsHubPage() {
  const navigate = useNavigate();
  const [topScorers, setTopScorers] = useState<any[]>([]);
  const [topAssists, setTopAssists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('goals');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: scorers, error: scorersError } = await supabase
        .from('players')
        .select('*, team:teams(name, color)')
        .order('goals', { ascending: false })
        .limit(10);
      
      if (scorersError) throw scorersError;
      
      const { data: assisters, error: assistsError } = await supabase
        .from('players')
        .select('*, team:teams(name, color)')
        .order('assists', { ascending: false })
        .limit(10);
      
      if (assistsError) throw assistsError;
      
      setTopScorers(scorers || []);
      setTopAssists(assisters || []);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl text-white flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>
          <BarChart3 className="w-8 h-8 text-[#ffd700]" />
          Stats Hub
        </h1>
        <p className="text-gray-400">Player Statistics • Season 2025/26</p>
      </div>

      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setActiveCategory('goals')} className="p-3 rounded-lg transition-all"
            style={{ background: activeCategory === 'goals' ? '#ffd700' : 'rgba(26, 31, 46, 0.8)' }}>
            <Trophy className="w-5 h-5 mx-auto mb-1" style={{ color: activeCategory === 'goals' ? 'black' : '#ffd700' }} />
            <p className={`text-xs font-semibold ${activeCategory === 'goals' ? 'text-black' : 'text-gray-400'}`}>Golden Boot</p>
          </button>
          <button onClick={() => setActiveCategory('assists')} className="p-3 rounded-lg transition-all"
            style={{ background: activeCategory === 'assists' ? '#3b82f6' : 'rgba(26, 31, 46, 0.8)' }}>
            <Award className="w-5 h-5 mx-auto mb-1" style={{ color: activeCategory === 'assists' ? 'white' : '#3b82f6' }} />
            <p className={`text-xs font-semibold ${activeCategory === 'assists' ? 'text-white' : 'text-gray-400'}`}>Playmaker</p>
          </button>
        </div>
      </div>

      {activeCategory === 'goals' && (
        <div className="px-4">
          <div className="mb-6 text-center">
            <div className="inline-block p-6 rounded-full mb-3" style={{ background: 'linear-gradient(135deg, #ffd70020, #ffd70005)' }}>
              <Trophy className="w-12 h-12 text-[#ffd700]" />
            </div>
            <h2 className="text-2xl font-black text-white mb-1">Golden Boot Race</h2>
            <p className="text-sm text-gray-400">Top goal scorers of the season</p>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
            <div className="p-3 border-b border-white/10"><h3 className="text-white font-bold">Top Goal Scorers</h3></div>
            {topScorers.map((player, index) => (
              <div key={player.id} onClick={() => navigate(`/player/${player.id}`)} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 text-center"><span className={`font-bold ${index < 3 ? 'text-[#ffd700]' : 'text-gray-400'}`}>{index + 1}</span></div>
                  <div><p className="text-white font-semibold">{player.name}</p><p className="text-xs text-gray-400">{player.team?.name}</p></div>
                </div>
                <div className="text-right"><p className="text-2xl font-black text-[#ffd700]">{player.goals}</p><p className="text-xs text-gray-500">goals</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCategory === 'assists' && (
        <div className="px-4">
          <div className="mb-6 text-center">
            <div className="inline-block p-6 rounded-full mb-3" style={{ background: 'linear-gradient(135deg, #3b82f620, #3b82f605)' }}>
              <Award className="w-12 h-12 text-blue-500" />
            </div>
            <h2 className="text-2xl font-black text-white mb-1">Playmaker Award</h2>
            <p className="text-sm text-gray-400">Top assist providers</p>
          </div>

          <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
            <div className="p-3 border-b border-white/10"><h3 className="text-white font-bold">Top Assists</h3></div>
            {topAssists.map((player, index) => (
              <div key={player.id} onClick={() => navigate(`/player/${player.id}`)} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 cursor-pointer hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 text-center"><span className={`font-bold ${index < 3 ? 'text-blue-500' : 'text-gray-400'}`}>{index + 1}</span></div>
                  <div><p className="text-white font-semibold">{player.name}</p><p className="text-xs text-gray-400">{player.team?.name}</p></div>
                </div>
                <div className="text-right"><p className="text-2xl font-black text-blue-500">{player.assists}</p><p className="text-xs text-gray-500">assists</p></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 mt-6">
        <button onClick={() => navigate('/head-to-head')} className="w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
          style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(255, 215, 0, 0.3)', color: '#ffd700' }}>
          Compare Teams Head to Head <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}