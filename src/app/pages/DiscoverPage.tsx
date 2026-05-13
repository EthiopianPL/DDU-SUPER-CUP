// src/app/pages/DiscoverPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Compass, Shield, Trophy, BarChart3, ChevronRight, ArrowLeft, Search, MapPin, Calendar, Users, Award } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../context/LanguageContext';

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
  played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goals_for?: number;
  goals_against?: number;
  points?: number;
  form?: string[];
}

interface StandingsEntry {
  position: number;
  team: {
    id: number;
    name: string;
    short_name: string;
    color: string;
    logo_url?: string;
  };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[];
}

interface Player {
  id: number;
  name: string;
  position: string;
  number: number;
  team_id: number;
  goals: number;
  assists: number;
  team?: { name: string; color: string; short_name: string; logo_url?: string };
}

export function DiscoverPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const getInitialSection = () => {
    const params = new URLSearchParams(location.search);
    return params.get('section');
  };

  const [teams, setTeams] = useState<Team[]>([]);
  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [topScorers, setTopScorers] = useState<Player[]>([]);
  const [topAssists, setTopAssists] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(getInitialSection());
  const [teamSearchTerm, setTeamSearchTerm] = useState('');
  const [statsFilter, setStatsFilter] = useState<'goals' | 'assists'>('goals');
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetchDiscoverData();
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleImageError = (teamId: number) => {
    setImageErrors(prev => ({ ...prev, [teamId]: true }));
  };

  const fetchDiscoverData = async () => {
    try {
      // Fetch all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch all finished matches
      const { data: matches, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'finished');

      if (matchesError) console.error('Error fetching matches:', matchesError);

      // Calculate standings from match results
      if (teamsData && matches) {
        const calculatedStandings = teamsData.map((team: Team) => {
          const teamMatches = (matches || []).filter((m: any) =>
            m.home_team_id === team.id || m.away_team_id === team.id
          );

          let won = 0, drawn = 0, lost = 0;
          let goalsFor = 0, goalsAgainst = 0;

          teamMatches.forEach((match: any) => {
            const isHome = match.home_team_id === team.id;
            const teamScore = isHome ? match.home_score : match.away_score;
            const opponentScore = isHome ? match.away_score : match.home_score;

            if (teamScore !== null && opponentScore !== null) {
              goalsFor += teamScore;
              goalsAgainst += opponentScore;
              if (teamScore > opponentScore) won++;
              else if (teamScore === opponentScore) drawn++;
              else lost++;
            }
          });

          const played = teamMatches.length;
          const points = (won * 3) + drawn;
          const goalDifference = goalsFor - goalsAgainst;

          // Calculate form from last 5 matches (by date)
          const sortedMatches = [...teamMatches].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
          ).slice(0, 5);

          const form = sortedMatches.map((match: any) => {
            const isHome = match.home_team_id === team.id;
            const teamScore = isHome ? match.home_score : match.away_score;
            const opponentScore = isHome ? match.away_score : match.home_score;
            if (teamScore === null || opponentScore === null) return '-';
            if (teamScore > opponentScore) return 'W';
            if (teamScore === opponentScore) return 'D';
            return 'L';
          }).reverse();

          // Pad form to always have 5 entries
          while (form.length < 5) form.unshift('-');

          return {
            position: 0,
            team: {
              id: team.id,
              name: team.name,
              short_name: team.short_name,
              color: team.color,
              logo_url: team.logo_url
            },
            played,
            won,
            drawn,
            lost,
            goalsFor,
            goalsAgainst,
            goalDifference,
            points,
            form
          };
        });

        // Sort standings by points, then goal difference, then goals for
        calculatedStandings.sort((a, b) => {
          if (a.points !== b.points) return b.points - a.points;
          if (a.goalDifference !== b.goalDifference) return b.goalDifference - a.goalDifference;
          return b.goalsFor - a.goalsFor;
        });

        // Assign positions
        calculatedStandings.forEach((team, idx) => {
          team.position = idx + 1;
        });

        setStandings(calculatedStandings);
      }

      // Fetch top scorers
      const { data: scorers, error: scorersError } = await supabase
        .from('players')
        .select('*, team:teams(name, color, short_name, logo_url)')
        .order('goals', { ascending: false })
        .limit(10);

      if (!scorersError && scorers) {
        setTopScorers(scorers);
      }

      // Fetch top assists
      const { data: assisters, error: assistsError } = await supabase
        .from('players')
        .select('*, team:teams(name, color, short_name, logo_url)')
        .order('assists', { ascending: false })
        .limit(10);

      if (!assistsError && assisters) {
        setTopAssists(assisters);
      }

    } catch (error) {
      console.error('Error fetching discover data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFormColor = (result: string) => {
    switch (result) {
      case 'W': return 'bg-green-500';
      case 'D': return 'bg-yellow-500';
      case 'L': return 'bg-red-500';
      default: return 'bg-gray-600';
    }
  };

  const getFormText = (result: string) => {
    switch (result) {
      case 'W': return 'W';
      case 'D': return 'D';
      case 'L': return 'L';
      default: return '-';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center pt-32 h-full w-full">
        <div className="w-12 h-12 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24 overflow-x-hidden h-full relative w-full text-left">
      {expandedSection === null ? (
        <div>
          <div className="px-4 pt-6 pb-4">
            <h1 className="text-3xl text-white flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>
              <Compass className="w-8 h-8 text-[#ffd700]" />
              {t('Discover')}
            </h1>
            <p className="text-gray-400">{t('Explore clubs, standings, and statistics')}</p>
          </div>

          <div className="px-4 space-y-4">
            <div
              onClick={() => toggleSection('table')}
              className="flex items-center justify-between p-5 rounded-xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg"
              style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
            >
              <h2 className="text-xl font-bold text-white flex items-center gap-4">
                <div className="p-3 rounded-full bg-[#ffd700]/10"><Trophy className="w-6 h-6 text-[#ffd700]" /></div>
                {t('League Table')}
              </h2>
              <ChevronRight className="w-6 h-6 text-gray-500" />
            </div>

            <div
              onClick={() => toggleSection('stats')}
              className="flex items-center justify-between p-5 rounded-xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg"
              style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
            >
              <h2 className="text-xl font-bold text-white flex items-center gap-4">
                <div className="p-3 rounded-full bg-[#ffd700]/10"><BarChart3 className="w-6 h-6 text-[#ffd700]" /></div>
                {t('Top Stats')}
              </h2>
              <ChevronRight className="w-6 h-6 text-gray-500" />
            </div>

            <div
              onClick={() => navigate('/teams')}
              className="flex items-center justify-between p-5 rounded-xl cursor-pointer transition-all hover:scale-[1.02] shadow-lg"
              style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.05)' }}
            >
              <h2 className="text-xl font-bold text-white flex items-center gap-4">
                <div className="p-3 rounded-full bg-[#ffd700]/10">
                  <Shield className="w-6 h-6 text-[#ffd700]" />
                </div>
                {t('Clubs')}
              </h2>
              <ChevronRight className="w-6 h-6 text-gray-500" />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="px-4 mb-4">
            <button onClick={() => setExpandedSection(null)} className="flex items-center text-gray-400 hover:text-white transition-colors font-medium">
              <ArrowLeft className="w-5 h-5 mr-2" /> {t('Back')}
            </button>
          </div>

          {expandedSection === 'table' && (
            <div className="px-4">
              <div className="flex justify-between items-center mb-4 mt-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#ffd700]" /> {t('League Table')}
                </h2>
                <div className="text-sm text-gray-400">{standings.length} {t('Teams')}</div>
              </div>

              {standings.length === 0 ? (
                <div className="text-center py-12 rounded-xl" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
                  <p className="text-gray-400">No standings data available</p>
                  <p className="text-xs text-gray-500 mt-2">Complete some matches to see the league table</p>
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left p-3 text-xs text-gray-400 w-12">#</th>
                          <th className="text-left p-3 text-xs text-gray-400">{t('Team')}</th>
                          <th className="text-center p-3 text-xs text-gray-400 w-12">{t('P')}</th>
                          <th className="text-center p-3 text-xs text-gray-400 w-12">{t('W')}</th>
                          <th className="text-center p-3 text-xs text-gray-400 w-12">{t('D')}</th>
                          <th className="text-center p-3 text-xs text-gray-400 w-12">{t('L')}</th>
                          <th className="text-center p-3 text-xs text-gray-400 w-16">{t('GF')}</th>
                          <th className="text-center p-3 text-xs text-gray-400 w-16">{t('GA')}</th>
                          <th className="text-center p-3 text-xs text-gray-400 w-16">{t('GD')}</th>
                          <th className="text-center p-3 text-xs text-gray-400 w-12">{t('Pts')}</th>
                          <th className="text-center p-3 text-xs text-gray-400 w-28">{t('Form')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((team) => {
                          const isChampionsLeague = team.position <= 2;
                          const isConfederationCup = team.position === 3;
                          const isRelegation = team.position >= 18;

                          return (
                            <tr
                              key={team.team.id}
                              className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                              onClick={() => navigate(`/team/${team.team.id}`)}
                            >
                              <td className="p-3">
                                <span className={`font-bold text-sm ${isChampionsLeague ? 'text-green-500' :
                                    isConfederationCup ? 'text-blue-500' :
                                      isRelegation ? 'text-red-500' : 'text-white'
                                  }`}>
                                  {team.position}
                                </span>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
                                    {team.team.logo_url && !imageErrors[team.team.id] ? (
                                      <img
                                        src={team.team.logo_url}
                                        alt={team.team.name}
                                        className="w-full h-full object-cover"
                                        onError={() => handleImageError(team.team.id)}
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-black" style={{ background: team.team.color }}>
                                        {t(team.team.short_name || team.team.name).charAt(0)}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-white font-medium text-sm truncate">{t(team.team.name)}</span>
                                </div>
                              </td>
                              <td className="p-3 text-center text-gray-300 text-sm">{team.played}</td>
                              <td className="p-3 text-center text-green-500 text-sm font-semibold">{team.won}</td>
                              <td className="p-3 text-center text-yellow-500 text-sm font-semibold">{team.drawn}</td>
                              <td className="p-3 text-center text-red-500 text-sm font-semibold">{team.lost}</td>
                              <td className="p-3 text-center text-gray-300 text-sm">{team.goalsFor}</td>
                              <td className="p-3 text-center text-gray-300 text-sm">{team.goalsAgainst}</td>
                              <td className={`p-3 text-center text-sm font-semibold ${team.goalDifference >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {team.goalDifference >= 0 ? `+${team.goalDifference}` : team.goalDifference}
                              </td>
                              <td className="p-3 text-center font-black text-white text-sm">{team.points}</td>
                              <td className="p-3">
                                <div className="flex gap-1 justify-center">
                                  {team.form.map((result, idx) => (
                                    <div key={idx} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${getFormColor(result)}`}>
                                      {getFormText(result)}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Rules panel */}
              <div className="mt-6">
                <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700 overflow-hidden max-w-md">
                  <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-700">
                    <h3 className="text-sm font-semibold text-[#ffd700]">{t('Rules & Legend')}</h3>
                  </div>
                  <div className="p-3">
                    <div className="mb-3">
                      <p className="text-xs text-gray-400 mb-1">{t('Qualification')}</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-xs text-gray-300">{t('Champions League')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-xs text-gray-300">{t('CAF Confederation Cup')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <span className="text-xs text-gray-300">{t('Relegation (18th–20th)')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-700 pt-3">
                      <p className="text-xs text-gray-400 mb-1">{t('Statistics')}</p>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
                        <div><span className="text-gray-400">{t('P')}</span> <span className="text-gray-300">{t('Played')}</span></div>
                        <div><span className="text-gray-400">{t('W')}</span> <span className="text-gray-300">{t('Wins')}</span></div>
                        <div><span className="text-gray-400">{t('D')}</span> <span className="text-gray-300">{t('Draws')}</span></div>
                        <div><span className="text-gray-400">{t('L')}</span> <span className="text-gray-300">{t('Losses')}</span></div>
                        <div><span className="text-gray-400">{t('GF')}</span> <span className="text-gray-300">{t('Goals For')}</span></div>
                        <div><span className="text-gray-400">{t('GA')}</span> <span className="text-gray-300">{t('Goals Against')}</span></div>
                        <div><span className="text-gray-400">{t('GD')}</span> <span className="text-gray-300">{t('Goal Difference')}</span></div>
                        <div><span className="text-gray-400">{t('Pts')}</span> <span className="text-gray-300">{t('Points')}</span></div>
                        <div><span className="text-gray-400">{t('Form')}</span> <span className="text-gray-300">{t('Last 5 results')}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats and Clubs sections remain the same */}
          {expandedSection === 'stats' && (
            <div className="px-4">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setStatsFilter('goals')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${statsFilter === 'goals' ? 'bg-[#ffd700] text-black' : 'bg-white/10 text-gray-400'}`}
                >
                  ⚽ {t('Top Scorers')}
                </button>
                <button
                  onClick={() => setStatsFilter('assists')}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${statsFilter === 'assists' ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'}`}
                >
                  🎯 {t('Top Assists')}
                </button>
              </div>

              {statsFilter === 'goals' ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="w-5 h-5 text-[#ffd700]" />
                    <h3 className="text-white font-bold">{t('Golden Boot Race')}</h3>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
                    {topScorers.map((player, index) => (
                      <div
                        key={player.id}
                        onClick={() => navigate(`/player/${player.id}`)}
                        className="flex items-center justify-between p-4 border-b border-white/10 last:border-0 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-[#ffd700] text-black' :
                            index === 1 ? 'bg-gray-400 text-black' :
                              index === 2 ? 'bg-amber-600 text-white' : 'bg-white/10 text-white'
                            }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{player.name}</p>
                            <p className="text-xs text-gray-400">{player.team?.name ? t(player.team.name) : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-[#ffd700]">{player.goals}</p>
                          <p className="text-xs text-gray-500">{t('goals')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="w-5 h-5 text-blue-500" />
                    <h3 className="text-white font-bold">{t('Playmaker Award')}</h3>
                  </div>
                  <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
                    {topAssists.map((player, index) => (
                      <div
                        key={player.id}
                        onClick={() => navigate(`/player/${player.id}`)}
                        className="flex items-center justify-between p-4 border-b border-white/10 last:border-0 cursor-pointer hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-blue-500 text-white' :
                            index === 1 ? 'bg-blue-400 text-white' :
                              index === 2 ? 'bg-blue-300 text-black' : 'bg-white/10 text-white'
                            }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{player.name}</p>
                            <p className="text-xs text-gray-400">{player.team?.name ? t(player.team.name) : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-blue-500">{player.assists}</p>
                          <p className="text-xs text-gray-500">{t('assists')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {expandedSection === 'clubs' && (
            <div className="px-4">
              <div className="flex justify-between items-center mb-4 mt-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#ffd700]" /> {t('Participating Clubs')}
                </h2>
                <div className="text-sm text-gray-400">{teams.length} {t('Teams')}</div>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('Search teams...')}
                  value={teamSearchTerm}
                  onChange={(e) => setTeamSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-white"
                  style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {teams
                  .filter(team => {
                    const searchLower = teamSearchTerm.toLowerCase();
                    return team.name.toLowerCase().includes(searchLower) ||
                      (team.short_name && team.short_name.toLowerCase().includes(searchLower)) ||
                      t(team.name).toLowerCase().includes(searchLower) ||
                      (team.short_name && t(team.short_name).toLowerCase().includes(searchLower));
                  })
                  .map(team => (
                    <div
                      key={team.id}
                      onClick={() => navigate(`/team/${team.id}`)}
                      className="rounded-xl p-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
                      style={{ background: 'rgba(26, 31, 46, 0.8)' }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                          {team.logo_url && !imageErrors[team.id] ? (
                            <img
                              src={team.logo_url}
                              alt={team.name}
                              className="w-full h-full object-cover"
                              onError={() => handleImageError(team.id)}
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center text-xl font-bold text-black"
                              style={{ background: team.color }}
                            >
                              {t(team.short_name || team.name).charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-white font-bold">{t(team.name)}</h3>
                          <p className="text-xs text-gray-400">{t(team.short_name)}</p>
                        </div>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <MapPin className="w-3 h-3 text-[#ffd700]" />
                          <span>{team.stadium}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Calendar className="w-3 h-3 text-[#ffd700]" />
                          <span>{t('Founded:')} {team.founded}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Users className="w-3 h-3 text-[#ffd700]" />
                          <span>{t('Capacity:')} {team.capacity.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}