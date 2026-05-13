import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Trophy, Calendar, History } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Season {
  year: string;
  champion: string;
  championColor: string;
  runnerUp: string;
  topScorer: string;
  topScorerGoals: number;
}

export function SeasonArchivePage() {
  const navigate = useNavigate();
  const [seasons, setSeasons] = useState<Season[]>([
    { year: '2025/26', champion: 'St. George FC', championColor: '#ffc300', runnerUp: 'Fasil Kenema', topScorer: 'Getaneh Kebede', topScorerGoals: 22 },
    { year: '2024/25', champion: 'Fasil Kenema', championColor: '#e63946', runnerUp: 'St. George FC', topScorer: 'Abubeker Nassir', topScorerGoals: 19 },
    { year: '2023/24', champion: 'St. George FC', championColor: '#ffc300', runnerUp: 'Ethiopian Coffee', topScorer: 'Getaneh Kebede', topScorerGoals: 21 },
    { year: '2022/23', champion: 'Ethiopian Coffee', championColor: '#8b4513', runnerUp: 'St. George FC', topScorer: 'Amanuel Gebremichael', topScorerGoals: 18 }
  ]);
  const [selectedSeason, setSelectedSeason] = useState('2025/26');
  const [loading, setLoading] = useState(false);

  const currentSeason = seasons.find(s => s.year === selectedSeason);

  return (
    <div className="pb-20">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-3xl text-white flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900 }}>
          <History className="w-8 h-8 text-[#ffd700]" />
          Season Archive
        </h1>
        <p className="text-gray-400">Past champions & records</p>
      </div>

      <div className="px-4 mb-6">
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="w-full px-4 py-3 rounded-lg text-white"
          style={{ background: 'rgba(26, 31, 46, 0.8)', border: '1px solid rgba(255, 215, 0, 0.3)' }}
        >
          {seasons.map(season => (
            <option key={season.year} value={season.year}>{season.year} Season</option>
          ))}
        </select>
      </div>

      {currentSeason && (
        <>
          <div className="px-4 mb-6">
            <div className="rounded-lg p-6 text-center relative overflow-hidden" style={{ 
              background: `linear-gradient(135deg, ${currentSeason.championColor}20, ${currentSeason.championColor}05)`, 
              border: `2px solid ${currentSeason.championColor}` 
            }}>
              <Trophy className="absolute top-2 right-2 w-8 h-8 text-[#ffd700]" />
              <h3 className="text-sm text-gray-400 mb-2">Season {currentSeason.year} Champion</h3>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: currentSeason.championColor }}>
                <Trophy className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-black mb-1" style={{ color: currentSeason.championColor }}>
                {currentSeason.champion}
              </h2>
              <p className="text-sm text-gray-400">Runner-up: {currentSeason.runnerUp}</p>
            </div>
          </div>

          <div className="px-4 mb-6">
            <div className="rounded-lg p-4" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
              <h3 className="text-white font-bold mb-3 text-center">Season Awards</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-3xl mb-1">⚽</div>
                  <p className="text-xs text-gray-400">Golden Boot</p>
                  <p className="text-white font-bold text-sm">{currentSeason.topScorer}</p>
                  <p className="text-[#ffd700] font-bold">{currentSeason.topScorerGoals} goals</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="px-4">
        <h3 className="text-white font-bold mb-3">Champions History</h3>
        <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
          {seasons.map((season, index) => (
            <div
              key={season.year}
              onClick={() => setSelectedSeason(season.year)}
              className={`flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors ${
                index !== seasons.length - 1 ? 'border-b border-white/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ background: season.championColor }} />
                <div>
                  <p className="text-white font-semibold text-sm">{season.year}</p>
                  <p className="text-xs text-gray-400">{season.champion}</p>
                </div>
              </div>
              <Trophy className="w-4 h-4 text-[#ffd700]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}