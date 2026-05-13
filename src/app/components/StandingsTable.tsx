import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface StandingsEntry {
  position: number;
  team: { id: string; name: string; color: string };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L' | '-')[];
}

interface StandingsTableProps {
  standings: StandingsEntry[];
}

export function StandingsTable({ standings }: StandingsTableProps) {
  const { t } = useLanguage();
  const getFormColor = (result: string) => { 
  if (result === 'W') return 'bg-green-500';
  if (result === 'D') return 'bg-yellow-500';
  if (result === 'L') return 'bg-red-500';
  return 'bg-gray-600';   // for '-'
};

  const getPositionIcon = (position: number) => {
    if (position === 1) return <Trophy className="w-4 h-4 text-[#ffd700]" />;
    if (position === 2) return <Trophy className="w-4 h-4 text-gray-400" />;
    if (position === 3) return <Trophy className="w-4 h-4 text-amber-600" />;
    return null;
  };

  const getPositionChange = (position: number) => {
    const changes: Record<number, 'up' | 'down' | 'same'> = {
      1: 'same', 2: 'same', 3: 'up', 4: 'down', 5: 'up', 6: 'down',
      7: 'same', 8: 'up', 9: 'down', 10: 'same', 11: 'up', 12: 'down',
      13: 'same', 14: 'down', 15: 'same', 16: 'same'
    };
    return changes[position] || 'same';
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(26, 31, 46, 0.8)' }}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-3 text-xs text-gray-400 w-12">#</th>
              <th className="text-left p-3 text-xs text-gray-400">{t('Team')}</th>
              <th className="text-center p-3 text-xs text-gray-400 w-12">P</th>
              <th className="text-center p-3 text-xs text-gray-400 w-12">W</th>
              <th className="text-center p-3 text-xs text-gray-400 w-12">D</th>
              <th className="text-center p-3 text-xs text-gray-400 w-12">L</th>
              <th className="text-center p-3 text-xs text-gray-400 w-16">GD</th>
              <th className="text-center p-3 text-xs text-gray-400 w-12">Pts</th>
              <th className="text-center p-3 text-xs text-gray-400 w-24">{t('Form')}</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((team) => {
              const positionChange = getPositionChange(team.position);
              
              return (
                <tr key={team.team.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3">
          <span className={`font-bold text-sm ${
          team.position === 1 ? 'text-green-500' :
          team.position === 2 ? 'text-blue-500' :
          team.position >= 18 && team.position <= 20 ? 'text-red-500' :
    'text-white'
  }`}>
    {team.position}
  </span>
</td>
                  
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.team.color }} />
                      <span className="text-white font-medium text-sm">{team.team.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center text-gray-300 text-sm">{team.played}</td>
                  <td className="p-3 text-center text-green-500 text-sm">{team.won}</td>
                  <td className="p-3 text-center text-yellow-500 text-sm">{team.drawn}</td>
                  <td className="p-3 text-center text-red-500 text-sm">{team.lost}</td>
                  <td className={`p-3 text-center text-sm ${team.goalDifference >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {team.goalDifference}
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-black text-white text-sm">{team.points}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-center">
                      {team.form.map((result, idx) => (
                        <div key={idx} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${getFormColor(result)}`}>
                          {result}
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
  );
}
