import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  MapPin,
  Calendar,
  Clock,
  History,
  Users,
  Trophy,
  Shield,
} from 'lucide-react';
import { DepartmentMark } from '../components/DepartmentMark';
import { RedCards } from '../components/RedCards';
import { formationPlan } from '../../data/formation';
import { useLeagueVersion } from '../../data/live';
import { useMatchClock } from '../useMatchClock';
import { GroupTable } from '../components/GroupTable';
import {
  clockSync,
  formatKickoff,
  formatLiveTime,
  getDepartment,
  getFixture,
  GROUP_COLLEGES,
  manualStats,
  matchSheet,
  matchSubstitutions,
  matchTimeline,
  periodText,
  teamRedCards,
  players,
  type Player,
  type TimelineEvent,
} from '../../data/supercup';

type MatchTab = 'overview' | 'lineups' | 'standings';

export function MatchDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Tab state synchronization
  const rawTab = (searchParams.get('tab') || '').toLowerCase();
  const activeTab: MatchTab = rawTab === 'lineups' ? 'lineups' : rawTab === 'standings' || rawTab === 'table' ? 'standings' : 'overview';

  const setTab = (tab: MatchTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  const fixture = id ? getFixture(id) : undefined;
  const clock = useMatchClock(fixture?.status === 'live' ? fixture.id : undefined);
  const version = useLeagueVersion();

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

  const timeline = useMemo(() => matchTimeline(fixture), [fixture, version, clock?.minute, fixture.homeScore, fixture.awayScore, fixture.status]);
  const homeReds = teamRedCards(fixture.id, fixture.homeId);
  const awayReds = teamRedCards(fixture.id, fixture.awayId);
  const substitutions = useMemo(() => matchSubstitutions(fixture), [fixture, version, clock?.minute, fixture.status]);
  const homeSheet = useMemo(() => matchSheet(fixture.homeId, fixture.id), [fixture.homeId, fixture.id, version]);
  const awaySheet = useMemo(() => matchSheet(fixture.awayId, fixture.id), [fixture.awayId, fixture.id, version]);
  const recorded = manualStats.filter((stat) => stat.matchId === fixture.id);

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
          <div className="min-w-0 text-center sm:text-right">
            <button
              type="button"
              onClick={() => home && navigate(`/team/${home.id}`)}
              className="group mx-auto flex w-full min-w-0 flex-col items-center sm:ml-auto sm:mr-0 sm:items-end"
            >
              <div className="transition-transform group-hover:scale-105">
                <DepartmentMark
                  shortName={home?.shortName ?? '?'}
                  color={home?.color ?? '#2450c8'}
                  size={56}
                  src={home?.crestUrl || undefined}
                />
              </div>
              <span className="mt-2.5 inline-flex max-w-full items-center justify-center gap-1.5 sm:justify-end">
                {homeReds > 0 && <RedCards count={homeReds} />}
                <span className="min-w-0 text-sm font-bold leading-tight text-white group-hover:underline sm:text-base">
                  {home?.name ?? home?.shortName ?? 'Team'}
                </span>
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
                  <span className="font-mono text-xs font-bold text-red-400">
                    {clock ? formatLiveTime(clock) : `${fixture.minute ?? 0}'`}
                  </span>
                </div>
                <div className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {fixture.homeScore} <span className="text-white/30">-</span> {fixture.awayScore}
                </div>
                <p className="mt-1 text-[11px] font-semibold text-white/50">{periodText(fixture.period, clock?.running)}{clock && clock.added > 0 ? ` · +${clock.added}` : ''}</p>
                {fixture.pensHome != null && fixture.pensAway != null && (
                  <p className="text-[11px] font-bold text-[#f5c518]">Pens {fixture.pensHome}-{fixture.pensAway}</p>
                )}
              </div>
            ) : played ? (
              <div className="text-center">
                <span className="mb-2 inline-block rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/60">
                  Full Time
                </span>
                <div className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {fixture.homeScore} <span className="text-white/30">-</span> {fixture.awayScore}
                </div>
                <p className="mt-1 text-[11px] font-semibold text-white/40">
                  {fixture.confirmed ? 'Confirmed result' : 'Awaiting confirmation'}
                </p>
                {fixture.pensHome != null && fixture.pensAway != null && (
                  <p className="text-[11px] font-bold text-[#f5c518]">Pens {fixture.pensHome}-{fixture.pensAway}</p>
                )}
              </div>
            ) : (
              <KickoffClock date={fixture.date} time={fixture.time} detail={fixture.detail} compact />
            )}
          </div>

          {/* Away Team */}
          <div className="min-w-0 text-center sm:text-left">
            <button
              type="button"
              onClick={() => away && navigate(`/team/${away.id}`)}
              className="group mx-auto flex w-full min-w-0 flex-col items-center sm:ml-0 sm:mr-auto sm:items-start"
            >
              <div className="transition-transform group-hover:scale-105">
                <DepartmentMark
                  shortName={away?.shortName ?? '?'}
                  color={away?.color ?? '#dc2626'}
                  size={56}
                  src={away?.crestUrl || undefined}
                />
              </div>
              <span className="mt-2.5 inline-flex max-w-full items-center justify-center gap-1.5 sm:justify-start">
                <span className="min-w-0 text-sm font-bold leading-tight text-white group-hover:underline sm:text-base">
                  {away?.name ?? away?.shortName ?? 'Team'}
                </span>
                {awayReds > 0 && <RedCards count={awayReds} />}
              </span>
            </button>
          </div>
        </div>
      </section>

      <LiveNotice events={timeline} live={isLive} />

      {/* Match Center Segmented Navigation Tabs */}
      <nav
        role="tablist"
        aria-label="Match center sections"
        className="mt-6 grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-[#10192b] p-1.5 shadow-inner"
      >
        <MatchTabButton id="overview" active={activeTab === 'overview'} onSelect={() => setTab('overview')} icon={History} label="Overview" />
        <MatchTabButton id="lineups" active={activeTab === 'lineups'} onSelect={() => setTab('lineups')} icon={Users} label="Lineups" />
        <MatchTabButton id="standings" active={activeTab === 'standings'} onSelect={() => setTab('standings')} icon={Trophy} label="Standings" />
      </nav>

      {activeTab === 'overview' && (
        <section id="match-panel-overview" role="tabpanel" aria-labelledby="match-tab-overview" className="mt-8">
          {fixture.status === 'upcoming' ? (
            <KickoffClock date={fixture.date} time={fixture.time} detail={fixture.detail} />
          ) : (
            <EventTimeline
              events={timeline}
              substitutions={substitutions}
              homeId={fixture.homeId}
              reachedHalf={Boolean(fixture.period && fixture.period !== 'pre' && fixture.period !== 'first_half')}
              halfMinute={Math.round((fixture.halfSeconds ?? 45 * 60) / 60)}
            />
          )}
        </section>
      )}

      {activeTab === 'lineups' && (
        <section
          id="match-panel-lineups"
          role="tabpanel"
          aria-labelledby="match-tab-lineups"
          className="mt-6 space-y-4"
        >
          <Pitch
            homeName={home?.name ?? 'Home'}
            awayName={away?.name ?? 'Away'}
            homeShort={home?.shortName ?? 'H'}
            awayShort={away?.shortName ?? 'A'}
            homeColor={home?.color ?? '#334155'}
            awayColor={away?.color ?? '#334155'}
            homeCrest={home?.crestUrl || undefined}
            awayCrest={away?.crestUrl || undefined}
            homeSheet={homeSheet}
            awaySheet={awaySheet}
            timeline={timeline}
            substitutions={substitutions}
            played={played}
            live={isLive}
          />
          {recorded.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#10192b] p-4">
              <p className="text-[11px] font-bold tracking-[0.14em] text-white/40">ENTERED BY THE MATCH OFFICIAL</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {recorded.map((stat) => (
                  <p key={`${stat.teamId}-${stat.metric}`} className="text-white/70">
                    {stat.metric.replaceAll('_', ' ')} · {stat.value}
                  </p>
                ))}
              </div>
            </div>
          )}
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
            />
          </div>
        </section>
      )}
    </div>
  );
}

