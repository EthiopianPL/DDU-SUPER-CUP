import { useNavigate } from 'react-router';
import { DepartmentMark } from './DepartmentMark';
import { GROUP_COLLEGES, isTeamQualified, standingsFor, type GroupId } from '../../data/supercup';
import { useLeagueVersion } from '../../data/live';
import { resolveGroupCoverUrl } from '../../config/assets';

interface GroupTableProps {
  group: GroupId;
  compact?: boolean;
  highlightTeamIds?: string[];
}

export function GroupTable({
  group,
  compact = false,
  highlightTeamIds = [],
}: GroupTableProps) {
  const version = useLeagueVersion();
  void version;
  const navigate = useNavigate();
  const rows = standingsFor(group);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#10192b] shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#0c1424] px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f5c518]/30 bg-[#0c1424] text-xs font-black text-[#f5c518] shadow-sm select-none"
              aria-hidden="true"
            >
              {group}
            </div>
            <img
              src={resolveGroupCoverUrl(group)}
              alt=""
              className="absolute inset-0 h-10 w-10 object-contain drop-shadow transition-opacity duration-200"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (!img.dataset.retried) {
                  img.dataset.retried = 'true';
                  if (img.src.includes('cdn.jsdelivr.net')) {
                    img.src = img.src.replace(
                      'cdn.jsdelivr.net/gh/EthiopianPL/ddu-super-cup-assets@main',
                      'raw.githubusercontent.com/EthiopianPL/ddu-super-cup-assets/main'
                    );
                    return;
                  }
                  if (img.src.includes('raw.githubusercontent.com')) {
                    img.src = img.src.replace(
                      'raw.githubusercontent.com/EthiopianPL/ddu-super-cup-assets/main',
                      'cdn.jsdelivr.net/gh/EthiopianPL/ddu-super-cup-assets@main'
                    );
                    return;
                  }
                }
                img.style.display = 'none';
              }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.18em] text-[#f5c518]">GROUP {group}</p>
            <p className="mt-0.5 text-xs text-white/70 truncate">{GROUP_COLLEGES[group]}</p>
          </div>
        </div>
        <span className="rounded-full border border-[#2f9e44]/30 bg-[#2f9e44]/15 px-2.5 py-1 text-[10px] font-bold text-[#7ddea0] shrink-0">
          {group === 'E' ? 'All 4 advance' : 'Top 3 advance'}
        </span>
      </header>

      <div className={compact ? '' : 'overflow-x-auto overscroll-x-contain pb-0.5'}>
        <div className={compact ? '' : 'min-w-[500px]'}>
          <div
            className="grid items-center gap-2 border-b border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white/75"
            style={{
              gridTemplateColumns: compact
                ? '28px 1fr 32px 42px'
                : '28px minmax(130px, 1fr) 32px 30px 30px 30px 38px 42px 76px',
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
                <span className="text-center text-white/75" title="Goal difference">GD</span>
                <span className="text-center font-black text-[#f5c518]" title="Points">PTS</span>
                <span className="text-center text-white/75">Form</span>
              </>
            )}
          </div>

          {rows.map((row) => {
            const isHighlighted = highlightTeamIds.includes(row.department.id);
            return (
              <button
                key={row.department.id}
                type="button"
                onClick={() => navigate(`/team/${row.department.id}`)}
                className={`grid w-full items-center gap-2 border-b border-white/5 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/5 ${isHighlighted ? 'bg-[#f5c518]/10' : ''
                  }`}
                style={{
                  gridTemplateColumns: compact
                    ? '28px 1fr 32px 42px'
                    : '28px minmax(130px, 1fr) 32px 30px 30px 30px 38px 42px 76px',
                }}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-black ${isTeamQualified(group, row.position)
                      ? 'bg-[#2f9e44] text-[#070d18]'
                      : 'text-white/40'
                    }`}
                >
                  {row.position}
                </span>

                <div className="flex items-center gap-2.5 overflow-hidden">
                  <DepartmentMark
                    shortName={row.department.shortName}
                    color={row.department.color}
                    size={22}
                    src={row.department.crestUrl || undefined}
                  />
                  <div className="truncate">
                    <p className="truncate text-sm font-bold text-white">
                      {row.department.name}
                    </p>
                    <p className="text-[10px] text-white/40 sm:hidden">
                      {row.department.shortName}
                    </p>
                  </div>
                </div>

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
                          className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${result === 'W'
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
            );
          })}
          {rows.length === 0 && (
            <div className="py-8 text-center text-xs text-white/40">
              No teams registered in Group {group} yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
