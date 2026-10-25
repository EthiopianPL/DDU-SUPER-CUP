import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  BarChart3,
  Users,
  Trophy,
  Shield,
  Activity,
} from 'lucide-react';
import { DepartmentMark } from '../components/DepartmentMark';
import { GroupTable } from '../components/GroupTable';
import {
  cardEvents,
  formatKickoff,
  getDepartment,
  getFixture,
  getMatchStats,
  goalEvents,
  GROUP_COLLEGES,
  playersForDepartment,
  standingsFor,
  type Player,
} from '../../data/supercup';

type MatchTab = 'stats' | 'lineups' | 'standings';

export function MatchDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Tab state synchronization
  const rawTab = (searchParams.get('tab') || '').toLowerCase();
  const activeTab: MatchTab =
    rawTab === 'lineups' || rawTab === 'lineup'
      ? 'lineups'
      : rawTab === 'standings' || rawTab === 'table'
        ? 'standings'
        : 'stats';

  const setTab = (tab: MatchTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  const fixture = id ? getFixture(id) : undefined;

  // Unknown match ID handling
  if (!fixture) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-[#10192b] text-white/40">
          <Shield className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-white">Match Not Found</h1>
        <p className="mt-2 text-sm text-white/60">
          The requested fixture ID ({id || 'none'}) does not exist in the DDU Super Cup schedule.
        </p>
        <button
          type="button"
          onClick={() => navigate('/matches')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#f5c518] px-5 py-2.5 text-sm font-bold text-[#102018] shadow-md transition-all hover:bg-[#e5b512]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Matches
        </button>
      </div>
    );
  }

  const home = getDepartment(fixture.homeId);
  const away = getDepartment(fixture.awayId);
  const played = fixture.status !== 'upcoming';
  const isLive = fixture.status === 'live';

  const goals = useMemo(() => goalEvents(fixture), [fixture]);
  const cards = useMemo(() => cardEvents(fixture), [fixture]);
  const stats = useMemo(() => getMatchStats(fixture), [fixture]);

  const homeSquad = useMemo(() => playersForDepartment(fixture.homeId), [fixture.homeId]);
  const awaySquad = useMemo(() => playersForDepartment(fixture.awayId), [fixture.awayId]);

  const homeCaptain = homeSquad.find((p) => p.position === 'FWD') || homeSquad[0];
  const awayCaptain = awaySquad.find((p) => p.position === 'FWD') || awaySquad[0];

  const groupStandings = useMemo(() => standingsFor(fixture.group), [fixture.group]);
  const homeStanding = groupStandings.find((s) => s.department.id === fixture.homeId);
  const awayStanding = groupStandings.find((s) => s.department.id === fixture.awayId);

  return (
    <div className="mx-auto max-w-3xl overflow-x-clip px-4 pb-24 pt-5 sm:pb-12">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/matches')}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white/60 transition-colors hover:text-white"
        aria-label="Back to matches list"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Matches
      </button>

      {/* Broadcast Match Header Card */}
      <section
        className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#10192b] p-5 shadow-xl sm:p-7"
        aria-label="Match header"
      >
        {/* Subtle background team accent glows */}
        <div
          className="pointer-events-none absolute -left-12 -top-12 h-44 w-44 rounded-full opacity-15 blur-3xl"
          style={{ background: home?.color || '#2450c8' }}
        />
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-15 blur-3xl"
          style={{ background: away?.color || '#dc2626' }}
        />

        {/* Competition Stage & Kickoff Details */}
        <div className="relative border-b border-white/10 pb-4 text-center">
          <p className="text-[11px] font-bold tracking-[0.2em] text-[#f5c518]">
            DIRE DAWA UNIVERSITY SUPER CUP
          </p>
          <p className="mt-1 text-xs font-semibold text-white/70">
            GROUP {fixture.group} · MATCHDAY {fixture.matchday} · {GROUP_COLLEGES[fixture.group]}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-white/40" />
              {formatKickoff(fixture.date, fixture.time)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-white/40" />
              {fixture.time}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-white/40" />
              {fixture.stadium}
            </span>
          </div>
        </div>

        {/* Teams and Scoreboard Grid */}
        <div className="relative mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          {/* Home Team */}
          <div className="text-center sm:text-right">
            <button
              type="button"
              onClick={() => home && navigate(`/team/${home.id}`)}
              className="group mx-auto flex flex-col items-center sm:ml-auto sm:mr-0 sm:items-end"
            >
              <div className="transition-transform group-hover:scale-105">
                <DepartmentMark
                  shortName={home?.shortName ?? '?'}
                  color={home?.color ?? '#2450c8'}
                  size={56}
                />
              </div>
              <span className="mt-2.5 block text-sm font-bold text-white group-hover:underline sm:text-base">
                {home?.name ?? 'Home Team'}
              </span>
              <span className="rounded bg-[#2450c8]/25 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#9eb6f5]">
                HOME
              </span>
            </button>
          </div>

          {/* Center Score & Status Display */}
          <div className="flex flex-col items-center justify-center px-2">
            {isLive ? (
              <div className="text-center">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/20 px-3 py-1">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                  <span className="text-xs font-black tracking-wide text-red-500">LIVE</span>
                  <span className="font-mono text-xs font-bold text-red-400">{fixture.minute}&apos;</span>
                </div>
                <div className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {fixture.homeScore} <span className="text-white/30">-</span> {fixture.awayScore}
                </div>
                <p className="mt-1 text-[11px] font-semibold text-white/50">2nd Half In Progress</p>
              </div>
            ) : played ? (
              <div className="text-center">
                <span className="mb-2 inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/60">
                  Full Time
                </span>
                <div className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {fixture.homeScore} <span className="text-white/30">-</span> {fixture.awayScore}
                </div>
                <p className="mt-1 text-[11px] font-semibold text-white/40">Final Result</p>
              </div>
            ) : (
              <div className="text-center">
                <span className="mb-2 inline-block rounded-full border border-[#f5c518]/30 bg-[#f5c518]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#f5c518]">
                  Upcoming
                </span>
                <div className="text-2xl font-black tracking-widest text-white/40 sm:text-3xl">
                  VS
                </div>
                <p className="mt-1 font-mono text-sm font-bold text-[#f5c518]">{fixture.time} EAT</p>
              </div>
            )}
          </div>

          {/* Away Team */}
          <div className="text-center sm:text-left">
            <button
              type="button"
              onClick={() => away && navigate(`/team/${away.id}`)}
              className="group mx-auto flex flex-col items-center sm:ml-0 sm:mr-auto sm:items-start"
            >
              <div className="transition-transform group-hover:scale-105">
                <DepartmentMark
                  shortName={away?.shortName ?? '?'}
                  color={away?.color ?? '#dc2626'}
                  size={56}
                />
              </div>
              <span className="mt-2.5 block text-sm font-bold text-white group-hover:underline sm:text-base">
                {away?.name ?? 'Away Team'}
              </span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-white/70">
                AWAY
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Match Center Segmented Navigation Tabs */}
      <nav
        role="tablist"
        aria-label="Match center sections"
        className="mt-6 grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-[#10192b] p-1.5 shadow-inner"
      >
        <button
          id="match-tab-stats"
          role="tab"
          type="button"
          aria-selected={activeTab === 'stats'}
          aria-controls="match-panel-stats"
          onClick={() => setTab('stats')}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10192b] ${
            activeTab === 'stats'
              ? 'bg-[#f5c518] text-[#102018] shadow-md font-black'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <BarChart3 className={`h-4 w-4 shrink-0 ${activeTab === 'stats' ? 'text-[#102018]' : 'text-white/40'}`} />
          <span className="truncate">Statistics</span>
        </button>

        <button
          id="match-tab-lineups"
          role="tab"
          type="button"
          aria-selected={activeTab === 'lineups'}
          aria-controls="match-panel-lineups"
          onClick={() => setTab('lineups')}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10192b] ${
            activeTab === 'lineups'
              ? 'bg-[#f5c518] text-[#102018] shadow-md font-black'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Users className={`h-4 w-4 shrink-0 ${activeTab === 'lineups' ? 'text-[#102018]' : 'text-white/40'}`} />
          <span className="truncate">Lineups</span>
        </button>

        <button
          id="match-tab-standings"
          role="tab"
          type="button"
          aria-selected={activeTab === 'standings'}
          aria-controls="match-panel-standings"
          onClick={() => setTab('standings')}
          className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10192b] ${
            activeTab === 'standings'
              ? 'bg-[#f5c518] text-[#102018] shadow-md font-black'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Trophy className={`h-4 w-4 shrink-0 ${activeTab === 'standings' ? 'text-[#102018]' : 'text-white/40'}`} />
          <span className="truncate">Standings</span>
        </button>
      </nav>

      {/* TAB PANEL 1: STATISTICS */}
      {activeTab === 'stats' && (
        <section
          id="match-panel-stats"
          role="tabpanel"
          aria-labelledby="match-tab-stats"
          className="mt-6 space-y-6"
        >
          {played ? (
            <>
              {/* Match Events Timeline (Goals & Cards) */}
              <div className="rounded-2xl border border-white/10 bg-[#10192b] p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="flex items-center gap-2 text-base font-black text-white">
                    <Activity className="h-4 w-4 text-[#f5c518]" />
                    Match Events Timeline
                  </h2>
                  <span className="text-xs text-white/40">
                    {goals.length} {goals.length === 1 ? 'goal' : 'goals'} · {cards.length} {cards.length === 1 ? 'card' : 'cards'}
                  </span>
                </div>

                {goals.length === 0 && cards.length === 0 ? (
                  <p className="py-6 text-center text-sm text-white/50">
                    No score or disciplinary events recorded in this match.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {/* Interleaved goals and card events ordered by minute */}
                    {[...goals.map((g) => ({ ...g, eventKind: 'goal' as const })), ...cards.map((c) => ({ ...c, eventKind: 'card' as const }))]
                      .sort((a, b) => a.minute - b.minute)
                      .map((event, idx) => {
                        const isHomeTeam = event.teamId === fixture.homeId;
                        const eventDept = isHomeTeam ? home : away;

                        return (
                          <div
                            key={`${event.playerId}-${event.minute}-${idx}`}
                            className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3.5 py-2.5 transition-colors hover:bg-white/[0.06]"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 font-mono text-xs font-black text-[#f5c518]">
                                {event.minute}&apos;
                              </span>
                              <div className="flex items-center gap-2">
                                {event.eventKind === 'goal' ? (
                                  <span className="text-base" title="Goal">⚽</span>
                                ) : (
                                  <span
                                    className="inline-block h-4 w-3 rounded-sm bg-yellow-400 shadow-sm"
                                    title="Yellow Card"
                                  />
                                )}
                                <div>
                                  <p className="text-sm font-bold text-white">{event.playerName}</p>
                                  <p className="text-[11px] text-white/50">
                                    {event.eventKind === 'goal' ? 'Goal scored' : 'Caution (Yellow card)'}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-right">
                              <span className="text-xs font-semibold text-white/70">{eventDept?.shortName}</span>
                              {eventDept && (
                                <DepartmentMark
                                  shortName={eventDept.shortName}
                                  color={eventDept.color}
                                  size={22}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Match Statistics Comparison Bars */}
              {stats && (
                <div className="rounded-2xl border border-white/10 bg-[#10192b] p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                    <h2 className="flex items-center gap-2 text-base font-black text-white">
                      <BarChart3 className="h-4 w-4 text-[#f5c518]" />
                      Match Statistics
                    </h2>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="flex items-center gap-1.5" style={{ color: home?.color || '#2450c8' }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: home?.color || '#2450c8' }} />
                        {home?.shortName}
                      </span>
                      <span className="flex items-center gap-1.5" style={{ color: away?.color || '#dc2626' }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: away?.color || '#dc2626' }} />
                        {away?.shortName}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <StatBar
                      label="Possession"
                      homeVal={stats.home.possession}
                      awayVal={stats.away.possession}
                      homeColor={home?.color || '#2450c8'}
                      awayColor={away?.color || '#dc2626'}
                      unit="%"
                    />
                    <StatBar
                      label="Total Shots"
                      homeVal={stats.home.shots}
                      awayVal={stats.away.shots}
                      homeColor={home?.color || '#2450c8'}
                      awayColor={away?.color || '#dc2626'}
                    />
                    <StatBar
                      label="Shots on Target"
                      homeVal={stats.home.shotsOnTarget}
                      awayVal={stats.away.shotsOnTarget}
                      homeColor={home?.color || '#2450c8'}
                      awayColor={away?.color || '#dc2626'}
                    />
                    <StatBar
                      label="Corner Kicks"
                      homeVal={stats.home.corners}
                      awayVal={stats.away.corners}
                      homeColor={home?.color || '#2450c8'}
                      awayColor={away?.color || '#dc2626'}
                    />
                    <StatBar
                      label="Fouls Committed"
                      homeVal={stats.home.fouls}
                      awayVal={stats.away.fouls}
                      homeColor={home?.color || '#2450c8'}
                      awayColor={away?.color || '#dc2626'}
                    />
                    <StatBar
                      label="Yellow Cards"
                      homeVal={stats.home.yellowCards}
                      awayVal={stats.away.yellowCards}
                      homeColor={home?.color || '#2450c8'}
                      awayColor={away?.color || '#dc2626'}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Upcoming Match Pre-Match State: Genuine fixture info, no fabricated zeros */
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-[#10192b] p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <h2 className="flex items-center gap-2 text-base font-black text-white">
                    <Clock className="h-4 w-4 text-[#f5c518]" />
                    Pre-Match Overview
                  </h2>
                  <span className="rounded-full border border-[#f5c518]/30 bg-[#f5c518]/15 px-2.5 py-0.5 text-xs font-bold text-[#f5c518]">
                    Kickoff {fixture.time}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-white/70">
                  This Group {fixture.group} encounter will kick off at{' '}
                  <span className="font-bold text-white">{fixture.time} EAT</span> on{' '}
                  <span className="font-bold text-white">{formatKickoff(fixture.date, fixture.time)}</span> at{' '}
                  <span className="font-bold text-white">{fixture.stadium}</span>. Official live statistics and score events will be recorded once the referee signals the start of the match.
                </p>

                {/* Form & Table Standing Preview */}
                <div className="mt-5 grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <p className="text-xs font-semibold text-white/50">{home?.name}</p>
                    <p className="mt-1 text-lg font-black text-white">
                      Pos #{homeStanding?.position ?? '-'} · {homeStanding?.points ?? 0} pts
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-1">
                      {homeStanding?.form.map((res, i) => (
                        <span
                          key={`home-form-${i}`}
                          className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${
                            res === 'W' ? 'bg-[#7ddea0] text-[#070d18]' : res === 'D' ? 'bg-[#f5c518] text-[#070d18]' : 'bg-[#f07167] text-white'
                          }`}
                        >
                          {res}
                        </span>
                      ))}
                      {(!homeStanding || homeStanding.form.length === 0) && (
                        <span className="text-xs text-white/40">No games played</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <p className="text-xs font-semibold text-white/50">{away?.name}</p>
                    <p className="mt-1 text-lg font-black text-white">
                      Pos #{awayStanding?.position ?? '-'} · {awayStanding?.points ?? 0} pts
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-1">
                      {awayStanding?.form.map((res, i) => (
                        <span
                          key={`away-form-${i}`}
                          className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${
                            res === 'W' ? 'bg-[#7ddea0] text-[#070d18]' : res === 'D' ? 'bg-[#f5c518] text-[#070d18]' : 'bg-[#f07167] text-white'
                          }`}
                        >
                          {res}
                        </span>
                      ))}
                      {(!awayStanding || awayStanding.form.length === 0) && (
                        <span className="text-xs text-white/40">No games played</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB PANEL 2: LINEUPS */}
      {activeTab === 'lineups' && (
        <section
          id="match-panel-lineups"
          role="tabpanel"
          aria-labelledby="match-tab-lineups"
          className="mt-6 space-y-6"
        >
          {/* Lineup Confirmation Status Banner */}
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#10192b] p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-white/50">Formation</p>
              <p className="mt-0.5 text-base font-black text-white">1 - 2 - 3 - 2 (8-a-Side)</p>
            </div>
            {played ? (
              <span className="rounded-full border border-[#2f9e44]/40 bg-[#2f9e44]/15 px-3 py-1 text-xs font-bold text-[#7ddea0]">
                ✓ Confirmed Lineups
              </span>
            ) : (
              <span className="rounded-full border border-[#f5c518]/30 bg-[#f5c518]/15 px-3 py-1 text-xs font-bold text-[#f5c518]">
                Expected Squad Lineup
              </span>
            )}
          </div>

          {/* Desktop & Tablet Football Pitch Formation Visualizer */}
          <div className="rounded-2xl border border-white/10 bg-[#10192b] p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wider text-white/70">
              Tactical Pitch Layout
            </h2>

            {/* Pitch Graphic Container */}
            <div className="relative mx-auto h-[500px] w-full max-w-lg overflow-hidden rounded-2xl border-2 border-white/20 bg-gradient-to-b from-[#14532d] via-[#165b2a] to-[#14532d] p-3 shadow-inner">
              {/* Pitch Markings */}
              {/* Halfway Line */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-white/30" />
              {/* Center Circle */}
              <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/30" />
              {/* Center Dot */}
              <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />

              {/* Top Penalty Box (Home) */}
              <div className="absolute left-1/2 top-0 h-20 w-44 -translate-x-1/2 rounded-b-xl border-b-2 border-x-2 border-white/30" />
              {/* Bottom Penalty Box (Away) */}
              <div className="absolute bottom-0 left-1/2 h-20 w-44 -translate-x-1/2 rounded-t-xl border-t-2 border-x-2 border-white/30" />

              {/* HOME TEAM PLAYERS (Top Half, attacking downward) */}
              <div className="absolute inset-x-2 top-2 flex h-[46%] flex-col justify-around">
                {/* GK */}
                <PitchPlayerRow
                  players={homeSquad.filter((p) => p.position === 'GK')}
                  teamColor={home?.color || '#2450c8'}
                  goals={goals}
                  captainId={homeCaptain?.id}
                />
                {/* DEF */}
                <PitchPlayerRow
                  players={homeSquad.filter((p) => p.position === 'DEF')}
                  teamColor={home?.color || '#2450c8'}
                  goals={goals}
                  captainId={homeCaptain?.id}
                />
                {/* MID */}
                <PitchPlayerRow
                  players={homeSquad.filter((p) => p.position === 'MID')}
                  teamColor={home?.color || '#2450c8'}
                  goals={goals}
                  captainId={homeCaptain?.id}
                />
                {/* FWD */}
                <PitchPlayerRow
                  players={homeSquad.filter((p) => p.position === 'FWD')}
                  teamColor={home?.color || '#2450c8'}
                  goals={goals}
                  captainId={homeCaptain?.id}
                />
              </div>

              {/* AWAY TEAM PLAYERS (Bottom Half, attacking upward) */}
              <div className="absolute inset-x-2 bottom-2 flex h-[46%] flex-col-reverse justify-around">
                {/* GK */}
                <PitchPlayerRow
                  players={awaySquad.filter((p) => p.position === 'GK')}
                  teamColor={away?.color || '#dc2626'}
                  goals={goals}
                  captainId={awayCaptain?.id}
                />
                {/* DEF */}
                <PitchPlayerRow
                  players={awaySquad.filter((p) => p.position === 'DEF')}
                  teamColor={away?.color || '#dc2626'}
                  goals={goals}
                  captainId={awayCaptain?.id}
                />
                {/* MID */}
                <PitchPlayerRow
                  players={awaySquad.filter((p) => p.position === 'MID')}
                  teamColor={away?.color || '#dc2626'}
                  goals={goals}
                  captainId={awayCaptain?.id}
                />
                {/* FWD */}
                <PitchPlayerRow
                  players={awaySquad.filter((p) => p.position === 'FWD')}
                  teamColor={away?.color || '#dc2626'}
                  goals={goals}
                  captainId={awayCaptain?.id}
                />
              </div>
            </div>
          </div>

          {/* Roster Squad Lists for Mobile & Desktop */}
          <div className="grid gap-4 sm:grid-cols-2">
            <LineupRoster
              teamName={home?.name ?? 'Home'}
              shortName={home?.shortName ?? 'HOME'}
              color={home?.color ?? '#2450c8'}
              players={homeSquad}
              captainId={homeCaptain?.id}
              goals={goals}
              departmentId={fixture.homeId}
            />
            <LineupRoster
              teamName={away?.name ?? 'Away'}
              shortName={away?.shortName ?? 'AWAY'}
              color={away?.color ?? '#dc2626'}
              players={awaySquad}
              captainId={awayCaptain?.id}
              goals={goals}
              departmentId={fixture.awayId}
            />
          </div>
        </section>
      )}

      {/* TAB PANEL 3: STANDINGS */}
      {activeTab === 'standings' && (
        <section
          id="match-panel-standings"
          role="tabpanel"
          aria-labelledby="match-tab-standings"
          className="mt-6 space-y-6"
        >
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">
                  Group {fixture.group} Standings
                </h2>
                <p className="mt-0.5 text-xs text-white/50">{GROUP_COLLEGES[fixture.group]}</p>
              </div>
              <span className="rounded-full border border-[#2f9e44]/30 bg-[#2f9e44]/15 px-2.5 py-1 text-[11px] font-bold text-[#7ddea0]">
                Top 2 Advance
              </span>
            </div>

            {/* Standings Table with Home and Away teams highlighted */}
            <GroupTable
              group={fixture.group}
              highlightTeamIds={[fixture.homeId, fixture.awayId]}
              homeTeamId={fixture.homeId}
              awayTeamId={fixture.awayId}
            />
          </div>

          {/* Live Contextual Impact Note */}
          <div className="rounded-2xl border border-white/10 bg-[#10192b] p-4 text-xs leading-relaxed text-white/70">
            <p className="font-bold text-white">
              Match Impact on Group {fixture.group}
            </p>
            <p className="mt-1">
              Teams highlighted with <span className="font-bold text-[#9eb6f5]">[HOME]</span> and{' '}
              <span className="font-bold text-white">[AWAY]</span> show the current standings impact. Positions 1 & 2 qualify directly for the knockout stage following the conclusion of Matchday 3 on October 31.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

// -----------------------------------------
// Helper Subcomponents
// -----------------------------------------

function StatBar({
  label,
  homeVal,
  awayVal,
  homeColor,
  awayColor,
  unit = '',
}: {
  label: string;
  homeVal: number;
  awayVal: number;
  homeColor: string;
  awayColor: string;
  unit?: string;
}) {
  const total = homeVal + awayVal;
  const homePercent = total > 0 ? Math.round((homeVal / total) * 100) : 50;
  const awayPercent = 100 - homePercent;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="font-mono text-sm text-white">
          {homeVal}
          {unit}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
          {label}
        </span>
        <span className="font-mono text-sm text-white">
          {awayVal}
          {unit}
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="transition-all duration-500"
          style={{ width: `${homePercent}%`, backgroundColor: homeColor }}
        />
        <div
          className="transition-all duration-500"
          style={{ width: `${awayPercent}%`, backgroundColor: awayColor }}
        />
      </div>
    </div>
  );
}

function PitchPlayerRow({
  players,
  teamColor,
  goals,
  captainId,
}: {
  players: Player[];
  teamColor: string;
  goals: ReturnType<typeof goalEvents>;
  captainId?: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-around py-1">
      {players.map((player) => {
        const isCaptain = player.id === captainId;
        const hasScored = goals.some((g) => g.playerId === player.id);

        return (
          <div key={player.id} className="flex flex-col items-center">
            <div className="relative">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white/60 font-black text-xs text-white shadow-lg"
                style={{
                  background: teamColor,
                  color: teamColor.toLowerCase() === '#f5c518' ? '#102018' : '#ffffff',
                }}
              >
                {player.number}
              </div>
              {isCaptain && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f5c518] text-[9px] font-black text-[#102018] shadow">
                  C
                </span>
              )}
              {hasScored && (
                <span className="absolute -left-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] shadow">
                  ⚽
                </span>
              )}
            </div>
            <span className="mt-0.5 max-w-[65px] truncate rounded bg-black/60 px-1 py-0.5 text-center text-[9px] font-bold text-white backdrop-blur-sm">
              {player.name.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function LineupRoster({
  teamName,
  shortName,
  color,
  players,
  captainId,
  goals,
  departmentId,
}: {
  teamName: string;
  shortName: string;
  color: string;
  players: Player[];
  captainId?: string;
  goals: ReturnType<typeof goalEvents>;
  departmentId: string;
}) {
  const navigate = useNavigate();

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#10192b]">
      <header className="flex items-center justify-between border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <DepartmentMark shortName={shortName} color={color} size={28} />
          <h3 className="truncate text-sm font-bold text-white">{teamName}</h3>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/team/${departmentId}`)}
          className="text-xs font-semibold text-[#f5c518] hover:underline"
        >
          View Squad
        </button>
      </header>

      <div className="divide-y divide-white/5">
        {players.map((player) => {
          const isCaptain = player.id === captainId;
          const matchGoals = goals.filter((g) => g.playerId === player.id).length;

          return (
            <div
              key={player.id}
              className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-white/[0.03]"
            >
              <div className="flex items-center gap-3">
                <span className="w-5 text-center font-mono text-xs font-black text-white/50">
                  {player.number}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">{player.name}</span>
                    {isCaptain && (
                      <span className="rounded bg-[#f5c518]/20 px-1 py-0.2 text-[9px] font-black text-[#f5c518]">
                        CAPTAIN
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/40">{player.position}</p>
                </div>
              </div>
              {matchGoals > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-[#7ddea0]">
                  <span>⚽</span> {matchGoals > 1 ? `x${matchGoals}` : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
