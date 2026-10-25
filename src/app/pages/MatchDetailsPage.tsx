import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  MapPin,
  Calendar,
  Clock,
  Users,
  Trophy,
  Shield,
} from 'lucide-react';
import { DepartmentMark } from '../components/DepartmentMark';
import { formatMatchClock, HALF_SECONDS, type MatchClock } from '../../data/editor';
import { useMatchClock } from '../useMatchClock';
import { GroupTable } from '../components/GroupTable';
import {
  formatKickoff,
  getDepartment,
  getFixture,
  goalEvents,
  GROUP_COLLEGES,
  matchSheet,
  matchSubstitutions,
  matchTimeline,
  type Player,
  type TimelineEvent,
} from '../../data/supercup';

type MatchTab = 'lineups' | 'standings';

function periodLabel(clock: MatchClock | null) {
  if (!clock) return 'Live';
  if (!clock.running && clock.total === HALF_SECONDS) return 'Half time';
  if (clock.minute < 45) return clock.running ? 'First half' : 'First half paused';
  return clock.running ? 'Second half' : 'Second half paused';
}

export function MatchDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Tab state synchronization
  const rawTab = (searchParams.get('tab') || '').toLowerCase();
  const activeTab: MatchTab = rawTab === 'standings' || rawTab === 'table' ? 'standings' : 'lineups';

  const setTab = (tab: MatchTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next);
  };

  const fixture = id ? getFixture(id) : undefined;
  const clock = useMatchClock(fixture?.status === 'live' ? fixture.id : undefined);

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

  const goals = useMemo(() => goalEvents(fixture), [fixture, clock?.minute, fixture.homeScore, fixture.awayScore, fixture.status]);
  const timeline = useMemo(() => matchTimeline(fixture), [fixture, clock?.minute, fixture.homeScore, fixture.awayScore, fixture.status]);
  const substitutions = useMemo(() => matchSubstitutions(fixture), [fixture, clock?.minute, fixture.status]);
  const homeSheet = useMemo(() => matchSheet(fixture.homeId), [fixture.homeId]);
  const awaySheet = useMemo(() => matchSheet(fixture.awayId), [fixture.awayId]);

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
              {goals.filter((goal) => goal.teamId === fixture.homeId).map((goal) => (
                <span key={`${goal.playerId}-${goal.minute}`} className="text-[11px] text-white/55">
                  {goal.minute}&apos; {goal.playerName}
                </span>
              ))}
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
                  <span className="font-mono text-xs font-bold text-red-400">
                    {clock ? formatMatchClock(clock) : `${fixture.minute ?? 0}'`}
                  </span>
                </div>
                <div className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                  {fixture.homeScore} <span className="text-white/30">-</span> {fixture.awayScore}
                </div>
                <p className="mt-1 text-[11px] font-semibold text-white/50">{periodLabel(clock)}</p>
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
              {goals.filter((goal) => goal.teamId === fixture.awayId).map((goal) => (
                <span key={`${goal.playerId}-${goal.minute}`} className="text-[11px] text-white/55">
                  {goal.minute}&apos; {goal.playerName}
                </span>
              ))}
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
        className="mt-6 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-[#10192b] p-1.5 shadow-inner"
      >
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
            homeSheet={homeSheet}
            awaySheet={awaySheet}
            timeline={timeline}
            substitutions={substitutions}
            played={played}
          />
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

const TILES = ['#6d5344', '#3e5270', '#5c4638', '#4d5b4a', '#70543f', '#3c4e63', '#645244', '#455446'];

