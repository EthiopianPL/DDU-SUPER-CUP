import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, MapPin } from 'lucide-react';
import { DepartmentMark } from '../components/DepartmentMark';
import {
  formatKickoff,
  getDepartment,
  getFixture,
  matchSheet,
  matchStatRows,
  matchTimeline,
  type Player,
  type TimelineEvent,
} from '../../data/supercup';

type DetailTab = 'summary' | 'lineups' | 'stats';

const TABS: { id: DetailTab; label: string }[] = [
  { id: 'summary', label: 'Summary' },
  { id: 'lineups', label: 'Lineups' },
  { id: 'stats', label: 'Stats' },
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
  const stats = matchStatRows(fixture, timeline);
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

        <div className="grid grid-cols-3 border-t border-white/10">
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
          homeName={home?.shortName ?? 'Home'}
          awayName={away?.shortName ?? 'Away'}
          homeColor={home?.color ?? '#334155'}
          awayColor={away?.color ?? '#334155'}
          homeSheet={homeSheet}
          awaySheet={awaySheet}
          timeline={timeline}
        />
      )}
      {tab === 'stats' && <Stats stats={stats} />}
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
  homeColor,
  awayColor,
  homeSheet,
  awaySheet,
  timeline,
}: {
  homeName: string;
  awayName: string;
  homeColor: string;
  awayColor: string;
  homeSheet: ReturnType<typeof matchSheet>;
  awaySheet: ReturnType<typeof matchSheet>;
  timeline: TimelineEvent[];
}) {
  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#10192b]">
      <div className="grid grid-cols-2 border-b border-white/10 px-4 py-3 text-xs font-bold">
        <span style={{ color: homeColor }}>{homeName} · {homeSheet.formation}</span>
        <span className="text-right" style={{ color: awayColor }}>{awaySheet.formation} · {awayName}</span>
      </div>
      {(['GK', 'DEF', 'MID', 'FWD'] as const).map((position) => (
        <LineupRow
          key={position}
          label={position}
          home={homeSheet.starters.filter((player) => player.position === position)}
          away={awaySheet.starters.filter((player) => player.position === position)}
          timeline={timeline}
        />
      ))}
      <p className="border-t border-white/10 px-4 py-2 text-[11px] font-semibold tracking-[0.14em] text-white/35">BENCH</p>
      <LineupRow home={homeSheet.bench} away={awaySheet.bench} timeline={timeline} />
    </section>
  );
}

function LineupRow({
  label,
  home,
  away,
  timeline,
}: {
  label?: string;
  home: Player[];
  away: Player[];
  timeline: TimelineEvent[];
}) {
  const rows = Math.max(home.length, away.length);
  return (
    <div className="border-t border-white/5">
      {label && <p className="px-4 pt-2 text-[10px] font-semibold tracking-[0.14em] text-white/30">{label}</p>}
      {Array.from({ length: rows }, (_, index) => (
        <div key={`${label ?? 'bench'}-${index}`} className="grid grid-cols-2 gap-3 px-4 py-1.5">
          <LineupPlayer player={home[index]} timeline={timeline} align="left" />
          <LineupPlayer player={away[index]} timeline={timeline} align="right" />
        </div>
      ))}
    </div>
  );
}

function LineupPlayer({ player, timeline, align }: { player?: Player; timeline: TimelineEvent[]; align: 'left' | 'right' }) {
  if (!player) return <span />;
  const marks = timeline.filter((event) => event.playerId === player.id);
  return (
    <span className={`flex min-w-0 items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <span className="w-5 shrink-0 text-xs font-black text-white/35">{player.number}</span>
      <span className="truncate text-sm text-white">{player.name}</span>
      <span className="flex shrink-0 gap-1">
        {marks.map((event) => (
          <EventMark key={`${event.kind}-${event.minute}`} kind={event.kind} />
        ))}
      </span>
    </span>
  );
}

function Stats({ stats }: { stats: ReturnType<typeof matchStatRows> }) {
  if (!stats) {
    return <p className="mt-6 rounded-2xl border border-white/10 bg-[#10192b] px-4 py-8 text-center text-sm text-white/50">Stats appear after kickoff.</p>;
  }

  return (
    <section className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-[#10192b] p-4">
      {stats.map((stat) => {
        const total = stat.home + stat.away || 1;
        const homeWidth = (stat.home / total) * 50;
        const awayWidth = (stat.away / total) * 50;
        const suffix = stat.percent ? '%' : '';
        return (
          <div key={stat.label}>
            <div className="mb-1 grid grid-cols-3 items-center text-sm">
              <span className="font-black text-white">{stat.home}{suffix}</span>
              <span className="text-center text-xs text-white/45">{stat.label}</span>
              <span className="text-right font-black text-white">{stat.away}{suffix}</span>
            </div>
            <div className="flex h-1.5 overflow-hidden rounded-full bg-white/10">
              <span className="ml-auto bg-[#f5c518]" style={{ width: `${homeWidth}%` }} />
              <span className="bg-[#7aa2ff]" style={{ width: `${awayWidth}%` }} />
            </div>
          </div>
        );
      })}
    </section>
  );
}
