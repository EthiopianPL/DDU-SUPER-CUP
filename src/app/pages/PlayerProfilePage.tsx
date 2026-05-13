import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Calendar, MapPin, Activity, Trophy, TrendingUp, Clock, Shield, Star } from 'lucide-react';
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

export function PlayerProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayer();
  }, [id]);

  const fetchPlayer = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*, team:teams(name, color)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      setPlayer({
        ...data,
        team_name: data.team?.name,
        team_color: data.team?.color,
      });
    } catch (error) {
      console.error('Error fetching player:', error);
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

  if (!player) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Player not found</p>
          <button onClick={() => navigate('/players')} className="px-4 py-2 bg-[#ffd700] text-black rounded-lg font-semibold">
            Back to Players
          </button>
        </div>
      </div>
    );
  }

  const getPositionColor = () => {
    const colors: Record<string, string> = { GK: 'bg-blue-500', DEF: 'bg-green-500', MID: 'bg-yellow-500', FWD: 'bg-red-500' };
    return colors[player.position] || 'bg-gray-500';
  };

  const goalsPerGame = (player.goals / player.appearances).toFixed(2);
  const goalContribution = player.goals + player.assists;

  return (
    <div className="pb-20">
      <div className="relative pt-12 pb-8 px-4" style={{ background: `linear-gradient(135deg, ${player.team_color}40, ${player.team_color}10)`, borderBottom: `3px solid ${player.team_color}` }}>
        <button onClick={() => navigate('/players')} className="absolute top-4 left-4 flex items-center gap-2 text-white/80 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="text-center mt-4">
          <div className="w-28 h-28 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: `linear-gradient(135deg, ${player.team_color}, ${player.team_color}cc)` }}>
            <span className="text-5xl font-black text-white">{player.number}</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">{player.name}</h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getPositionColor()}`}>
              {player.position}
            </span>
            <span className="text-gray-300">#{player.number}</span>
          </div>
          <p className="text-gray-300">{player.team_name}</p>
        </div>
      </div>

      <div className="px-4 -mt-6 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3" style={{ background: 'rgba(26, 31, 46, 0.9)' }}>
            <Calendar className="w-4 h-4 text-[#ffd700] mb-1" />
            <p className="text-xs text-gray-400">Age</p>
            <p className="text-white font-semibold text-lg">{player.age} years</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'rgba(26, 31, 46, 0.9)' }}>
            <MapPin className="w-4 h-4 text-[#ffd700] mb-1" />
            <p className="text-xs text-gray-400">Nationality</p>
            <p className="text-white font-semibold text-lg">{player.nationality}</p>
          </div>
        </div>
      </div>

      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
            <Activity className="w-5 h-5 text-[#ffd700] mx-auto mb-1" />
            <p className="text-3xl font-black text-white">{player.appearances}</p>
            <p className="text-xs text-gray-400">Appearances</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
            <Clock className="w-5 h-5 text-[#ffd700] mx-auto mb-1" />
            <p className="text-3xl font-black text-white">{Math.floor(player.minutes_played / 90)}</p>
            <p className="text-xs text-gray-400">Full Games</p>
          </div>
          <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
            <TrendingUp className="w-5 h-5 text-[#ffd700] mx-auto mb-1" />
            <p className="text-3xl font-black text-white">{goalContribution}</p>
            <p className="text-xs text-gray-400">G+A</p>
          </div>
        </div>
      </div>

      <div className="px-4 mb-6">
        <div className="rounded-lg p-4" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <p className="text-5xl font-black text-[#ffd700]">{player.goals}</p>
              <p className="text-sm text-gray-400">Goals</p>
              <p className="text-xs text-gray-500 mt-1">{goalsPerGame} per game</p>
            </div>
            <div className="text-center">
              <p className="text-5xl font-black text-blue-500">{player.assists}</p>
              <p className="text-sm text-gray-400">Assists</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mb-6">
        <h3 className="text-white font-bold mb-3 flex items-center gap-2">
          <Star className="w-4 h-4 text-[#ffd700]" />
          Detailed Statistics
        </h3>
        <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
          <div className="divide-y divide-white/10">
            <div className="flex justify-between p-3">
              <span className="text-gray-400">Goals per 90 mins</span>
              <span className="text-white font-semibold">{(player.goals / player.minutes_played * 90).toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-gray-400">Assists per 90 mins</span>
              <span className="text-white font-semibold">{(player.assists / player.minutes_played * 90).toFixed(2)}</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-gray-400">Minutes Played</span>
              <span className="text-white font-semibold">{player.minutes_played.toLocaleString()}</span>
            </div>
            <div className="flex justify-between p-3">
              <span className="text-gray-400">Cards</span>
              <div className="flex gap-2">
                <span className="text-yellow-500">{player.yellow_cards} 🟨</span>
                <span className="text-red-500">{player.red_cards} 🟥</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <button onClick={() => navigate(`/team/${player.team_id}`)} className="w-full py-3 rounded-lg font-semibold transition-all" style={{ background: player.team_color, color: '#000' }}>
          View Team Page
        </button>
      </div>
    </div>
  );
}