function Pitch({
  homeName,
  awayName,
  homeShort,
  awayShort,
  homeColor,
  awayColor,
  homeSheet,
  awaySheet,
  timeline,
  substitutions,
  played,
}: {
  homeName: string;
  awayName: string;
  homeShort: string;
  awayShort: string;
  homeColor: string;
  awayColor: string;
  homeSheet: ReturnType<typeof matchSheet>;
  awaySheet: ReturnType<typeof matchSheet>;
  timeline: TimelineEvent[];
  substitutions: ReturnType<typeof matchSubstitutions>;
  played: boolean;
}) {
  const homeLines = formationLines(homeSheet).map((players, index) => ({
    top: ['8%', '17%', '26%', '35%', '44%'][index],
    players,
  }));
  const awayLines = [...formationLines(awaySheet)].reverse().map((players, index) => ({
    top: ['56%', '65%', '74%', '83%', '92%'][index],
    players: [...players].reverse(),
  }));

  return (
    <section>
      <div className="relative overflow-hidden rounded-3xl bg-[#3f7a4c]">
        <TeamBar name={homeName} shortName={homeShort} color={homeColor} formation={homeSheet.formation} />
        <div className="relative h-[760px]">
          <PitchLines />
          {[...homeLines, ...awayLines].map((line) => line.players.map((player, index) => (
            <PitchPlayer
              key={`${line.top}-${player.id}`}
              player={player}
              top={line.top}
              left={`${spread(line.players.length)[index]}%`}
              timeline={timeline}
              subbed={substitutions.some((change) => change.offId === player.id)}
              played={played}
            />
          )))}
        </div>
        <TeamBar name={awayName} shortName={awayShort} color={awayColor} formation={awaySheet.formation} />
      </div>
      <SubList substitutions={substitutions} homeId={homeSheet.starters[0]?.departmentId} awayId={awaySheet.starters[0]?.departmentId} homeShort={homeShort} awayShort={awayShort} />
    </section>
  );
}

function TeamBar({ name, shortName, color, formation }: { name: string; shortName: string; color: string; formation: string }) {
  return (
    <div className="relative flex items-center justify-between gap-3 px-4 py-3">
      <span className="flex min-w-0 items-center gap-2">
        <DepartmentMark shortName={shortName} color={color} size={28} />
        <span className="truncate text-sm font-bold text-white">{name}</span>
      </span>
      <span className="shrink-0 rounded-full bg-[#146b32] px-2.5 py-1 text-[11px] font-bold text-white">{formation}</span>
    </div>
  );
}

function formationLines(sheet: ReturnType<typeof matchSheet>) {
  const keepers = sheet.starters.filter((player) => player.position === 'GK');
  const defenders = sheet.starters.filter((player) => player.position === 'DEF');
  const mids = sheet.starters.filter((player) => player.position === 'MID');
  const forwards = sheet.starters.filter((player) => player.position === 'FWD');
  return [
    keepers,
    defenders,
    mids.slice(0, 2),
    [mids[2], forwards[0], forwards[1]].filter((player): player is Player => Boolean(player)),
    forwards.slice(2),
  ];
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
  if (count === 2) return [32, 68];
  if (count === 3) return [18, 50, 82];
  return [14, 38, 62, 86];
}

function PitchPlayer({
  player,
  top,
  left,
  timeline,
  subbed,
  played,
}: {
  player: Player;
  top: string;
  left: string;
  timeline: TimelineEvent[];
  subbed: boolean;
  played: boolean;
}) {
  const marks = timeline.filter((event) => event.playerId === player.id);
  const scored = marks.some((event) => event.kind === 'goal');
  const assisted = timeline.some((event) => event.kind === 'goal' && event.assistId === player.id);
  const booked = marks.find((event) => event.kind === 'yellow' || event.kind === 'red');
  const rating = played ? pitchRating(player, marks) : null;
  const tone = rating == null ? null : ratingTone(rating);
  const tile = TILES[player.number % TILES.length];

  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2 text-center" style={{ top, left }}>
      <div className="relative mx-auto h-9 w-9">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg text-[11px] font-black text-white shadow-md" style={{ background: tile }}>
          {initials(player.name)}
        </span>
        {played && subbed && (
          <span className="absolute -left-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#e11d48] text-white">
            <ArrowDown className="h-3 w-3" strokeWidth={3} />
          </span>
        )}
        {played && booked && (
          <span className={`absolute -right-1 top-0 h-3.5 w-2.5 rounded-[2px] ${booked.kind === 'red' ? 'bg-[#e11d48]' : 'bg-[#f5c518]'}`} />
        )}
        {rating != null && tone && (
          <span
            className="absolute -bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-md px-1.5 py-0.5 text-[10px] font-black leading-none"
            style={{ background: tone.bg, color: tone.fg }}
          >
            {rating.toFixed(1)}
          </span>
        )}
        {played && scored && <BallMark />}
        {played && assisted && <BootMark />}
      </div>
      <p className="mt-2.5 whitespace-nowrap text-[10px] font-semibold text-white drop-shadow">
        {player.number} {compactName(player.name)}
      </p>
    </div>
  );
}