function Pitch({
  homeName,
  awayName,
  homeShort,
  awayShort,
  homeColor,
  awayColor,
  homeCrest,
  awayCrest,
  homeSheet,
  awaySheet,
  timeline,
  substitutions,
  played,
  live,
}: {
  homeName: string;
  awayName: string;
  homeShort: string;
  awayShort: string;
  homeColor: string;
  awayColor: string;
  homeCrest?: string;
  awayCrest?: string;
  homeSheet: ReturnType<typeof matchSheet>;
  awaySheet: ReturnType<typeof matchSheet>;
  timeline: TimelineEvent[];
  substitutions: ReturnType<typeof matchSubstitutions>;
  played: boolean;
  live: boolean;
}) {
  const homeLines = formationLines(homeSheet.formation, homeSheet.starters);
  const awayLines = formationLines(awaySheet.formation, awaySheet.starters);
  const fresh = useFreshMarks(timeline, live);
  const homeTops = band(homeLines.length, 8, 42);
  const awayTops = band(awayLines.length, 92, 58);

  return (
    <section>
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a1f12] shadow-2xl">
        <TeamBar name={homeName} shortName={homeShort} color={homeColor} crest={homeCrest} formation={homeSheet.formation} position="top" />
        <div
          className="relative h-[760px] overflow-hidden select-none"
          style={{
            backgroundColor: '#163b22',
            backgroundImage: `repeating-linear-gradient(
              to bottom,
              #1b4628 0px,
              #1b4628 48px,
              #153a20 48px,
              #153a20 96px
            )`,
            boxShadow: 'inset 0 0 70px rgba(5, 20, 10, 0.75), inset 0 0 15px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Subtle grass grain texture */}
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-20 mix-blend-overlay" aria-hidden="true">
            <filter id="pitch-turf-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#pitch-turf-grain)" />
          </svg>

          {/* Vignette edge depth */}
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(6,22,12,0.65)_100%)]"
            aria-hidden="true"
          />

          {/* Pitch Markings */}
          <PitchLines />

          {/* Home team logo watermark (top half -> right side, LiveScore style) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 z-[2] flex items-center justify-end pr-3 sm:pr-8 md:pr-10 select-none overflow-hidden">
            {homeCrest ? (
              <img
                src={homeCrest}
                alt=""
                aria-hidden="true"
                className="max-h-[240px] max-w-[240px] sm:max-h-[280px] sm:max-w-[280px] object-contain opacity-15 drop-shadow-xl translate-x-2 sm:translate-x-4"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-44 w-44 sm:h-56 sm:w-56 items-center justify-center rounded-3xl border-4 border-current opacity-12 translate-x-2 sm:translate-x-4"
                style={{ color: homeColor }}
              >
                <span className="font-black text-6xl sm:text-7xl tracking-wider">{homeShort}</span>
              </div>
            )}
          </div>

          {/* Away team logo watermark (bottom half -> left side, LiveScore style) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 z-[2] flex items-center justify-start pl-3 sm:pl-8 md:pl-10 select-none overflow-hidden">
            {awayCrest ? (
              <img
                src={awayCrest}
                alt=""
                aria-hidden="true"
                className="max-h-[240px] max-w-[240px] sm:max-h-[280px] sm:max-w-[280px] object-contain opacity-15 drop-shadow-xl -translate-x-2 sm:-translate-x-4"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-44 w-44 sm:h-56 sm:w-56 items-center justify-center rounded-3xl border-4 border-current opacity-12 -translate-x-2 sm:-translate-x-4"
                style={{ color: awayColor }}
              >
                <span className="font-black text-6xl sm:text-7xl tracking-wider">{awayShort}</span>
              </div>
            )}
          </div>

          {homeLines.map((players, lineIndex) => players.map((player, index) => (
            <PitchPlayer
              key={player.id}
              player={player}
              color={homeColor}
              top={homeTops[lineIndex]}
              left={`${spread(players.length)[index]}%`}
              timeline={timeline}
              fresh={fresh.has(player.id)}
              subbed={substitutions.some((change) => change.offId === player.id)}
              played={played}
            />
          )))}
          {awayLines.map((players, lineIndex) => [...players].reverse().map((player, index) => (
            <PitchPlayer
              key={player.id}
              player={player}
              color={awayColor}
              nameAbove
              top={awayTops[lineIndex]}
              left={`${spread(players.length)[index]}%`}
              timeline={timeline}
              fresh={fresh.has(player.id)}
              subbed={substitutions.some((change) => change.offId === player.id)}
              played={played}
            />
          )))}
        </div>
        <TeamBar name={awayName} shortName={awayShort} color={awayColor} crest={awayCrest} formation={awaySheet.formation} position="bottom" />
      </div>
      <SubList substitutions={substitutions} homeId={homeSheet.starters[0]?.departmentId} awayId={awaySheet.starters[0]?.departmentId} homeShort={homeShort} awayShort={awayShort} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <BenchList title={homeShort} color={homeColor} players={homeSheet.bench} />
        <BenchList title={awayShort} color={awayColor} players={awaySheet.bench} />
      </div>
    </section>
  );
}

function TeamBar({
  name,
  shortName,
  color,
  crest,
  formation,
  position = 'top',
}: {
  name: string;
  shortName: string;
  color: string;
  crest?: string;
  formation: string;
  position?: 'top' | 'bottom';
}) {
  return (
    <div
      className={`relative z-20 flex items-center justify-between gap-3 px-4 py-3 bg-[#0a1f13]/90 backdrop-blur-md ${
        position === 'top' ? 'border-b border-white/10' : 'border-t border-white/10'
      }`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <DepartmentMark shortName={shortName} color={color} size={28} src={crest} />
        <span className="truncate text-sm font-bold text-white">{name}</span>
      </span>
      <span className="shrink-0 rounded-full border border-white/15 bg-[#174e2a] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm">
        {formation}
      </span>
    </div>
  );
}

function formationLines(formation: string, starters: Player[]) {
  const lines: Player[][] = [];
  let index = 0;
  formationPlan(formation).forEach((row) => {
    const line = starters.slice(index, index + row.length);
    index += row.length;
    if (line.length) lines.push(line);
  });
  if (index < starters.length) lines.push(starters.slice(index));
  return lines;
}

function useFreshMarks(events: TimelineEvent[], live: boolean) {
  const seen = useRef('');
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    if (!live) return;
    const marks = events.filter((event) => event.kind === 'goal' || event.kind === 'yellow' || event.kind === 'red');
    const latest = marks[marks.length - 1];
    const key = latest ? `${latest.kind}:${latest.playerId}:${latest.minute}:${latest.assistId ?? ''}` : '';
    if (!key || key === seen.current) return;
    const first = seen.current === '';
    seen.current = key;
    if (first) return;
    const next = [latest.playerId, latest.assistId].filter((id): id is string => Boolean(id));
    setIds(next);
    const timer = window.setTimeout(() => setIds([]), 4500);
    return () => window.clearTimeout(timer);
  }, [events, live]);
  return new Set(ids);
}

function LiveNotice({ events, live }: { events: TimelineEvent[]; live: boolean }) {
  const seen = useRef('');
  const [text, setText] = useState('');
  useEffect(() => {
    if (!live) return;
    const marks = events.filter((event) => event.kind === 'goal' || event.kind === 'yellow' || event.kind === 'red');
    const latest = marks[marks.length - 1];
    const key = latest ? `${latest.kind}:${latest.playerId}:${latest.minute}:${latest.assistId ?? ''}` : '';
    if (!key || key === seen.current) return;
    const first = seen.current === '';
    seen.current = key;
    if (first) return;
    const label = latest.kind === 'goal' ? 'Goal' : latest.kind === 'yellow' ? 'Yellow card' : 'Red card';
    const assist = latest.kind === 'goal' && latest.assistName ? ` · Assist ${latest.assistName}` : '';
    setText(`${label} · ${latest.playerName}${assist}`);
    const timer = window.setTimeout(() => setText(''), 4500);
    return () => window.clearTimeout(timer);
  }, [events, live]);
  if (!text) return null;
  return (
    <p role="status" className="mt-4 rounded-2xl border border-[#f5c518]/50 bg-[#f5c518] px-4 py-3 text-center text-sm font-black text-[#102018] shadow-lg">
      {text}
    </p>
  );
}

function band(count: number, from: number, to: number) {
  if (count <= 1) return [`${from}%`];
  return Array.from({ length: count }, (_, index) => `${from + ((to - from) * index) / (count - 1)}%`);
}

function SubList({
  substitutions,
  homeId,
  awayId,
  homeShort,
  awayShort,
}: {
  substitutions: ReturnType<typeof matchSubstitutions>;
  homeId?: string;
  awayId?: string;
  homeShort: string;
  awayShort: string;
}) {
  const rows = [
    { id: homeId, label: homeShort },
    { id: awayId, label: awayShort },
  ];
  return (
    <div className="mt-2 space-y-1.5">
      {rows.map((row) => {
        const arrivals = substitutions.filter((change) => change.onPlayer.departmentId === row.id);
        if (arrivals.length === 0) return null;
        return (
          <div key={row.label} className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold tracking-wide text-white/35">{row.label}</span>
            {arrivals.map((change) => (
              <span key={change.onPlayer.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#10192b] px-2.5 py-1 text-[11px] font-semibold text-white">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1f9d55] text-white">
                  <ArrowUp className="h-3 w-3" strokeWidth={3} />
                </span>
                {change.onPlayer.number} {compactName(change.onPlayer.name)} {change.minute}&apos;
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function spread(count: number) {
  if (count <= 1) return [50];
  const inset = count >= 5 ? 10 : count === 4 ? 16 : count === 3 ? 22 : 32;
  return Array.from({ length: count }, (_, index) => inset + ((100 - inset * 2) * index) / (count - 1));
}

function FootballIcon({ count = 1 }: { count?: number }) {
  return (
    <span className="relative inline-flex items-center justify-center" title={count > 1 ? `${count} Goals` : 'Goal'}>
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" fill="#ffffff" stroke="#102018" strokeWidth="1.2" />
        <polygon points="12,7.2 16.5,10.5 14.8,15.8 9.2,15.8 7.5,10.5" fill="#102018" />
        <line x1="12" y1="7.2" x2="12" y2="2" stroke="#102018" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="16.5" y1="10.5" x2="21.5" y2="8.9" stroke="#102018" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="14.8" y1="15.8" x2="17.9" y2="20.1" stroke="#102018" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="9.2" y1="15.8" x2="6.1" y2="20.1" stroke="#102018" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="7.5" y1="10.5" x2="2.5" y2="8.9" stroke="#102018" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M10 2.2A10 10 0 0 1 14 2.2L12 7.2Z" fill="#102018" />
        <path d="M21.7 10.3A10 10 0 0 1 20.3 14.6L16.5 10.5Z" fill="#102018" />
        <path d="M15.4 21.2A10 10 0 0 1 11.5 22L14.8 15.8Z" fill="#102018" />
        <path d="M8.6 15.8L12.5 22A10 10 0 0 1 8.6 21.2Z" fill="#102018" />
        <path d="M7.5 10.5L3.7 14.6A10 10 0 0 1 2.3 10.3Z" fill="#102018" />
      </svg>
      {count > 1 && (
        <span className="absolute -bottom-1 -right-1.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-[#0c1424] px-0.5 text-[8px] font-black leading-none text-white ring-1 ring-white/50 shadow-sm">
          {count}
        </span>
      )}
    </span>
  );
}

function BootIcon({ count = 1 }: { count?: number }) {
  return (
    <span className="relative inline-flex items-center justify-center" title={count > 1 ? `${count} Assists` : 'Assist'}>
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M2.5 13.5c0-1.8 1-3.2 2.5-4l4.5-2.2c.8-.4 1.8-.2 2.4.5l1.6 2 4 1.2c1.4.4 2.5 1.5 2.8 2.9l.8 2.9c.2.6-.3 1-.9 1H3.5c-.6 0-1-.4-1-1v-3.3z"
          fill="#f5c518"
          stroke="#102018"
          strokeWidth="0.8"
        />
        <path d="M8 11.5l2.5-1.5m-1 3.5l3-1.5" stroke="#102018" strokeWidth="1" strokeLinecap="round" />
        <rect x="4.5" y="18.5" width="2" height="2" rx="0.5" fill="#f5c518" />
        <rect x="8.5" y="18.5" width="2" height="2" rx="0.5" fill="#f5c518" />
        <rect x="14" y="18.5" width="2" height="2" rx="0.5" fill="#f5c518" />
        <rect x="18" y="18.5" width="2" height="2" rx="0.5" fill="#f5c518" />
      </svg>
      {count > 1 && (
        <span className="absolute -bottom-1 -right-1.5 flex h-3 min-w-3 items-center justify-center rounded-full bg-[#0c1424] px-0.5 text-[8px] font-black leading-none text-white ring-1 ring-white/50 shadow-sm">
          {count}
        </span>
      )}
    </span>
  );
}

function YellowCardIcon() {
  return (
    <span
      className="inline-block h-3.5 w-2.5 shrink-0 rounded-[1.5px] bg-[#f5c518] shadow-[0_1px_3px_rgba(0,0,0,0.8)] ring-1 ring-black/40"
      title="Yellow card"
      aria-label="Yellow card"
    />
  );
}

function RedCardIcon() {
  return (
    <span
      className="inline-block h-3.5 w-2.5 shrink-0 rounded-[1.5px] bg-[#e11d48] shadow-[0_1px_3px_rgba(0,0,0,0.8)] ring-1 ring-black/40"
      title="Red card"
      aria-label="Red card"
    />
  );
}

function PitchPlayer({
  player,
  color,
  nameAbove = false,
  top,
  left,
  timeline,
  fresh,
  subbed,
  played,
}: {
  player: Player;
  color: string;
  nameAbove?: boolean;
  top: string;
  left: string;
  timeline: TimelineEvent[];
  fresh: boolean;
  subbed: boolean;
  played: boolean;
}) {
  const marks = timeline.filter((event) => event.playerId === player.id);
  const goalCount = marks.filter((event) => event.kind === 'goal').length;
  const assistCount = timeline.filter((event) => event.kind === 'goal' && event.assistId === player.id).length;
  const hasYellow = marks.some((event) => event.kind === 'yellow');
  const hasRed = marks.some((event) => event.kind === 'red');
  const hasEvents = played && (goalCount > 0 || assistCount > 0 || hasYellow || hasRed);

  return (
    <div className={`absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center ${nameAbove ? 'flex-col-reverse' : ''}`} style={{ top, left }}>
      <div className={`relative h-11 w-11 ${fresh ? 'animate-pulse' : ''}`}>
        {hasEvents && (
          <div
            className="pointer-events-none absolute bottom-[calc(100%+3px)] left-1/2 z-30 flex -translate-x-1/2 items-center justify-center gap-1.5 whitespace-nowrap"
            aria-label="Player events"
          >
            {hasYellow && <YellowCardIcon />}
            {hasRed && <RedCardIcon />}
            {goalCount > 0 && <FootballIcon count={goalCount} />}
            {assistCount > 0 && <BootIcon count={assistCount} />}
          </div>
        )}
        {player.photoUrl ? (
          <img src={player.photoUrl} alt="" className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-md" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-[12px] font-black text-white shadow-md" style={{ background: color }}>
            {player.number}
          </span>
        )}
        {player.photoUrl && (
          <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black text-white" style={{ background: color }}>
            {player.number}
          </span>
        )}
        {played && subbed && (
          <span className="absolute -left-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#e11d48] text-white">
            <ArrowDown className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className={nameAbove ? (hasEvents ? 'mb-4.5' : 'mb-1') : 'mt-1'}>
        <p className="whitespace-nowrap text-[10px] font-semibold text-white drop-shadow">{compactName(player.name)}</p>
      </div>
    </div>
  );
}

function PitchLines() {
  return (
    <div className="pointer-events-none absolute inset-3 z-[1]" aria-hidden="true">
      {/* Outer touchline boundary */}
      <div className="relative h-full w-full border border-white/35">
        {/* Corner arcs */}
        <div className="absolute -top-px -left-px h-3.5 w-3.5 rounded-br-full border-r border-b border-white/35" />
        <div className="absolute -top-px -right-px h-3.5 w-3.5 rounded-bl-full border-l border-b border-white/35" />
        <div className="absolute -bottom-px -left-px h-3.5 w-3.5 rounded-tr-full border-r border-t border-white/35" />
        <div className="absolute -bottom-px -right-px h-3.5 w-3.5 rounded-tl-full border-l border-t border-white/35" />

        {/* Halfway line */}
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/35" />

        {/* Center circle & kickoff spot */}
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/35" />
        <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50" />

        {/* TOP PENALTY AREA & GOAL */}
        {/* Top Goal outline (nets) */}
        <div className="absolute left-[38%] right-[38%] -top-3 h-3 border-t border-x border-white/25 bg-white/[0.03]" />
        {/* Top 18-yard box */}
        <div className="absolute left-[18%] right-[18%] top-0 h-[16%] border-x border-b border-white/35" />
        {/* Top 6-yard box */}
        <div className="absolute left-[34%] right-[34%] top-0 h-[6%] border-x border-b border-white/35" />
        {/* Top Penalty spot */}
        <div className="absolute left-1/2 top-[11.5%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/50" />
        {/* Top D-arc */}
        <div className="absolute left-1/2 top-[16%] h-9 w-20 -translate-x-1/2 rounded-b-full border-b border-x border-white/35" />

        {/* BOTTOM PENALTY AREA & GOAL */}
        {/* Bottom Goal outline (nets) */}
        <div className="absolute left-[38%] right-[38%] -bottom-3 h-3 border-b border-x border-white/25 bg-white/[0.03]" />
        {/* Bottom 18-yard box */}
        <div className="absolute left-[18%] right-[18%] bottom-0 h-[16%] border-x border-t border-white/35" />
        {/* Bottom 6-yard box */}
        <div className="absolute left-[34%] right-[34%] bottom-0 h-[6%] border-x border-t border-white/35" />
        {/* Bottom Penalty spot */}
        <div className="absolute left-1/2 bottom-[11.5%] h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/50" />
        {/* Bottom D-arc */}
        <div className="absolute left-1/2 bottom-[16%] h-9 w-20 -translate-x-1/2 rounded-t-full border-t border-x border-white/35" />
      </div>
    </div>
  );
}

