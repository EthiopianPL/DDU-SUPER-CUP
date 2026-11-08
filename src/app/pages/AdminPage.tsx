import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Eye, EyeOff, Edit3, Plus, X, Trash2, Search, ExternalLink, LogOut, ArrowLeft } from 'lucide-react';
import { desk, imagePayload } from '../../data/api';
import { useLeagueVersion } from '../../data/live';
import { newsArticles } from '../../data/news';
import { useMatchClock } from '../useMatchClock';
import { DepartmentMark, Portrait } from '../components/DepartmentMark';
import { MatchLoading } from '../components/Layout';
import { RichTextEditor } from '../components/RichTextEditor';
import { RichTextContent } from '../components/RichTextContent';
import { stripHtml } from '../utils/richText';
import {
  departments,
  GROUPS,
  fixtures,
  formatLiveTime,
  getDepartment,
  getFixture,
  leagueRules,
  matchEvents,
  periodText,
  players,
  squads,
  type GroupId,
  type Player,
} from '../../data/supercup';
import { formationPlan, seatPlayers } from '../../data/formation';
import { STAGE_OPTIONS, scheduleTie, stageLabel, tieCount, type Stage } from '../../data/knockout';

type Role = 'super_admin' | 'match_admin' | 'competition_manager' | 'team_manager' | 'reader';
type Section = 'overview' | 'matches' | 'teams' | 'players' | 'news' | 'users' | 'audit';
type DeskTab = 'clock' | 'events' | 'lineup' | 'fixture' | 'motm';

interface DeskUser {
  id: string;
  username: string;
  role: Role;
}

const NAV: { id: Section; label: string }[] = [
  { id: 'overview', label: 'Dashboard' },
  { id: 'matches', label: 'Matches' },
  { id: 'teams', label: 'Teams' },
  { id: 'players', label: 'Players' },
  { id: 'news', label: 'News' },
  { id: 'users', label: 'Users' },
  { id: 'audit', label: 'Audit' },
];

const inputClass = 'mt-1 w-full rounded-xl border border-white/10 bg-[#0c1424] px-3 py-2 text-sm text-white outline-none focus:border-[#f5c518]/70';
const FORMATIONS = ['4-2-3-1', '4-3-3', '4-4-2', '4-1-4-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1'];

