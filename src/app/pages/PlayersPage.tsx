import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Users, Search, Trophy, Award, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Player {
  id: string;
  name: string;
  position: string;
  number: number;
  nationality: string;
  age: number;
  team_id: string;
  team_name: string;
  team_color: string;
  goals: number;
  assists: number;
  appearances: number;
  minutes_played: number;
  yellow_cards: number;
  red_cards: number;
}

export function PlayersPage() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('all');
  const [sortBy, setSortBy] = useState('goals');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*, team:teams(name, color)')
        .order(sortBy, { ascending: false });
      
      if (error) throw error;
      
      const formattedPlayers = (data || []).map((p: any) => ({
        ...p,
        team_name: p.team?.name,
        team_color: p.team?.color
      }));
      
      setPlayers(formattedPlayers);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(p => positionFilter === 'all' || p.position === positionFilter)
    .sort((a, b) => {
      if (sortBy === 'goals') return b.goals - a.goals;
      if (sortBy === 'assists') return b.assists - a.assists;
      return b.appearances - a.appearances;
    });

  const getPositionBadge = (position: string) => {
    const colors: Record<string, string> = {
      GK: 'bg-blue-500/20 text-blue-400',
      DEF: 'bg-green-500/20 text-green-400',
      MID: 'bg-yellow-500/20 text-yellow-400',
      FWD: 'bg-red-500/20 text-red-400',
    };
    return colors[position] || 'bg-gray-500/20 text-gray-400';
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
          <Users className="w-8 h-8 text-[#ffd700]" />
          Players
        </h1>
        <p className="text-gray-400">All players • Ethiopian Premier League</p>
      </div>

      <div className="px-4 mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg text-white"
            style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {['all', 'FWD', 'MID', 'DEF', 'GK'].map((position) => (
            <button
              key={position}
              onClick={() => setPositionFilter(position)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap font-semibold transition-all ${
                positionFilter === position ? 'text-black' : 'text-gray-400'
              }`}
              style={{
                background: positionFilter === position ? '#ffd700' : 'rgba(26, 31, 46, 0.8)',
              }}
            >
              {position === 'all' ? 'All' : position}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSortBy('goals')}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${
              sortBy === 'goals' ? 'text-black' : 'text-gray-400'
            }`}
            style={{
              background: sortBy === 'goals' ? '#ffd700' : 'rgba(26, 31, 46, 0.8)',
            }}
          >
            <Trophy className="w-4 h-4" /> Goals
          </button>
          <button
            onClick={() => setSortBy('assists')}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${
              sortBy === 'assists' ? 'text-black' : 'text-gray-400'
            }`}
            style={{
              background: sortBy === 'assists' ? '#ffd700' : 'rgba(26, 31, 46, 0.8)',
            }}
          >
            <Award className="w-4 h-4" /> Assists
          </button>
          <button
            onClick={() => setSortBy('appearances')}
            className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 ${
              sortBy === 'appearances' ? 'text-black' : 'text-gray-400'
            }`}
            style={{
              background: sortBy === 'appearances' ? '#ffd700' : 'rgba(26, 31, 46, 0.8)',
            }}
          >
            <TrendingUp className="w-4 h-4" /> Apps
          </button>
        </div>
      </div>

      <div className="px-4 space-y-2">
        {filteredPlayers.map((player, index) => (
          <div
            key={player.id}
            onClick={() => navigate(`/player/${player.id}`)}
            className="rounded-lg p-3 transition-all hover:scale-[1.02] cursor-pointer"
            style={{ background: 'rgba(26, 31, 46, 0.8)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 text-center">
                <span className="text-2xl font-black text-[#ffd700]">{index + 1}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-semibold">{player.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${getPositionBadge(player.position)}`}>
                    {player.position}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: player.team_color }} />
                  <span className="text-gray-400">{player.team_name}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400">#{player.number}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-lg">{player.goals}</div>
                <div className="text-xs text-gray-400">Goals</div>
              </div>
              <div className="text-right min-w-[60px]">
                <div className="text-white font-bold text-lg">{player.assists}</div>
                <div className="text-xs text-gray-400">Assists</div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-xs">
              <span className="text-gray-500">{player.appearances} appearances</span>
              <span className="text-gray-500">{player.minutes_played} minutes</span>
              <span className="text-yellow-500">{player.yellow_cards} 🟨</span>
            </div>
          </div>
        ))}

        {filteredPlayers.length === 0 && (
          <div className="text-center py-12 rounded-lg" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No players found</p>
          </div>
        )}
      </div>
    </div>
  );
}