function PitchLines() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute left-[20%] right-[20%] top-0 h-[14%] border-x border-b border-white/40" />
      <div className="absolute left-[34%] right-[34%] top-0 h-[6%] border-x border-b border-white/40" />
      <div className="absolute left-0 right-0 top-1/2 h-px bg-white/45" />
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45" />
      <div className="absolute bottom-0 left-[20%] right-[20%] h-[14%] border-x border-t border-white/40" />
      <div className="absolute bottom-0 left-[34%] right-[34%] h-[6%] border-x border-t border-white/40" />
    </div>
  );
}

function BallMark() {
  return (
    <svg viewBox="0 0 24 24" className="absolute -right-2.5 top-1/2 z-20 h-5 w-5 -translate-y-1/2 drop-shadow" aria-label="Goal">
      <circle cx="12" cy="12" r="11" fill="#ffffff" />
      <circle cx="12" cy="12" r="7.4" fill="#102018" />
      <path fill="#ffffff" d="M12 6.2 13.8 8.6 12 9.8 10.2 8.6Z M12 9.8 13.8 8.6 15.8 10.4 14.2 12.8 12 11.6Z M12 9.8 10.2 8.6 8.2 10.4 9.8 12.8 12 11.6Z M9.8 12.8 12 11.6 14.2 12.8 13.4 15.2 10.6 15.2Z" />
    </svg>
  );
}

function BootMark() {
  return (
    <svg viewBox="0 0 24 24" className="absolute -left-2.5 top-1/2 z-20 h-5 w-5 -translate-y-1/2 drop-shadow" aria-label="Assist">
      <circle cx="12" cy="12" r="11" fill="#ffffff" />
      <path fill="#102018" d="M6.2 14.4c.4-2.8 1.8-4.4 3.6-4.6l.5-1.6h1.8v1.6h4.4c1 0 1.7.6 1.7 1.5v1.1H7.2c-.8 0-1.3-.4-1-1.1Z" />
      <path fill="#102018" d="M6.4 15.6h11.2v1H6.4zM7.2 16.8h1.1v1.1H7.2zM9.6 16.8h1.1v1.1H9.6zM12 16.8h1.1v1.1H12zM14.4 16.8h1.1v1.1h-1.1z" />
    </svg>
  );
}

function compactName(name: string) {
  const [first, last] = name.split(' ');
  return `${first?.[0] ?? ''}. ${last ?? first}`;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('');
}

function pitchRating(player: Player, marks: TimelineEvent[]) {
  let seed = player.number * 17;
  for (let index = 0; index < player.id.length; index += 1) seed = (seed * 33 + player.id.charCodeAt(index)) >>> 0;
  let value = 4.6 + (seed % 16) / 10;
  if (marks.some((event) => event.kind === 'goal')) value += 1.7;
  if (marks.some((event) => event.kind === 'yellow')) value -= 0.4;
  if (marks.some((event) => event.kind === 'red')) value -= 1.2;
  return Math.round(Math.min(9.1, Math.max(4.2, value)) * 10) / 10;
}

function ratingTone(value: number) {
  if (value >= 7) return { bg: '#1f9d55', fg: '#ffffff' };
  if (value >= 5.5) return { bg: '#e6b325', fg: '#1a1404' };
  return { bg: '#d64545', fg: '#ffffff' };
}