export function AdminPage() {
  const navigate = useNavigate();
  const { section: routeSection, matchId: routeMatchId, deskTab: routeDeskTab } = useParams<{ section?: string; matchId?: string; deskTab?: string }>();
  const [searchParams] = useSearchParams();
  const version = useLeagueVersion();
  const [user, setUser] = useState<DeskUser | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    desk('/api/me')
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  const rawSection = (routeSection || searchParams.get('tab') || searchParams.get('section') || '').toLowerCase();
  const validSections: Section[] = ['overview', 'matches', 'teams', 'players', 'news', 'users', 'audit'];
  const resolvedSection: Section = rawSection === 'dashboard'
    ? 'overview'
    : rawSection === 'fixture' || rawSection === 'fixtures'
      ? 'matches'
      : (validSections.includes(rawSection as Section) ? (rawSection as Section) : (user?.role === 'match_admin' ? 'matches' : 'overview'));

  const section: Section = user?.role === 'match_admin' && resolvedSection !== 'matches' && resolvedSection !== 'news'
    ? 'matches'
    : resolvedSection;

  const matchId = section === 'matches' ? (routeMatchId || searchParams.get('match') || null) : null;

  useEffect(() => {
    if (user?.role === 'match_admin' && resolvedSection !== 'matches' && resolvedSection !== 'news') {
      navigate('/admin/matches', { replace: true });
    }
  }, [user, resolvedSection, navigate]);

  useEffect(() => {
    if (!notice && !error) return;
    const timer = window.setTimeout(() => {
      setNotice('');
      setError('');
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [notice, error]);

  if (!ready) return <MatchLoading />;
  if (!user) {
    return (
      <Login
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          if (loggedUser.role === 'match_admin') {
            navigate('/admin/matches');
          } else if (!routeSection) {
            navigate('/admin/overview');
          }
        }}
      />
    );
  }

  const openMatch = (id: string, deskTab?: string) => {
    navigate(deskTab ? `/admin/matches/${id}/${deskTab}` : `/admin/matches/${id}`);
  };

  const closeMatch = () => {
    navigate('/admin/matches');
  };

  const visibleNav = NAV.filter((item) => {
    if (user.role === 'match_admin') {
      return item.id === 'matches' || item.id === 'news';
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#070d18] text-white lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="flex flex-col justify-between border-b border-white/10 px-4 py-4 lg:min-h-screen lg:border-b-0 lg:border-r lg:p-5">
        <div>
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">SUPER CUP DESK</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs font-semibold text-white/90">{user.username}</span>
                <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60 uppercase">
                  {user.role.replaceAll('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          <nav className="mt-4 flex gap-1.5 overflow-x-auto pb-1 lg:mt-6 lg:flex-col lg:gap-1 lg:pb-0" aria-label="Admin sections">
            {visibleNav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(`/admin/${item.id}`)}
                className={`flex shrink-0 items-center rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${
                  section === item.id ? 'bg-[#f5c518] text-[#102018]' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 lg:mt-6 lg:flex-col lg:items-stretch lg:gap-1.5">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-bold text-white/80 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white lg:justify-start lg:text-sm"
          >
            <ExternalLink className="h-4 w-4 shrink-0 text-[#f5c518]" />
            <span>View site</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmLogout(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-300 transition-colors hover:border-red-500/40 hover:bg-red-500/15 hover:text-red-200 lg:justify-start lg:text-sm"
          >
            <LogOut className="h-4 w-4 shrink-0 text-red-400" />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      {confirmLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f172a] p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-400">
                <LogOut className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Log out</h3>
                <p className="text-xs text-white/50">Are you sure you want to end your session?</p>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmLogout(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                No
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmLogout(false);
                  try {
                    await desk('/api/logout', { method: 'POST', body: {} });
                  } finally {
                    setUser(null);
                    navigate('/admin');
                  }
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-500"
              >
                Yes, log out
              </button>
            </div>
          </div>
        </div>
      )}
      <main className="px-4 py-5 sm:px-6">
        {(notice || error) && (
          <p className={`mb-4 rounded-xl px-3 py-2 text-sm ${error ? 'bg-red-500/15 text-red-200' : 'bg-[#2f9e44]/15 text-[#7ddea0]'}`} role="status">
            {error || notice}
          </p>
        )}
        {section === 'overview' && user.role !== 'match_admin' && <Overview version={version} onOpen={openMatch} />}
        {section === 'matches' && !matchId && <MatchList version={version} onOpen={openMatch} onMessage={setNotice} onError={setError} />}
        {section === 'matches' && matchId && (
          <MatchDesk
            key={matchId}
            id={matchId}
            role={user.role}
            tab={routeDeskTab as DeskTab | undefined}
            onTabChange={(nextTab) => navigate(`/admin/matches/${matchId}/${nextTab}`)}
            onClose={closeMatch}
            onMessage={setNotice}
            onError={setError}
          />
        )}
        {section === 'teams' && user.role !== 'match_admin' && <TeamAdmin onMessage={setNotice} onError={setError} />}
        {section === 'players' && user.role !== 'match_admin' && <PlayerAdmin onMessage={setNotice} onError={setError} />}
        {section === 'news' && <NewsAdmin onMessage={setNotice} onError={setError} />}
        {section === 'users' && user.role !== 'match_admin' && <UserAdmin role={user.role} onMessage={setNotice} onError={setError} />}
        {section === 'audit' && user.role !== 'match_admin' && <AuditList />}
      </main>
    </div>
  );
}

function Login({ onSuccess }: { onSuccess: (user: DeskUser) => void }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="mx-auto max-w-sm px-4 py-16 sm:py-20">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-white/70 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to site</span>
      </button>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setError('');
          try {
            const data = await desk('/api/login', { body: { username, password } });
            onSuccess(data.user);
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Sign-in failed.');
          }
        }}
      >
        <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">MATCH DESK</p>
        <h1 className="mt-2 text-3xl font-black">Sign in</h1>
        <p className="mt-2 text-sm text-white/50">Sign in with your authorized credentials to access the administrative match desk.</p>
        <label className="mt-5 block text-xs font-bold text-white/50">Username
          <input className={inputClass} value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>
        <label className="mt-3 block text-xs font-bold text-white/50">Password
          <input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <button type="submit" className="mt-5 w-full rounded-xl bg-[#f5c518] py-3 text-sm font-black text-[#102018]">Enter desk</button>
      </form>
    </div>
  );
}

function Overview({ version, onOpen }: { version: number; onOpen: (id: string) => void }) {
  void version;
  const live = fixtures.filter((fixture) => fixture.status === 'live');
  const upcoming = fixtures.filter((fixture) => fixture.detail === 'scheduled' || fixture.detail === 'postponed');
  const finished = fixtures.filter((fixture) => fixture.detail === 'finished');
  const postponed = fixtures.filter((fixture) => fixture.detail === 'postponed');
  const recent = [...matchEvents].reverse().filter((event) => !event.voided).slice(0, 6);
  return (
    <div>
      <h1 className="text-3xl font-black">Dashboard</h1>
      <p className="mt-1 text-sm text-white/45">Counts come from the match server.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Matches" value={fixtures.length} hint={`${live.length} live · ${upcoming.length} scheduled`} />
        <Stat label="Finished" value={finished.filter((fixture) => fixture.confirmed).length} hint={`${finished.length - finished.filter((fixture) => fixture.confirmed).length} awaiting confirmation`} />
        <Stat label="Postponed" value={postponed.length} hint="Not in the table" />
        <Stat label="Teams / players" value={`${departments.length} / ${players.filter((player) => player.registered !== false).length}`} hint="Registered squads" />
      </div>
      <section className="mt-6">
        <h2 className="text-lg font-black">Live and recent events</h2>
        <div className="mt-3 space-y-2">
          {live.map((fixture) => (
            <button key={fixture.id} type="button" onClick={() => onOpen(fixture.id)} className="flex w-full items-center justify-between rounded-2xl border border-red-500/30 bg-[#10192b] px-4 py-3 text-left">
              <span className="font-bold">{labelOf(fixture.homeId)} {fixture.homeScore}-{fixture.awayScore} {labelOf(fixture.awayId)}</span>
              <span className="font-mono text-sm text-red-300">{fixture.minute ?? 0}'</span>
            </button>
          ))}
          {!live.length && <p className="text-sm text-white/40">No match is live.</p>}
          {recent.map((event) => (
            <p key={event.id} className="text-sm text-white/60">{event.minute}' {event.type.replaceAll('_', ' ')} · {event.playerName || event.detail}</p>
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#10192b] p-4">
      <p className="text-[11px] font-bold tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs text-white/40">{hint}</p>
    </div>
  );
}

function MatchList({ version, onOpen, onMessage, onError }: { version: number; onOpen: (id: string) => void; onMessage: (text: string) => void; onError: (text: string) => void }) {
  void version;
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const rows = fixtures.filter((fixture) => {
    const home = getDepartment(fixture.homeId);
    const away = getDepartment(fixture.awayId);
    const text = `${home?.name ?? ''} ${away?.name ?? ''} ${fixture.stadium} ${fixture.group} ${fixture.stage ?? ''}`.toLowerCase();
    const statusOk = status === 'all' || fixture.detail === status || fixture.status === status;
    return statusOk && text.includes(query.trim().toLowerCase());
  });

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">FIXTURES</p>
      <h1 className="mt-1 text-3xl font-black">Matches</h1>
      <p className="mt-1 text-sm text-white/45">Nothing is placed on the calendar until you schedule it here.</p>
      <MatchForm onDone={onMessage} onError={onError} />
      <GroupRoundForm onDone={onMessage} onError={onError} />
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <input className={`${inputClass} mt-0`} placeholder="Search teams or venue" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className={`${inputClass} mt-0 sm:max-w-[180px]`} value={status} onChange={(event) => setStatus(event.target.value)}>
          {['all', 'scheduled', 'live', 'halftime', 'finished', 'postponed', 'suspended', 'cancelled', 'abandoned'].map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((fixture) => {
          const knockout = fixture.stage && fixture.stage !== 'group';
          return (
            <li key={fixture.id}>
              <button type="button" onClick={() => onOpen(fixture.id)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#10192b] px-3 py-3 text-left">
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-[#f5c518]">
                    {knockout ? `${stageLabel(fixture.stage)} · Tie ${fixture.slot}` : `Group ${fixture.group} · Matchday ${fixture.matchday}`}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-black">{labelOf(fixture.homeId)} vs {labelOf(fixture.awayId)}</span>
                  <span className="block text-xs text-white/40">{fixture.date} {fixture.time} · {fixture.stadium}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-sm font-black">{fixture.status === 'upcoming' ? '–' : `${fixture.homeScore}-${fixture.awayScore}`}</span>
                  <span className="text-[11px] font-bold text-white/40">{fixture.detail}{fixture.confirmed ? ' · confirmed' : ''}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!rows.length && <p className="mt-4 rounded-2xl border border-white/10 px-3 py-8 text-center text-sm text-white/40">No matches yet. Schedule one above.</p>}
    </div>
  );
}

function MatchForm({ onDone, onError }: { onDone: (text: string) => void; onError: (text: string) => void }) {
  const version = useLeagueVersion();
  const [stage, setStage] = useState<Stage>('group');
  const [group, setGroup] = useState<GroupId>('A');
  const [slot, setSlot] = useState('1');
  const [matchday, setMatchday] = useState('1');
  const pool = departments.filter((team) => team.group === group);
  const [homeId, setHomeId] = useState(pool[0]?.id ?? '');
  const [awayId, setAwayId] = useState(pool[1]?.id ?? '');
  const [date, setDate] = useState('2026-11-07');
  const [time, setTime] = useState('15:00');
  const [venue, setVenue] = useState('DDU Main Pitch');
  const [referee, setReferee] = useState('');
  const [assistant1, setAssistant1] = useState('');
  const [assistant2, setAssistant2] = useState('');
  const [fourthReferee, setFourthReferee] = useState('');
  const [allowExtra, setAllowExtra] = useState(false);
  void version;
  const home = pool.find((team) => team.id === homeId) ?? pool[0];
  const awayOptions = pool.filter((team) => team.id !== home?.id);
  const away = awayOptions.find((team) => team.id === awayId) ?? awayOptions[0];
  const ties = tieCount(stage);
  const tie = stage === 'group' ? undefined : scheduleTie(stage, Math.min(Number(slot) || 1, ties));
  const knockoutHome = tie?.home.team;
  const knockoutAway = tie?.away.team;
  const ready = stage === 'group' ? Boolean(home && away) : Boolean(tie && !tie.fixture && knockoutHome && knockoutAway);

  return (
    <form
      className="mt-5 rounded-3xl border border-white/10 bg-[#10192b] p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          if (!ready) throw new Error(stage === 'group' ? 'Add two teams before scheduling a match.' : 'Both places in this tie need a qualified team.');
          await desk('/api/matches', {
            body: {
              stage,
              slot: stage === 'group' ? 0 : Math.min(Number(slot) || 1, ties),
              matchday: Number(matchday) || 1,
              homeId: stage === 'group' ? home?.id : knockoutHome?.id,
              awayId: stage === 'group' ? away?.id : knockoutAway?.id,
              date,
              time,
              venue,
              referee,
              assistant1,
              assistant2,
              fourthReferee,
              allowExtra: stage === 'group' ? allowExtra : true,
            },
          });
          onDone('Match scheduled.');
        } catch (reason) {
          onError(reason instanceof Error ? reason.message : 'Could not schedule the match.');
        }
      }}
    >
      <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">NEW MATCH</p>
      <h2 className="mt-1 text-xl font-black">Schedule a fixture</h2>
      <div className="mt-4 grid gap-4">
        <ChoiceRow label="Round" value={stageLabel(stage)} options={STAGE_OPTIONS.map((item) => item.label)} onChange={(label) => {
          const next = STAGE_OPTIONS.find((item) => item.label === label)?.id ?? 'group';
          setStage(next);
          if (next !== 'group') {
            setAllowExtra(true);
            if (Number(slot) > tieCount(next)) setSlot('1');
          }
        }} />
        {stage === 'group' ? (
          <ChoiceRow label="Group" value={group} options={['A', 'B', 'C', 'D', 'E',]} onChange={(value) => setGroup(value as GroupId)} />
        ) : (
          <ChoiceRow label="Tie" value={String(Math.min(Number(slot) || 1, ties))} options={Array.from({ length: ties }, (_, index) => String(index + 1))} onChange={setSlot} />
        )}
        {stage === 'group' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Home" value={home?.id ?? ''} onChange={setHomeId} options={pool.map((team) => ({ id: team.id, label: `${team.shortName} · ${team.name}` }))} />
            <Select label="Away" value={away?.id ?? ''} onChange={setAwayId} options={awayOptions.map((team) => ({ id: team.id, label: `${team.shortName} · ${team.name}` }))} />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <TiePlace label={tie?.home.label ?? 'Home'} team={knockoutHome?.name} />
            <TiePlace label={tie?.away.label ?? 'Away'} team={knockoutAway?.name} />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {stage === 'group' && <Field label="Matchday" value={matchday} onChange={setMatchday} placeholder="1" inputMode="numeric" />}
          <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">Date
            <input className={inputClass} type="date" value={date} required onChange={(event) => setDate(event.target.value)} />
          </label>
          <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">Kickoff
            <input className={inputClass} type="time" value={time} required onChange={(event) => setTime(event.target.value)} />
          </label>
          <Field label="Venue" value={venue} onChange={setVenue} placeholder="Campus pitch" />
          <Field label="Referee" value={referee} onChange={setReferee} placeholder="Optional" />
          <Field label="Assistant 1" value={assistant1} onChange={setAssistant1} placeholder="Optional" />
          <Field label="Assistant 2" value={assistant2} onChange={setAssistant2} placeholder="Optional" />
          <Field label="4th Referee" value={fourthReferee} onChange={setFourthReferee} placeholder="Optional" />
        </div>
        {stage === 'group' && (
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={allowExtra} onChange={(event) => setAllowExtra(event.target.checked)} />
            Allow extra time and penalties
          </label>
        )}
        {stage !== 'group' && (
          <p className="text-xs text-white/40">
            {tie?.fixture
              ? 'This tie is already on the calendar.'
              : 'The two teams come from the knockout. A group place fills only after that group table is finished. Later rounds take the confirmed winner of the previous tie.'}
          </p>
        )}
      </div>
      <button type="submit" disabled={!ready} className="mt-5 w-full rounded-xl bg-[#f5c518] px-4 py-3 text-sm font-black text-[#102018] disabled:opacity-40 sm:w-auto">Schedule match</button>
    </form>
  );
}

function TiePlace({ label, team }: { label: string; team?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1424] px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">{label}</p>
      <p className={`mt-1 text-sm font-black ${team ? 'text-white' : 'text-white/35'}`}>{team ?? 'Not through yet'}</p>
    </div>
  );
}

function GroupRoundForm({ onDone, onError }: { onDone: (text: string) => void; onError: (text: string) => void }) {
  const [group, setGroup] = useState('ALL');
  const [date, setDate] = useState('2026-11-07');
  const [time, setTime] = useState('15:00');
  return (
    <form
      className="mt-3 rounded-3xl border border-white/10 bg-[#10192b] p-5"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          const data = await desk('/api/matches/round', { body: { group: group === 'ALL' ? '' : group, date, time } });
          onDone(data.created ? `Scheduled ${data.created} group matches.` : 'Those group matches are already on the calendar.');
        } catch (reason) {
          onError(reason instanceof Error ? reason.message : 'Could not build the group fixtures.');
        }
      }}
    >
      <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">GROUP DRAW</p>
      <h2 className="mt-1 text-xl font-black">Fill a group calendar</h2>
      <p className="mt-1 text-sm text-white/45">Builds the missing round-robin only. Each matchday is one week apart. Scores stay blank until you play the match.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Select label="Group" value={group} onChange={setGroup} options={[{ id: 'ALL', label: 'All groups' }, ...GROUPS.map((id) => ({ id, label: `Group ${id}` }))]} />
        <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">First matchday
          <input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">Kickoff
          <input className={inputClass} type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
        </label>
      </div>
      <button type="submit" className="mt-4 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-black">Schedule missing fixtures</button>
    </form>
  );
}

function MatchDesk({
  id,
  role,
  tab: controlledTab,
  onTabChange,
  onClose,
  onMessage,
  onError,
}: {
  id: string;
  role: Role;
  tab?: DeskTab;
  onTabChange?: (tab: DeskTab) => void;
  onClose: () => void;
  onMessage: (text: string) => void;
  onError: (text: string) => void;
}) {
  const version = useLeagueVersion();
  const fixture = getFixture(id);
  const clock = useMatchClock(fixture?.status === 'live' ? id : undefined);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ label: string; action: string } | null>(null);
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const [internalTab, setInternalTab] = useState<DeskTab>(() => {
    const current = getFixture(id);
    if (!current || current.status === 'live' || (current.detail === 'finished' && current.confirmed)) return 'events';
    if (current.detail === 'finished') return 'clock';
    return 'lineup';
  });

  const tab = controlledTab || internalTab;

  useEffect(() => {
    if (controlledTab) {
      setInternalTab(controlledTab);
    }
  }, [controlledTab]);

  void version;
  if (!fixture) return <p className="text-sm text-white/50">That match is no longer on the server.</p>;
  const home = getDepartment(fixture.homeId);
  const away = getDepartment(fixture.awayId);
  const events = matchEvents.filter((event) => event.matchId === id && !event.voided);
  const canCorrect = role === 'super_admin' || role === 'competition_manager';
  const canRun = role === 'super_admin' || role === 'match_admin' || role === 'competition_manager';
  const finished = fixture.detail === 'finished';
  const live = fixture.status === 'live' || fixture.detail === 'suspended';
  const deskTabs: { id: DeskTab; label: string }[] = [
    { id: 'clock', label: 'Clock' },
    { id: 'events', label: 'Events' },
  ];
  if (finished) deskTabs.push({ id: 'motm', label: 'Man of the Match' });
  if (!finished && !live) deskTabs.push({ id: 'lineup', label: 'Lineup' }, { id: 'fixture', label: 'Fixture' });
  const activeTab = deskTabs.some((item) => item.id === tab) ? tab : deskTabs[0].id;

  const handleTabClick = (nextTab: DeskTab) => {
    setInternalTab(nextTab);
    if (onTabChange) onTabChange(nextTab);
  };

  const act = async (path: string, body: Record<string, unknown>, method = 'POST') => {
    setBusy(true);
    try {
      await desk(path, { method, body: { ...body, version: getFixture(id)?.version } });
      onMessage('Saved.');
      setConfirm(null);
      setEditingGoal(null);
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Could not update the match.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={onClose} className="text-sm font-semibold text-white/50 hover:text-white transition-colors">← All matches</button>
      <div className="mt-3 rounded-3xl border border-white/10 bg-[#10192b] p-4 sm:p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamBlock team={home} />
          <div className="text-center">
            <p className={`font-mono text-4xl font-black ${clock?.running ? 'text-[#7ddea0]' : 'text-white'}`}>
              {fixture.detail === 'finished' ? 'FT' : clock ? formatLiveTime(clock) : '00:00'}
            </p>
            <p className="text-xs font-bold text-white/45">{periodText(fixture.period, clock?.running)}{clock && clock.added > 0 ? ` · +${clock.added} added` : ''}</p>
            <p className="mt-1 text-3xl font-black">{fixture.homeScore ?? 0}–{fixture.awayScore ?? 0}</p>
            {fixture.pensHome != null && <p className="text-xs font-bold text-[#f5c518]">Pens {fixture.pensHome}-{fixture.pensAway}</p>}
          </div>
          <TeamBlock team={away} align="end" />
        </div>
        <p className="mt-3 text-center text-xs text-white/35">{fixture.stage && fixture.stage !== 'group' ? `${stageLabel(fixture.stage)} · Tie ${fixture.slot}` : `Group ${fixture.group} · MD${fixture.matchday}`} · {fixture.stadium} · {fixture.date} {fixture.time}{fixture.referee ? ` · Ref ${fixture.referee}` : ''}{fixture.assistant1 ? ` · AR1 ${fixture.assistant1}` : ''}{fixture.assistant2 ? ` · AR2 ${fixture.assistant2}` : ''}{fixture.fourthReferee ? ` · 4th Ref ${fixture.fourthReferee}` : ''}{fixture.confirmed ? ' · Confirmed' : ''}</p>
        {finished && <p className="mt-3 text-center text-sm text-white/50">This match is finished. The score, lineup, and events stay as recorded.</p>}
      </div>

      <nav role="tablist" aria-label="Match desk" className={`mt-4 grid gap-1 rounded-2xl border border-white/10 bg-[#10192b] p-1.5 ${deskTabs.length >= 4 ? 'grid-cols-4' : deskTabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {deskTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeTab === item.id}
            onClick={() => handleTabClick(item.id)}
            className={`rounded-xl px-2 py-2.5 text-center text-xs font-bold sm:text-sm ${activeTab === item.id ? 'bg-[#f5c518] text-[#102018]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {activeTab === 'clock' && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-[#10192b] p-4" role="tabpanel">
          <div className="flex flex-wrap gap-2">
            {!finished && (fixture.detail === 'scheduled' || fixture.detail === 'postponed') ? <Action disabled={busy || !canRun} onClick={() => act(`/api/matches/${id}/clock`, { action: 'kickoff' })}>Kick off</Action> : null}
            {!finished && clock?.running ? <Action disabled={busy || !canRun} onClick={() => act(`/api/matches/${id}/clock`, { action: 'pause' })}>Pause</Action> : null}
            {!finished && fixture.status === 'live' && !clock?.running && fixture.period !== 'halftime' && fixture.period !== 'penalties' ? <Action disabled={busy || !canRun} onClick={() => act(`/api/matches/${id}/clock`, { action: 'resume' })}>Resume</Action> : null}
            {!finished && fixture.period === 'first_half' && <Action disabled={busy || !canRun} onClick={() => act(`/api/matches/${id}/clock`, { action: 'halftime' })}>Half time</Action>}
            {!finished && fixture.period === 'halftime' && <Action disabled={busy || !canRun} onClick={() => act(`/api/matches/${id}/clock`, { action: 'second_half' })}>Second half</Action>}
            {!finished && (fixture.allowExtra || leagueRules.allowExtraTime) && fixture.period === 'second_half' && <Action disabled={busy || !canRun} onClick={() => act(`/api/matches/${id}/clock`, { action: 'extra_first' })}>Extra time</Action>}
            {!finished && fixture.period === 'extra_first' && <Action disabled={busy || !canRun} onClick={() => act(`/api/matches/${id}/clock`, { action: 'extra_break' })}>Extra break</Action>}
            {!finished && fixture.period === 'extra_break' && <Action disabled={busy || !canRun} onClick={() => act(`/api/matches/${id}/clock`, { action: 'extra_second' })}>Second extra</Action>}
            {!finished && fixture.allowExtra && <Action disabled={busy || !canRun} onClick={() => act(`/api/matches/${id}/clock`, { action: 'penalties' })}>Penalties</Action>}
            {!finished && fixture.status === 'live' && <Action disabled={busy || !canRun} onClick={() => act(`/api/matches/${id}/clock`, { action: 'suspend' })}>Suspend</Action>}
            {!finished && fixture.detail === 'suspended' && <Action disabled={busy || !canRun} onClick={() => act(`/api/matches/${id}/clock`, { action: 'resume' })}>Resume match</Action>}
            {!finished && ['scheduled', 'postponed', 'suspended'].includes(fixture.detail || '') && <Action disabled={busy || !canRun} onClick={() => act(`/api/matches/${id}/clock`, { action: 'postpone' })}>Postpone</Action>}
            {!finished && !fixture.confirmed && fixture.detail !== 'cancelled' && <Action disabled={busy || !canRun} onClick={() => setConfirm({ label: 'Cancel this match?', action: 'cancel' })}>Cancel</Action>}
            {!finished && fixture.status === 'live' && <Action disabled={busy || !canRun} onClick={() => setConfirm({ label: 'Abandon this match? It will not count in the table.', action: 'abandon' })}>Abandon</Action>}
            {!finished && fixture.status !== 'upcoming' && <Action disabled={busy || !canRun} onClick={() => setConfirm({ label: 'End the match? The result stays unconfirmed until you confirm it.', action: 'full_time' })}>Full time</Action>}
            {fixture.detail === 'finished' && !fixture.confirmed && canCorrect && <Action disabled={busy} onClick={() => setConfirm({ label: 'Confirm this result and add it to the table?', action: 'confirm' })}>Confirm result</Action>}
          </div>
          {confirm && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm">
              <span>{confirm.label}</span>
              <button type="button" disabled={busy} onClick={() => act(`/api/matches/${id}/clock`, { action: confirm.action })} className="rounded-lg bg-red-500 px-3 py-1.5 font-bold">Confirm</button>
              <button type="button" onClick={() => setConfirm(null)} className="text-white/50">Back</button>
            </div>
          )}
          {!finished && live && <AddedTime period={fixture.period} announced={clock?.added ?? Math.floor((fixture.addedSeconds ?? 0) / 60)} disabled={busy || !canRun} onSave={(minutes) => act(`/api/matches/${id}/events`, { type: 'added_time', addedMinute: minutes, clientKey: crypto.randomUUID() })} />}
          {!finished && <ClockCorrection disabled={busy || !canRun} onSave={(seconds) => act(`/api/matches/${id}/clock`, { action: 'set_clock', seconds })} />}
          {finished && fixture.confirmed && <p className="text-sm text-white/50">Nothing left to change on the clock.</p>}
        </section>
      )}

      {activeTab === 'lineup' && !finished && !live && <LineupEditor matchId={id} disabled={busy || !canRun} onSave={(body) => act(`/api/matches/${id}/lineup`, body)} />}
      {activeTab === 'fixture' && !finished && !live && (
        <FixtureMeta
          fixture={fixture}
          disabled={busy || !canRun}
          onSave={(body) => act(`/api/matches/${id}`, body, 'PATCH')}
        />
      )}
      {activeTab === 'events' && !finished && canRun && (
        <EventPicker
          matchId={id}
          period={fixture.period}
          disabled={busy}
          onEvent={(body) => act(`/api/matches/${id}/events`, body)}
        />
      )}


      {activeTab === 'motm' && (
        <MotmManager
          fixture={fixture}
          disabled={busy || !canRun}
          onSave={async (body) => {
            setBusy(true);
            try {
              await desk(`/api/matches/${id}/motm`, { method: 'POST', body: { ...body, version: getFixture(id)?.version } });
              onMessage('Man of the Match selection saved.');
            } catch (reason) {
              onError(reason instanceof Error ? reason.message : 'Could not save Man of the Match.');
            } finally {
              setBusy(false);
            }
          }}
          onRemove={async () => {
            setBusy(true);
            try {
              await desk(`/api/matches/${id}/motm`, { method: 'POST', body: { playerId: null, photoUrl: null, version: getFixture(id)?.version } });
              onMessage('Man of the Match selection removed.');
            } catch (reason) {
              onError(reason instanceof Error ? reason.message : 'Could not remove selection.');
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {activeTab === 'events' && <section className="mt-4 rounded-2xl border border-white/10 bg-[#10192b] p-4">
        <h2 className="font-black">Event history</h2>
        <ul className="mt-3 space-y-2">
          {events.filter(shownEvent).map((event) => (
            <li key={event.id} className="border-t border-white/5 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{historyLine(event)}</span>
                {!finished && (
                  <span className="flex gap-3">
                    {canCorrect && event.type === 'goal' && (
                      <button type="button" className="text-xs font-bold text-[#f5c518]" onClick={() => setEditingGoal(event.id)}>Correct</button>
                    )}
                    {canRun && (
                      <button type="button" className="text-xs font-bold text-red-300" onClick={() => {
                        const reason = window.prompt('Reason for removing this event');
                        if (reason) act(`/api/matches/${id}/events/${event.id}/void`, { reason, disallowed: event.type === 'goal' });
                      }}>Void</button>
                    )}
                  </span>
                )}
              </div>
              {!finished && editingGoal === event.id && event.type === 'goal' && (
                <GoalCorrect event={event} matchId={id} disabled={busy} onSave={(body) => act(`/api/matches/${id}/events/${event.id}`, body, 'PATCH')} />
              )}
            </li>
          ))}
          {!events.some(shownEvent) && <li className="text-sm text-white/40">No goals, cards, or substitutions yet.</li>}
        </ul>
      </section>}
    </div>
  );
}

function TeamBlock({ team, align = 'start' }: { team?: { id?: string; shortName: string; name: string; color: string; crestUrl?: string }; align?: 'start' | 'end' }) {
  if (!team) return null;
  return (
    <div className={align === 'end' ? 'text-right' : ''}>
      <DepartmentMark id={team.id} name={team.name} shortName={team.shortName} color={team.color} size={48} src={team.crestUrl || undefined} />
      <p className="mt-2 text-sm font-bold">{team.name}</p>
    </div>
  );
}

function Action({ children, onClick, disabled }: { children: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold disabled:opacity-40">{children}</button>;
}

function AddedTime({ period, announced, disabled, onSave }: { period?: string; announced: number; disabled: boolean; onSave: (minutes: number) => void }) {
  const [value, setValue] = useState(String(announced || ''));
  const label = period === 'first_half' ? 'First half added time'
    : period === 'second_half' ? 'Second half added time'
      : period === 'extra_first' ? 'Extra time added'
        : period === 'extra_second' ? 'Second extra added'
          : '';
  if (!label) return null;
  return (
    <form className="mt-3 flex items-end gap-2" onSubmit={(event) => {
      event.preventDefault();
      const minutes = Number(value);
      if (!Number.isInteger(minutes) || minutes < 0 || minutes > 30) return;
      onSave(minutes);
    }}>
      <label className="text-xs font-bold text-white/45">{label}
        <input className={inputClass} inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)} placeholder="0" />
      </label>
      <button type="submit" disabled={disabled} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">Set</button>
    </form>
  );
}

function ClockCorrection({ disabled, onSave }: { disabled: boolean; onSave: (seconds: number) => void }) {
  const [value, setValue] = useState('40:00');
  return (
    <form className="mt-3 flex items-end gap-2" onSubmit={(event) => {
      event.preventDefault();
      const [minutes, seconds] = value.split(':').map(Number);
      if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return;
      onSave(minutes * 60 + seconds);
    }}>
      <label className="text-xs font-bold text-white/45">Correct clock
        <input className={inputClass} value={value} onChange={(event) => setValue(event.target.value)} />
      </label>
      <button type="submit" disabled={disabled} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">Set</button>
    </form>
  );
}

function FixtureMeta({
  fixture,
  disabled,
  onSave,
}: {
  fixture: NonNullable<ReturnType<typeof getFixture>>;
  disabled: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [date, setDate] = useState(fixture.date);
  const [time, setTime] = useState(fixture.time);
  const [venue, setVenue] = useState(fixture.stadium);
  const [referee, setReferee] = useState(fixture.referee ?? '');
  const [assistant1, setAssistant1] = useState(fixture.assistant1 ?? '');
  const [assistant2, setAssistant2] = useState(fixture.assistant2 ?? '');
  const [fourthReferee, setFourthReferee] = useState(fixture.fourthReferee ?? '');
  return (
    <form className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-[#10192b] p-4 sm:grid-cols-3 lg:grid-cols-4" onSubmit={(event) => {
      event.preventDefault();
      onSave({ date, time, venue, referee, assistant1, assistant2, fourthReferee });
    }}>
      <h2 className="font-black sm:col-span-3 lg:col-span-4">Fixture and officials</h2>
      <label className="text-xs font-bold text-white/45">Date<input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Kickoff<input className={inputClass} type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Venue<input className={inputClass} value={venue} onChange={(event) => setVenue(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Referee<input className={inputClass} value={referee} onChange={(event) => setReferee(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Assistant 1<input className={inputClass} value={assistant1} onChange={(event) => setAssistant1(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Assistant 2<input className={inputClass} value={assistant2} onChange={(event) => setAssistant2(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">4th Referee<input className={inputClass} value={fourthReferee} onChange={(event) => setFourthReferee(event.target.value)} /></label>
      <button type="submit" disabled={disabled} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40 sm:col-span-3 lg:col-span-4">Save fixture</button>
    </form>
  );
}

function LineupEditor({ matchId, disabled, onSave }: { matchId: string; disabled: boolean; onSave: (body: Record<string, unknown>) => void }) {
  const fixture = getFixture(matchId);
  const [side, setSide] = useState<'home' | 'away'>('home');
  if (!fixture) return null;
  const teamId = side === 'home' ? fixture.homeId : fixture.awayId;
  const isApproved = side === 'home' ? Boolean(fixture.lineupHomeApproved) : Boolean(fixture.lineupAwayApproved);
  const home = getDepartment(fixture.homeId);
  const away = getDepartment(fixture.awayId);

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-[#10192b] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-lg">Lineup</h2>
          <p className="text-xs text-white/50">Only approved lineups will appear on the public Lineups tab.</p>
        </div>
        <Select label="Team" value={side} onChange={(value) => setSide(value as 'home' | 'away')} options={sidesOf(fixture)} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#0c1424] p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white/80">{home?.shortName ?? 'Home'}</span>
          {fixture.lineupHomeApproved ? (
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 font-bold text-emerald-400">Approved</span>
          ) : (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-bold text-amber-300">Pending</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="font-bold text-white/80">{away?.shortName ?? 'Away'}</span>
          {fixture.lineupAwayApproved ? (
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 font-bold text-emerald-400">Approved</span>
          ) : (
            <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-bold text-amber-300">Pending</span>
          )}
        </div>
      </div>

      <LineupSide
        key={`${matchId}-${teamId}-${side === 'home' ? fixture.formationHome : fixture.formationAway}`}
        matchId={matchId}
        teamId={teamId}
        formation={side === 'home' ? fixture.formationHome : fixture.formationAway}
        isApproved={isApproved}
        disabled={disabled}
        onSave={onSave}
      />
    </section>
  );
}

function LineupSide({
  matchId,
  teamId,
  formation,
  isApproved,
  disabled,
  onSave,
}: {
  matchId: string;
  teamId: string;
  formation?: string;
  isApproved?: boolean;
  disabled: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const current = squads.filter((row) => row.matchId === matchId && row.teamId === teamId);
  const currentIds = new Set(current.map((row) => row.playerId));
  const roster = players.filter((player) => player.departmentId === teamId && player.active !== false && (player.registered !== false || currentIds.has(player.id)));
  const [shape, setShape] = useState(formation && FORMATIONS.includes(formation) ? formation : '4-2-3-1');
  const [slots, setSlots] = useState<Array<string | null>>(() => seatPlayers(current.filter((row) => row.role === 'starter').sort((a, b) => a.sort - b.sort).map((row) => row.playerId), formation || '4-2-3-1', roster));
  const [bench, setBench] = useState(current.filter((row) => row.role === 'bench').map((row) => row.playerId));
  const [picking, setPicking] = useState<number | null>(null);

  useEffect(() => {
    if (formation && FORMATIONS.includes(formation)) {
      setShape(formation);
    }
  }, [formation]);
  const plan = formationPlan(shape);
  const roles = plan.flat();
  const chosen = new Set(slots.filter((id): id is string => Boolean(id)));
  const place = (index: number, playerId: string | null) => {
    setSlots((list) => list.map((id, slot) => (slot === index ? playerId : id === playerId ? null : id)));
    if (playerId) setBench((list) => list.filter((id) => id !== playerId));
    setPicking(null);
  };
  const toggleBench = (playerId: string) => {
    if (chosen.has(playerId)) return;
    setBench((list) => list.includes(playerId) ? list.filter((id) => id !== playerId) : [...list, playerId]);
  };
  const autoFill = () => {
    const used = new Set<string>();
    const newSlots: Array<string | null> = [];
    for (const role of roles) {
      const candidate = roster.find((p) => p.position === role && !used.has(p.id));
      if (candidate) {
        newSlots.push(candidate.id);
        used.add(candidate.id);
      } else {
        newSlots.push(null);
      }
    }
    const newBench = roster.filter((p) => !used.has(p.id)).slice(0, 9).map((p) => p.id);
    setSlots(newSlots);
    setBench(newBench);
    setPicking(null);
  };
  const clearLineup = () => {
    setSlots(Array.from({ length: roles.length }, () => null));
    setBench([]);
    setPicking(null);
  };
  const ready = slots.every(Boolean);
  const openRole = picking == null ? null : roles[picking];
  const choices = openRole ? roster.filter((player) => player.position === openRole && !bench.includes(player.id) && (slots[picking!] === player.id || !chosen.has(player.id))) : [];
  const tops = band(plan.length, 12, 88);

  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      onSave({
        teamId,
        starters: slots.filter((id): id is string => Boolean(id)),
        bench,
        formation: shape,
        approved: false,
      });
    }}>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-bold text-white/45">Formation
          <select className={`${inputClass} mt-1`} value={shape} onChange={(event) => {
            const next = event.target.value;
            setShape(next);
            const seated = seatPlayers(slots.filter((id): id is string => Boolean(id)), next, roster);
            setSlots(seated);
            setPicking(null);
            onSave({
              teamId,
              formation: next,
              starters: seated.filter((id): id is string => Boolean(id)),
              bench,
              approved: false,
            });
          }}>
            {FORMATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2 pt-4">
          <button
            type="button"
            onClick={autoFill}
            className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors"
          >
            Auto-fill from roster
          </button>
          <button
            type="button"
            onClick={clearLineup}
            className="rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-white/60 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="relative mt-3 h-[460px] overflow-hidden rounded-3xl bg-[#3f7a4c]">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-[20%] right-[20%] top-0 h-[16%] border-x border-b border-white/40" />
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/40" />
          <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
        </div>
        {plan.map((line, lineIndex) => line.map((role, index) => {
          const slot = plan.slice(0, lineIndex).reduce((sum, row) => sum + row.length, 0) + index;
          const player = roster.find((item) => item.id === slots[slot]);
          return (
            <button
              key={`${role}-${slot}`}
              type="button"
              onClick={() => setPicking(slot)}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${picking === slot ? 'z-10' : ''}`}
              style={{ top: tops[lineIndex], left: `${spread(line.length)[index]}%` }}
            >
              {player ? (
                <span className="relative">
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt="" className="h-11 w-11 rounded-full border-2 border-white object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#102018] text-xs font-black text-white">{player.number}</span>
                  )}
                </span>
              ) : (
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-white/80 text-[10px] font-black text-white">{role}</span>
              )}
              <span className="mt-1 max-w-20 text-center text-[10px] font-semibold leading-tight text-white drop-shadow line-clamp-2" title={player?.name}>
                {player ? player.name : 'Pick'}
              </span>
            </button>
          );
        }))}
      </div>
      {openRole && (
        <div className="mt-3 rounded-2xl border border-white/10 bg-[#0c1424] p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">{openRole === 'GK' ? 'Goalkeepers only' : `${openRole} only`}</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto">
            {choices.map((player) => (
              <li key={player.id}>
                <button type="button" className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm hover:bg-white/5" onClick={() => place(picking!, player.id)}>
                  {player.photoUrl ? <img src={player.photoUrl} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-black">{player.number}</span>}
                  <span className="min-w-0 flex-1 truncate">{player.name}</span>
                  <span className="text-[10px] font-bold text-white/40">{player.position}</span>
                </button>
              </li>
            ))}
            {!choices.length && <li className="text-sm text-white/40">No {openRole} is free for this place.</li>}
          </ul>
          <button type="button" className="mt-2 text-xs font-bold text-white/50" onClick={() => { if (picking != null) place(picking, null); }}>Clear this place</button>
        </div>
      )}
      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Substitutes</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {roster.filter((player) => !chosen.has(player.id)).map((player) => (
            <li key={player.id}>
              <button type="button" onClick={() => toggleBench(player.id)} className={`rounded-full px-3 py-1 text-xs font-bold ${bench.includes(player.id) ? 'bg-[#f5c518] text-[#102018]' : 'bg-white/10 text-white/70'}`}>
                {player.number} {player.name}
              </button>
            </li>
          ))}
          {!roster.length && <li className="text-sm text-white/40">Register players for this team before setting a lineup.</li>}
        </ul>
      </div>
      <p className="mt-2 text-xs text-white/40">{slots.filter(Boolean).length} of {roles.length} places filled · {bench.length} substitutes</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSave({
            teamId,
            starters: slots.filter((id): id is string => Boolean(id)),
            bench,
            formation: shape,
            approved: false,
          })}
          className="rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          Save Draft
        </button>

        {!isApproved ? (
          <button
            type="button"
            disabled={disabled || !ready}
            onClick={() => onSave({
              teamId,
              starters: slots.filter((id): id is string => Boolean(id)),
              bench,
              formation: shape,
              approved: true,
            })}
            className="rounded-xl bg-[#2f9e44] hover:bg-[#288339] px-5 py-2 text-sm font-black text-white shadow-lg disabled:opacity-40"
          >
            Approve Lineup
          </button>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSave({ teamId, action: 'unapprove' })}
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 text-sm font-bold text-amber-300 disabled:opacity-40"
          >
            Revoke Approval (Set to Draft)
          </button>
        )}
      </div>
    </form>
  );
}

