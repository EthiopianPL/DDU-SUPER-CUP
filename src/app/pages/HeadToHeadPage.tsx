import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { BarChart3, X, ArrowRight, Calendar, Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Team {
  id: string;
  name: string;
  short_name: string;
  color: string;
}

interface HeadToHeadData {
  totalMatches: number;
  team1Wins: number;
  team2Wins: number;
  draws: number;
  team1Goals: number;
  team2Goals: number;
}

export function HeadToHeadPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam1, setSelectedTeam1] = useState<Team | null>(null);
  const [selectedTeam2, setSelectedTeam2] = useState<Team | null>(null);
  const [headToHead, setHeadToHead] = useState<HeadToHeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, short_name, color')
        .order('name');
      
      if (error) throw error;
      setTeams(data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHeadToHead = async () => {
    if (!selectedTeam1 || !selectedTeam2) return;
    
    try {
      // Fetch all matches between the two teams
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .or(`and(home_team_id.eq.${selectedTeam1.id},away_team_id.eq.${selectedTeam2.id}),and(home_team_id.eq.${selectedTeam2.id},away_team_id.eq.${selectedTeam1.id})`)
        .eq('status', 'finished');
      
      if (error) throw error;
      
      let team1Wins = 0;
      let team2Wins = 0;
      let draws = 0;
      let team1Goals = 0;
      let team2Goals = 0;
      
      (data || []).forEach(match => {
        const isTeam1Home = match.home_team_id === selectedTeam1.id;
        const team1Score = isTeam1Home ? match.home_score : match.away_score;
        const team2Score = isTeam1Home ? match.away_score : match.home_score;
        
        team1Goals += team1Score || 0;
        team2Goals += team2Score || 0;
        
        if (team1Score > team2Score) team1Wins++;
        else if (team2Score > team1Score) team2Wins++;
        else draws++;
      });
      
      setHeadToHead({
        totalMatches: data?.length || 0,
        team1Wins,
        team2Wins,
        draws,
        team1Goals,
        team2Goals
      });
      
      setShowComparison(true);
    } catch (error) {
      console.error('Error fetching head to head:', error);
    }
  };

  const handleCompare = () => {
    if (selectedTeam1 && selectedTeam2 && selectedTeam1.id !== selectedTeam2.id) {
      fetchHeadToHead();
    }
  };

  const handleReset = () => {
    setSelectedTeam1(null);
    setSelectedTeam2(null);
    setShowComparison(false);
    setHeadToHead(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (showComparison && headToHead) {
    return (
      <div className="pb-20">
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-3xl text-white flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>
            <BarChart3 className="w-8 h-8 text-[#ffd700]" />
            Head to Head
          </h1>
        </div>

        <div className="px-4">
          <button onClick={handleReset} className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
            <span className="text-sm">Change Teams</span>
          </button>

          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex-1 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: selectedTeam1?.color }}>
                <span className="text-2xl font-black text-black">{selectedTeam1?.short_name?.charAt(0)}</span>
              </div>
              <h2 className="text-white font-bold text-lg">{selectedTeam1?.name}</h2>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: 'rgba(255, 215, 0, 0.2)' }}>
                <span className="text-[#ffd700] font-black text-xl">VS</span>
              </div>
            </div>
            <div className="flex-1 text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: selectedTeam2?.color }}>
                <span className="text-2xl font-black text-black">{selectedTeam2?.short_name?.charAt(0)}</span>
              </div>
              <h2 className="text-white font-bold text-lg">{selectedTeam2?.name}</h2>
            </div>
          </div>

          <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
            <h3 className="text-white font-bold mb-3">Head to Head Record</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white">{selectedTeam1?.short_name} Wins</span>
                  <span className="text-gray-400">{headToHead.team1Wins}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ 
                    width: `${(headToHead.team1Wins / (headToHead.totalMatches || 1)) * 100}%`, 
                    background: selectedTeam1?.color 
                  }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Draws</span>
                  <span className="text-gray-400">{headToHead.draws}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gray-500 rounded-full" style={{ width: `${(headToHead.draws / (headToHead.totalMatches || 1)) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white">{selectedTeam2?.short_name} Wins</span>
                  <span className="text-gray-400">{headToHead.team2Wins}</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ 
                    width: `${(headToHead.team2Wins / (headToHead.totalMatches || 1)) * 100}%`, 
                    background: selectedTeam2?.color 
                  }} />
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-white/10 text-center">
              <p className="text-gray-400 text-sm">Total Matches Played</p>
              <p className="text-3xl font-black text-[#ffd700]">{headToHead.totalMatches}</p>
            </div>
          </div>

          <button onClick={() => navigate('/matches')} className="w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2" style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(255, 215, 0, 0.3)', color: '#ffd700' }}>
            View Full Match History <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl text-white flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>
          <BarChart3 className="w-8 h-8 text-[#ffd700]" />
          Head to Head
        </h1>
        <p className="text-gray-400">Compare two teams</p>
      </div>

      <div className="px-4">
        <div className="rounded-lg p-6 mb-6" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
          <div className="space-y-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Select First Team</label>
              <select
                value={selectedTeam1?.id || ''}
                onChange={(e) => setSelectedTeam1(teams.find(t => t.id === e.target.value) || null)}
                className="w-full px-4 py-3 rounded-lg text-white"
                style={{ background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <option value="">Choose a team</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div className="text-center">
              <div className="inline-block p-3 rounded-full" style={{ background: 'rgba(255, 215, 0, 0.1)' }}>
                <span className="text-[#ffd700] font-black text-xl">VS</span>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Select Second Team</label>
              <select
                value={selectedTeam2?.id || ''}
                onChange={(e) => setSelectedTeam2(teams.find(t => t.id === e.target.value) || null)}
                className="w-full px-4 py-3 rounded-lg text-white"
                style={{ background: 'rgba(10, 14, 26, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              >
                <option value="">Choose a team</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCompare}
              disabled={!selectedTeam1 || !selectedTeam2 || selectedTeam1.id === selectedTeam2.id}
              className="w-full py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#ffd700', color: '#000' }}
            >
              Compare Teams
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}