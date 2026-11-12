import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { Eye, EyeOff, Edit3, Plus, X, Trash2, Search, ExternalLink, LogOut, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { desk, imagePayload } from '../../data/api';
import { useLeagueVersion } from '../../data/live';
import { newsArticles } from '../../data/news';
import { useMatchClock } from '../useMatchClock';
import { DepartmentMark, Portrait } from '../components/DepartmentMark';
import { MatchLoading } from '../components/Layout';
import { RichTextEditor } from '../components/RichTextEditor';
import { RichTextContent } from '../components/RichTextContent';
import { NewsImageSlider, getArticleImages } from '../components/NewsImageSlider';
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
  getPlayerSuspension,
  type GroupId,
  type Player,
} from '../../data/supercup';
import { formationPlan, seatPlayers, FORMATIONS, FORMATION_GROUPS, isValidFormation } from '../../data/formation';
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
                className={`flex shrink-0 items-center rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${section === item.id ? 'bg-[#f5c518] text-[#102018]' : 'text-white/60 hover:bg-white/5 hover:text-white'
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
        {section === 'matches' && !matchId && <MatchList role={user.role} version={version} onOpen={openMatch} onMessage={setNotice} onError={setError} />}
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

function MatchList({ role, version, onOpen, onMessage, onError }: { role?: Role; version: number; onOpen: (id: string) => void; onMessage: (text: string) => void; onError: (text: string) => void }) {
  void version;
  const canSchedule = role !== 'match_admin';
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const rows = fixtures.filter((fixture) => {
    if (role === 'match_admin' && fixture.confirmed) return false;
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
      <p className="mt-1 text-sm text-white/45">
        {canSchedule
          ? 'Nothing is placed on the calendar until you schedule it here.'
          : 'Select any match below to manage its clock, lineup, and match events.'}
      </p>
      {canSchedule && (
        <>
          <MatchForm onDone={onMessage} onError={onError} />
          <GroupRoundForm onDone={onMessage} onError={onError} />
        </>
      )}
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
            <li key={fixture.id} className="group relative flex items-center gap-2">
              <button type="button" onClick={() => onOpen(fixture.id)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#10192b] px-3 py-3 text-left hover:border-white/20 transition-all">
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
              {role === 'super_admin' && (
                <button
                  type="button"
                  title="Delete match"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (!window.confirm(`Delete match "${labelOf(fixture.homeId)} vs ${labelOf(fixture.awayId)}"? All lineups and events will be deleted.`)) return;
                    try {
                      await desk(`/api/matches/${fixture.id}`, { method: 'DELETE', body: {} });
                      onMessage('Match deleted successfully.');
                    } catch (err) {
                      onError(err instanceof Error ? err.message : 'Could not delete match.');
                    }
                  }}
                  className="hidden group-hover:flex sm:flex items-center justify-center h-10 w-10 rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/25 hover:border-red-500/40 transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
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
  const [streamer, setStreamer] = useState('');
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
              streamer,
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
          <Field label="Live Streamer" value={streamer} onChange={setStreamer} placeholder="Optional" />
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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [voidingEvent, setVoidingEvent] = useState<{ id: number; line: string; isGoal: boolean } | null>(null);
  const [voidReason, setVoidReason] = useState('Incorrect entry');
  const [disallowGoal, setDisallowGoal] = useState(true);
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
  if (role === 'match_admin' && fixture.confirmed) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-[#10192b] p-6 text-center">
        <p className="text-sm font-semibold text-white/70">This match is already confirmed and closed. Confirmed matches are not accessible to match admins.</p>
        <button type="button" onClick={onClose} className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15">
          ← Back to matches
        </button>
      </div>
    );
  }
  const home = getDepartment(fixture.homeId);
  const away = getDepartment(fixture.awayId);
  const allMatchEvents = matchEvents.filter((event) => event.matchId === id);
  const events = allMatchEvents.filter((event) => !event.voided);
  const voidedEvents = allMatchEvents.filter((event) => event.voided);
  const canCorrect = role === 'super_admin' || role === 'competition_manager' || role === 'match_admin';
  const canRun = role === 'super_admin' || role === 'match_admin' || role === 'competition_manager';
  const finished = fixture.detail === 'finished';
  const live = fixture.status === 'live' || fixture.detail === 'suspended';
  const deskTabs: { id: DeskTab; label: string }[] = [
    { id: 'clock', label: 'Clock' },
    { id: 'events', label: 'Events' },
  ];
  if (finished) deskTabs.push({ id: 'motm', label: 'Man of the Match' });
  deskTabs.push({ id: 'lineup', label: live ? 'Bench / Lineup' : 'Lineup' });
  deskTabs.push({ id: 'fixture', label: 'Fixture' });
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
      setEditingEventId(null);
      setVoidingEvent(null);
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : 'Could not update the match.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onClose} className="text-sm font-semibold text-white/50 hover:text-white transition-colors">← All matches</button>
        {role === 'super_admin' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Match</span>
          </button>
        )}
      </div>
      {deleteConfirm && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
          <div>
            <p className="text-sm font-bold text-red-200">Delete this match permanently?</p>
            <p className="text-xs text-red-300/70">All lineups, goals, cards, and events recorded for this match will be deleted. This cannot be undone.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await desk(`/api/matches/${id}`, { method: 'DELETE', body: {} });
                  onMessage('Match deleted successfully.');
                  onClose();
                } catch (reason) {
                  onError(reason instanceof Error ? reason.message : 'Could not delete match.');
                  setDeleteConfirm(false);
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-40"
            >
              Permanently Delete
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setDeleteConfirm(false)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-white/60 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
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
        <p className="mt-3 text-center text-xs text-white/35">{fixture.stage && fixture.stage !== 'group' ? `${stageLabel(fixture.stage)} · Tie ${fixture.slot}` : `Group ${fixture.group} · MD${fixture.matchday}`} · {fixture.stadium} · {fixture.date} {fixture.time}{fixture.referee ? ` · Ref ${fixture.referee}` : ''}{fixture.assistant1 ? ` · AR1 ${fixture.assistant1}` : ''}{fixture.assistant2 ? ` · AR2 ${fixture.assistant2}` : ''}{fixture.fourthReferee ? ` · 4th Ref ${fixture.fourthReferee}` : ''}{fixture.streamer ? ` · Streamer: ${fixture.streamer}` : ''}{fixture.confirmed ? ' · Confirmed' : ''}</p>
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

      {activeTab === 'lineup' && <LineupEditor matchId={id} role={role} isLive={live} disabled={busy || !canRun} onSave={(body) => act(`/api/matches/${id}/lineup`, body)} />}
      {activeTab === 'fixture' && (
        <FixtureMeta
          fixture={fixture}
          disabled={busy || !canRun}
          onSave={(body) => act(`/api/matches/${id}`, body, 'PATCH')}
        />
      )}
      {activeTab === 'events' && canRun && (!fixture.confirmed || canCorrect) && (
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

      {activeTab === 'events' && (
        <section className="mt-4 rounded-2xl border border-white/10 bg-[#10192b] p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-white">Event history</h2>
            <span className="text-xs text-white/40">{events.length} active event{events.length === 1 ? '' : 's'}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {events.filter(shownEvent).map((event) => (
              <li key={event.id} className="border-t border-white/5 py-2.5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-white/90">{historyLine(event)}</span>
                  {(!fixture.confirmed || canCorrect) && (
                    <span className="flex items-center gap-3">
                      {canCorrect && (event.type === 'goal' || event.type === 'card' || event.type === 'substitution') && (
                        <button
                          type="button"
                          className="text-xs font-bold text-[#f5c518] hover:underline"
                          onClick={() => setEditingEventId(editingEventId === event.id ? null : event.id)}
                        >
                          {editingEventId === event.id ? 'Close' : 'Correct'}
                        </button>
                      )}
                      {canRun && (
                        <button
                          type="button"
                          className="text-xs font-bold text-red-400 hover:text-red-300 hover:underline"
                          onClick={() => {
                            setVoidReason('Incorrect entry');
                            setDisallowGoal(true);
                            setVoidingEvent({ id: event.id, line: historyLine(event), isGoal: event.type === 'goal' });
                          }}
                        >
                          Void
                        </button>
                      )}
                    </span>
                  )}
                </div>
                {(!fixture.confirmed || canCorrect) && editingEventId === event.id && event.type === 'goal' && (
                  <GoalCorrect
                    event={event}
                    matchId={id}
                    disabled={busy}
                    onSave={(body) => act(`/api/matches/${id}/events/${event.id}`, body, 'PATCH')}
                    onCancel={() => setEditingEventId(null)}
                  />
                )}
                {(!fixture.confirmed || canCorrect) && editingEventId === event.id && event.type === 'card' && (
                  <CardCorrect
                    event={event}
                    matchId={id}
                    disabled={busy}
                    onSave={(body) => act(`/api/matches/${id}/events/${event.id}`, body, 'PATCH')}
                    onCancel={() => setEditingEventId(null)}
                  />
                )}
                {(!fixture.confirmed || canCorrect) && editingEventId === event.id && event.type === 'substitution' && (
                  <SubCorrect
                    event={event}
                    matchId={id}
                    disabled={busy}
                    onSave={(body) => act(`/api/matches/${id}/events/${event.id}`, body, 'PATCH')}
                    onCancel={() => setEditingEventId(null)}
                  />
                )}
              </li>
            ))}
            {!events.some(shownEvent) && <li className="text-sm text-white/40">No goals, cards, or substitutions yet.</li>}
          </ul>

          {voidedEvents.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400/80">Voided records ({voidedEvents.length})</h3>
              <ul className="mt-2 space-y-1.5">
                {voidedEvents.map((event) => (
                  <li key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-950/20 border border-red-500/15 px-3 py-2 text-xs text-white/50">
                    <span className="line-through">{historyLine(event)}</span>
                    <span className="rounded-md bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                      Voided: {event.voidReason || 'Removed by admin'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {voidingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#10192b] p-5 shadow-2xl">
            <h3 className="text-base font-black text-red-400">Void Recorded Event</h3>
            <p className="mt-2 text-sm text-white/70">
              Are you sure you want to void this record? It will be removed from official match statistics.
            </p>
            <div className="mt-3 rounded-xl bg-black/40 p-3 text-xs text-white/80 border border-white/5">
              {voidingEvent.line}
            </div>
            <label className="mt-4 block text-xs font-bold text-white/50">
              Reason for voiding
              <input
                className="mt-1 w-full rounded-xl border border-white/10 bg-[#0a101d] px-3 py-2 text-sm text-white focus:border-[#f5c518] focus:outline-none"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
                placeholder="Reason (e.g. Referee overturned, mistaken identity)"
              />
            </label>
            {voidingEvent.isGoal && (
              <label className="mt-3 flex items-center gap-2 text-xs font-medium text-white/70 cursor-pointer">
                <input
                  type="checkbox"
                  checked={disallowGoal}
                  onChange={(e) => setDisallowGoal(e.target.checked)}
                  className="rounded border-white/20 text-[#f5c518] focus:ring-0"
                />
                Mark as disallowed goal (adds note in match log)
              </label>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setVoidingEvent(null)}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || voidReason.trim().length < 3}
                onClick={async () => {
                  const ev = voidingEvent;
                  setVoidingEvent(null);
                  await act(`/api/matches/${id}/events/${ev.id}/void`, {
                    reason: voidReason.trim(),
                    disallowed: ev.isGoal && disallowGoal,
                  });
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-40"
              >
                {busy ? 'Voiding...' : 'Confirm Void Record'}
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [matchday, setMatchday] = useState(String(fixture.matchday ?? 1));
  const [date, setDate] = useState(fixture.date);
  const [time, setTime] = useState(fixture.time);
  const [venue, setVenue] = useState(fixture.stadium);
  const [referee, setReferee] = useState(fixture.referee ?? '');
  const [assistant1, setAssistant1] = useState(fixture.assistant1 ?? '');
  const [assistant2, setAssistant2] = useState(fixture.assistant2 ?? '');
  const [fourthReferee, setFourthReferee] = useState(fixture.fourthReferee ?? '');
  const [streamer, setStreamer] = useState(fixture.streamer ?? '');

  useEffect(() => {
    setMatchday(String(fixture.matchday ?? 1));
    setDate(fixture.date);
    setTime(fixture.time);
    setVenue(fixture.stadium);
    setReferee(fixture.referee ?? '');
    setAssistant1(fixture.assistant1 ?? '');
    setAssistant2(fixture.assistant2 ?? '');
    setFourthReferee(fixture.fourthReferee ?? '');
    setStreamer(fixture.streamer ?? '');
  }, [fixture.matchday, fixture.date, fixture.time, fixture.stadium, fixture.referee, fixture.assistant1, fixture.assistant2, fixture.fourthReferee, fixture.streamer]);

  return (
    <form className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-[#10192b] p-4 sm:grid-cols-3 lg:grid-cols-4" onSubmit={(event) => {
      event.preventDefault();
      onSave({ matchday: Number(matchday) || 1, date, time, venue, referee, assistant1, assistant2, fourthReferee, streamer });
    }}>
      <h2 className="font-black sm:col-span-3 lg:col-span-4">Fixture and officials</h2>
      <label className="text-xs font-bold text-white/45">Matchday<input className={inputClass} type="number" min="1" max="50" value={matchday} onChange={(event) => setMatchday(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Date<input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Kickoff<input className={inputClass} type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Venue<input className={inputClass} value={venue} onChange={(event) => setVenue(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Referee<input className={inputClass} value={referee} onChange={(event) => setReferee(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Assistant 1<input className={inputClass} value={assistant1} onChange={(event) => setAssistant1(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Assistant 2<input className={inputClass} value={assistant2} onChange={(event) => setAssistant2(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">4th Referee<input className={inputClass} value={fourthReferee} onChange={(event) => setFourthReferee(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Live Streamer<input className={inputClass} value={streamer} onChange={(event) => setStreamer(event.target.value)} placeholder="e.g. John Doe / DDU Media" /></label>
      <button type="submit" disabled={disabled} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40 sm:col-span-3 lg:col-span-4">Save fixture</button>
    </form>
  );
}

function LineupEditor({ matchId, role, isLive, disabled, onSave }: { matchId: string; role?: Role; isLive?: boolean; disabled: boolean; onSave: (body: Record<string, unknown>) => void }) {
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
          <h2 className="font-black text-lg">{isLive ? 'Substitutes & Lineup' : 'Lineup'}</h2>
          <p className="text-xs text-white/50">{isLive ? 'Add and edit substitute bench players during the match.' : 'Only approved lineups will appear on the public Lineups tab.'}</p>
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
        canApprove={role === 'super_admin' || role === 'match_admin' || role === 'competition_manager'}
        isLive={isLive}
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
  canApprove,
  isLive = false,
  disabled,
  onSave,
}: {
  matchId: string;
  teamId: string;
  formation?: string;
  isApproved?: boolean;
  canApprove?: boolean;
  isLive?: boolean;
  disabled: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const current = squads.filter((row) => row.matchId === matchId && row.teamId === teamId);
  const currentIds = new Set(current.map((row) => row.playerId));
  const roster = players.filter((player) => player.departmentId === teamId && player.active !== false && (player.registered !== false || currentIds.has(player.id)));
  const pitch = usePitch(matchId);
  const playedInMatch = (playerId: string) => Boolean(isLive && pitch.get(playerId)?.used);
  const [shape, setShape] = useState(formation && (FORMATIONS.includes(formation) || isValidFormation(formation)) ? formation : '4-2-3-1');
  const [slots, setSlots] = useState<Array<string | null>>(() => {
    const saved = current.filter((row) => row.role === 'starter').sort((a, b) => a.sort - b.sort).map((row) => row.playerId);
    const initialShape = formation && (FORMATIONS.includes(formation) || isValidFormation(formation)) ? formation : '4-2-3-1';
    const planRoles = formationPlan(initialShape).flat();
    if (saved.length === planRoles.length) {
      return saved;
    }
    return seatPlayers(saved, initialShape, roster);
  });
  const [bench, setBench] = useState(current.filter((row) => row.role === 'bench').map((row) => row.playerId));
  const [picking, setPicking] = useState<number | null>(null);

  useEffect(() => {
    if (formation && (FORMATIONS.includes(formation) || isValidFormation(formation))) {
      setShape(formation);
    }
  }, [formation]);
  const plan = formationPlan(shape);
  const roles = plan.flat();
  const chosen = new Set(slots.filter((id): id is string => Boolean(id)));
  const place = (index: number, playerId: string | null) => {
    if (isLive) return;
    if (playerId) {
      const sus = getPlayerSuspension(playerId, teamId, matchId);
      if (sus.suspended) return;
    }
    setSlots((list) => list.map((id, slot) => (slot === index ? playerId : id === playerId ? null : id)));
    if (playerId) setBench((list) => list.filter((id) => id !== playerId));
    setPicking(null);
  };
  const toggleBench = (playerId: string) => {
    if (chosen.has(playerId)) return;
    const sus = getPlayerSuspension(playerId, teamId, matchId);
    if (sus.suspended) return;
    if (playedInMatch(playerId)) return;
    setBench((list) => list.includes(playerId) ? list.filter((id) => id !== playerId) : [...list, playerId]);
  };
  const autoFill = () => {
    const used = new Set<string>();
    const newSlots: Array<string | null> = Array.from({ length: roles.length }, () => null);
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const candidate = roster.find(
        (p) => p.position === role && !used.has(p.id) && !getPlayerSuspension(p.id, teamId, matchId).suspended
      );
      if (candidate) {
        newSlots[i] = candidate.id;
        used.add(candidate.id);
      }
    }
    for (let i = 0; i < roles.length; i++) {
      if (!newSlots[i]) {
        const candidate = roster.find(
          (p) => !used.has(p.id) && !getPlayerSuspension(p.id, teamId, matchId).suspended
        );
        if (candidate) {
          newSlots[i] = candidate.id;
          used.add(candidate.id);
        }
      }
    }
    const newBench = roster
      .filter((p) => !used.has(p.id) && !getPlayerSuspension(p.id, teamId, matchId).suspended)
      .slice(0, 9)
      .map((p) => p.id);
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
  const choices = openRole
    ? roster
      .filter((player) => !bench.includes(player.id) && (slots[picking!] === player.id || !chosen.has(player.id)))
      .sort((a, b) => {
        const aMatch = a.position === openRole ? 1 : 0;
        const bMatch = b.position === openRole ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        return a.number - b.number;
      })
    : [];
  const tops = band(plan.length, 12, 88);

  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      if (isLive) {
        onSave({ teamId, bench, action: 'update_bench' });
      } else {
        onSave({
          teamId,
          starters: slots.filter((id): id is string => Boolean(id)),
          bench,
          formation: shape,
          approved: false,
        });
      }
    }}>
      {isLive && (
        <div className="mt-3 rounded-2xl border border-[#f5c518]/30 bg-[#f5c518]/10 p-3 text-xs text-[#f5c518]">
          <p className="font-bold">Match is in progress · Starting XI is locked.</p>
          <p className="mt-0.5 text-white/70">You can add, edit, or adjust substitute bench players below at any time during the match.</p>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="block text-xs font-bold text-white/45">Formation
          <select disabled={isLive} className={`${inputClass} mt-1 ${isLive ? 'opacity-60 cursor-not-allowed' : ''}`} value={shape} onChange={(event) => {
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
            {FORMATION_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label} className="bg-[#10192b] text-white/90 font-bold">
                {group.formations.map((item) => (
                  <option key={item.id} value={item.id} className="bg-[#0c1424] text-white font-medium">
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
            {!FORMATIONS.includes(shape) && (
              <option value={shape} className="bg-[#0c1424] text-white font-medium">{shape}</option>
            )}
          </select>
        </label>
        {!isLive && (
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
        )}
      </div>
      <div className="relative mt-3 h-[460px] overflow-hidden rounded-3xl bg-[#3f7a4c]">
        {isLive && (
          <span className="absolute top-3 right-3 z-20 rounded-full bg-black/60 backdrop-blur border border-white/10 px-3 py-1 text-[11px] font-bold text-white/80 shadow">
            Starting XI in play
          </span>
        )}
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
              disabled={isLive}
              onClick={() => !isLive && setPicking(slot)}
              className={`absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ${picking === slot ? 'z-10' : ''} ${isLive ? 'cursor-default' : ''}`}
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
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
              Slot: <span className="text-[#f5c518]">{openRole}</span> · Any player can be placed here
            </p>
            <button
              type="button"
              className="text-xs font-bold text-white/50 hover:text-white"
              onClick={() => setPicking(null)}
            >
              Close
            </button>
          </div>
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto">
            {choices.map((player) => {
              const sus = getPlayerSuspension(player.id, teamId, matchId);
              const isNatural = player.position === openRole;
              return (
                <li key={player.id}>
                  <button
                    type="button"
                    disabled={sus.suspended}
                    className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm ${sus.suspended ? 'opacity-40 cursor-not-allowed bg-red-500/10' : 'hover:bg-white/5'
                      }`}
                    onClick={() => !sus.suspended && place(picking!, player.id)}
                    title={sus.suspended ? sus.detail : undefined}
                  >
                    {player.photoUrl ? (
                      <img src={player.photoUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-black">
                        {player.number}
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate">{player.name}</span>
                    {sus.suspended ? (
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-bold text-red-300">
                        {sus.reason === 'red_card' ? 'Red card' : '5 Yellows'}
                      </span>
                    ) : (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isNatural ? 'bg-emerald-500/20 text-emerald-300' : 'text-white/40'}`}>
                        {player.position}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {!choices.length && <li className="text-sm text-white/40">No available player for this place.</li>}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
            <button
              type="button"
              className="text-xs font-bold text-red-400 hover:text-red-300"
              onClick={() => { if (picking != null) place(picking, null); }}
            >
              Clear this place
            </button>
            <button
              type="button"
              className="text-xs font-bold text-white/50 hover:text-white"
              onClick={() => setPicking(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">Substitutes</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {roster.filter((player) => !chosen.has(player.id)).map((player) => {
            const sus = getPlayerSuspension(player.id, teamId, matchId);
            const lockedActive = playedInMatch(player.id);
            return (
              <li key={player.id}>
                <button
                  type="button"
                  disabled={sus.suspended || lockedActive}
                  onClick={() => toggleBench(player.id)}
                  title={lockedActive ? 'Player has already participated in this match' : sus.suspended ? sus.detail : undefined}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${sus.suspended
                      ? 'border border-red-500/40 bg-red-500/20 text-red-300 cursor-not-allowed opacity-60'
                      : lockedActive
                        ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300 cursor-default'
                        : bench.includes(player.id)
                          ? 'bg-[#f5c518] text-[#102018]'
                          : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                >
                  {player.number} {player.name}
                  {lockedActive ? ' (In Play / Subbed)' : sus.suspended ? ' (Suspended)' : ''}
                </button>
              </li>
            );
          })}
          {!roster.length && <li className="text-sm text-white/40">Register players for this team before setting a lineup.</li>}
        </ul>
      </div>
      <p className="mt-2 text-xs text-white/40">{slots.filter(Boolean).length} of {roles.length} places filled · {bench.length} substitutes</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {isLive ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSave({
              teamId,
              bench,
              action: 'update_bench',
            })}
            className="rounded-xl bg-[#2f9e44] hover:bg-[#288339] px-6 py-2.5 text-sm font-black text-white shadow-lg disabled:opacity-40"
          >
            Save Bench Substitutes ({bench.length})
          </button>
        ) : (
          <>
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

            {canApprove && (!isApproved ? (
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
            ))}

            {!canApprove && (
              <span className="text-xs text-white/40 italic">
                {isApproved ? 'Approved by Admin' : 'Lineup approval requires Match Admin or Super Admin'}
              </span>
            )}
          </>
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
  onCancel,
}: {
  event: (typeof matchEvents)[number];
  matchId: string;
  disabled: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onCancel?: () => void;
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
  const finished = fixture.status === 'finished';
  const credited = side === 'home' ? fixture.homeId : fixture.awayId;
  const scorerTeam = goalType === 'own_goal' ? (side === 'home' ? fixture.awayId : fixture.homeId) : credited;
  const onTeam = (teamId: string) => {
    const fromPitch = [...pitch.entries()].filter(([id, row]) => row.teamId === teamId && (row.on || id === playerId || finished)).map(([id]) => id);
    if (fromPitch.length > 0) return fromPitch;
    return players.filter((p) => p.departmentId === teamId && p.registered !== false && p.active !== false).map((p) => p.id);
  };
  const scorers = onTeam(scorerTeam);
  const assisters = onTeam(credited).filter((id) => id !== playerId);
  return (
    <form className="mt-2 grid w-full grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#0c1424] p-3" onSubmit={(submit) => {
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
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={disabled} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/15">
            Cancel
          </button>
        )}
        <button type="submit" disabled={disabled || !playerId} className="rounded-xl bg-[#f5c518] px-3 py-2 text-xs font-black text-[#102018] hover:bg-[#ffd700] disabled:opacity-40">
          Save goal correction
        </button>
      </div>
    </form>
  );
}

function CardCorrect({
  event,
  matchId,
  disabled,
  onSave,
  onCancel,
}: {
  event: (typeof matchEvents)[number];
  matchId: string;
  disabled: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const fixture = getFixture(matchId);
  const pitch = usePitch(matchId);
  const [side, setSide] = useState<'home' | 'away'>(fixture && event.teamId === fixture.awayId ? 'away' : 'home');
  const [playerId, setPlayerId] = useState(event.playerId || '');
  const [cardType, setCardType] = useState(event.cardType === 'second_yellow' ? 'yellow' : (event.cardType || 'yellow'));
  const [minute, setMinute] = useState(String(event.minute));
  const [addedMinute, setAddedMinute] = useState(String(event.addedMinute || 0));
  const [detail, setDetail] = useState(event.detail || '');

  if (!fixture) return null;
  const finished = fixture.status === 'finished';
  const teamId = side === 'home' ? fixture.homeId : fixture.awayId;
  const onTeam = (tid: string) => {
    const fromPitch = [...pitch.entries()]
      .filter(([id, row]) => row.teamId === tid && (row.on || id === playerId || finished))
      .map(([id]) => id);
    if (fromPitch.length > 0) return fromPitch;
    return players.filter((p) => p.departmentId === tid && p.registered !== false && p.active !== false).map((p) => p.id);
  };
  const cardPlayers = onTeam(teamId);
  const priorYellow = Boolean(playerId) && matchEvents.some((ev) =>
    ev.matchId === matchId && !ev.voided && ev.id !== event.id && ev.playerId === playerId && ev.type === 'card' && ev.cardType === 'yellow'
  );

  return (
    <form className="mt-2 grid w-full grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#0c1424] p-3" onSubmit={(submit) => {
      submit.preventDefault();
      onSave({ side, playerId, cardType, minute: Number(minute), addedMinute: Number(addedMinute), detail });
    }}>
      <Select label="Team" value={side} onChange={(value) => { setSide(value as 'home' | 'away'); setPlayerId(''); }} options={sidesOf(fixture)} />
      <Select label="Card" value={cardType} onChange={setCardType} options={[
        { id: 'yellow', label: priorYellow ? 'Second yellow (red card)' : 'Yellow' },
        { id: 'red', label: 'Direct red card' },
      ]} />
      <div className="col-span-2">
        <Select label="Player" value={playerId} onChange={setPlayerId} options={[{ id: '', label: 'Choose player' }, ...cardPlayers.map((id) => ({ id, label: playerName(id) }))]} />
      </div>
      <label className="text-xs font-bold text-white/45">Minute<input className={inputClass} value={minute} onChange={(input) => setMinute(input.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Added<input className={inputClass} value={addedMinute} onChange={(input) => setAddedMinute(input.target.value)} /></label>
      <label className="col-span-2 text-xs font-bold text-white/45">Reason / note<input className={inputClass} value={detail} onChange={(input) => setDetail(input.target.value)} placeholder="e.g. Foul, Unsporting conduct" /></label>
      {priorYellow && cardType === 'yellow' && <p className="col-span-2 text-xs font-semibold text-[#f5c518]">This player already has a yellow card. Saving as yellow will record as a second yellow (sent off).</p>}
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={disabled} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/15">
            Cancel
          </button>
        )}
        <button type="submit" disabled={disabled || !playerId} className="rounded-xl bg-[#f5c518] px-3 py-2 text-xs font-black text-[#102018] hover:bg-[#ffd700] disabled:opacity-40">
          Save card correction
        </button>
      </div>
    </form>
  );
}

function SubCorrect({
  event,
  matchId,
  disabled,
  onSave,
  onCancel,
}: {
  event: (typeof matchEvents)[number];
  matchId: string;
  disabled: boolean;
  onSave: (body: Record<string, unknown>) => void;
  onCancel?: () => void;
}) {
  const fixture = getFixture(matchId);
  const pitch = usePitch(matchId);
  const [side, setSide] = useState<'home' | 'away'>(fixture && event.teamId === fixture.awayId ? 'away' : 'home');
  const [playerId, setPlayerId] = useState(event.playerId || '');
  const [relatedPlayerId, setRelatedPlayerId] = useState(event.relatedPlayerId || '');
  const [minute, setMinute] = useState(String(event.minute));
  const [addedMinute, setAddedMinute] = useState(String(event.addedMinute || 0));
  const [detail, setDetail] = useState(event.detail || 'tactical');

  if (!fixture) return null;
  const teamId = side === 'home' ? fixture.homeId : fixture.awayId;
  const teamPitch = [...pitch.entries()].filter(([, row]) => row.teamId === teamId).map(([id]) => id);
  const teamRoster = players.filter((p) => p.departmentId === teamId && p.registered !== false && p.active !== false).map((p) => p.id);
  const available = teamPitch.length > 0 ? teamPitch : teamRoster;

  return (
    <form className="mt-2 grid w-full grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#0c1424] p-3" onSubmit={(submit) => {
      submit.preventDefault();
      onSave({ side, playerId, relatedPlayerId, minute: Number(minute), addedMinute: Number(addedMinute), detail });
    }}>
      <Select label="Team" value={side} onChange={(value) => { setSide(value as 'home' | 'away'); setPlayerId(''); setRelatedPlayerId(''); }} options={sidesOf(fixture)} />
      <Select label="Reason / type" value={detail} onChange={setDetail} options={[
        { id: 'tactical', label: 'Tactical' },
        { id: 'injury', label: 'Injury' },
      ]} />
      <Select label="Player off" value={playerId} onChange={setPlayerId} options={[{ id: '', label: 'Choose player off' }, ...available.map((id) => ({ id, label: playerName(id) }))]} />
      <Select label="Player on" value={relatedPlayerId} onChange={setRelatedPlayerId} options={[{ id: '', label: 'Choose player on' }, ...available.filter((id) => id !== playerId).map((id) => ({ id, label: playerName(id) }))]} />
      <label className="text-xs font-bold text-white/45">Minute<input className={inputClass} value={minute} onChange={(input) => setMinute(input.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Added<input className={inputClass} value={addedMinute} onChange={(input) => setAddedMinute(input.target.value)} /></label>
      <div className="col-span-2 flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={disabled} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/15">
            Cancel
          </button>
        )}
        <button type="submit" disabled={disabled || !playerId || !relatedPlayerId || playerId === relatedPlayerId} className="rounded-xl bg-[#f5c518] px-3 py-2 text-xs font-black text-[#102018] hover:bg-[#ffd700] disabled:opacity-40">
          Save sub correction
        </button>
      </div>
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
  const [minute, setMinute] = useState(String(clock?.minute ?? fixture?.minute ?? (fixture?.status === 'finished' ? 90 : 0)));
  const [addedMinute, setAddedMinute] = useState('0');
  const [detail, setDetail] = useState('');
  const minuteTouched = useRef(false);
  const addedTouched = useRef(false);
  useEffect(() => {
    if (!minuteTouched.current && clock?.minute != null) setMinute(String(clock.minute));
    if (!addedTouched.current) setAddedMinute(clock && clock.stoppage > 0 ? String(Math.floor(clock.stoppage / 60)) : '0');
  }, [clock]);
  if (!fixture) return null;
  const finished = fixture.status === 'finished';
  const credited = side === 'home' ? fixture.homeId : fixture.awayId;
  const scorerTeam = goalType === 'own_goal' ? (side === 'home' ? fixture.awayId : fixture.homeId) : credited;
  const teamPlayers = (teamId: string) => {
    const list = [...pitch.entries()].filter(([, row]) => row.teamId === teamId && (finished || (row.on && !row.dismissed))).map(([id]) => id);
    if (list.length > 0) return list;
    return players.filter((p) => p.departmentId === teamId && p.registered !== false && p.active !== false).map((p) => p.id);
  };
  const scorers = teamPlayers(scorerTeam);
  const assisters = teamPlayers(credited).filter((id) => id !== playerId);
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
  const clock = useMatchClock(fixture?.status === 'live' ? matchId : undefined);
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [playerId, setPlayerId] = useState('');
  const [cardType, setCardType] = useState('yellow');
  const [minute, setMinute] = useState(String(clock?.minute ?? fixture?.minute ?? (fixture?.status === 'finished' ? 90 : 0)));
  const [addedMinute, setAddedMinute] = useState('0');
  const [detail, setDetail] = useState('');
  const minuteTouched = useRef(false);
  const addedTouched = useRef(false);
  useEffect(() => {
    if (!minuteTouched.current && clock?.minute != null) setMinute(String(clock.minute));
    if (!addedTouched.current) setAddedMinute(clock && clock.stoppage > 0 ? String(Math.floor(clock.stoppage / 60)) : '0');
  }, [clock]);
  if (!fixture) return null;
  const finished = fixture.status === 'finished';
  const teamId = side === 'home' ? fixture.homeId : fixture.awayId;
  const teamPitch = [...pitch.entries()].filter(([, row]) => row.teamId === teamId && (finished || row.on)).map(([id]) => id);
  const teamRoster = players.filter((p) => p.departmentId === teamId && p.registered !== false && p.active !== false).map((p) => p.id);
  const options = (teamPitch.length > 0 ? teamPitch : teamRoster).map((id) => ({ id, label: playerName(id) }));
  const booked = Boolean(playerId) && matchEvents.some((event) => event.matchId === matchId && !event.voided && event.playerId === playerId && event.type === 'card' && event.cardType === 'yellow');
  return (
    <form className={bare ? '' : 'rounded-2xl border border-white/10 bg-[#10192b] p-4'} onSubmit={(event) => {
      event.preventDefault();
      onSubmit({ type: 'card', side, playerId, cardType, minute: Number(minute), addedMinute: Number(addedMinute), detail, clientKey: crypto.randomUUID() });
    }}>
      {!bare && <h2 className="font-black">Card</h2>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Select label="Team" value={side} onChange={(value) => { setSide(value as 'home' | 'away'); setPlayerId(''); }} options={sidesOf(fixture)} />
        <Select label="Card" value={cardType} onChange={setCardType} options={[{ id: 'yellow', label: booked ? 'Second yellow (red card)' : 'Yellow' }, { id: 'red', label: 'Red card' }]} />
        <div className="col-span-2">
          <Select label="Player" value={playerId} onChange={setPlayerId} options={[{ id: '', label: 'Choose' }, ...options]} />
        </div>
        <label className="text-xs font-bold text-white/45">Minute<input className={inputClass} value={minute} onChange={(event) => { minuteTouched.current = true; setMinute(event.target.value); }} /></label>
        <label className="text-xs font-bold text-white/45">Added minute<input className={inputClass} value={addedMinute} onChange={(event) => { addedTouched.current = true; setAddedMinute(event.target.value); }} /></label>
        <label className="col-span-2 text-xs font-bold text-white/45">Reason<input className={inputClass} value={detail} onChange={(event) => setDetail(event.target.value)} placeholder="e.g. Foul, Unsporting conduct" /></label>
      </div>
      {booked && cardType === 'yellow' && <p className="mt-3 text-xs font-semibold text-[#f5c518]">A second yellow is a red card. {playerName(playerId)} is sent off.</p>}
      <button type="submit" disabled={disabled || !playerId} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40">Record card</button>
    </form>
  );
}

function SubForm({ matchId, disabled, onSubmit, bare = false }: { matchId: string; disabled: boolean; onSubmit: (body: Record<string, unknown>) => void; bare?: boolean }) {
  const fixture = getFixture(matchId);
  const pitch = usePitch(matchId);
  const clock = useMatchClock(fixture?.status === 'live' ? matchId : undefined);
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [playerId, setPlayerId] = useState('');
  const [relatedPlayerId, setRelatedPlayerId] = useState('');
  const [minute, setMinute] = useState(String(clock?.minute ?? fixture?.minute ?? (fixture?.status === 'finished' ? 90 : 0)));
  const [addedMinute, setAddedMinute] = useState('0');
  const [detail, setDetail] = useState('tactical');
  const minuteTouched = useRef(false);
  const addedTouched = useRef(false);
  useEffect(() => {
    if (!minuteTouched.current && clock?.minute != null) setMinute(String(clock.minute));
    if (!addedTouched.current) setAddedMinute(clock && clock.stoppage > 0 ? String(Math.floor(clock.stoppage / 60)) : '0');
  }, [clock]);
  if (!fixture) return null;
  const finished = fixture.status === 'finished';
  const teamId = side === 'home' ? fixture.homeId : fixture.awayId;
  const teamPitch = [...pitch.entries()].filter(([, row]) => row.teamId === teamId).map(([id]) => id);
  const teamRoster = players.filter((p) => p.departmentId === teamId && p.registered !== false && p.active !== false).map((p) => p.id);
  const allTeamPlayers = teamPitch.length > 0 ? teamPitch : teamRoster;

  const outgoing = finished
    ? allTeamPlayers.map((id) => ({ id, label: playerName(id) }))
    : [...pitch.entries()].filter(([, row]) => row.teamId === teamId && row.on).map(([id]) => ({ id, label: playerName(id) }));
  const incoming = finished
    ? allTeamPlayers.filter((id) => id !== playerId).map((id) => ({ id, label: playerName(id) }))
    : [...pitch.entries()].filter(([, row]) => row.teamId === teamId && !row.used && !row.dismissed).map(([id]) => ({ id, label: playerName(id) }));
  return (
    <form className={bare ? '' : 'rounded-2xl border border-white/10 bg-[#10192b] p-4'} onSubmit={(event) => {
      event.preventDefault();
      onSubmit({ type: 'substitution', side, playerId, relatedPlayerId, minute: Number(minute), addedMinute: Number(addedMinute), detail, clientKey: crypto.randomUUID() });
    }}>
      {!bare && <h2 className="font-black">Substitution</h2>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <Select label="Team" value={side} onChange={(value) => { setSide(value as 'home' | 'away'); setPlayerId(''); setRelatedPlayerId(''); }} options={sidesOf(fixture)} />
        </div>
        <Select label="Player off" value={playerId} onChange={setPlayerId} options={[{ id: '', label: 'Choose' }, ...outgoing]} />
        <Select label="Player on" value={relatedPlayerId} onChange={setRelatedPlayerId} options={[{ id: '', label: 'Choose' }, ...incoming]} />
        {incoming.length === 0 && (
          <p className="col-span-2 text-xs text-amber-300/80">
            ℹ No substitutes currently on the bench. Switch to the <strong>Bench / Lineup</strong> tab to add substitutes to the bench.
          </p>
        )}
        <label className="text-xs font-bold text-white/45">Minute<input className={inputClass} value={minute} onChange={(event) => { minuteTouched.current = true; setMinute(event.target.value); }} /></label>
        <label className="text-xs font-bold text-white/45">Added minute<input className={inputClass} value={addedMinute} onChange={(event) => { addedTouched.current = true; setAddedMinute(event.target.value); }} /></label>
        <div className="col-span-2">
          <Select label="Reason / type" value={detail} onChange={setDetail} options={[
            { id: 'tactical', label: 'Tactical' },
            { id: 'injury', label: 'Injury' },
          ]} />
        </div>
      </div>
      <button type="submit" disabled={disabled || !playerId || !relatedPlayerId || playerId === relatedPlayerId} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40">Record substitution</button>
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
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-[#10192b] px-3.5 py-2.5 transition-all ${isEditing
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
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${isEditing
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
                className={`rounded-full px-3.5 py-1.5 text-xs font-black transition ${!isCaptain
                    ? 'bg-[#f5c518] text-[#102018]'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
              >
                No (Squad Player)
              </button>
              <button
                type="button"
                onClick={() => setIsCaptain(true)}
                className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition ${isCaptain
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

interface NewsPhotoItem {
  id: string;
  file?: File;
  preview: string;
  url?: string;
}

function NewsAdmin({ onMessage, onError }: { onMessage: (text: string) => void; onError: (text: string) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('News');
  const [timeLabel, setTimeLabel] = useState('Today');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<NewsPhotoItem[]>([]);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const addPhotos = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const incoming: NewsPhotoItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        onError('Please select PNG, JPEG, or WebP images only.');
        continue;
      }
      if (file.size > 1_500_000) {
        onError(`"${file.name}" is larger than 1.5 MB. Please select images under 1.5 MB.`);
        continue;
      }
      incoming.push({
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${i}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    if (incoming.length > 0) {
      setPhotos((prev) => [...prev, ...incoming]);
    }
    setPhotoInputKey((k) => k + 1);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.preview.startsWith('blob:')) {
        URL.revokeObjectURL(target.preview);
      }
      return prev.filter((p) => p.id !== id);
    });
  };

  const movePhoto = (fromIndex: number, toIndex: number) => {
    setPhotos((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, item);
      return copy;
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCategory('News');
    setTimeLabel('Today');
    setSummary('');
    setBody('');
    setPhotos((prev) => {
      for (const p of prev) {
        if (p.preview.startsWith('blob:')) URL.revokeObjectURL(p.preview);
      }
      return [];
    });
    setPhotoInputKey((value) => value + 1);
    setIsPreviewMode(false);
  };

  const handleEdit = (article: typeof newsArticles[number]) => {
    setEditingId(article.id);
    setTitle(article.title || '');
    setCategory(article.category || 'News');
    setTimeLabel(article.time || 'Today');
    setSummary(article.summary || '');
    setBody(article.body || '');
    setPhotos((prev) => {
      for (const p of prev) {
        if (p.preview.startsWith('blob:')) URL.revokeObjectURL(p.preview);
      }
      return [];
    });
    const existingUrls = getArticleImages(article);
    setPhotos(
      existingUrls.map((url, i) => ({
        id: `existing-${article.id}-${i}`,
        preview: url,
        url,
      }))
    );
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
      const imagesPayload = [];
      for (const item of photos) {
        if (item.file) {
          const payload = await imagePayload(item.file);
          imagesPayload.push(payload);
        } else if (item.url) {
          imagesPayload.push({ url: item.url });
        }
      }

      const firstData = imagesPayload[0]?.data;
      const payload: Record<string, unknown> = {
        title: title.trim(),
        summary: summary.trim(),
        body: body.trim(),
        category: category.trim() || 'News',
        time: timeLabel.trim() || 'Today',
        images: imagesPayload,
      };
      if (firstData) {
        payload.image = { contentType: imagesPayload[0].contentType, data: firstData };
      }

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
            {photos.length > 0 && (
              <div className="overflow-hidden rounded-2xl">
                <NewsImageSlider
                  images={photos.map((p) => p.preview)}
                  alt={title}
                  className="h-60 sm:h-72 w-full"
                />
              </div>
            )}
            <p className="text-sm font-semibold text-white/60 italic">{summary || 'Summary line'}</p>
            <div className="border-t border-white/10 pt-4">
              <RichTextContent content={body || '<p>Start writing in the editor to see your story preview.</p>'} />
            </div>
          </div>
        ) : (
          /* EDITING FORM FIELDS */
          <div className="mt-5 grid gap-4">
            {/* Multiple Photos Manager */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wide text-white/40">
                    Story Photos ({photos.length})
                  </label>
                  <p className="text-xs text-white/50">
                    Add multiple photos. If 2 or more are uploaded, readers can swipe through them on Home and News.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 hover:border-white/30 hover:bg-white/10 hover:text-white transition-colors">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add photos</span>
                  <input
                    key={photoInputKey}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => addPhotos(e.target.files)}
                  />
                </label>
              </div>

              {photos.length === 0 ? (
                <label className="flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/15 bg-[#0c1424] hover:border-[#f5c518]/50 hover:bg-white/[0.02] transition-colors">
                  <div className="flex flex-col items-center text-center p-4">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-[#f5c518]">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-white">Click or tap to upload photos</span>
                    <span className="mt-1 text-[11px] text-white/40">PNG, JPEG, WebP up to 1.5 MB each · Multi-select enabled</span>
                  </div>
                  <input
                    key={photoInputKey}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(e) => addPhotos(e.target.files)}
                  />
                </label>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {photos.map((item, index) => (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c1424] p-1.5 shadow-sm"
                    >
                      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/40">
                        <img
                          src={item.preview}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute left-1.5 top-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-black ${index === 0
                                ? 'bg-[#f5c518] text-[#102018]'
                                : 'bg-black/70 text-white backdrop-blur-sm'
                              }`}
                          >
                            {index === 0 ? 'Cover' : `#${index + 1}`}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between px-1">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => movePhoto(index, index - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/15 disabled:opacity-20 transition-colors"
                            title="Move left"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === photos.length - 1}
                            onClick={() => movePhoto(index, index + 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/15 disabled:opacity-20 transition-colors"
                            title="Move right"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePhoto(item.id)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/25 transition-colors"
                          title="Remove photo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.02] text-white/50 hover:border-[#f5c518] hover:text-[#f5c518] transition-colors">
                    <Plus className="h-5 w-5 mb-1" />
                    <span className="text-[11px] font-bold">Add more</span>
                    <input
                      key={`more-${photoInputKey}`}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => addPhotos(e.target.files)}
                    />
                  </label>
                </div>
              )}
            </div>

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
                {(() => {
                  const imgs = getArticleImages(article);
                  return imgs.length > 0 ? (
                    <NewsImageSlider
                      images={imgs}
                      alt={stripHtml(article.title)}
                      className="h-44 w-full"
                    />
                  ) : null;
                })()}
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
    { id: 'match_admin', label: 'Match Admin (Match management & News only)' },
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
              ℹ Match Admins can manage existing matches (clock, lineups & approval, events, MOTM) and post news. They cannot create new matches.
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
              {account.role === 'match_admin' ? 'Match Admin (Match management & News only)' : account.role.replaceAll('_', ' ')}
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
