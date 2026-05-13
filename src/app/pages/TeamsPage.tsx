// src/app/pages/TeamsPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Shield, Search, MapPin, Calendar, Users, Trophy, ChevronRight, ArrowLeft } from 'lucide-react';
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
}

export function TeamsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [teams, setTeams] = useState<Team[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [selectedCity, setSelectedCity] = useState<string>('all');

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');

      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = (teamId: number) => {
    setImageErrors(prev => ({ ...prev, [teamId]: true }));
  };

  // Get unique cities for filter
  const cities = ['all', ...new Set(teams.map(team => team.city))].filter(Boolean);

  const filteredTeams = teams.filter(team => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      team.name.toLowerCase().includes(searchLower) ||
      team.short_name.toLowerCase().includes(searchLower) ||
      t(team.name).toLowerCase().includes(searchLower) ||
      t(team.short_name).toLowerCase().includes(searchLower);
    const matchesCity = selectedCity === 'all' || team.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <div className="relative mb-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#ffd700]/20 to-transparent" />
        <div className="px-4 pt-8 pb-6 relative">
          <button
            onClick={() => navigate('/discover')}
            className="mb-6 flex items-center gap-2 text-white/80 hover:text-white transition-colors bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t('Back')}</span>
          </button>
          <h1 className="text-4xl text-white flex items-center gap-2 mb-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>
            <Shield className="w-10 h-10 text-[#ffd700]" />
            {t('Clubs')}
          </h1>
          <p className="text-gray-400 text-lg">{teams.length} {t('Teams')} • {t('Ethiopian Premier League')}</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="px-4 mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('Search teams by name or short name...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-white"
            style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
          />
        </div>

        {/* City Filter Chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {cities.map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${selectedCity === city
                  ? 'bg-[#ffd700] text-black'
                  : 'bg-white/10 text-gray-400 hover:bg-white/20'
                }`}
            >
              {city === 'all' ? t('All Cities') : t(city)}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-xs text-gray-500">
          {t('Showing {{count}} of {{total}} teams', { count: filteredTeams.length, total: teams.length })}
        </p>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div className="px-4 text-center py-12">
          <Shield className="w-16 h-16 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">{t('No teams found matching your search')}</p>
        </div>
      ) : (
        <div className="px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTeams.map((team) => (
              <div
                key={team.id}
                onClick={() => navigate(`/team/${team.id}`)}
                className="group rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                style={{
                  background: 'rgba(26, 31, 46, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.06)'
                }}
              >
                {/* Team Header with Color */}
                <div
                  className="relative h-24 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${team.color}40, ${team.color}10)` }}
                >
                  {/* Team Logo */}
                  <div className="absolute -bottom-8 left-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden bg-white/10 flex items-center justify-center shadow-lg border-4" style={{ borderColor: team.color }}>
                      {team.logo_url && !imageErrors[team.id] ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="w-full h-full object-cover"
                          onError={() => handleImageError(team.id)}
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-2xl font-bold text-black"
                          style={{ background: team.color }}
                        >
                          {t(team.short_name || team.name).charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* City Badge */}
                  <div className="absolute top-3 right-3">
                    <span className="text-[10px] px-2 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">
                      {t(team.city)}
                    </span>
                  </div>
                </div>

                {/* Team Info */}
                <div className="p-4 pt-10">
                  <h3 className="text-white font-bold text-lg mb-1">{t(team.name)}</h3>
                  <p className="text-xs text-gray-400 mb-3">{t(team.short_name)}</p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 mb-3 pt-2 border-t border-white/10">
                    <div className="text-center">
                      <MapPin className="w-3 h-3 text-[#ffd700] mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500">{t('Stadium')}</p>
                      <p className="text-white text-xs font-semibold truncate">{t(team.stadium?.split(' ')[0] || team.stadium)}</p>
                    </div>
                    <div className="text-center">
                      <Calendar className="w-3 h-3 text-[#ffd700] mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500">{t('Founded')}</p>
                      <p className="text-white text-xs font-semibold">{team.founded}</p>
                    </div>
                    <div className="text-center">
                      <Users className="w-3 h-3 text-[#ffd700] mx-auto mb-1" />
                      <p className="text-[10px] text-gray-500">{t('Capacity')}</p>
                      <p className="text-white text-xs font-semibold">{(team.capacity / 1000).toFixed(0)}k</p>
                    </div>
                  </div>

                  {/* View Button */}
                  <button
                    className="w-full mt-2 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 group-hover:gap-2"
                    style={{ background: `${team.color}20`, color: team.color }}
                  >
                    {t('View Team Details')}
                    <ChevronRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Footer */}
      <div className="px-4 mt-8">
        <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(26, 31, 46, 0.5)' }}>
          <Trophy className="w-6 h-6 text-[#ffd700] mx-auto mb-2" />
          <p className="text-white text-sm font-semibold">{t('Ethiopian Premier League')}</p>
          <p className="text-xs text-gray-500 mt-1">{teams.length} {t('Teams • 380 Matches • Champions Crowned in June')}</p>
        </div>
      </div>
    </div>
  );
}