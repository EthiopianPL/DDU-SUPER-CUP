// src/app/components/SearchModal.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Search, X, Users, User, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../context/LanguageContext';
import { ChevronRight } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Team {
  id: number;
  name: string;
  short_name: string;
  color: string;
  stadium: string;
  logo_url?: string;
}

interface Player {
  id: number;
  name: string;
  position: string;
  number: number;
  team_id: number;
  goals: number;
  assists: number;
  team?: { name: string; color: string; short_name: string };
}

interface Match {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number | null;
  away_score: number | null;
  status: string;
  date: string;
  time: string;
  homeTeam?: Team;
  awayTeam?: Team;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Fetch data when search term changes (no debounce - instant search)
  useEffect(() => {
    if (!isOpen) {
      setTeams([]);
      setPlayers([]);
      setMatches([]);
      return;
    }

    // If search term is empty, show empty results
    if (!searchTerm.trim()) {
      setTeams([]);
      setPlayers([]);
      setMatches([]);
      return;
    }

    const fetchSearchResults = async () => {
      setLoading(true);
      try {
        // Fetch all teams matching search term (no limit)
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, name, short_name, color, stadium, logo_url')
          .ilike('name', `%${searchTerm}%`);

        if (teamsData) setTeams(teamsData);

        // Fetch all players matching search term (no limit)
        const { data: playersData } = await supabase
          .from('players')
          .select('*, team:teams(name, color, short_name)')
          .ilike('name', `%${searchTerm}%`);

        if (playersData) setPlayers(playersData);

        // Fetch all matches matching search term (no limit)
        const { data: matchesData } = await supabase
          .from('matches')
          .select(`
            *,
            homeTeam:home_team_id(id, name, short_name, color, logo_url),
            awayTeam:away_team_id(id, name, short_name, color, logo_url)
          `)
          .or(`homeTeam.name.ilike.%${searchTerm}%,awayTeam.name.ilike.%${searchTerm}%`);

        if (matchesData) setMatches(matchesData);
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSearchResults();
  }, [searchTerm, isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!isOpen) return null;

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setSearchTerm('');
  };

  const totalResults = teams.length + players.length + matches.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg">
      <div className="max-w-2xl mx-auto p-4">
        {/* Search Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('Search teams, players, matches...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg text-white text-lg"
              style={{
                background: 'rgba(26, 31, 46, 0.9)',
                border: '1px solid rgba(255, 215, 0, 0.3)'
              }}
              autoFocus
            />
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Results count */}
        {searchTerm && !loading && totalResults > 0 && (
          <div className="mb-3 px-2">
            <p className="text-xs text-gray-500">
              Found {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchTerm}"
            </p>
          </div>
        )}

        {/* Search Results */}
        <div className="space-y-6 max-h-[calc(100vh-160px)] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : searchTerm && totalResults === 0 ? (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">{t('No results found for "{{term}}"', { term: searchTerm })}</p>
              <p className="text-sm text-gray-500 mt-1">{t('Try searching for teams, players, or matches')}</p>
            </div>
          ) : (
            <>
              {/* Teams Results */}
              {teams.length > 0 && (
                <div>
                  <h3 className="text-[#ffd700] font-semibold mb-2 flex items-center gap-2 sticky top-0 bg-black/95 py-2">
                    <Users className="w-4 h-4" />
                    {t('Teams')} ({teams.length})
                  </h3>
                  <div className="space-y-2">
                    {teams.map(team => (
                      <button
                        key={team.id}
                        onClick={() => handleSelect(`/team/${team.id}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                      >
                        <div
                          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                          style={{ background: team.color }}
                        >
                          {team.logo_url ? (
                            <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-black font-bold text-lg">{team.short_name?.charAt(0) || team.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">{t(team.name)}</p>
                          <p className="text-xs text-gray-400 truncate">{team.stadium}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Players Results */}
              {players.length > 0 && (
                <div>
                  <h3 className="text-[#ffd700] font-semibold mb-2 flex items-center gap-2 sticky top-0 bg-black/95 py-2">
                    <User className="w-4 h-4" />
                    {t('Players')} ({players.length})
                  </h3>
                  <div className="space-y-2">
                    {players.map(player => (
                      <button
                        key={player.id}
                        onClick={() => handleSelect(`/player/${player.id}`)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-bold text-lg">{player.number}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">{t(player.name)}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {player.position} • {t(player.team?.name || '')}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-[#ffd700] font-bold">{player.goals}</p>
                          <p className="text-xs text-gray-400">{t('goals')}</p>
                        </div>
                        <div className="text-right min-w-[50px] flex-shrink-0">
                          <p className="text-blue-500 font-bold">{player.assists}</p>
                          <p className="text-xs text-gray-400">{t('assists')}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matches Results */}
              {matches.length > 0 && (
                <div>
                  <h3 className="text-[#ffd700] font-semibold mb-2 flex items-center gap-2 sticky top-0 bg-black/95 py-2">
                    <Calendar className="w-4 h-4" />
                    {t('Matches')} ({matches.length})
                  </h3>
                  <div className="space-y-2">
                    {matches.map(match => (
                      <button
                        key={match.id}
                        onClick={() => handleSelect(`/match/${match.id}`)}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                      >
                        <div className="flex-1 text-right">
                          <p className="text-white font-semibold">{match.homeTeam?.short_name || match.homeTeam?.name}</p>
                        </div>
                        <div className="px-3 text-center">
                          <p className="text-[#ffd700] font-bold text-sm">{t('VS')}</p>
                          <p className="text-xs text-gray-500">{match.time}</p>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-white font-semibold">{match.awayTeam?.short_name || match.awayTeam?.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

