import { useNavigate } from 'react-router';
import { DepartmentMark } from './DepartmentMark';
import { GROUP_COLLEGES, standingsFor, type GroupId } from '../../data/supercup';

interface GroupTableProps {
  group: GroupId;
  compact?: boolean;
}

export function GroupTable({ group, compact = false }: GroupTableProps) {
  const navigate = useNavigate();
  const rows = standingsFor(group);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#10192b]">
      <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[#f5c518]">GROUP {group}</p>
          <p className="mt-1 text-sm text-white/70">{GROUP_COLLEGES[group]}</p>
        </div>
        <span className="rounded-full bg-[#2f9e44]/15 px-2 py-1 text-[10px] font-semibold text-[#7ddea0]">
          Top 2 advance
        </span>
      </header>

      <div className={compact ? '' : 'overflow-x-auto'}>
        <div className={compact ? '' : 'min-w-[520px]'}>
          <div
            className="grid items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-wide text-white/40"
            style={{ gridTemplateColumns: compact ? '28px 1fr 28px 36px' : '28px 1fr repeat(6, 32px) 72px' }}
          >
            <span>#</span>
            <span>Department</span>
            {compact ? (
              <>
                <span className="text-center">P</span>
                <span className="text-center">Pts</span>
              </>
            ) : (
              <>
                <span className="text-center">P</span>
                <span className="text-center">W</span>
                <span className="text-center">D</span>
                <span className="text-center">L</span>
                <span className="text-center">GD</span>
                <span className="text-center">Pts</span>
                <span className="text-center">Form</span>
              </>
            )}
          </div>

          {rows.map((row) => (
            <button
              key={row.department.id}
              type="button"
              onClick={() => navigate(`/team/${row.department.id}`)}
              className="grid w-full items-center gap-2 border-t border-white/5 px-4 py-2.5 text-left hover:bg-white/5"
              style={{ gridTemplateColumns: compact ? '28px 1fr 28px 36px' : '28px 1fr repeat(6, 32px) 72px' }}
            >
              <span className={`text-sm font-black ${row.position <= 2 ? 'text-[#7ddea0]' : 'text-white/50'}`}>
                {row.position}
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <DepartmentMark shortName={row.department.shortName} color={row.department.color} size={32} />
                <span className="truncate text-sm font-semibold text-white">{row.department.name}</span>
              </span>
              {compact ? (
                <>
                  <span className="text-center text-sm text-white/70">{row.played}</span>
                  <span className="text-center text-sm font-black text-white">{row.points}</span>
                </>
              ) : (
                <>
                  <span className="text-center text-sm text-white/70">{row.played}</span>
                  <span className="text-center text-sm text-white/70">{row.won}</span>
                  <span className="text-center text-sm text-white/70">{row.drawn}</span>
                  <span className="text-center text-sm text-white/70">{row.lost}</span>
                  <span className="text-center text-sm text-white/70">{row.goalDifference}</span>
                  <span className="text-center text-sm font-black text-white">{row.points}</span>
                  <span className="flex justify-center gap-1">
                    {row.form.map((result, index) => (
                      <span
                        key={`${row.department.id}-${index}`}
                        className={`h-4 w-4 rounded-full text-center text-[9px] font-bold leading-4 text-black ${
                          result === 'W' ? 'bg-[#7ddea0]' : result === 'D' ? 'bg-[#f5c518]' : 'bg-[#f07167]'
                        }`}
                      >
                        {result}
                      </span>
                    ))}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