function band(count: number, from: number, to: number) {
  if (count <= 1) return ['50%'];
  return Array.from({ length: count }, (_, index) => `${from + ((to - from) * index) / (count - 1)}%`);
}

function spread(count: number) {
  if (count <= 1) return [50];
  const inset = count >= 5 ? 12 : count === 4 ? 18 : count === 3 ? 24 : 34;
  return Array.from({ length: count }, (_, index) => inset + ((100 - inset * 2) * index) / (count - 1));
}

const goalTypes = [
  { id: 'open_play', label: 'Normal goal' },
  { id: 'penalty', label: 'Penalty goal' },
  { id: 'free_kick', label: 'Direct free-kick goal' },
  { id: 'own_goal', label: 'Own goal' },
];

function GoalCorrect({
  event,
  matchId,
  disabled,
  onSave,
}: {
  event: (typeof matchEvents)[number];
  matchId: string;
  disabled: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const fixture = getFixture(matchId);
  const pitch = usePitch(matchId);
  const [side, setSide] = useState<'home' | 'away'>(fixture && event.creditedTeamId === fixture.awayId ? 'away' : 'home');
  const [goalType, setGoalType] = useState(event.goalType || 'open_play');
  const [playerId, setPlayerId] = useState(event.playerId || '');
  const [assistId, setAssistId] = useState(event.assistId || '');
  const [minute, setMinute] = useState(String(event.minute));
  const [addedMinute, setAddedMinute] = useState(String(event.addedMinute || 0));
  const [detail, setDetail] = useState(event.detail || '');
  if (!fixture) return null;
  const credited = side === 'home' ? fixture.homeId : fixture.awayId;
  const scorerTeam = goalType === 'own_goal' ? (side === 'home' ? fixture.awayId : fixture.homeId) : credited;
  const onTeam = (teamId: string) => [...pitch.entries()].filter(([id, row]) => row.teamId === teamId && (row.on || id === playerId)).map(([id]) => id);
  const scorers = onTeam(scorerTeam);
  const assisters = [...pitch.entries()].filter(([, row]) => row.teamId === credited && row.on).map(([id]) => id).filter((id) => id !== playerId);
  return (
    <form className="mt-2 grid w-full grid-cols-2 gap-2" onSubmit={(submit) => {
      submit.preventDefault();
      onSave({ side, goalType, playerId, assistId: goalType === 'own_goal' ? '' : assistId, minute: Number(minute), addedMinute: Number(addedMinute), detail });
    }}>
      <Select label={goalType === 'own_goal' ? 'Team credited' : 'Team'} value={side} onChange={(value) => setSide(value as 'home' | 'away')} options={sidesOf(fixture)} />
      <Select label="Type" value={goalType} onChange={setGoalType} options={goalTypes} />
      <Select label={goalType === 'own_goal' ? 'Own-goal scorer' : 'Scorer'} value={playerId} onChange={setPlayerId} options={scorers.map((id) => ({ id, label: playerName(id) }))} />
      {goalType !== 'own_goal' && <Select label="Assist" value={assistId} onChange={setAssistId} options={[{ id: '', label: 'No assist' }, ...assisters.map((id) => ({ id, label: playerName(id) }))]} />}
      <label className="text-xs font-bold text-white/45">Minute<input className={inputClass} value={minute} onChange={(input) => setMinute(input.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Added<input className={inputClass} value={addedMinute} onChange={(input) => setAddedMinute(input.target.value)} /></label>
      <label className="col-span-2 text-xs font-bold text-white/45">Note<input className={inputClass} value={detail} onChange={(input) => setDetail(input.target.value)} /></label>
      {goalType === 'own_goal' && <p className="col-span-2 text-xs font-semibold text-[#f5c518]">The selected team receives the goal. The scorer is on the other team, and no assist is recorded.</p>}
      <button type="submit" disabled={disabled || !playerId} className="col-span-2 rounded-xl bg-[#f5c518] px-3 py-2 text-sm font-black text-[#102018] disabled:opacity-40">Save correction</button>
    </form>
  );
}

function usePitch(matchId: string) {
  const version = useLeagueVersion();
  return useMemo(() => {
    const state = new Map<string, { teamId: string; on: boolean; used: boolean; dismissed: boolean }>();
    for (const row of squads.filter((item) => item.matchId === matchId)) {
      state.set(row.playerId, { teamId: row.teamId, on: row.role === 'starter', used: row.role === 'starter', dismissed: false });
    }
    for (const event of matchEvents.filter((item) => item.matchId === matchId && !item.voided)) {
      if (event.type === 'substitution') {
        const outgoing = state.get(event.playerId || '');
        const incoming = state.get(event.relatedPlayerId || '');
        if (outgoing) outgoing.on = false;
        if (incoming) {
          incoming.on = true;
          incoming.used = true;
        }
      }
      if (event.type === 'card' && (event.cardType === 'red' || event.cardType === 'second_yellow')) {
        const player = state.get(event.playerId || '');
        if (player) {
          player.dismissed = true;
          player.on = false;
        }
      }
    }
    return state;
  }, [matchId, version]);
}

function EventPicker({
  matchId,
  period,
  disabled,
  onEvent,
}: {
  matchId: string;
  period?: string;
  disabled: boolean;
  onEvent: (body: Record<string, unknown>) => void;
}) {
  const [tool, setTool] = useState('goal');
  const tools = [
    { id: 'goal', label: 'Goal' },
    { id: 'card', label: 'Card' },
    { id: 'sub', label: 'Substitution' },
    ...(period === 'penalties' ? [{ id: 'penalty', label: 'Penalty kick' }] : []),
  ];
  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-[#10192b] p-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Match action">
        {tools.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tool === item.id}
            onClick={() => setTool(item.id)}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${tool === item.id ? 'bg-[#f5c518] text-[#102018]' : 'bg-white/10 text-white/70'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tool === 'goal' && <GoalForm matchId={matchId} disabled={disabled} onSubmit={onEvent} bare />}
        {tool === 'card' && <CardForm matchId={matchId} disabled={disabled} onSubmit={onEvent} bare />}
        {tool === 'sub' && <SubForm matchId={matchId} disabled={disabled} onSubmit={onEvent} bare />}
        {tool === 'penalty' && <PenaltyForm matchId={matchId} disabled={disabled} onSubmit={onEvent} />}
      </div>
    </section>
  );
}

function GoalForm({ matchId, disabled, onSubmit, bare = false }: { matchId: string; disabled: boolean; onSubmit: (body: Record<string, unknown>) => void; bare?: boolean }) {
  const fixture = getFixture(matchId);
  const pitch = usePitch(matchId);
  const clock = useMatchClock(fixture?.status === 'live' ? matchId : undefined);
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [goalType, setGoalType] = useState('open_play');
  const [playerId, setPlayerId] = useState('');
  const [assistId, setAssistId] = useState('');
  const [minute, setMinute] = useState(String(clock?.minute ?? fixture?.minute ?? 0));
  const [addedMinute, setAddedMinute] = useState('0');
  const [detail, setDetail] = useState('');
  const minuteTouched = useRef(false);
  const addedTouched = useRef(false);
  useEffect(() => {
    if (!minuteTouched.current && clock?.minute != null) setMinute(String(clock.minute));
    if (!addedTouched.current) setAddedMinute(clock && clock.stoppage > 0 ? String(Math.floor(clock.stoppage / 60)) : '0');
  }, [clock]);
  if (!fixture) return null;
  const credited = side === 'home' ? fixture.homeId : fixture.awayId;
  const scorerTeam = goalType === 'own_goal' ? (side === 'home' ? fixture.awayId : fixture.homeId) : credited;
  const onTeam = (teamId: string) => [...pitch.entries()].filter(([, row]) => row.teamId === teamId && row.on && !row.dismissed).map(([id]) => id);
  const scorers = onTeam(scorerTeam);
  const assisters = onTeam(credited).filter((id) => id !== playerId);
  return (
    <form className={bare ? '' : 'rounded-2xl border border-white/10 bg-[#10192b] p-4'} onSubmit={(event) => {
      event.preventDefault();
      onSubmit({ type: 'goal', side, goalType, playerId, assistId: goalType === 'own_goal' ? '' : assistId, minute: Number(minute), addedMinute: Number(addedMinute), detail, clientKey: crypto.randomUUID() });
    }}>
      {!bare && <h2 className="font-black">Goal</h2>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Select label={goalType === 'own_goal' ? 'Team credited' : 'Team'} value={side} onChange={(value) => setSide(value as 'home' | 'away')} options={sidesOf(fixture)} />
        <Select label="Type" value={goalType} onChange={setGoalType} options={goalTypes} />
        <Select label={goalType === 'own_goal' ? 'Own-goal scorer' : 'Scorer'} value={playerId} onChange={setPlayerId} options={[{ id: '', label: 'Choose' }, ...scorers.map((id) => ({ id, label: playerName(id) }))]} />
        {goalType !== 'own_goal' && <Select label="Assist (optional)" value={assistId} onChange={setAssistId} options={[{ id: '', label: 'No assist' }, ...assisters.map((id) => ({ id, label: playerName(id) }))]} />}
        <label className="text-xs font-bold text-white/45">Minute<input className={inputClass} value={minute} onChange={(event) => { minuteTouched.current = true; setMinute(event.target.value); }} /></label>
        <label className="text-xs font-bold text-white/45">Added minute<input className={inputClass} value={addedMinute} onChange={(event) => { addedTouched.current = true; setAddedMinute(event.target.value); }} /></label>
        <label className="col-span-2 text-xs font-bold text-white/45">Note<input className={inputClass} value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
        {goalType === 'own_goal' && <p className="col-span-2 text-xs font-semibold text-[#f5c518]">The selected team receives the goal. The scorer is on the other team, and no assist is recorded.</p>}
      </div>
      <button type="submit" disabled={disabled || !playerId} className="mt-3 rounded-xl bg-[#f5c518] px-4 py-2 text-sm font-black text-[#102018] disabled:opacity-40">Record goal</button>
    </form>
  );
}

function CardForm({ matchId, disabled, onSubmit, bare = false }: { matchId: string; disabled: boolean; onSubmit: (body: Record<string, unknown>) => void; bare?: boolean }) {
  const fixture = getFixture(matchId);
  const pitch = usePitch(matchId);
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [playerId, setPlayerId] = useState('');
  const [cardType, setCardType] = useState('yellow');
  const [detail, setDetail] = useState('');
  if (!fixture) return null;
  const teamId = side === 'home' ? fixture.homeId : fixture.awayId;
  const options = [...pitch.entries()].filter(([, row]) => row.teamId === teamId && row.on).map(([id]) => ({ id, label: playerName(id) }));
  const booked = Boolean(playerId) && matchEvents.some((event) => event.matchId === matchId && !event.voided && event.playerId === playerId && event.type === 'card' && event.cardType === 'yellow');
  return (
    <form className={bare ? '' : 'rounded-2xl border border-white/10 bg-[#10192b] p-4'} onSubmit={(event) => {
      event.preventDefault();
      onSubmit({ type: 'card', side, playerId, cardType, detail, clientKey: crypto.randomUUID() });
    }}>
      {!bare && <h2 className="font-black">Card</h2>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Select label="Team" value={side} onChange={(value) => { setSide(value as 'home' | 'away'); setPlayerId(''); }} options={sidesOf(fixture)} />
        <Select label="Card" value={cardType} onChange={setCardType} options={[{ id: 'yellow', label: booked ? 'Second yellow (red card)' : 'Yellow' }, { id: 'red', label: 'Red card' }]} />
        <Select label="Player" value={playerId} onChange={setPlayerId} options={[{ id: '', label: 'Choose' }, ...options]} />
        <label className="text-xs font-bold text-white/45">Reason<input className={inputClass} value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
      </div>
      {booked && cardType === 'yellow' && <p className="mt-3 text-xs font-semibold text-[#f5c518]">A second yellow is a red card. {playerName(playerId)} is sent off.</p>}
      <button type="submit" disabled={disabled || !playerId} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40">Record card</button>
    </form>
  );
}

function SubForm({ matchId, disabled, onSubmit, bare = false }: { matchId: string; disabled: boolean; onSubmit: (body: Record<string, unknown>) => void; bare?: boolean }) {
  const fixture = getFixture(matchId);
  const pitch = usePitch(matchId);
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [playerId, setPlayerId] = useState('');
  const [relatedPlayerId, setRelatedPlayerId] = useState('');
  if (!fixture) return null;
  const teamId = side === 'home' ? fixture.homeId : fixture.awayId;
  const outgoing = [...pitch.entries()].filter(([, row]) => row.teamId === teamId && row.on).map(([id]) => ({ id, label: playerName(id) }));
  const incoming = [...pitch.entries()].filter(([, row]) => row.teamId === teamId && !row.used && !row.dismissed).map(([id]) => ({ id, label: playerName(id) }));
  return (
    <form className={bare ? '' : 'rounded-2xl border border-white/10 bg-[#10192b] p-4'} onSubmit={(event) => {
      event.preventDefault();
      onSubmit({ type: 'substitution', side, playerId, relatedPlayerId, detail: 'tactical', clientKey: crypto.randomUUID() });
    }}>
      {!bare && <h2 className="font-black">Substitution</h2>}
      <div className="mt-3 grid gap-2">
        <Select label="Team" value={side} onChange={(value) => { setSide(value as 'home' | 'away'); setPlayerId(''); setRelatedPlayerId(''); }} options={sidesOf(fixture)} />
        <Select label="Off" value={playerId} onChange={setPlayerId} options={[{ id: '', label: 'Choose' }, ...outgoing]} />
        <Select label="On" value={relatedPlayerId} onChange={setRelatedPlayerId} options={[{ id: '', label: 'Choose' }, ...incoming]} />
      </div>
      <button type="submit" disabled={disabled || !playerId || !relatedPlayerId} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40">Record substitution</button>
    </form>
  );
}

function PenaltyForm({ matchId, disabled, onSubmit }: { matchId: string; disabled: boolean; onSubmit: (body: Record<string, unknown>) => void }) {
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [scored, setScored] = useState(true);
  const [playerId, setPlayerId] = useState('');
  const fixture = getFixture(matchId);
  const pitch = usePitch(matchId);
  if (!fixture) return null;
  const teamId = side === 'home' ? fixture.homeId : fixture.awayId;
  const takers = [...pitch.entries()].filter(([, row]) => row.teamId === teamId && !row.dismissed).map(([id]) => ({ id, label: playerName(id) }));
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      onSubmit({ type: 'penalty_kick', side, playerId, scored, clientKey: crypto.randomUUID() });
    }}>
      <div className="grid gap-2">
        <Select label="Team" value={side} onChange={(value) => { setSide(value as 'home' | 'away'); setPlayerId(''); }} options={sidesOf(fixture)} />
        <Select label="Taker" value={playerId} onChange={setPlayerId} options={[{ id: '', label: 'Choose' }, ...takers]} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={scored} onChange={(event) => setScored(event.target.checked)} /> Scored</label>
      </div>
      <button type="submit" disabled={disabled || !playerId} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40">Record kick</button>
    </form>
  );
}

function sidesOf(fixture: { homeId: string; awayId: string }) {
  const home = getDepartment(fixture.homeId);
  const away = getDepartment(fixture.awayId);
  return [
    { id: 'home', label: home?.name || 'Team' },
    { id: 'away', label: away?.name || 'Team' },
  ];
}

function shownEvent(event: (typeof matchEvents)[number]) {
  return event.type === 'goal' || event.type === 'card' || event.type === 'substitution' || event.type === 'added_time' || event.type === 'penalty_kick';
}

function historyLine(event: (typeof matchEvents)[number]) {
  const stamp = `${event.minute}${event.addedMinute ? `+${event.addedMinute}` : ''}'`;
  const team = getDepartment(event.creditedTeamId || event.teamId || '')?.name;
  const who = team ? `${team} · ` : '';
  if (event.type === 'goal') {
    const kind = event.goalType === 'penalty' ? 'Penalty goal' : event.goalType === 'own_goal' ? 'Own goal' : event.goalType === 'free_kick' ? 'Direct free kick' : 'Goal';
    const assist = event.goalType === 'own_goal' || !event.assistName ? '' : ` (assist ${event.assistName})`;
    return `${stamp} ${kind} · ${who}${event.playerName}${assist}`;
  }
  if (event.type === 'card') return `${stamp} ${event.cardType === 'yellow' ? 'Yellow card' : 'Red card'} · ${who}${event.playerName}`;
  if (event.type === 'substitution') return `${stamp} Substitution · ${who}${event.playerName} off, ${event.relatedName} on`;
  if (event.type === 'added_time') return `${stamp} Added time +${event.addedMinute}`;
  if (event.type === 'penalty_kick') return `${stamp} Penalty · ${who}${event.playerName} ${event.scored ? 'scored' : 'missed'}`;
  return stamp;
}

function Field({ label, value, onChange, placeholder, required, maxLength, inputMode }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  inputMode?: 'text' | 'numeric';
}) {
  return (
    <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">{label}
      <input
        className={inputClass}
        value={value}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ChoiceRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-full px-3 py-1.5 text-xs font-black ${value === option ? 'bg-[#f5c518] text-[#102018]' : 'bg-white/5 text-white/70'}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function PicturePicker({ preview, empty, round = false, wide = false, required = false, inputKey, onFile }: {
  preview: string;
  empty: string;
  round?: boolean;
  wide?: boolean;
  required?: boolean;
  inputKey?: number;
  onFile: (file: File | null) => void;
}) {
  return (
    <label className={`flex shrink-0 cursor-pointer flex-col items-center gap-2 ${wide ? 'w-full' : ''}`}>
      <span className={`relative flex items-center justify-center overflow-hidden border border-dashed border-white/20 bg-[#0c1424] ${wide ? 'h-44 w-full rounded-2xl' : 'h-32 w-32'} ${round ? 'rounded-full' : ''} ${wide || round ? '' : 'rounded-3xl'}`}>
        {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <span className="px-4 text-center text-xs font-bold leading-snug text-white/45">{empty}</span>}
        <input
          key={inputKey}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          required={required}
          onChange={(event) => onFile(event.target.files?.[0] ?? null)}
        />
      </span>
      <span className="text-[11px] font-bold text-white/40">{preview ? 'Change picture' : 'Choose a picture'}</span>
    </label>
  );
}

function TeamAdmin({ onMessage, onError }: { onMessage: (text: string) => void; onError: (text: string) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const team = departments.find((item) => item.id === editing);
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">DEPARTMENTS</p>
      <h1 className="mt-1 text-3xl font-black">Teams</h1>
      <TeamEditor
        key={team?.id ?? 'new'}
        initial={team}
        onDone={(text) => {
          onMessage(text);
          if (!team) setEditing(null);
        }}
        onError={onError}
        onCancel={() => setEditing(null)}
      />
      <ul className="mt-6 space-y-2">
        {departments.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#10192b] px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-3 text-sm font-bold">
              <DepartmentMark id={item.id} name={item.name} shortName={item.shortName} color={item.color} size={36} src={item.crestUrl || undefined} />
              {item.coachPhotoUrl ? (
                <Portrait name={item.coach || 'Coach'} src={item.coachPhotoUrl} size={30} />
              ) : null}
              <span className="min-w-0">
                <span className="block truncate">{item.name}</span>
                <span className="block text-xs font-semibold text-white/35">Group {item.group}{item.coach ? ` · Coach: ${item.coach}` : ''}</span>
              </span>
            </span>
            <button type="button" onClick={() => setEditing(item.id)} className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-[#f5c518] hover:bg-white/10 transition">Edit</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeamEditor({ initial, onDone, onError, onCancel }: { initial?: (typeof departments)[number]; onDone: (text: string) => void; onError: (text: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [shortName, setShortName] = useState(initial?.shortName ?? '');
  const [group, setGroup] = useState<GroupId>(initial?.group ?? 'A');
  const [coach, setCoach] = useState(initial?.coach ?? '');
  const [pitch, setPitch] = useState(initial?.pitch ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial?.crestUrl ?? '');
  const [logoKey, setLogoKey] = useState(0);

  const [coachFile, setCoachFile] = useState<File | null>(null);
  const [coachPreview, setCoachPreview] = useState(initial?.coachPhotoUrl ?? '');
  const [coachPhotoKey, setCoachPhotoKey] = useState(0);

  const chooseLogo = (next: File | null) => {
    setFile(next);
    setPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return next ? URL.createObjectURL(next) : (initial?.crestUrl ?? '');
    });
  };

  const chooseCoachPhoto = (next: File | null) => {
    setCoachFile(next);
    setCoachPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return next ? URL.createObjectURL(next) : (initial?.coachPhotoUrl ?? '');
    });
  };

  return (
    <form className="mt-5 rounded-3xl border border-white/10 bg-[#10192b] p-5" onSubmit={async (event) => {
      event.preventDefault();
      try {
        if (!initial && !file) throw new Error('A team logo is required.');
        const image = file ? await imagePayload(file) : undefined;
        const coachImage = coachFile ? await imagePayload(coachFile) : undefined;
        await desk(initial ? `/api/teams/${initial.id}` : '/api/teams', {
          method: initial ? 'PATCH' : 'POST',
          body: {
            name,
            shortName,
            group,
            coach,
            pitch,
            college: initial?.college ?? '',
            color: initial?.color ?? '#2450c8',
            ...(image ? { image } : {}),
            ...(coachImage ? { coachImage } : {}),
          },
        });
        if (!initial) {
          setName('');
          setShortName('');
          setCoach('');
          setPitch('');
          setFile(null);
          setLogoKey((value) => value + 1);
          setPreview((current) => {
            if (current.startsWith('blob:')) URL.revokeObjectURL(current);
            return '';
          });
          setCoachFile(null);
          setCoachPhotoKey((value) => value + 1);
          setCoachPreview((current) => {
            if (current.startsWith('blob:')) URL.revokeObjectURL(current);
            return '';
          });
        }
        onDone(initial ? 'Team updated.' : 'Team created.');
      } catch (reason) {
        onError(reason instanceof Error ? reason.message : 'Could not save the team.');
      }
    }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">{initial ? 'EDIT TEAM' : 'NEW TEAM'}</p>
          <h2 className="mt-1 text-xl font-black">{initial ? initial.name : 'Add a department'}</h2>
        </div>
        {initial && <button type="button" onClick={onCancel} className="text-sm font-bold text-white/45">Cancel</button>}
      </div>
      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex flex-wrap gap-4 sm:flex-nowrap">
          <PicturePicker preview={preview} empty="Team logo" required={!initial} inputKey={logoKey} onFile={chooseLogo} />
          <PicturePicker preview={coachPreview} empty="Coach photo" round inputKey={coachPhotoKey} onFile={chooseCoachPhoto} />
        </div>
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <Field label="Department name" value={name} onChange={setName} placeholder="Computer Science" required />
          <Field label="Short name" value={shortName} onChange={setShortName} placeholder="CS" required maxLength={8} />
          <Field label="Coach" value={coach} onChange={setCoach} placeholder="Coach name" />
          <Field label="Pitch" value={pitch} onChange={setPitch} placeholder="Campus pitch" />
          <div className="sm:col-span-2">
            <ChoiceRow label="Group" value={group} options={['A', 'B', 'C', 'D', 'E']} onChange={(value) => setGroup(value as GroupId)} />
          </div>
        </div>
      </div>
      <button type="submit" className="mt-5 w-full rounded-xl bg-[#f5c518] px-4 py-3 text-sm font-black text-[#102018] sm:w-auto">{initial ? 'Save team' : 'Create team'}</button>
    </form>
  );
}

function PlayerAdmin({ onMessage, onError }: { onMessage: (text: string) => void; onError: (text: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [positionFilter, setPositionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const formRef = useRef<HTMLDivElement | null>(null);

  const editingPlayer = players.find((p) => p.id === editingId);

  const filteredPlayers = players.filter((player) => {
    if (player.registered === false) return false;
    if (teamFilter !== 'ALL' && player.departmentId !== teamFilter) return false;
    if (positionFilter !== 'ALL' && player.position !== positionFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = player.name.toLowerCase().includes(q);
      const matchNumber = String(player.number).includes(q);
      const dept = getDepartment(player.departmentId);
      const matchDept = (dept?.name || '').toLowerCase().includes(q) || (dept?.shortName || '').toLowerCase().includes(q);
      if (!matchName && !matchNumber && !matchDept) return false;
    }
    return true;
  });

  const playersByDepartment = useMemo(() => {
    const map = new Map<string, Player[]>();
    for (const player of filteredPlayers) {
      const list = map.get(player.departmentId) || [];
      list.push(player);
      map.set(player.departmentId, list);
    }
    return Array.from(map.entries())
      .map(([deptId, deptPlayers]) => ({
        dept: getDepartment(deptId),
        deptId,
        players: deptPlayers.sort((a, b) => a.number - b.number),
      }))
      .sort((a, b) => (a.dept?.name || a.deptId).localeCompare(b.dept?.name || b.deptId));
  }, [filteredPlayers]);

  const handleStartEdit = (player: Player) => {
    setEditingId(player.id);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div ref={formRef}>
        <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">SQUADS & ROSTERS</p>
        <h1 className="mt-1 text-3xl font-black">Players</h1>
        <PlayerEditor
          key={editingPlayer?.id ?? 'new'}
          initial={editingPlayer}
          defaultTeamId={teamFilter !== 'ALL' ? teamFilter : undefined}
          onDone={(text) => {
            setEditingId(null);
            onMessage(text);
          }}
          onError={onError}
          onCancel={handleCancelEdit}
        />
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Registered Squad</h2>
            <p className="text-xs text-white/45">
              Showing {filteredPlayers.length} of {players.filter((p) => p.registered !== false).length} players · Grouped by Department
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by department"
              className="rounded-xl border border-white/10 bg-[#0c1424] px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#f5c518]"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.shortName} · {d.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by position"
              className="rounded-xl border border-white/10 bg-[#0c1424] px-3 py-2 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-[#f5c518]"
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
            >
              <option value="ALL">All Positions</option>
              <option value="GK">Goalkeepers (GK)</option>
              <option value="DEF">Defenders (DEF)</option>
              <option value="MID">Midfielders (MID)</option>
              <option value="FWD">Forwards (FWD)</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <input
            className={`${inputClass} mt-0 pl-9`}
            placeholder="Search by player name, shirt #, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        </div>

        <div className="mt-4 space-y-6">
          {playersByDepartment.map(({ dept, deptId, players: deptPlayers }) => (
            <div key={deptId} className="rounded-2xl border border-white/10 bg-[#0c1424] p-4">
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <DepartmentMark
                    id={deptId}
                    name={dept?.name}
                    shortName={dept?.shortName ?? deptId}
                    color={dept?.color ?? '#2450c8'}
                    size={34}
                    src={dept?.crestUrl}
                  />
                  <div>
                    <h3 className="font-black text-white text-base">
                      {dept?.name ?? deptId}
                    </h3>
                    <p className="text-[11px] font-semibold text-white/40">
                      Group {dept?.group ?? '—'} · {deptPlayers.length} player{deptPlayers.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs font-bold text-[#f5c518]">
                  {deptPlayers.length}
                </span>
              </div>

              <ul className="space-y-2">
                {deptPlayers.map((player) => {
                  const isEditing = editingId === player.id;
                  return (
                    <li
                      key={player.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-[#10192b] px-3.5 py-2.5 transition-all ${
                        isEditing
                          ? 'border-[#f5c518] ring-1 ring-[#f5c518]/50 shadow-lg'
                          : 'border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Portrait name={player.name} src={player.photoUrl || undefined} size={38} id={player.id} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/10 text-[11px] font-black text-[#f5c518]">
                              {player.number}
                            </span>
                            <span className="truncate font-bold text-white text-sm">
                              {player.name}
                            </span>
                            {player.isCaptain && (
                              <span className="rounded-md border border-[#f5c518]/40 bg-[#f5c518]/20 px-1.5 py-0.5 text-[10px] font-black text-[#f5c518] tracking-wider">
                                CAPTAIN
                              </span>
                            )}
                            <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
                              {player.position}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                            <span>
                              {player.goals}G {player.assists}A {player.ownGoals ? `${player.ownGoals}OG ` : ''}{player.yellowCards ?? 0}Y {player.redCards ?? 0}R · {player.appearances ?? 0} apps
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(player)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                            isEditing
                              ? 'bg-[#f5c518] text-[#102018]'
                              : 'bg-white/10 text-white hover:bg-[#f5c518] hover:text-[#102018]'
                          }`}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          {isEditing ? 'Editing' : 'Edit'}
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Delete or deactivate player "${player.name}" (#${player.number})?`)) return;
                            try {
                              await desk(`/api/players/${player.id}`, { method: 'DELETE', body: {} });
                              if (editingId === player.id) setEditingId(null);
                              onMessage(`Player "${player.name}" removed.`);
                            } catch (reason) {
                              onError(reason instanceof Error ? reason.message : 'Could not delete the player.');
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-white/5 p-1.5 text-xs font-bold text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
                          title="Delete player"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {!filteredPlayers.length && (
            <div className="rounded-2xl border border-white/10 px-4 py-10 text-center text-sm text-white/40">
              No players found matching your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlayerEditor({
  initial,
  defaultTeamId,
  onDone,
  onError,
  onCancel,
}: {
  initial?: Player;
  defaultTeamId?: string;
  onDone: (text: string) => void;
  onError: (text: string) => void;
  onCancel: () => void;
}) {
  const [teamId, setTeamId] = useState(initial?.departmentId ?? defaultTeamId ?? departments[0]?.id ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [position, setPosition] = useState(initial?.position ?? 'MID');
  const [number, setNumber] = useState(initial ? String(initial.number) : '');
  const [isCaptain, setIsCaptain] = useState(Boolean(initial?.isCaptain));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initial?.photoUrl ?? '');
  const [photoKey, setPhotoKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentCaptain = players.find((p) => p.departmentId === teamId && p.isCaptain && p.id !== initial?.id);

  const choosePhoto = (next: File | null) => {
    setFile(next);
    setPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return next ? URL.createObjectURL(next) : (initial?.photoUrl ?? '');
    });
  };

  return (
    <form
      className="mt-5 rounded-3xl border border-white/10 bg-[#10192b] p-5 shadow-lg"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          setIsSubmitting(true);
          const image = file ? await imagePayload(file) : undefined;
          await desk(initial ? `/api/players/${initial.id}` : '/api/players', {
            method: initial ? 'PATCH' : 'POST',
            body: {
              name: name.trim(),
              teamId,
              position,
              number: Number(number),
              isCaptain,
              ...(image ? { image } : {}),
            },
          });

          if (!initial) {
            setName('');
            setNumber('');
            setIsCaptain(false);
            setFile(null);
            setPhotoKey((k) => k + 1);
            setPreview('');
          }
          onDone(initial ? `Player "${name.trim()}" updated.` : `Player "${name.trim()}" registered.`);
        } catch (reason) {
          onError(reason instanceof Error ? reason.message : 'Could not save the player.');
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">
            {initial ? 'EDIT PLAYER' : 'NEW PLAYER'}
          </p>
          <h2 className="mt-1 text-xl font-black text-white">
            {initial ? `Edit ${initial.name}` : 'Register a player'}
          </h2>
        </div>
        {initial && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/20 hover:text-white transition"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <PicturePicker
          preview={preview}
          empty={initial ? 'Change photo' : 'Player photo (optional)'}
          round
          inputKey={photoKey}
          onFile={choosePhoto}
        />
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Select
              label="Team"
              value={teamId}
              onChange={setTeamId}
              options={departments.map((team) => ({
                id: team.id,
                label: `${team.shortName} · ${team.name} (Group ${team.group})`,
              }))}
            />
          </div>
          <Field
            label="Player name"
            value={name}
            onChange={setName}
            placeholder="Full name"
            required
          />
          <Field
            label="Shirt number"
            value={number}
            onChange={setNumber}
            placeholder="10"
            required
            inputMode="numeric"
          />
          <div className="sm:col-span-2">
            <ChoiceRow
              label="Position"
              value={position}
              options={['GK', 'DEF', 'MID', 'FWD']}
              onChange={setPosition}
            />
          </div>
          <div className="sm:col-span-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">Assign Captain</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCaptain(false)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-black transition ${
                  !isCaptain
                    ? 'bg-[#f5c518] text-[#102018]'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                No (Squad Player)
              </button>
              <button
                type="button"
                onClick={() => setIsCaptain(true)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition ${
                  isCaptain
                    ? 'bg-[#f5c518] text-[#102018] shadow-md shadow-[#f5c518]/20'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                <span>© Yes (Team Captain)</span>
              </button>
            </div>
            {isCaptain ? (
              <p className="mt-1.5 text-[11px] text-[#f5c518]">
                ★ This player will be assigned as the team captain.
                {currentCaptain ? ` (Replaces current captain: ${currentCaptain.name} #${currentCaptain.number})` : ''}
              </p>
            ) : currentCaptain ? (
              <p className="mt-1.5 text-[11px] text-white/40">
                Current team captain: <span className="font-semibold text-white/60">{currentCaptain.name} (#{currentCaptain.number})</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-[#f5c518] px-5 py-3 text-sm font-black text-[#102018] transition hover:bg-[#ffe27a] disabled:opacity-40 sm:w-auto"
        >
          {isSubmitting ? 'Saving...' : initial ? 'Save changes' : 'Add player'}
        </button>
        {initial && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/5 transition"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function NewsAdmin({ onMessage, onError }: { onMessage: (text: string) => void; onError: (text: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('News');
  const [timeLabel, setTimeLabel] = useState('Today');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [photoKey, setPhotoKey] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const choosePhoto = (next: File | null) => {
    setFile(next);
    setPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return next ? URL.createObjectURL(next) : '';
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('News');
    setTimeLabel('Today');
    setSummary('');
    setBody('');
    setFile(null);
    setPhotoKey((value) => value + 1);
    setPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return '';
    });
    setIsPreviewMode(false);
  };

  const handleEdit = (article: typeof newsArticles[number]) => {
    setEditingId(article.id);
    setTitle(article.title || '');
    setCategory(article.category || 'News');
    setTimeLabel(article.time || 'Today');
    setSummary(article.summary || '');
    setBody(article.body || '');
    setFile(null);
    setPreview(article.imageUrl || '');
    setIsPreviewMode(false);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      onError('Please enter a headline for the story.');
      return;
    }
    if (!summary.trim()) {
      onError('Please enter a summary for the news list.');
      return;
    }
    if (!body.trim()) {
      onError('Please write the story content in the rich text editor.');
      return;
    }

    setIsSubmitting(true);
    try {
      const image = file ? await imagePayload(file) : undefined;
      const payload = {
        title: title.trim(),
        summary: summary.trim(),
        body: body.trim(),
        category: category.trim() || 'News',
        time: timeLabel.trim() || 'Today',
        ...(image ? { image } : {}),
      };

      if (editingId) {
        await desk(`/api/news/${editingId}`, {
          method: 'PATCH',
          body: payload,
        });
        onMessage('Story updated successfully.');
      } else {
        await desk('/api/news', {
          body: payload,
        });
        onMessage('Story published successfully.');
      }

      resetForm();
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Could not save the story.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const CATEGORY_PRESETS = ['News', 'Match report', 'Fixtures', 'Announcement', 'Discipline', 'Standings'];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">STORIES</p>
          <h1 className="mt-1 text-3xl font-black">News</h1>
        </div>
        {editingId && (
          <button
            type="button"
            onClick={resetForm}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Plus className="h-3.5 w-3.5" />
            New story
          </button>
        )}
      </div>

      {/* PUBLISH / EDIT FORM */}
      <form
        ref={formRef}
        className={`mt-5 rounded-3xl border bg-[#10192b] p-5 transition-all ${editingId ? 'border-[#f5c518]/40 shadow-lg shadow-[#f5c518]/5' : 'border-white/10'
          }`}
        onSubmit={handleSubmit}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">
              {editingId ? 'EDITING STORY' : 'NEW STORY'}
            </p>
            <h2 className="mt-1 text-xl font-black">
              {editingId ? 'Edit news article' : 'Publish a story'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${isPreviewMode
                  ? 'border-[#f5c518] bg-[#f5c518] text-[#102018]'
                  : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white'
                }`}
            >
              {isPreviewMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {isPreviewMode ? 'Editor' : 'Live Preview'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                title="Cancel editing"
                className="rounded-xl border border-white/10 bg-white/5 p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* PREVIEW MODE */}
        {isPreviewMode ? (
          <div className="mt-5 space-y-4 rounded-2xl border border-white/10 bg-[#070d18] p-5">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-[#f5c518] px-2 py-0.5 text-[11px] font-bold text-[#102018]">
                {category || 'News'}
              </span>
              <span className="text-white/40">{timeLabel || 'Today'}</span>
            </div>
            <h1 className="text-2xl font-black text-white">{title || 'Story headline will appear here'}</h1>
            {preview && (
              <img src={preview} alt="" className="h-56 w-full rounded-2xl object-cover" />
            )}
            <p className="text-sm font-semibold text-white/60 italic">{summary || 'Summary line'}</p>
            <div className="border-t border-white/10 pt-4">
              <RichTextContent content={body || '<p>Start writing in the editor to see your story preview.</p>'} />
            </div>
          </div>
        ) : (
          /* EDITING FORM FIELDS */
          <div className="mt-5 grid gap-4">
            <PicturePicker
              preview={preview}
              empty={editingId ? 'Change photo (optional)' : 'Story photo'}
              wide
              inputKey={photoKey}
              onFile={choosePhoto}
            />

            <Field
              label="Title"
              value={title}
              onChange={setTitle}
              placeholder="Headline"
              required
            />

            {/* Category Presets & Custom Input */}
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-white/40">
                Category
              </label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {CATEGORY_PRESETS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${category.toLowerCase() === cat.toLowerCase()
                        ? 'bg-[#f5c518] text-[#102018]'
                        : 'border border-white/10 bg-white/5 text-white/70 hover:border-white/25 hover:text-white'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <input
                type="text"
                className={inputClass}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (e.g. Match report, Fixtures, Announcement)"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label="Time label"
                value={timeLabel}
                onChange={setTimeLabel}
                placeholder="e.g. Today, Matchday 2, This week"
              />
              <Field
                label="Summary"
                value={summary}
                onChange={setSummary}
                placeholder="One line for the news list preview"
                required
              />
            </div>

            {/* RICH TEXT EDITOR */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">
                  Story Content (Rich Text)
                </label>
                <span className="text-[10px] text-[#f5c518]/70">
                  Format headings, bullet lists, bold text, links & match announcements
                </span>
              </div>
              <RichTextEditor
                content={body}
                onChange={setBody}
                placeholder="Write the full story... You can paste formatted text from Word, Google Docs or websites, add headings, match fixture lineups, and lists."
                minHeight="240px"
                disabled={isSubmitting}
              />
            </div>
          </div>
        )}

        {/* SUBMIT ACTIONS */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#f5c518] px-6 py-3 text-sm font-black text-[#102018] shadow-md transition-all hover:bg-[#ffd644] active:scale-95 disabled:opacity-50 sm:w-auto"
          >
            {isSubmitting
              ? editingId
                ? 'Updating...'
                : 'Publishing...'
              : editingId
                ? 'Update story'
                : 'Publish story'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white sm:w-auto"
            >
              Cancel editing
            </button>
          )}
        </div>
      </form>

      {/* EXISTING STORIES LIST */}
      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Published Stories ({newsArticles.length})</h2>
          <span className="text-xs text-white/40">Click Edit to modify formatting</span>
        </div>
        <ul className="space-y-3">
          {newsArticles.map((article) => {
            const isEditing = editingId === article.id;
            return (
              <li
                key={article.id}
                className={`overflow-hidden rounded-2xl border bg-[#10192b] transition-all ${isEditing
                    ? 'border-[#f5c518] ring-1 ring-[#f5c518]/40 shadow-md'
                    : 'border-white/10 hover:border-white/20'
                  }`}
              >
                {article.imageUrl && <img src={article.imageUrl} alt="" className="h-36 w-full object-cover" />}
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#f5c518]/15 border border-[#f5c518]/30 px-2 py-0.5 text-[10px] font-bold text-[#f5c518]">
                        {article.category}
                      </span>
                      <span className="text-xs text-white/40">{article.time}</span>
                    </div>
                    <span className="mt-1 block truncate text-base font-bold text-white">{stripHtml(article.title)}</span>
                    <p className="mt-0.5 line-clamp-1 text-xs text-white/50">{stripHtml(article.summary)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleEdit(article)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${isEditing
                          ? 'bg-[#f5c518] text-[#102018]'
                          : 'bg-white/10 text-white hover:bg-[#f5c518] hover:text-[#102018]'
                        }`}
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      {isEditing ? 'Editing' : 'Edit'}
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200"
                      onClick={async () => {
                        if (!window.confirm(`Delete story "${article.title}"?`)) return;
                        try {
                          await desk(`/api/news/${article.id}`, { method: 'DELETE', body: {} });
                          if (editingId === article.id) resetForm();
                          onMessage('Story removed.');
                        } catch (reason) {
                          onError(reason instanceof Error ? reason.message : 'Could not remove the story.');
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
          {!newsArticles.length && (
            <li className="rounded-2xl border border-white/10 px-4 py-8 text-center text-sm text-white/40">
              No stories published yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

function UserAdmin({ role, onMessage, onError }: { role: Role; onMessage: (text: string) => void; onError: (text: string) => void }) {
  const [users, setUsers] = useState<Array<{ id: string; username: string; role: string }>>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nextRole, setNextRole] = useState<Role>('match_admin');

  useEffect(() => {
    if (role !== 'super_admin') return;
    desk('/api/users').then((data) => setUsers(data.users)).catch((reason) => onError(reason.message));
  }, [role, onError]);

  if (role !== 'super_admin') return <p className="text-sm text-white/50">Only a super admin can manage accounts.</p>;

  const roleOptions: { id: string; label: string }[] = [
    { id: 'match_admin', label: 'Match Admin (Matches & News only)' },
    { id: 'super_admin', label: 'Super Admin (Full access)' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-black">Users</h1>
      <p className="mt-1 text-sm text-white/45">Create and manage admin and match official accounts.</p>
      <form
        className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-[#10192b] p-4 sm:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault();
          try {
            await desk('/api/users', { body: { username, password, role: nextRole } });
            const data = await desk('/api/users');
            setUsers(data.users);
            setUsername('');
            setPassword('');
            onMessage('Account created successfully.');
          } catch (reason) {
            onError(reason instanceof Error ? reason.message : 'Could not create the account.');
          }
        }}
      >
        <label className="text-xs font-bold text-white/45">
          Username
          <input className={inputClass} value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label className="text-xs font-bold text-white/45">
          Password
          <input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <div className="sm:col-span-2">
          <Select
            label="Role"
            value={nextRole}
            onChange={(value) => setNextRole(value as Role)}
            options={roleOptions}
          />
          {nextRole === 'match_admin' && (
            <p className="mt-1.5 text-xs text-[#f5c518]">
              ℹ Match Admins have access restricted strictly to the <strong>Matches</strong> and <strong>News</strong> tabs.
            </p>
          )}
        </div>
        <button type="submit" className="self-end rounded-xl bg-[#f5c518] px-4 py-2 text-sm font-black text-[#102018] sm:col-span-2 sm:w-fit">
          Create Account
        </button>
      </form>
      <ul className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10">
        {users.map((account) => (
          <li key={account.id} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="font-semibold">{account.username}</span>
            <span className="text-white/40">
              {account.role === 'match_admin' ? 'Match Admin (Matches & News only)' : account.role.replaceAll('_', ' ')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuditList() {
  const [rows, setRows] = useState<Array<{ id: number; actor_name: string; action: string; entity: string; entity_id: string; created_at: number }>>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    desk('/api/audit').then((data) => setRows(data.audit)).catch((reason) => setError(reason.message));
  }, []);
  return (
    <div>
      <h1 className="text-3xl font-black">Audit</h1>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      <ul className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10">
        {rows.map((row) => (
          <li key={row.id} className="px-3 py-2 text-sm">
            <span className="font-bold">{row.action}</span>
            <span className="text-white/45"> · {row.actor_name} · {row.entity} {row.entity_id} · {new Date(row.created_at).toLocaleString()}</span>
          </li>
        ))}
        {!rows.length && !error && <li className="px-3 py-6 text-sm text-white/40">No audit entries yet.</li>}
      </ul>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ id: string; label: string }> }) {
  return (
    <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">{label}
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option.id || 'none'} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function labelOf(id: string) {
  return getDepartment(id)?.shortName ?? id;
}

function playerName(id: string) {
  const player = players.find((item) => item.id === id);
  return player ? `${player.number} ${player.name}` : id;
}

function MotmManager({
  fixture,
  disabled,
  onSave,
  onRemove,
}: {
  fixture: (typeof fixtures)[number];
  disabled: boolean;
  onSave: (body: { playerId: string; photoUrl?: string | null; image?: { contentType: string; data: string } }) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(fixture.motmPlayerId || '');
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(fixture.motmPhotoUrl || '');
  const [previewUrl, setPreviewUrl] = useState(fixture.motmPhotoUrl || '');
  const [pendingPayload, setPendingPayload] = useState<{ contentType: string; data: string } | null>(null);
  const [fileError, setFileError] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedPlayerId(fixture.motmPlayerId || '');
    setCurrentPhotoUrl(fixture.motmPhotoUrl || '');
    if (!pendingPayload) {
      setPreviewUrl(fixture.motmPhotoUrl || '');
    }
  }, [fixture.motmPlayerId, fixture.motmPhotoUrl]);

  const homeDept = getDepartment(fixture.homeId);
  const awayDept = getDepartment(fixture.awayId);

  const homePlayers = players
    .filter((p) => p.departmentId === fixture.homeId && p.registered !== false && p.active !== false)
    .sort((a, b) => a.number - b.number);

  const awayPlayers = players
    .filter((p) => p.departmentId === fixture.awayId && p.registered !== false && p.active !== false)
    .sort((a, b) => a.number - b.number);

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFileError('Please select a JPG, JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5_000_000) {
      setFileError('The image must be smaller than 5 MB.');
      return;
    }

    try {
      const payload = await imagePayload(file);
      setPendingPayload(payload);
      setPreviewUrl(`data:${payload.contentType};base64,${payload.data}`);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Could not read image.');
    }
  };

  const handleRemovePhoto = () => {
    setPendingPayload(null);
    setPreviewUrl('');
    setCurrentPhotoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    if (!selectedPlayerId) {
      setFileError('Please select a player.');
      return;
    }
    if (!previewUrl && !pendingPayload) {
      setFileError('A photograph of the player is required.');
      return;
    }
    onSave({
      playerId: selectedPlayerId,
      photoUrl: pendingPayload ? undefined : currentPhotoUrl,
      image: pendingPayload || undefined,
    });
  };

  const isPublished = Boolean(fixture.motmPlayerId && fixture.motmPhotoUrl);

  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-[#10192b] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-lg font-black tracking-wide text-white flex items-center gap-2">
            <span className="text-[#f5c518]">★</span> Man of the Match Award
          </h2>
          <p className="mt-0.5 text-xs text-white/50">
            Select the official award winner and upload their photograph.
          </p>
        </div>
        {isPublished ? (
          <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-400">
            ✓ Published to Highlights
          </span>
        ) : (
          <span className="rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs font-bold text-white/50">
            Not Published
          </span>
        )}
      </div>

      <div className="mt-5 space-y-4">
        {/* Player Selector */}
        <div>
          <label className="block text-xs font-bold tracking-wider text-white/70 uppercase">
            Select Award Winner
          </label>
          <select
            value={selectedPlayerId}
            onChange={(e) => setSelectedPlayerId(e.target.value)}
            disabled={disabled}
            className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#070d18] px-3.5 py-2.5 text-sm font-semibold text-white outline-none focus:border-[#f5c518]"
          >
            <option value="">-- Choose Man of the Match --</option>
            <optgroup label={`${homeDept?.name || 'Home'} (${homeDept?.shortName})`}>
              {homePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.number} · {p.name} ({p.position})
                </option>
              ))}
            </optgroup>
            <optgroup label={`${awayDept?.name || 'Away'} (${awayDept?.shortName})`}>
              {awayPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.number} · {p.name} ({p.position})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Photograph Upload & Preview */}
        <div>
          <label className="block text-xs font-bold tracking-wider text-white/70 uppercase">
            Player Photograph
          </label>

          <div className="mt-2 flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-white/10 bg-[#070d18] p-4">
            {/* Preview Frame */}
            <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-[#f5c518]/40 bg-[#10192b]">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center p-2 text-white/30 text-xs font-bold">
                  No photo
                </div>
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-1 text-center sm:text-left">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={disabled}
                className="hidden"
                id="motm-photo-input"
              />
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className="rounded-xl border border-white/20 bg-white/5 px-3.5 py-2 text-xs font-bold text-white transition-colors hover:border-[#f5c518] hover:bg-[#f5c518]/10"
                >
                  {previewUrl ? 'Replace Photograph' : 'Choose Photograph'}
                </button>
                {selectedPlayer?.photoUrl && previewUrl !== selectedPlayer.photoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingPayload(null);
                      setPreviewUrl(selectedPlayer.photoUrl);
                      setCurrentPhotoUrl(selectedPlayer.photoUrl);
                      setFileError('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    disabled={disabled}
                    className="rounded-xl border border-[#f5c518]/30 bg-[#f5c518]/10 px-3.5 py-2 text-xs font-bold text-[#f5c518] transition-colors hover:bg-[#f5c518]/20"
                  >
                    Use Profile Photo
                  </button>
                )}
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={disabled}
                    className="rounded-xl border border-red-500/30 px-3.5 py-2 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <p className="mt-2 text-[11px] text-white/40">
                Supports JPG, JPEG, PNG, and WebP (Max 1.5 MB). Preview appears before saving.
              </p>
              {fileError && <p className="mt-1 text-xs font-semibold text-red-400">{fileError}</p>}
            </div>
          </div>
        </div>

        {/* Selected Player Summary Preview */}
        {selectedPlayer && (
          <div className="rounded-xl border border-[#f5c518]/20 bg-[#f5c518]/5 p-3 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-[#f5c518]">Selected: </span>
              <span className="font-black text-white">{selectedPlayer.name}</span>
              <span className="text-white/60"> (#{selectedPlayer.number} · {selectedPlayer.position})</span>
            </div>
            <span className="text-white/40 font-semibold">
              {selectedPlayer.departmentId === fixture.homeId ? homeDept?.shortName : awayDept?.shortName}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={disabled || !selectedPlayerId || !previewUrl}
            className="rounded-xl bg-[#f5c518] px-5 py-2.5 text-xs sm:text-sm font-black text-[#102018] shadow-md transition-all hover:bg-[#e5b512] disabled:opacity-40"
          >
            Save & Publish Award
          </button>

          {isPublished && (
            <div>
              {confirmRemove ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-300">Remove and hide from homepage?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmRemove(false);
                      onRemove();
                    }}
                    disabled={disabled}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                  >
                    Yes, Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRemove(false)}
                    className="text-xs text-white/50 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmRemove(true)}
                  disabled={disabled}
                  className="rounded-xl border border-red-500/30 px-3.5 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10"
                >
                  Remove Selection
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
