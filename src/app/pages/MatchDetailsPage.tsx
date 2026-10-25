import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowDown, ArrowLeft, ArrowUp, MapPin } from 'lucide-react';
import { DepartmentMark } from '../components/DepartmentMark';
import {
  formatKickoff,
  getDepartment,
  getFixture,
  matchSheet,
  matchSubstitutions,
  matchTimeline,
  type Player,
  type TimelineEvent,
} from '../../data/supercup';

type DetailTab = 'summary' | 'lineups';

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'lineups', label: 'Lineups' },
];

export function MatchDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<DetailTab>('summary');
  const fixture = id ? getFixture(id) : undefined;

  if (!fixture) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-white/60">Match not found.</p>
        <button type="button" onClick={() => navigate('/matches')} className="mt-4 text-[#f5c518]">Back to matches</button>
      </div>
    );
  }

  const home = getDepartment(fixture.homeId);
  const away = getDepartment(fixture.awayId);
  const played = fixture.status !== 'upcoming';
  const timeline = matchTimeline(fixture);
  const substitutions = matchSubstitutions(fixture);
  const homeSheet = matchSheet(fixture.homeId);
  const awaySheet = matchSheet(fixture.awayId);
  const homeGoals = timeline.filter((event) => event.kind === 'goal' && event.teamId === fixture.homeId);
  const awayGoals = timeline.filter((event) => event.kind === 'goal' && event.teamId === fixture.awayId);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      <button type="button" onClick={() => navigate('/matches')} className="mb-4 flex items-center gap-2 text-sm text-white/60">
        <ArrowLeft className="h-4 w-4" />
        Matches
      </button>

      <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#10192b]">
        <div className="px-5 pb-5 pt-5">
          <p className="text-center text-[11px] font-semibold tracking-[0.16em] text-[#f5c518]">
            GROUP {fixture.group} · MATCHDAY {fixture.matchday}
          </p>
          <p className="mt-1 text-center text-sm text-white/50">
            {formatKickoff(fixture.date, fixture.time)} · {fixture.time}
            {fixture.status === 'live' && fixture.minute != null ? ` · ${fixture.minute}'` : ''}
            {fixture.status === 'finished' ? ' · Full time' : ''}
          </p>

          <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            <TeamSide
              name={home?.name ?? 'Home'}
              shortName={home?.shortName ?? '?'}
              color={home?.color ?? '#334155'}
              goals={homeGoals}
              align="right"
              onClick={() => home && navigate(`/team/${home.id}`)}
            />
            <div className="pt-3 text-center">
              {played ? (
                <p className="text-4xl font-black text-white">
                  {fixture.homeScore} <span className="text-white/30">-</span> {fixture.awayScore}
                </p>
              ) : (
                <p className="text-sm font-black tracking-[0.2em] text-white/40">VS</p>
              )}
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-white/40">{fixture.status}</p>
            </div>
            <TeamSide
              name={away?.name ?? 'Away'}
              shortName={away?.shortName ?? '?'}
              color={away?.color ?? '#334155'}
              goals={awayGoals}
              align="left"
              onClick={() => away && navigate(`/team/${away.id}`)}
            />
          </div>

          <p className="mt-5 flex items-center justify-center gap-1 text-sm text-white/50">
            <MapPin className="h-4 w-4" />
            {fixture.stadium}
          </p>
        </div>

        <div className="grid grid-cols-2 border-t border-white/10">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`py-3 text-sm font-bold ${tab === item.id ? 'text-[#f5c518] shadow-[inset_0_-2px_0_#f5c518]' : 'text-white/45'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {tab === 'summary' && (
        <Summary timeline={timeline} homeId={fixture.homeId} kickoff={fixture.time} played={played} />
      )}
      {tab === 'lineups' && (
        <Lineups
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
      )}
    </div>
  );
}

function TeamSide({
  name,
  shortName,
  color,
  goals,
  align,
  onClick,
}: {
  name: string;
  shortName: string;
  color: string;
  goals: TimelineEvent[];
  align: 'left' | 'right';
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={`flex flex-col gap-2 ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
      <DepartmentMark shortName={shortName} color={color} size={52} />
      <span className="text-sm font-bold text-white">{name}</span>
      {goals.map((goal) => (
        <span key={`${goal.playerId}-${goal.minute}`} className="text-[11px] text-white/55">
          {goal.minute}&apos; {goal.playerName}
        </span>
      ))}
    </button>
  );
}