function MatchTabButton({
  id,
  active,
  onSelect,
  icon: Icon,
  label,
}: {
  id: MatchTab;
  active: boolean;
  onSelect: () => void;
  icon: typeof History;
  label: string;
}) {
  return (
    <button
      id={`match-tab-${id}`}
      role="tab"
      type="button"
      aria-selected={active}
      aria-controls={`match-panel-${id}`}
      onClick={onSelect}
      className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-center text-xs font-bold transition-all sm:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c518] focus-visible:ring-offset-2 focus-visible:ring-offset-[#10192b] ${
        active ? 'bg-[#f5c518] text-[#102018] shadow-md font-black' : 'text-white/60 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#102018]' : 'text-white/40'}`} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function kickoffAt(date: string, time: string) {
  const clock = /^\d{2}:\d{2}$/.test(time) ? `${time}:00` : time;
  const value = Date.parse(`${date}T${clock}+03:00`);
  return Number.isNaN(value) ? null : value;
}

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function KickoffClock({ date, time, detail, compact = false }: { date: string; time: string; detail?: string; compact?: boolean }) {
  const [now, setNow] = useState(() => Date.now() + clockSync.offset);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now() + clockSync.offset), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const held = detail === 'postponed' || detail === 'cancelled';
  const kickoff = kickoffAt(date, time);
  const remaining = kickoff == null ? 0 : kickoff - now;
  const total = Math.max(0, Math.floor(remaining / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const waiting = held || kickoff == null || remaining <= 0;
  const headline = held ? (detail === 'cancelled' ? 'Cancelled' : 'Postponed') : waiting ? 'Kickoff' : days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  if (compact) {
    return (
      <div className="text-center">
        <span className="mb-2 inline-block rounded-full border border-[#f5c518]/30 bg-[#f5c518]/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#f5c518]">
          {held ? headline : 'Upcoming'}
        </span>
        <p className="font-mono text-xl font-black tracking-tight text-white sm:text-2xl">{held ? time : headline}</p>
        <p className="mt-1 text-[11px] font-semibold text-white/45">{waiting ? 'Waiting to start' : 'until kickoff'}</p>
      </div>
    );
  }

  const units = [
    ...(days > 0 ? [{ label: 'Days', value: pad(days) }] : []),
    { label: 'Hours', value: pad(hours) },
    { label: 'Minutes', value: pad(minutes) },
    { label: 'Seconds', value: pad(seconds) },
  ];

  return (
    <section className="mx-auto max-w-lg rounded-2xl border border-white/10 bg-[#10192b] px-4 py-5 text-center shadow-xl">
      <p className="text-[10px] font-bold tracking-[0.18em] text-[#f5c518]">{held ? headline.toUpperCase() : 'KICKOFF COUNTDOWN'}</p>
      <p className="mt-0.5 text-xs text-white/55">{formatKickoff(date, time)} · {time} EAT</p>
      {waiting ? (
        <p className="mt-4 text-base font-black text-white">{held ? 'This match is not on the clock.' : 'Waiting for the whistle.'}</p>
      ) : (
        <div className={`mt-4 grid gap-2 ${days > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {units.map((unit) => (
            <div key={unit.label} className="rounded-xl border border-white/10 bg-[#0c1424] px-2 py-2">
              <p className="font-mono text-2xl font-black text-white">{unit.value}</p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">{unit.label}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function afterHalf(period: string | undefined, minute: number, halfMinute: number) {
  if (period === 'first_half' || period === 'pre' || period === 'halftime') return false;
  return minute > halfMinute;
}

function EventTimeline({
  events,
  substitutions,
  homeId,
  reachedHalf,
  halfMinute,
}: {
  events: TimelineEvent[];
  substitutions: ReturnType<typeof matchSubstitutions>;
  homeId: string;
  reachedHalf: boolean;
  halfMinute: number;
}) {
  const rows = [
    ...events.filter((event) => event.kind === 'goal' || event.kind === 'yellow' || event.kind === 'red').map((event) => ({
      key: `${event.kind}-${event.playerId}-${event.minute}-${event.addedMinute ?? 0}-${event.assistId ?? ''}`,
      minute: event.minute,
      added: event.addedMinute ?? 0,
      later: afterHalf(event.period, event.minute, halfMinute),
      teamId: event.teamId,
      kind: event.kind,
      cardType: event.cardType,
      title: event.kind === 'goal' ? 'Goal' : event.cardType === 'second_yellow' ? 'Second yellow, red card' : event.kind === 'yellow' ? 'Yellow card' : 'Red card',
      name: event.playerName,
      detail: event.kind === 'goal' && event.assistName ? event.assistName : event.kind === 'goal' && event.detail === 'penalty' ? 'Penalty' : '',
    })),
    ...substitutions.map((change) => {
      const off = players.find((player) => player.id === change.offId);
      return {
        key: `sub-${change.offId}-${change.onPlayer.id}-${change.minute}-${change.addedMinute ?? 0}`,
        minute: change.minute,
        added: change.addedMinute ?? 0,
        later: afterHalf(change.period, change.minute, halfMinute),
        teamId: change.teamId,
        kind: 'sub' as const,
        cardType: null,
        title: 'Substitution',
        name: change.onPlayer.name,
        detail: off?.name ?? '',
      };
    }),
  ].sort((a, b) => Number(a.later) - Number(b.later) || a.minute - b.minute || a.added - b.added || a.title.localeCompare(b.title));

  const first = rows.filter((row) => !row.later);
  const second = rows.filter((row) => row.later);

  if (!rows.length && !reachedHalf) {
    return (
      <p className="mx-auto max-w-md py-6 text-center text-sm text-white/50">
        No goals, cards, or substitutions yet.
      </p>
    );
  }

  const renderRow = (row: (typeof rows)[number]) => {
    const home = row.teamId === homeId;
    const note = row.kind === 'goal' && row.detail && row.detail !== 'Penalty'
      ? `Assist ${row.detail}`
      : row.kind === 'sub' && row.detail
        ? row.detail
        : row.kind === 'goal' && row.detail === 'Penalty'
          ? 'Penalty'
          : '';
    return (
      <li key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
        <div className="min-w-0 flex items-center justify-end">
          {home && <EventSide home name={row.name} note={note} kind={row.kind} cardType={row.cardType} title={row.title} />}
        </div>
        <span className="relative z-10 flex h-6 min-w-7 items-center justify-center rounded-full border border-white/15 bg-[#0c1424] px-1.5 font-mono text-[11px] font-bold text-[#f5c518] shadow-md">
          {row.added ? `${row.minute}+${row.added}` : row.minute}&apos;
        </span>
        <div className="min-w-0 flex items-center justify-start">
          {!home && <EventSide name={row.name} note={note} kind={row.kind} cardType={row.cardType} title={row.title} />}
        </div>
      </li>
    );
  };

  return (
    <ol className="relative mx-auto max-w-md space-y-2.5 py-2">
      <span className="absolute bottom-1.5 left-1/2 top-1.5 w-px -translate-x-1/2 bg-white/20" aria-hidden="true" />
      {first.map(renderRow)}
      {reachedHalf && (
        <li className="my-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center">
          <span className="relative z-10 col-start-2 rounded-full border border-white/20 bg-[#10192b] px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-white/75">HT</span>
        </li>
      )}
      {second.map(renderRow)}
    </ol>
  );
}

function EventSide({
  home = false,
  name,
  note,
  kind,
  cardType,
  title,
}: {
  home?: boolean;
  name: string;
  note: string;
  kind: string;
  cardType?: string | null;
  title: string;
}) {
  const mark = kind === 'sub'
    ? <ArrowUp className="h-3.5 w-3.5 shrink-0 text-[#1f9d55]" strokeWidth={3} aria-label="Player on" />
    : <EventMark kind={kind} cardType={cardType} />;
  const player = <span className="truncate text-sm font-semibold text-white">{name}</span>;
  return (
    <div title={note ? `${title} · ${note}` : title} className={`flex min-w-0 flex-col ${home ? 'items-end' : 'items-start'}`}>
      <div className="flex min-w-0 items-center gap-1.5">
        {home ? player : mark}
        {home ? mark : player}
      </div>
      {note && (
        <span className={`mt-0.5 flex max-w-full items-center gap-1 text-[11px] font-medium text-white/55 ${home ? 'flex-row-reverse' : ''}`}>
          {kind === 'sub' && <ArrowDown className="h-3 w-3 shrink-0 text-[#e11d48]" strokeWidth={3} />}
          <span className="truncate">{note}</span>
        </span>
      )}
    </div>
  );
}

function CardFace({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="inline-block h-3.5 w-2.5 shrink-0 rounded-[1.5px] shadow-[0_1px_2px_rgba(0,0,0,0.8)] ring-1 ring-black/40"
      style={{ background: color }}
      title={label}
    />
  );
}

function EventMark({ kind, cardType }: { kind: string; cardType?: string | null }) {
  if (kind === 'red' && cardType === 'second_yellow') {
    return (
      <span className="inline-flex shrink-0 items-center gap-0.5" aria-label="Second yellow, red card" title="Second yellow, red card">
        <CardFace color="#f5c518" label="Yellow card" />
        <CardFace color="#f5c518" label="Yellow card" />
        <CardFace color="#e11d48" label="Red card" />
      </span>
    );
  }
  if (kind === 'yellow') {
    return (
      <span
        className="inline-block h-3.5 w-2.5 shrink-0 rounded-[1.5px] bg-[#f5c518] shadow-[0_1px_2px_rgba(0,0,0,0.8)] ring-1 ring-black/40"
        title="Yellow card"
        aria-label="Yellow card"
      />
    );
  }
  if (kind === 'red') {
    return (
      <span
        className="inline-block h-3.5 w-2.5 shrink-0 rounded-[1.5px] bg-[#e11d48] shadow-[0_1px_2px_rgba(0,0,0,0.8)] ring-1 ring-black/40"
        title="Red card"
        aria-label="Red card"
      />
    );
  }
  if (kind === 'sub') {
    return (
      <span className="inline-flex shrink-0 items-center" aria-label="Substitution" title="Substitution">
        <ArrowUp className="h-3.5 w-3.5 text-[#1f9d55]" strokeWidth={3} />
        <ArrowDown className="-ml-1 h-3.5 w-3.5 text-[#e11d48]" strokeWidth={3} />
      </span>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5 shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
      fill="none"
      aria-label="Goal"
    >
      <circle cx="12" cy="12" r="10" fill="#ffffff" stroke="#102018" strokeWidth="1.2" />
      <polygon points="12,7.2 16.5,10.5 14.8,15.8 9.2,15.8 7.5,10.5" fill="#102018" />
      <line x1="12" y1="7.2" x2="12" y2="2" stroke="#102018" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="16.5" y1="10.5" x2="21.5" y2="8.9" stroke="#102018" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="14.8" y1="15.8" x2="17.9" y2="20.1" stroke="#102018" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="9.2" y1="15.8" x2="6.1" y2="20.1" stroke="#102018" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="7.5" y1="10.5" x2="2.5" y2="8.9" stroke="#102018" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M10 2.2A10 10 0 0 1 14 2.2L12 7.2Z" fill="#102018" />
      <path d="M21.7 10.3A10 10 0 0 1 20.3 14.6L16.5 10.5Z" fill="#102018" />
      <path d="M15.4 21.2A10 10 0 0 1 11.5 22L14.8 15.8Z" fill="#102018" />
      <path d="M8.6 15.8L12.5 22A10 10 0 0 1 8.6 21.2Z" fill="#102018" />
      <path d="M7.5 10.5L3.7 14.6A10 10 0 0 1 2.3 10.3Z" fill="#102018" />
    </svg>
  );
}

function BenchList({ title, color, players }: { title: string; color: string; players: Player[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#10192b] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">Substitutes · {title}</p>
      <ul className="mt-2 space-y-1.5">
        {players.map((player) => (
          <li key={player.id} className="flex items-center gap-2 text-sm text-white/85">
            {player.photoUrl ? (
              <img src={player.photoUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-black text-white" style={{ background: color }}>
                {player.number}
              </span>
            )}
            <span className="min-w-0 flex-1 truncate">{player.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-white/40">{player.position}</span>
          </li>
        ))}
        {!players.length && <li className="text-sm text-white/45">No substitutes named.</li>}
      </ul>
    </section>
  );
}

function compactName(name: string) {
  const [first, last] = name.split(' ');
  return `${first?.[0] ?? ''}. ${last ?? first}`;
}

