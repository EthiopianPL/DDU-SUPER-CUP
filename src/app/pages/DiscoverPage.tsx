import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Trophy, Users, BarChart3, Search, X, Award, ChevronRight } from 'lucide-react';
import { GroupTable } from '../components/GroupTable';
import { MatchCard } from '../components/MatchCard';
import { DepartmentMark } from '../components/DepartmentMark';
import {
  GROUPS,
  GROUP_COLLEGES,
  cardTeam,
  departments,
  fixtures,
  standingsFor,
  topAssists,
  topScorers,
  type GroupId,
} from '../../data/supercup';
import { useLeagueVersion } from '../../data/live';

export type DiscoverTab = 'groups' | 'teams' | 'stats';

export function DiscoverPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab resolution with support for legacy aliases
  const rawTab = (searchParams.get('tab') || '').toLowerCase();
  const activeTab: DiscoverTab =
    rawTab === 'teams' || rawTab === 'departments'
      ? 'teams'
      : rawTab === 'stats' || rawTab === 'statistics'
        ? 'stats'
        : 'groups';

  // Group filter for Groups tab and Departments tab
  const rawGroup = (searchParams.get('group') || '').toUpperCase();
  const selectedGroup: GroupId = (GROUPS as string[]).includes(rawGroup) ? (rawGroup as GroupId) : 'A';

  const setTab = (tab: DiscoverTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const setSelectedGroup = (group: GroupId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'groups');
    next.set('group', group);
    setSearchParams(next, { replace: true });
  };

  // State for Teams/Departments search
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [departmentGroupFilter, setDepartmentGroupFilter] = useState<'ALL' | GroupId>('ALL');

  // State for Stats tab (goals vs assists)
  const [statCategory, setStatCategory] = useState<'goals' | 'assists'>('goals');
  const version = useLeagueVersion();

  // Groups data
  const groupFixtures = useMemo(
    () => fixtures.filter((fixture) => fixture.group === selectedGroup),
    [selectedGroup, version],
  );

  // Filtered departments
  const normalizedQuery = departmentSearch.trim().toLowerCase();
  const filteredDepartments = useMemo(() => {
    return departments.filter((dept) => {
      const matchesSearch =
        normalizedQuery === '' ||
        `${dept.name} ${dept.shortName} ${dept.college} ${dept.pitch}`.toLowerCase().includes(normalizedQuery);
      const matchesGroup = departmentGroupFilter === 'ALL' || dept.group === departmentGroupFilter;
      return matchesSearch && matchesGroup;
    });
  }, [normalizedQuery, departmentGroupFilter, version]);

  // Tournament statistics data
  const topScorersList = useMemo(() => topScorers(10), [version]);
  const topAssistsList = useMemo(() => topAssists(10), [version]);
  const activeStatsList = statCategory === 'goals' ? topScorersList : topAssistsList;
  const statLeader = activeStatsList[0];

  // Tournament aggregate summary
  const summary = useMemo(() => {
    const finishedOrLive = fixtures.filter((f) => f.status === 'finished' || f.status === 'live');
    const totalGoals = finishedOrLive.reduce((acc, f) => acc + (f.homeScore ?? 0) + (f.awayScore ?? 0), 0);
    const avgGoals = finishedOrLive.length > 0 ? (totalGoals / finishedOrLive.length).toFixed(1) : '0';
    return {
      matchesPlayed: finishedOrLive.length,
      totalGoals,
      avgGoals,
    };
  }, [version]);

  return (
    <div className="mx-auto max-w-3xl overflow-x-clip px-4 pb-24 pt-5 sm:pb-12">
      {/* Header Banner */}
      <header className="mb-5">
        <p className="text-[11px] font-semibold tracking-[0.2em] text-[#f5c518]">TOURNAMENT HUB</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Discover</h1>
        <p className="mt-1.5 text-sm text-white/60">
          Explore group standings, department rosters, and tournament leaderboards.
        </p>

        {/* Quick summary stats banner */}
        <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-2xl border border-white/10 bg-[#10192b] px-2 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 sm:text-[11px]">Groups</p>
            <p className="mt-1 text-base font-black tracking-tight text-white sm:text-lg">{GROUPS.length} Groups</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#10192b] px-2 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 sm:text-[11px]">Teams</p>
            <p className="mt-1 text-base font-black tracking-tight text-[#f5c518] sm:text-lg">{departments.length} Depts</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#10192b] px-2 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 sm:text-[11px]">Advancing</p>
            <p className="mt-1 text-base font-black tracking-tight text-[#7ddea0] sm:text-lg">Top 2 Each</p>
          </div>
        </div>
      </header>

      {/* Segmented Control / Tabs: uses grid-cols-3 so it never has horizontal overflow on mobile */}
      <div
        role="tablist"
        aria-label="Discover tournament sections"
        className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-[#10192b] p-1.5 shadow-inner"
      >
        <button
          id="tab-groups"
          role="tab"
          type="button"
          aria-selected={activeTab === 'groups'}
          aria-controls="panel-groups"
          onClick={() => setTab('groups')}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10192b] active:scale-[0.98] ${
            activeTab === 'groups'
              ? 'bg-[#f5c518] text-[#102018] shadow-md'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Trophy className={`h-4 w-4 shrink-0 ${activeTab === 'groups' ? 'text-[#102018]' : 'text-white/40'}`} />
          <span className="truncate">
            <span className="hidden sm:inline">Groups & Standings</span>
            <span className="sm:hidden">Standings</span>
          </span>
        </button>

        <button
          id="tab-teams"
          role="tab"
          type="button"
          aria-selected={activeTab === 'teams'}
          aria-controls="panel-teams"
          onClick={() => setTab('teams')}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10192b] active:scale-[0.98] ${
            activeTab === 'teams'
              ? 'bg-[#f5c518] text-[#102018] shadow-md'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Users className={`h-4 w-4 shrink-0 ${activeTab === 'teams' ? 'text-[#102018]' : 'text-white/40'}`} />
          <span className="truncate">
            <span className="hidden sm:inline">Departments</span>
            <span className="sm:hidden">Depts</span>
          </span>
        </button>

        <button
          id="tab-stats"
          role="tab"
          type="button"
          aria-selected={activeTab === 'stats'}
          aria-controls="panel-stats"
          onClick={() => setTab('stats')}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10192b] active:scale-[0.98] ${
            activeTab === 'stats'
              ? 'bg-[#f5c518] text-[#102018] shadow-md'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <BarChart3 className={`h-4 w-4 shrink-0 ${activeTab === 'stats' ? 'text-[#102018]' : 'text-white/40'}`} />
          <span className="truncate">
            <span className="hidden sm:inline">Tournament Stats</span>
            <span className="sm:hidden">Stats</span>
          </span>
        </button>
      </div>

      {/* TAB PANEL 1: GROUPS & STANDINGS */}
      {activeTab === 'groups' && (
        <section
          id="panel-groups"
          role="tabpanel"
          aria-labelledby="tab-groups"
          className="mt-6 space-y-6"
        >
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Groups & Standings</h2>
                <p className="mt-0.5 text-xs text-white/50">Four departments per group. Top 2 advance.</p>
              </div>
              <span className="rounded-full border border-[#2f9e44]/30 bg-[#2f9e44]/15 px-2.5 py-1 text-[11px] font-bold text-[#7ddea0]">
                Matchday 2 Live
              </span>
            </div>

            {/* Group selector chips */}
            <div
              role="group"
              aria-label="Filter standings by group"
              className="mt-4 flex gap-2 overflow-x-auto pb-1 overscroll-x-contain"
            >
              {GROUPS.map((item) => {
                const isCurrent = item === selectedGroup;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={isCurrent}
                    onClick={() => setSelectedGroup(item)}
                    className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all sm:text-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#070d18] ${
                      isCurrent
                        ? 'border border-[#f5c518] bg-[#f5c518] text-[#102018] shadow-md shadow-[#f5c518]/20 font-black'
                        : 'border border-white/10 bg-[#10192b] text-white/80 hover:border-white/25 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    Group {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Group Standings Table */}
          <div>
            <GroupTable group={selectedGroup} />
          </div>

          {/* Group Fixtures */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-black text-white">Group {selectedGroup} Fixtures</h3>
              <button
                type="button"
                onClick={() => navigate('/matches')}
                className="flex items-center gap-1 text-xs font-semibold text-[#f5c518] hover:underline"
              >
                All Matches <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              {groupFixtures.map((fixture) => (
                <MatchCard
                  key={fixture.id}
                  id={fixture.id}
                  homeTeam={cardTeam(fixture.homeId)}
                  awayTeam={cardTeam(fixture.awayId)}
                  homeScore={fixture.homeScore}
                  awayScore={fixture.awayScore}
                  status={fixture.status}
                  time={`MD${fixture.matchday} · ${fixture.time}`}
                  stadium={fixture.stadium}
                  matchMinute={fixture.minute}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB PANEL 2: DEPARTMENTS / TEAMS */}
      {activeTab === 'teams' && (
        <section
          id="panel-teams"
          role="tabpanel"
          aria-labelledby="tab-teams"
          className="mt-6 space-y-6"
        >
          <div>
            <h2 className="text-xl font-black text-white">Departments & Teams</h2>
            <p className="mt-0.5 text-xs text-white/50">{departments.length} university departments competing in the Super Cup</p>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={departmentSearch}
              onChange={(e) => setDepartmentSearch(e.target.value)}
              placeholder="Search by department, shortcode, or college..."
              className="w-full rounded-xl border border-white/10 bg-[#10192b] py-3 pl-10 pr-10 text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-[#f5c518]/50"
            />
            {departmentSearch && (
              <button
                type="button"
                onClick={() => setDepartmentSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Quick Group Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Filter departments by group">
            <button
              type="button"
              onClick={() => setDepartmentGroupFilter('ALL')}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                departmentGroupFilter === 'ALL'
                  ? 'bg-[#f5c518] text-[#102018]'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              All
            </button>
            {GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setDepartmentGroupFilter(g)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  departmentGroupFilter === g
                    ? 'bg-[#f5c518] text-[#102018]'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                Group {g}
              </button>
            ))}
          </div>

          {/* Departments list organized by Group */}
          <div className="space-y-6">
            {GROUPS.map((group) => {
              const groupDepartments = filteredDepartments.filter((dept) => dept.group === group);
              if (groupDepartments.length === 0) return null;

              return (
                <div key={group}>
                  <div className="mb-2.5 flex items-center justify-between border-b border-white/5 pb-1.5">
                    <div>
                      <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">GROUP {group}</p>
                      <p className="text-xs text-white/50">{GROUP_COLLEGES[group]}</p>
                    </div>
                    <span className="text-[11px] text-white/40">{groupDepartments.length} teams</span>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {groupDepartments.map((dept) => {
                      const standing = standingsFor(dept.group).find((s) => s.department.id === dept.id);

                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => navigate(`/team/${dept.id}`)}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#10192b] p-3 text-left transition-all hover:border-white/20 hover:bg-white/[0.07]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <DepartmentMark shortName={dept.shortName} color={dept.color} size={40} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-white">{dept.name}</p>
                              <p className="truncate text-xs text-white/40">{dept.pitch}</p>
                            </div>
                          </div>
                          {standing && (
                            <div className="shrink-0 text-right">
                              <span className="rounded-lg bg-white/5 px-2 py-1 text-xs font-bold text-[#f5c518]">
                                {standing.points} pts
                              </span>
                              <span className="mt-1 block text-[10px] text-white/40">
                                Pos #{standing.position}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredDepartments.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#10192b] py-12 text-center">
                <Users className="mx-auto h-8 w-8 text-white/30" />
                <p className="mt-2 text-sm font-semibold text-white/70">No departments found</p>
                <p className="text-xs text-white/40">Try adjusting your search query or group filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setDepartmentSearch('');
                    setDepartmentGroupFilter('ALL');
                  }}
                  className="mt-3 text-xs font-bold text-[#f5c518] hover:underline"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB PANEL 3: TOURNAMENT STATISTICS */}
      {activeTab === 'stats' && (
        <section
          id="panel-stats"
          role="tabpanel"
          aria-labelledby="tab-stats"
          className="mt-6 space-y-6"
        >
          <div>
            <h2 className="text-xl font-black text-white">Tournament Statistics</h2>
            <p className="mt-0.5 text-xs text-white/50">Leaderboards and player stats across all 6 groups</p>
          </div>

          {/* Statistics summary analytics cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-white/10 bg-[#10192b] p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Matches</p>
              <p className="mt-1 text-xl font-black text-white">{summary.matchesPlayed}</p>
              <p className="text-[10px] text-white/40">played</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#10192b] p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Total Goals</p>
              <p className="mt-1 text-xl font-black text-[#f5c518]">{summary.totalGoals}</p>
              <p className="text-[10px] text-white/40">scored</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#10192b] p-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Avg / Match</p>
              <p className="mt-1 text-xl font-black text-[#7ddea0]">{summary.avgGoals}</p>
              <p className="text-[10px] text-white/40">goals/game</p>
            </div>
          </div>

          {/* Goals vs Assists Sub-tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStatCategory('goals')}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
                statCategory === 'goals'
                  ? 'bg-[#f5c518] text-[#102018] shadow-sm'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              Top Scorers (Goals)
            </button>
            <button
              type="button"
              onClick={() => setStatCategory('assists')}
              className={`rounded-full px-4 py-2 text-xs font-bold transition-all sm:text-sm ${
                statCategory === 'assists'
                  ? 'bg-[#f5c518] text-[#102018] shadow-sm'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              Top Playmakers (Assists)
            </button>
          </div>

          {/* Leader Spotlight / Hero Card */}
          {statLeader && statLeader.department && (
            <button
              type="button"
              onClick={() => navigate(`/team/${statLeader.departmentId}`)}
              className="flex w-full items-center justify-between rounded-2xl border border-[#f5c518]/30 bg-gradient-to-r from-[#10192b] to-[#162238] p-4 text-left transition-all hover:border-[#f5c518]/60"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5c518]/20 text-[#f5c518]">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#f5c518]">
                      {statCategory === 'goals' ? 'Golden Boot Leader' : 'Assist Leader'}
                    </span>
                  </div>
                  <p className="text-lg font-black text-white">{statLeader.name}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
                    <DepartmentMark
                      shortName={statLeader.department.shortName}
                      color={statLeader.department.color}
                      size={18}
                    />
                    <span>{statLeader.department.name} · {statLeader.position}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-3xl font-black text-[#f5c518]">
                  {statCategory === 'goals' ? statLeader.goals : statLeader.assists}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-white/40">{statCategory}</span>
              </div>
            </button>
          )}

          {/* Top 10 Table */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#10192b]">
            <div className="border-b border-white/10 px-4 py-2.5 text-[10px] uppercase tracking-wide text-white/40">
              Top 10 {statCategory === 'goals' ? 'Goalscorers' : 'Assist Providers'}
            </div>
            {activeStatsList.map((player, index) => {
              const rank = index + 1;
              const isPodium = rank <= 3;
              const rankBadgeColor =
                rank === 1
                  ? 'bg-[#f5c518] text-[#102018]'
                  : rank === 2
                    ? 'bg-slate-300 text-[#102018]'
                    : rank === 3
                      ? 'bg-amber-700 text-white'
                      : 'text-white/40';

              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => player.department && navigate(`/team/${player.department.id}`)}
                  className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/5"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                      isPodium ? rankBadgeColor : 'text-white/40'
                    }`}
                  >
                    {rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{player.name}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-white/45">
                      {player.department && (
                        <DepartmentMark
                          shortName={player.department.shortName}
                          color={player.department.color}
                          size={18}
                        />
                      )}
                      <span className="truncate">{player.department?.name} · {player.position}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xl font-black text-[#f5c518]">
                      {statCategory === 'goals' ? player.goals : player.assists}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-white/40">{statCategory}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
