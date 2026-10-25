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
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#10192b] shadow-sm">
      <header className="flex items-start justify-between gap-3 border-b border-white/10 bg-[#0c1424] px-4 py-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-[#f5c518]">GROUP {group}</p>
          <p className="mt-0.5 text-xs text-white/70">{GROUP_COLLEGES[group]}</p>
        </div>
        <span className="rounded-full border border-[#2f9e44]/30 bg-[#2f9e44]/15 px-2.5 py-1 text-[10px] font-bold text-[#7ddea0]">
          Top 2 advance
        </span>
      </header>

      <div className={compact ? '' : 'overflow-x-auto overscroll-x-contain pb-0.5'}>
        <div className={compact ? '' : 'min-w-[480px]'}>
          <div
            className="grid items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/75"
            style={{
              gridTemplateColumns: compact
                ? '28px 1fr 32px 42px'
                : '28px minmax(130px, 1fr) 32px 30px 30px 30px 36px 42px 76px',
            }}
          >
            <span className="text-white/40">#</span>
            <span className="text-white/90">Department</span>
            {compact ? (
              <>
                <span className="text-center text-white/75" title="Played">P</span>
                <span className="text-center font-black text-[#f5c518]" title="Points">PTS</span>
              </>
            ) : (
              <>
                <span className="text-center text-white/75" title="Played">P</span>
                <span className="text-center text-white/75" title="Won">W</span>
                <span className="text-center text-white/75" title="Drawn">D</span>
                <span className="text-center text-white/75" title="Lost">L</span>
                <span className="text-center text-white/75" title="Goal Difference">GD</span>
                <span className="text-center font-black text-[#f5c518]" title="Points">PTS</span>
                <span className="text-center text-white/75" title="Recent Form">FORM</span>
              </>
            )}
          </div>

          {rows.map((row) => (
            <button
              key={row.department.id}
              type="button"
              onClick={() => navigate(`/team/${row.department.id}`)}
              className="grid w-full items-center gap-2 border-t border-white/[0.07] px-4 py-3 text-left transition-colors hover:bg-white/[0.06] active:bg-white/[0.09] focus-visible:bg-white/[0.08] focus-visible:outline-none"
              style={{
                gridTemplateColumns: compact
                  ? '28px 1fr 32px 42px'
                  : '28px minmax(130px, 1fr) 32px 30px 30px 30px 38px 42px 76px',
              }}
            >
              <span className={`text-sm font-black ${row.position <= 2 ? 'text-[#7ddea0]' : 'text-white/40'}`}>
                {row.position}
              </span>
              <span className="flex min-w-0 items-center gap-2.5">
                <DepartmentMark shortName={row.department.shortName} color={row.department.color} size={32} />
                <span className="truncate text-sm font-bold tracking-tight text-white">{row.department.name}</span>
              </span>
              {compact ? (
                <>
                  <span className="text-center text-sm font-semibold text-white/80">{row.played}</span>
                  <span className="text-center text-sm font-black text-[#f5c518]">{row.points}</span>
                </>
              ) : (
                <>
                  <span className="text-center text-sm font-semibold text-white/80">{row.played}</span>
                  <span className="text-center text-sm font-semibold text-white/80">{row.won}</span>
                  <span className="text-center text-sm font-semibold text-white/80">{row.drawn}</span>
                  <span className="text-center text-sm font-semibold text-white/80">{row.lost}</span>
                  <span className="text-center text-sm font-semibold text-white/80">
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </span>
                  <span className="text-center text-sm font-black text-[#f5c518]">{row.points}</span>
                  <span className="flex items-center justify-center gap-1">
                    {row.form.map((result, index) => (
                      <span
                        key={`${row.department.id}-${index}`}
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${
                          result === 'W'
                            ? 'bg-[#7ddea0] text-[#070d18]'
                            : result === 'D'
                              ? 'bg-[#f5c518] text-[#070d18]'
                              : 'bg-[#f07167] text-white'
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
