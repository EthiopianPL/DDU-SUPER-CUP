import { useState } from 'react';
import { useNavigate } from 'react-router';
import { DepartmentMark, Portrait } from '../components/DepartmentMark';
import { topAssists, topScorers } from '../../data/supercup';

type StatTab = 'goals' | 'assists';

export function StatisticsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<StatTab>('goals');
  const rows = tab === 'goals' ? topScorers(10) : topAssists(10);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-3 sm:pt-5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('goals')}
          className={`rounded-full px-4 py-2 text-sm font-bold ${tab === 'goals' ? 'bg-[#f5c518] text-[#102018]' : 'bg-white/5 text-white/70'}`}
        >
          Goals
        </button>
        <button
          type="button"
          onClick={() => setTab('assists')}
          className={`rounded-full px-4 py-2 text-sm font-bold ${tab === 'assists' ? 'bg-[#f5c518] text-[#102018]' : 'bg-white/5 text-white/70'}`}
        >
          Assists
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-[#10192b]">
        {rows.map((player, index) => (
          <button
            key={player.id}
            type="button"
            onClick={() => player.department && navigate(`/team/${player.department.id}`)}
            className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 hover:bg-white/5"
          >
            <span className="w-6 text-sm font-black text-white/40">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 truncate font-semibold text-white"><Portrait name={player.name} src={player.photoUrl || undefined} size={28} />{player.name}</span>
              <span className="mt-1 flex items-center gap-2 text-xs text-white/45">
                {player.department && (
                  <DepartmentMark shortName={player.department.shortName} color={player.department.color} size={20} src={player.department.crestUrl || undefined} />
                )}
                {player.department?.name} · {player.position}
              </span>
            </span>
            <span className="text-right">
              <span className="block text-xl font-black text-[#f5c518]">
                {tab === 'goals' ? player.goals : player.assists}
              </span>
              <span className="text-[10px] uppercase tracking-wide text-white/40">{tab}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
