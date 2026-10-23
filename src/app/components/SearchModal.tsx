import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { DepartmentMark } from './DepartmentMark';
import { departments, fixtures, getDepartment } from '../../data/supercup';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { t } = useLanguage();

  const query = searchTerm.trim().toLowerCase();

  const departmentResults = useMemo(() => {
    if (!query) return [];
    return departments.filter((department) =>
      `${department.name} ${department.shortName} ${department.college} group ${department.group}`.toLowerCase().includes(query),
    );
  }, [query]);

  const matchResults = useMemo(() => {
    if (!query) return [];
    return fixtures.filter((fixture) => {
      const home = getDepartment(fixture.homeId);
      const away = getDepartment(fixture.awayId);
      return `${home?.name} ${away?.name} ${home?.shortName} ${away?.shortName} group ${fixture.group}`.toLowerCase().includes(query);
    }).slice(0, 8);
  }, [query]);

  if (!isOpen) return null;

  const go = (path: string) => {
    navigate(path);
    setSearchTerm('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 px-4 pt-20">
      <div className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#10192b]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <Search className="h-4 w-4 text-white/40" />
          <input
            autoFocus
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={t('Search departments or matches')}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
          <button type="button" onClick={onClose} aria-label="Close search">
            <X className="h-4 w-4 text-white/50" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query && departmentResults.length === 0 && matchResults.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-white/40">{t('No results found')}</p>
          )}

          {departmentResults.map((department) => (
            <button
              key={department.id}
              type="button"
              onClick={() => go(`/team/${department.id}`)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/5"
            >
              <DepartmentMark shortName={department.shortName} color={department.color} size={32} />
              <span>
                <span className="block text-sm font-semibold text-white">{department.name}</span>
                <span className="block text-xs text-white/40">Group {department.group} · {department.college}</span>
              </span>
            </button>
          ))}

          {matchResults.map((fixture) => {
            const home = getDepartment(fixture.homeId);
            const away = getDepartment(fixture.awayId);
            return (
              <button
                key={fixture.id}
                type="button"
                onClick={() => go(`/match/${fixture.id}`)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left hover:bg-white/5"
              >
                <span className="text-sm text-white">{home?.shortName} vs {away?.shortName}</span>
                <span className="text-xs text-white/40">Group {fixture.group}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
