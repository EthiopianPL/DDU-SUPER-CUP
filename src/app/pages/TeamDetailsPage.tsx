// src/app/pages/TeamDetailsPage.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, MapPin, Calendar, Users, Trophy, Shield, Award, Star, TrendingUp, Activity, Home, Flag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../context/LanguageContext';

interface Player {
  id: number;
  name: string;
  position: string;
  number: number;
  nationality: string;
  age: number;
  goals: number;
  assists: number;
  appearances: number;
  minutes_played: number;
  yellow_cards: number;
  red_cards: number;
  team_id: number;
}

interface Team {
  id: number;
  name: string;
  short_name: string;
  color: string;
  logo_url?: string;
  stadium: string;
  capacity: number;
  founded: number;
  manager: string;
  city: string;
  players: Player[];
}

export function TeamDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [activeTab, setActiveTab] = useState<'squad' | 'stats'>('squad');

  useEffect(() => {
    if (id) {
      fetchTeamDetails();
    }
  }, [id]);

  const fetchTeamDetails = async () => {
    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();

      if (teamError) throw teamError;

      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', id)
        .order('number', { ascending: true });

      if (playersError) throw playersError;

      setTeam({
        ...teamData,
        players: playersData || []
      });
    } catch (error) {
      console.error('Error fetching team details:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTeamStats = () => {
    if (!team) return { totalGoals: 0, totalAssists: 0, totalApps: 0, avgAge: 0, topScorer: null, topAssist: null };

    const totalGoals = team.players.reduce((sum, p) => sum + (p.goals || 0), 0);
    const totalAssists = team.players.reduce((sum, p) => sum + (p.assists || 0), 0);
    const totalApps = team.players.reduce((sum, p) => sum + (p.appearances || 0), 0);
    const avgAge = Math.round(team.players.reduce((sum, p) => sum + p.age, 0) / team.players.length);

    const topScorer = [...team.players].sort((a, b) => (b.goals || 0) - (a.goals || 0))[0];
    const topAssist = [...team.players].sort((a, b) => (b.assists || 0) - (a.assists || 0))[0];

    return { totalGoals, totalAssists, totalApps, avgAge, topScorer, topAssist };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-400 mb-4">{t('Team not found')}</p>
          <button onClick={() => navigate('/teams')} className="px-4 py-2 bg-[#ffd700] text-black rounded-lg font-semibold">
            {t('Back to Teams')}
          </button>
        </div>
      </div>
    );
  }

  const stats = calculateTeamStats();
  const positionGroups = {
    GK: team.players.filter(p => p.position === 'GK'),
    DEF: team.players.filter(p => p.position === 'DEF'),
    MID: team.players.filter(p => p.position === 'MID'),
    FWD: team.players.filter(p => p.position === 'FWD')
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section with Team Banner */}
      <div className="relative overflow-hidden">
        {/* Background Gradient */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(135deg, ${team.color}80, ${team.color}20)`,
          }}
        />

        {/* Content */}
        <div className="relative px-4 pt-8 pb-12">
          <button
            onClick={() => navigate('../discover?section=table')}
            className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t('Back to Teams')}</span>
          </button>

          <div className="flex flex-col items-center text-center">
            {/* Team Logo */}
            <div className="w-32 h-32 rounded-full overflow-hidden bg-white/10 flex items-center justify-center mb-4 shadow-2xl border-4" style={{ borderColor: team.color }}>
              {team.logo_url && !imageError ? (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-5xl font-black text-black"
                  style={{ background: team.color }}
                >
                  {t(team.short_name || team.name).charAt(0)}
                </div>
              )}
            </div>

            {/* Team Name */}
            <h1 className="text-4xl font-black text-white mb-2">{t(team.name)}</h1>
            <p className="text-gray-300 text-lg mb-4">{t(team.short_name)}</p>

            {/* City Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
              <Home className="w-4 h-4 text-[#ffd700]" />
              <span className="text-white text-sm">{t(team.city)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Club Info Cards */}
      <div className="px-4 -mt-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl p-4 text-center backdrop-blur-sm" style={{ background: 'rgba(26, 31, 46, 0.9)', border: `1px solid ${team.color}20` }}>
            <MapPin className="w-5 h-5 text-[#ffd700] mx-auto mb-2" />
            <p className="text-xs text-gray-400">{t('Stadium')}</p>
            <p className="text-white font-bold text-sm">{t(team.stadium?.split(' ')[0] || team.stadium)}</p>
            <p className="text-[10px] text-gray-500 mt-1">{team.capacity?.toLocaleString()} {t('capacity')}</p>
          </div>
          <div className="rounded-xl p-4 text-center backdrop-blur-sm" style={{ background: 'rgba(26, 31, 46, 0.9)', border: `1px solid ${team.color}20` }}>
            <Calendar className="w-5 h-5 text-[#ffd700] mx-auto mb-2" />
            <p className="text-xs text-gray-400">{t('Founded')}</p>
            <p className="text-white font-bold text-sm">{team.founded}</p>
            <p className="text-[10px] text-gray-500 mt-1">{new Date().getFullYear() - team.founded} {t('years ago')}</p>
          </div>
          <div className="rounded-xl p-4 text-center backdrop-blur-sm" style={{ background: 'rgba(26, 31, 46, 0.9)', border: `1px solid ${team.color}20` }}>
            <Users className="w-5 h-5 text-[#ffd700] mx-auto mb-2" />
            <p className="text-xs text-gray-400">Manager</p>
            <p className="text-white font-bold text-sm truncate">{team.manager?.split(' ')[0]}</p>
            <p className="text-[10px] text-gray-500 mt-1">{t('Head Coach')}</p>
          </div>
          <div className="rounded-xl p-4 text-center backdrop-blur-sm" style={{ background: 'rgba(26, 31, 46, 0.9)', border: `1px solid ${team.color}20` }}>
            <Shield className="w-5 h-5 text-[#ffd700] mx-auto mb-2" />
            <p className="text-xs text-gray-400">{t('Squad')}</p>
            <p className="text-white font-bold text-sm">{team.players.length} {t('players')}</p>
            <p className="text-[10px] text-gray-500 mt-1">{t('Avg Age:')} {stats.avgAge}</p>
          </div>
        </div>
      </div>

      {/* Team Statistics Dashboard */}
      <div className="px-4 mb-6">
        <div className="rounded-xl p-5 overflow-hidden relative" style={{ background: `linear-gradient(135deg, ${team.color}15, ${team.color}05)`, border: `1px solid ${team.color}20` }}>
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20" style={{ background: team.color }} />

          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#ffd700]" />
            {t('Team Statistics')}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-3xl font-black text-[#ffd700]">{stats.totalGoals}</p>
              <p className="text-xs text-gray-400">{t('Total Goals')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-blue-500">{stats.totalAssists}</p>
              <p className="text-xs text-gray-400">{t('Total Assists')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-green-500">{stats.totalApps}</p>
              <p className="text-xs text-gray-400">{t('Appearances')}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-purple-500">{team.players.length}</p>
              <p className="text-xs text-gray-400">{t('Players')}</p>
            </div>
          </div>

          {(stats.topScorer || stats.topAssist) && (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-white/10">
              {stats.topScorer && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-[#ffd700]/20 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-[#ffd700]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">{t('Top Scorer')}</p>
                    <p className="text-white font-semibold text-sm">{stats.topScorer.name}</p>
                    <p className="text-[#ffd700] font-bold text-xs">{stats.topScorer.goals} {t('goals')}</p>
                  </div>
                </div>
              )}
              {stats.topAssist && stats.topAssist.id !== stats.topScorer?.id && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Award className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400">{t('Top Assists')}</p>
                    <p className="text-white font-semibold text-sm">{stats.topAssist.name}</p>
                    <p className="text-blue-500 font-bold text-xs">{stats.topAssist.assists} {t('assists')}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(26, 31, 46, 0.5)' }}>
          <button
            onClick={() => setActiveTab('squad')}
            className={`flex-1 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'squad' ? 'text-black' : 'text-gray-400'
              }`}
            style={{ background: activeTab === 'squad' ? '#ffd700' : 'transparent' }}
          >
            <Users className="w-4 h-4" />
            {t('Squad')}
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'stats' ? 'text-black' : 'text-gray-400'
              }`}
            style={{ background: activeTab === 'stats' ? '#ffd700' : 'transparent' }}
          >
            <BarChart3 className="w-4 h-4" />
            {t('Player Stats')}
          </button>
        </div>
      </div>

      {/* Squad Section */}
      {activeTab === 'squad' && (
        <div className="px-4">
          {positionGroups.GK.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Flag className="w-4 h-4 text-[#ffd700]" />
                {t('Goalkeepers')}
              </h3>
              <div className="space-y-2">
                {positionGroups.GK.map(player => <PlayerCard key={player.id} player={player} teamColor={team.color} t={t} />)}
              </div>
            </div>
          )}

          {positionGroups.DEF.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-500" />
                {t('Defenders')}
              </h3>
              <div className="space-y-2">
                {positionGroups.DEF.map(player => <PlayerCard key={player.id} player={player} teamColor={team.color} t={t} />)}
              </div>
            </div>
          )}

          {positionGroups.MID.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                {t('Midfielders')}
              </h3>
              <div className="space-y-2">
                {positionGroups.MID.map(player => <PlayerCard key={player.id} player={player} teamColor={team.color} t={t} />)}
              </div>
            </div>
          )}

          {positionGroups.FWD.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-500" />
                {t('Forwards')}
              </h3>
              <div className="space-y-2">
                {positionGroups.FWD.map(player => <PlayerCard key={player.id} player={player} teamColor={team.color} t={t} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Player Stats Section */}
      {activeTab === 'stats' && (
        <div className="px-4">
          <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-xs text-gray-400">#</th>
                  <th className="text-left p-3 text-xs text-gray-400">{t('Player')}</th>
                  <th className="text-center p-3 text-xs text-gray-400">{t('Pos')}</th>
                  <th className="text-center p-3 text-xs text-gray-400">{t('Apps')}</th>
                  <th className="text-center p-3 text-xs text-gray-400">{t('Goals')}</th>
                  <th className="text-center p-3 text-xs text-gray-400">{t('Assists')}</th>
                  <th className="text-center p-3 text-xs text-gray-400">{t('Cards')}</th>
                </tr>
              </thead>
              <tbody>
                {team.players.map((player) => (
                  <tr
                    key={player.id}
                    onClick={() => navigate(`/player/${player.id}`)}
                    className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <td className="p-3 text-white font-bold text-sm">{player.number}</td>
                    <td className="p-3">
                      <div>
                        <p className="text-white font-medium text-sm">{player.name}</p>
                        <p className="text-xs text-gray-500">{t(player.nationality)} • {t('Age')} {player.age}</p>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">{t(player.position)}</span>
                    </td>
                    <td className="p-3 text-center text-white text-sm">{player.appearances}</td>
                    <td className="p-3 text-center text-[#ffd700] font-bold text-sm">{player.goals}</td>
                    <td className="p-3 text-center text-blue-500 font-bold text-sm">{player.assists}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {player.yellow_cards > 0 && <span className="text-xs text-yellow-500">{player.yellow_cards}🟨</span>}
                        {player.red_cards > 0 && <span className="text-xs text-red-500">{player.red_cards}🟥</span>}
                        {player.yellow_cards === 0 && player.red_cards === 0 && <span className="text-xs text-gray-600">0</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PlayerCard({ player, teamColor, t }: { player: Player; teamColor: string; t: any }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/player/${player.id}`)}
      className="rounded-xl p-4 transition-all hover:scale-[1.02] cursor-pointer group"
      style={{ background: 'rgba(26, 31, 46, 0.8)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center font-black text-2xl transition-all group-hover:scale-110"
            style={{ background: `${teamColor}20`, color: teamColor, border: `2px solid ${teamColor}` }}
          >
            {player.number}
          </div>
          <div>
            <p className="text-white font-bold text-base">{player.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">{t(player.nationality)}</span>
              <span className="text-xs text-gray-600">•</span>
              <span className="text-xs text-gray-400">{t('Age')} {player.age}</span>
              <span className="text-xs text-gray-600">•</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-gray-300">{t(player.position)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[#ffd700] font-black text-xl">{player.goals}</p>
            <p className="text-[10px] text-gray-500">{t('Goals')}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-500 font-black text-xl">{player.assists}</p>
            <p className="text-[10px] text-gray-500">{t('Assists')}</p>
          </div>
          <div className="text-right min-w-[50px]">
            <p className="text-white font-black text-xl">{player.appearances}</p>
            <p className="text-[10px] text-gray-500">{t('Apps')}</p>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: `${teamColor}20` }}>
            <ChevronRight className="w-4 h-4" style={{ color: teamColor }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Import BarChart3 for stats tab
import { BarChart3, ChevronRight } from 'lucide-react';