function Summary({
  timeline,
  homeId,
  kickoff,
  played,
}: {
  timeline: TimelineEvent[];
  homeId: string;
  kickoff: string;
  played: boolean;
}) {
  if (!played) {
    return <p className="mt-6 rounded-2xl border border-white/10 bg-[#10192b] px-4 py-8 text-center text-sm text-white/50">Kickoff is {kickoff}. Lineups are posted.</p>;
  }

  if (timeline.length === 0) {
    return <p className="mt-6 rounded-2xl border border-white/10 bg-[#10192b] px-4 py-8 text-center text-sm text-white/50">No goals or cards yet.</p>;
  }

  return (
    <section className="relative mt-6 rounded-2xl border border-white/10 bg-[#10192b] px-3 py-2">
      <div className="absolute bottom-4 left-1/2 top-4 w-px bg-white/10" />
      {timeline.map((event) => {
        const home = event.teamId === homeId;
        return (
          <div key={`${event.kind}-${event.playerId}-${event.minute}`} className="relative grid grid-cols-2 py-2">
            <div className={home ? 'pr-4 text-right' : ''} >
              {home && <EventLine event={event} align="right" />}
            </div>
            <div className={home ? '' : 'pl-4'}>
              {!home && <EventLine event={event} align="left" />}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function EventLine({ event, align }: { event: TimelineEvent; align: 'left' | 'right' }) {
  const marker = <EventMark kind={event.kind} />;
  return (
    <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
      {align === 'left' && marker}
      <span>
        <span className="block text-sm font-semibold text-white">
          {event.playerName} <span className="font-mono text-xs text-[#f5c518]">{event.minute}&apos;</span>
        </span>
        {event.kind === 'goal' && event.assistName && (
          <span className="block text-[11px] text-white/40">Assist {event.assistName}</span>
        )}
      </span>
      {align === 'right' && marker}
    </div>
  );
}

function EventMark({ kind }: { kind: TimelineEvent['kind'] }) {
  if (kind === 'goal') {
    return <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#f5c518] text-[10px] font-black text-[#102018]">G</span>;
  }
  return <span className={`inline-block h-4 w-3 rounded-[2px] ${kind === 'red' ? 'bg-[#e11d48]' : 'bg-[#f5c518]'}`} />;
}

function Lineups({
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
  return (
    <div className="mt-6 space-y-4">
      <Pitch name={homeName} shortName={homeShort} color={homeColor} sheet={homeSheet} timeline={timeline} substitutions={substitutions} played={played} />
      <Pitch name={awayName} shortName={awayShort} color={awayColor} sheet={awaySheet} timeline={timeline} substitutions={substitutions} played={played} />
    </div>
  );
}

const TILES = ['#6d5344', '#3e5270', '#5c4638', '#4d5b4a', '#70543f', '#3c4e63', '#645244', '#455446'];

function Pitch({
  name,
  shortName,
  color,
  sheet,
  timeline,
  substitutions,
  played,
}: {
  name: string;
  shortName: string;
  color: string;
  sheet: ReturnType<typeof matchSheet>;
  timeline: TimelineEvent[];
  substitutions: ReturnType<typeof matchSubstitutions>;
  played: boolean;
}) {
  const keepers = sheet.starters.filter((player) => player.position === 'GK');
  const defenders = sheet.starters.filter((player) => player.position === 'DEF');
  const mids = sheet.starters.filter((player) => player.position === 'MID');
  const forwards = sheet.starters.filter((player) => player.position === 'FWD');
  const lines = [
    { top: '11%', players: keepers },
    { top: '30%', players: defenders },
    { top: '49%', players: mids.slice(0, 2) },
    { top: '67%', players: [mids[2], forwards[0], forwards[1]].filter((player): player is Player => Boolean(player)) },
    { top: '85%', players: forwards.slice(2) },
  ];
  const arrivals = substitutions.filter((change) => change.onPlayer.departmentId === sheet.starters[0]?.departmentId);

  return (
    <section>
      <div className="relative overflow-hidden rounded-3xl bg-[#3f7a4c]">
        <div className="relative flex items-center justify-between px-4 pb-2 pt-4">
          <span className="flex min-w-0 items-center gap-2">
            <DepartmentMark shortName={shortName} color={color} size={28} />
            <span className="truncate text-sm font-bold text-white">{name}</span>
          </span>
          <span className="rounded-full bg-[#146b32] px-2.5 py-1 text-[11px] font-bold text-white">{sheet.formation}</span>
        </div>
        <div className="relative h-[560px]">
          <PitchLines />
          {lines.map((line) => line.players.map((player, index) => (
            <PitchPlayer
              key={player.id}
              player={player}
              top={line.top}
              left={`${spread(line.players.length)[index]}%`}
              timeline={timeline}
              subbed={substitutions.some((change) => change.offId === player.id)}
              played={played}
            />
          )))}
        </div>
      </div>
      {arrivals.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {arrivals.map((change) => (
            <span key={change.onPlayer.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#10192b] px-2.5 py-1 text-[11px] font-semibold text-white">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#1f9d55] text-white">
                <ArrowUp className="h-3 w-3" strokeWidth={3} />
              </span>
              {change.onPlayer.number} {compactName(change.onPlayer.name)} {change.minute}&apos;
            </span>
          ))}
        </div>
      )}
    </section>
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
  const booked = marks.find((event) => event.kind === 'yellow' || event.kind === 'red');
  const rating = played ? pitchRating(player, marks) : null;
  const tone = rating == null ? null : ratingTone(rating);
  const tile = TILES[player.number % TILES.length];

  return (
    <div className="absolute w-[76px] -translate-x-1/2 -translate-y-1/2 text-center" style={{ top, left }}>
      <div className="relative mx-auto h-12 w-12">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-black text-white shadow-md" style={{ background: tile }}>
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
      </div>
      <p className="mt-3 truncate text-[10px] font-semibold text-white drop-shadow">
        {player.number} {compactName(player.name)}
      </p>
    </div>
  );
}

function PitchLines() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <div className="absolute left-[18%] right-[18%] top-[2%] h-[16%] rounded-sm border border-white/40" />
      <div className="absolute left-[32%] right-[32%] top-[2%] h-[7%] border border-white/40" />
      <div className="absolute left-0 right-0 top-[36%] h-px bg-white/40" />
      <div className="absolute left-1/2 top-[36%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
      <div className="absolute bottom-[2%] left-[18%] right-[18%] h-[14%] rounded-sm border border-white/30" />
    </div>
  );
}

function BallMark() {
  return (
    <svg viewBox="0 0 16 16" className="absolute -bottom-1 -right-2 h-4 w-4" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#ffffff" />
      <path d="M8 2.8 10.1 5.6 8 7.4 5.9 5.6Z M8 7.4 10.1 5.6 12.4 7.8 10.5 10.6 8 9.4Z M8 7.4 5.9 5.6 3.6 7.8 5.5 10.6 8 9.4Z" fill="#102018" />
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
