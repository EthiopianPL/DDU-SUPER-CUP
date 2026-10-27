import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Trophy, BarChart3, Award, ChevronRight, GitBranch } from 'lucide-react';
import { KnockoutRoad } from '../components/KnockoutRoad';
import { GroupTable } from '../components/GroupTable';
import { MatchCard } from '../components/MatchCard';
import { DepartmentMark, Portrait } from '../components/DepartmentMark';
import {
  GROUPS,
  cardTeam,
  fixtures,
  topAssists,
  topScorers,
  sortFixturesByPriority,
  type GroupId,
} from '../../data/supercup';
import { useLeagueVersion } from '../../data/live';

export type DiscoverTab = 'groups' | 'knockout' | 'stats';

export function DiscoverPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab resolution with support for legacy aliases
  const rawTab = (searchParams.get('tab') || '').toLowerCase();
  const activeTab: DiscoverTab =
    rawTab === 'stats' || rawTab === 'statistics'
      ? 'stats'
      : rawTab === 'road' || rawTab === 'knockout' || rawTab === 'bracket'
        ? 'knockout'
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

  // State for Stats tab (goals vs assists)
  const [statCategory, setStatCategory] = useState<'goals' | 'assists'>('goals');
  const version = useLeagueVersion();

  // Groups data sorted by smart priority: LIVE -> UPCOMING -> FINISHED
  const groupFixtures = useMemo(
    () => sortFixturesByPriority(fixtures.filter((fixture) => fixture.group === selectedGroup && (fixture.stage ?? 'group') === 'group')),
    [selectedGroup, version],
  );

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
    <div className="mx-auto max-w-3xl overflow-x-clip px-4 pb-24 pt-3 sm:pb-12 sm:pt-5">
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
          <span className="truncate">Groups</span>
        </button>

        <button
          id="tab-knockout"
          role="tab"
          type="button"
          aria-selected={activeTab === 'knockout'}
          aria-controls="panel-knockout"
          onClick={() => setTab('knockout')}
          className={`flex items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-center text-[10px] font-bold transition-all sm:gap-1.5 sm:px-2 sm:text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10192b] active:scale-[0.98] ${
            activeTab === 'knockout'
              ? 'bg-[#f5c518] text-[#102018] shadow-md'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <GitBranch className={`h-4 w-4 shrink-0 ${activeTab === 'knockout' ? 'text-[#102018]' : 'text-white/40'}`} />
          <span className="truncate">Knockout</span>
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
          <span className="truncate">Stats</span>
        </button>
      </div>

      {/* TAB PANEL 1: GROUPS & STANDINGS */}
      {activeTab === 'groups' && (
        <section
          id="panel-groups"
          role="tabpanel"
          aria-labelledby="tab-groups"
          className="mt-4 space-y-5"
        >
          {/* Group selector chips */}
          <div
            role="group"
            aria-label="Filter standings by group"
            className="flex gap-2 overflow-x-auto pb-1 overscroll-x-contain"
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

      {activeTab === 'knockout' && (
        <section id="panel-knockout" role="tabpanel" aria-labelledby="tab-knockout" className="mt-4">
          <KnockoutRoad />
        </section>
      )}

      {/* TAB PANEL 3: TOURNAMENT STATISTICS */}
      {activeTab === 'stats' && (
        <section
          id="panel-stats"
          role="tabpanel"
          aria-labelledby="tab-stats"
          className="mt-4 space-y-5"
        >
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
                  <p className="flex items-center gap-2 text-lg font-black text-white"><Portrait name={statLeader.name} src={statLeader.photoUrl || undefined} size={28} />{statLeader.name}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-white/50">
                    <DepartmentMark
                      shortName={statLeader.department.shortName}
                      color={statLeader.department.color}
                      size={18}
                      src={statLeader.department.crestUrl || undefined}
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
                    <p className="flex items-center gap-2 truncate text-sm font-bold text-white"><Portrait name={player.name} src={player.photoUrl || undefined} size={24} />{player.name}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-white/45">
                      {player.department && (
                        <DepartmentMark
                          shortName={player.department.shortName}
                          color={player.department.color}
                          size={18}
                          src={player.department.crestUrl || undefined}
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
