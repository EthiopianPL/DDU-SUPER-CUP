import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search } from 'lucide-react';
import { DepartmentMark } from '../components/DepartmentMark';
import { GROUPS, GROUP_COLLEGES, departments } from '../../data/supercup';

export function TeamsPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const query = searchTerm.trim().toLowerCase();

  const filtered = useMemo(
    () => departments.filter((department) =>
      `${department.name} ${department.shortName} ${department.college}`.toLowerCase().includes(query),
    ),
    [query],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-3 sm:pt-5">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search departments"
          className="w-full rounded-xl border border-white/10 bg-[#10192b] py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/30"
        />
      </div>

      <div className="mt-6 space-y-6">
        {GROUPS.map((group) => {
          const teams = filtered.filter((department) => department.group === group);
          if (teams.length === 0) return null;
          return (
            <section key={group}>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-[#f5c518]">GROUP {group}</p>
              <p className="mb-2 text-sm text-white/50">{GROUP_COLLEGES[group]}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {teams.map((department) => (
                  <button
                    key={department.id}
                    type="button"
                    onClick={() => navigate(`/team/${department.id}`)}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#10192b] px-3 py-3 text-left hover:bg-white/5"
                  >
                    <DepartmentMark shortName={department.shortName} color={department.color} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-white">{department.name}</span>
                      <span className="block truncate text-xs text-white/40">{department.pitch}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
