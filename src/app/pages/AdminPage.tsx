import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { desk, imagePayload } from '../../data/api';
import { useLeagueVersion } from '../../data/live';
import { newsArticles } from '../../data/news';
import { useMatchClock } from '../useMatchClock';
import { DepartmentMark, Portrait } from '../components/DepartmentMark';
import {
  departments,
  fixtures,
  formatMatchClock,
  getDepartment,
  getFixture,
  leagueRules,
  matchEvents,
  periodText,
  players,
  squads,
  type GroupId,
} from '../../data/supercup';

type Role = 'super_admin' | 'match_admin' | 'competition_manager' | 'team_manager' | 'reader';
type Section = 'overview' | 'matches' | 'teams' | 'players' | 'news' | 'users' | 'audit' | 'rules';

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
  { id: 'rules', label: 'Competition' },
  { id: 'users', label: 'Users' },
  { id: 'audit', label: 'Audit' },
];

const inputClass = 'mt-1 w-full rounded-xl border border-white/10 bg-[#0c1424] px-3 py-2 text-sm text-white outline-none focus:border-[#f5c518]/70';
const FORMATIONS = ['4-2-3-1', '4-3-3', '4-4-2', '4-1-4-1', '3-5-2', '3-4-3', '5-3-2', '5-4-1'];

export function AdminPage() {
  const navigate = useNavigate();
  const version = useLeagueVersion();
  const [user, setUser] = useState<DeskUser | null>(null);
  const [ready, setReady] = useState(false);
  const [section, setSection] = useState<Section>('overview');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    desk('/api/me').then((data) => setUser(data.user)).catch(() => setUser(null)).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!notice && !error) return;
    const timer = window.setTimeout(() => {
      setNotice('');
      setError('');
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [notice, error]);

  if (!ready) return <p className="px-6 py-16 text-sm text-white/50">Opening the desk…</p>;
  if (!user) return <Login onSuccess={setUser} />;

  const openMatch = (id: string) => {
    setMatchId(id);
    setSection('matches');
  };

  return (
    <div className="min-h-screen bg-[#070d18] text-white lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="border-b border-white/10 px-4 py-4 lg:min-h-screen lg:border-b-0 lg:border-r">
        <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">SUPER CUP DESK</p>
        <p className="mt-1 text-xs text-white/40">{user.username} · {user.role.replaceAll('_', ' ')}</p>
        <nav className="mt-4 flex gap-2 overflow-x-auto lg:flex-col" aria-label="Admin sections">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setSection(item.id); setMatchId(null); }}
              className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm font-bold ${section === item.id ? 'bg-[#f5c518] text-[#102018]' : 'text-white/60 hover:bg-white/5'}`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-4 flex gap-3 text-sm">
          <button type="button" onClick={() => navigate('/')} className="text-white/50">View site</button>
          <button
            type="button"
            onClick={() => desk('/api/logout', { method: 'POST', body: {} }).then(() => setUser(null))}
            className="text-white/50"
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="px-4 py-5 sm:px-6">
        {(notice || error) && (
          <p className={`mb-4 rounded-xl px-3 py-2 text-sm ${error ? 'bg-red-500/15 text-red-200' : 'bg-[#2f9e44]/15 text-[#7ddea0]'}`} role="status">
            {error || notice}
          </p>
        )}
        {section === 'overview' && <Overview version={version} onOpen={openMatch} />}
        {section === 'matches' && !matchId && <MatchList version={version} onOpen={openMatch} onMessage={setNotice} onError={setError} />}
        {section === 'matches' && matchId && (
          <MatchDesk id={matchId} role={user.role} onClose={() => setMatchId(null)} onMessage={setNotice} onError={setError} />
        )}
        {section === 'teams' && <TeamAdmin onMessage={setNotice} onError={setError} />}
        {section === 'players' && <PlayerAdmin onMessage={setNotice} onError={setError} />}
        {section === 'news' && <NewsAdmin onMessage={setNotice} onError={setError} />}
        {section === 'rules' && <RulesAdmin role={user.role} onMessage={setNotice} onError={setError} />}
        {section === 'users' && <UserAdmin role={user.role} onMessage={setNotice} onError={setError} />}
        {section === 'audit' && <AuditList />}
      </main>
    </div>
  );
}

function Login({ onSuccess }: { onSuccess: (user: DeskUser) => void }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  return (
    <form
      className="mx-auto max-w-sm px-4 py-20"
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
      <p className="mt-2 text-sm text-white/50">The desk account is admin. The default password is supercup unless the server was given another one.</p>
      <label className="mt-5 block text-xs font-bold text-white/50">Username
        <input className={inputClass} value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
      </label>
      <label className="mt-3 block text-xs font-bold text-white/50">Password
        <input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
      </label>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      <button type="submit" className="mt-5 w-full rounded-xl bg-[#f5c518] py-3 text-sm font-black text-[#102018]">Enter desk</button>
    </form>
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
  const [creating, setCreating] = useState(false);
  const rows = fixtures.filter((fixture) => {
    const home = getDepartment(fixture.homeId);
    const away = getDepartment(fixture.awayId);
    const text = `${home?.name} ${away?.name} ${fixture.stadium} ${fixture.group}`.toLowerCase();
    const statusOk = status === 'all' || fixture.detail === status || fixture.status === status;
    return statusOk && text.includes(query.trim().toLowerCase());
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Matches</h1>
        <button type="button" onClick={() => setCreating((value) => !value)} className="rounded-xl bg-[#f5c518] px-3 py-2 text-sm font-black text-[#102018]">New match</button>
      </div>
      {creating && <MatchForm onDone={(text) => { setCreating(false); onMessage(text); }} onError={onError} />}
      <div className="mt-4 flex flex-wrap gap-2">
        <input className={`${inputClass} mt-0 max-w-xs`} placeholder="Search teams or venue" value={query} onChange={(event) => setQuery(event.target.value)} />
        {['all', 'scheduled', 'live', 'halftime', 'finished', 'postponed', 'suspended', 'cancelled', 'abandoned'].map((item) => (
          <button key={item} type="button" onClick={() => setStatus(item)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${status === item ? 'bg-white text-[#102018]' : 'bg-white/5 text-white/60'}`}>{item}</button>
        ))}
      </div>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-3 py-2">Fixture</th>
              <th className="px-3 py-2">Kickoff</th>
              <th className="px-3 py-2">Score</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Venue</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((fixture) => (
              <tr key={fixture.id} className="border-t border-white/5">
                <td className="px-3 py-2 font-bold">{labelOf(fixture.homeId)} vs {labelOf(fixture.awayId)}<span className="mt-0.5 block text-xs font-normal text-white/35">Group {fixture.group} · MD{fixture.matchday}</span></td>
                <td className="px-3 py-2 text-white/60">{fixture.date} {fixture.time}</td>
                <td className="px-3 py-2 font-mono">{fixture.status === 'upcoming' ? '–' : `${fixture.homeScore}-${fixture.awayScore}`}</td>
                <td className="px-3 py-2">{fixture.detail}{fixture.confirmed ? ' · confirmed' : ''}</td>
                <td className="px-3 py-2 text-white/50">{fixture.stadium}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => onOpen(fixture.id)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-bold">Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="px-3 py-8 text-center text-sm text-white/40">No matches for this filter.</p>}
      </div>
    </div>
  );
}

function MatchForm({ onDone, onError }: { onDone: (text: string) => void; onError: (text: string) => void }) {
  const [homeId, setHomeId] = useState(departments[0]?.id ?? '');
  const [awayId, setAwayId] = useState(departments[1]?.id ?? '');
  const [date, setDate] = useState('2026-11-07');
  const [time, setTime] = useState('15:00');
  const [venue, setVenue] = useState('DDU Main Pitch');
  const [allowExtra, setAllowExtra] = useState(false);
  return (
    <form
      className="mt-4 grid gap-3 rounded-2xl border border-white/10 bg-[#10192b] p-4 sm:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await desk('/api/matches', { body: { homeId, awayId, date, time, venue, allowExtra, matchday: 1 } });
          onDone('Match scheduled.');
        } catch (reason) {
          onError(reason instanceof Error ? reason.message : 'Could not schedule the match.');
        }
      }}
    >
      <Select label="Home" value={homeId} onChange={setHomeId} options={departments.map((team) => ({ id: team.id, label: team.name }))} />
      <Select label="Away" value={awayId} onChange={setAwayId} options={departments.map((team) => ({ id: team.id, label: team.name }))} />
      <label className="text-xs font-bold text-white/50">Date<input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/50">Kickoff<input className={inputClass} type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/50 sm:col-span-2">Venue<input className={inputClass} value={venue} onChange={(event) => setVenue(event.target.value)} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={allowExtra} onChange={(event) => setAllowExtra(event.target.checked)} /> Allow extra time and penalties</label>
      <button type="submit" className="rounded-xl bg-[#f5c518] px-4 py-2 text-sm font-black text-[#102018] sm:col-span-2">Schedule</button>
    </form>
  );
}

function MatchDesk({ id, role, onClose, onMessage, onError }: { id: string; role: Role; onClose: () => void; onMessage: (text: string) => void; onError: (text: string) => void }) {
  const version = useLeagueVersion();
  const fixture = getFixture(id);
  const clock = useMatchClock(fixture?.status === 'live' ? id : undefined);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ label: string; action: string } | null>(null);
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  void version;
  if (!fixture) return <p className="text-sm text-white/50">That match is no longer on the server.</p>;
  const home = getDepartment(fixture.homeId);
  const away = getDepartment(fixture.awayId);
  const events = matchEvents.filter((event) => event.matchId === id && !event.voided);
  const canCorrect = role === 'super_admin' || role === 'competition_manager';
  const canRun = role === 'super_admin' || role === 'match_admin' || role === 'competition_manager';
  const finished = fixture.detail === 'finished';
  const live = fixture.status === 'live' || fixture.detail === 'suspended';

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
      <button type="button" onClick={onClose} className="text-sm font-semibold text-white/50">All matches</button>
      <div className="mt-3 rounded-3xl border border-white/10 bg-[#10192b] p-4 sm:p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamBlock team={home} />
          <div className="text-center">
            <p className={`font-mono text-4xl font-black ${clock?.running ? 'text-[#7ddea0]' : 'text-white'}`}>
              {fixture.detail === 'finished' ? 'FT' : clock ? formatMatchClock(clock) : '00:00'}
            </p>
            <p className="text-xs font-bold text-white/45">{periodText(fixture.period, clock?.running)}{clock && clock.added > 0 ? ` · +${clock.added}` : ''}</p>
            <p className="mt-1 text-3xl font-black">{fixture.homeScore ?? 0}–{fixture.awayScore ?? 0}</p>
            {fixture.pensHome != null && <p className="text-xs font-bold text-[#f5c518]">Pens {fixture.pensHome}-{fixture.pensAway}</p>}
          </div>
          <TeamBlock team={away} align="end" />
        </div>
        <p className="mt-3 text-center text-xs text-white/35">{fixture.stadium} · {fixture.date} {fixture.time}{fixture.referee ? ` · Ref ${fixture.referee}` : ''}{fixture.confirmed ? ' · Confirmed' : ''}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {finished && <p className="w-full text-sm text-white/50">This match is finished. The score, lineup, and events stay as recorded.</p>}
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
        {!finished && <ClockCorrection disabled={busy || !canRun} onSave={(seconds) => act(`/api/matches/${id}/clock`, { action: 'set_clock', seconds })} />}
      </div>

      {!finished && !live && (
        <FixtureMeta
          fixture={fixture}
          disabled={busy || !canRun}
          onSave={(body) => act(`/api/matches/${id}`, body, 'PATCH')}
        />
      )}
      {!finished && <LineupEditor matchId={id} disabled={busy || !canRun} onSave={(body) => act(`/api/matches/${id}/lineup`, body)} />}
      {!finished && canRun && (
        <EventPicker
          matchId={id}
          period={fixture.period}
          disabled={busy}
          onEvent={(body) => act(`/api/matches/${id}/events`, body)}
          onStat={(body) => act(`/api/matches/${id}/stats`, body)}
        />
      )}

      <section className="mt-4 rounded-2xl border border-white/10 bg-[#10192b] p-4">
        <h2 className="font-black">Event history</h2>
        <ul className="mt-3 space-y-2">
          {events.map((event) => (
            <li key={event.id} className="border-t border-white/5 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>{event.minute}{event.addedMinute ? `+${event.addedMinute}` : ''}' {event.type.replaceAll('_', ' ')} · {event.type === 'substitution' ? `${event.playerName} off, ${event.relatedName} on` : event.playerName || event.detail}{event.assistName ? ` (assist ${event.assistName})` : ''}</span>
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
          {!events.length && <li className="text-sm text-white/40">No events yet.</li>}
        </ul>
      </section>
    </div>
  );
}

function TeamBlock({ team, align = 'start' }: { team?: { shortName: string; name: string; color: string; crestUrl?: string }; align?: 'start' | 'end' }) {
  if (!team) return null;
  return (
    <div className={align === 'end' ? 'text-right' : ''}>
      <DepartmentMark shortName={team.shortName} color={team.color} size={48} src={team.crestUrl || undefined} />
      <p className="mt-2 text-sm font-bold">{team.name}</p>
    </div>
  );
}

function Action({ children, onClick, disabled }: { children: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="rounded-xl bg-white/10 px-3 py-2 text-sm font-bold disabled:opacity-40">{children}</button>;
}

function ClockCorrection({ disabled, onSave }: { disabled: boolean; onSave: (seconds: number) => void }) {
  const [value, setValue] = useState('45:00');
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
  return (
    <form className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-[#10192b] p-4 sm:grid-cols-3" onSubmit={(event) => {
      event.preventDefault();
      onSave({ date, time, venue, referee, assistant1, assistant2 });
    }}>
      <h2 className="font-black sm:col-span-3">Fixture and officials</h2>
      <label className="text-xs font-bold text-white/45">Date<input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Kickoff<input className={inputClass} type="time" value={time} onChange={(event) => setTime(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Venue<input className={inputClass} value={venue} onChange={(event) => setVenue(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Referee<input className={inputClass} value={referee} onChange={(event) => setReferee(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Assistant 1<input className={inputClass} value={assistant1} onChange={(event) => setAssistant1(event.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Assistant 2<input className={inputClass} value={assistant2} onChange={(event) => setAssistant2(event.target.value)} /></label>
      <button type="submit" disabled={disabled} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40 sm:col-span-3">Save fixture</button>
    </form>
  );
}

function LineupEditor({ matchId, disabled, onSave }: { matchId: string; disabled: boolean; onSave: (body: Record<string, unknown>) => void }) {
  const fixture = getFixture(matchId);
  const [side, setSide] = useState<'home' | 'away'>('home');
  if (!fixture) return null;
  const teamId = side === 'home' ? fixture.homeId : fixture.awayId;
  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-[#10192b] p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-black">Lineup</h2>
        <Select label="Team" value={side} onChange={(value) => setSide(value as 'home' | 'away')} options={[{ id: 'home', label: 'Home' }, { id: 'away', label: 'Away' }]} />
      </div>
      <LineupSide key={`${matchId}-${teamId}`} matchId={matchId} teamId={teamId} formation={side === 'home' ? fixture.formationHome : fixture.formationAway} disabled={disabled} onSave={onSave} />
    </section>
  );
}

function LineupSide({
  matchId,
  teamId,
  formation,
  disabled,
  onSave,
}: {
  matchId: string;
  teamId: string;
  formation?: string;
  disabled: boolean;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const current = squads.filter((row) => row.matchId === matchId && row.teamId === teamId);
  const currentIds = new Set(current.map((row) => row.playerId));
  const roster = players.filter((player) => player.departmentId === teamId && player.active !== false && (player.registered !== false || currentIds.has(player.id)));
  const [starters, setStarters] = useState(current.filter((row) => row.role === 'starter').map((row) => row.playerId));
  const [bench, setBench] = useState(current.filter((row) => row.role === 'bench').map((row) => row.playerId));
  const [shape, setShape] = useState(formation || '4-2-3-1');
  const place = (playerId: string, role: 'starter' | 'bench' | 'out') => {
    setStarters((list) => list.filter((id) => id !== playerId));
    setBench((list) => list.filter((id) => id !== playerId));
    if (role === 'starter') setStarters((list) => list.length >= 11 ? list : [...list, playerId]);
    if (role === 'bench') setBench((list) => [...list, playerId]);
  };
  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      onSave({ teamId, starters, bench, formation: shape });
    }}>
      <label className="mt-3 block text-xs font-bold text-white/45">Formation
        <select className={inputClass} value={FORMATIONS.includes(shape) ? shape : FORMATIONS[0]} onChange={(event) => setShape(event.target.value)}>
          {FORMATIONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <ul className="mt-3 max-h-72 space-y-1 overflow-auto">
        {roster.map((player) => {
          const role = starters.includes(player.id) ? 'starter' : bench.includes(player.id) ? 'bench' : 'out';
          return (
            <li key={player.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{player.number} {player.name}</span>
              <select className="rounded-lg bg-[#0c1424] px-2 py-1 text-xs font-bold" value={role} onChange={(event) => place(player.id, event.target.value as 'starter' | 'bench' | 'out')}>
                <option value="starter">Starting XI</option>
                <option value="bench">Bench</option>
                <option value="out">Out</option>
              </select>
            </li>
          );
        })}
        {!roster.length && <li className="text-sm text-white/40">Register players for this team before setting a lineup.</li>}
      </ul>
      <p className="mt-2 text-xs text-white/40">{starters.length} starters · {bench.length} substitutes</p>
      <button type="submit" disabled={disabled || !starters.length} className="mt-3 rounded-xl bg-[#f5c518] px-4 py-2 text-sm font-black text-[#102018] disabled:opacity-40">Save lineup</button>
    </form>
  );
}

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
  if (!fixture) return null;
  const credited = side === 'home' ? fixture.homeId : fixture.awayId;
  const scorerTeam = goalType === 'own_goal' ? (side === 'home' ? fixture.awayId : fixture.homeId) : credited;
  const onTeam = (teamId: string) => [...pitch.entries()].filter(([id, row]) => row.teamId === teamId && (row.on || id === playerId)).map(([id]) => id);
  const scorers = onTeam(scorerTeam);
  const assisters = [...pitch.entries()].filter(([, row]) => row.teamId === credited && row.on).map(([id]) => id).filter((id) => id !== playerId);
  return (
    <form className="mt-2 grid w-full grid-cols-2 gap-2" onSubmit={(submit) => {
      submit.preventDefault();
      onSave({ side, goalType, playerId, assistId: goalType === 'own_goal' ? '' : assistId, minute: Number(minute), addedMinute: Number(addedMinute) });
    }}>
      <Select label="Team credited" value={side} onChange={(value) => setSide(value as 'home' | 'away')} options={[{ id: 'home', label: 'Home' }, { id: 'away', label: 'Away' }]} />
      <Select label="Type" value={goalType} onChange={setGoalType} options={[{ id: 'open_play', label: 'Open play' }, { id: 'penalty', label: 'Penalty' }, { id: 'free_kick', label: 'Free kick' }, { id: 'own_goal', label: 'Own goal' }]} />
      <Select label="Scorer" value={playerId} onChange={setPlayerId} options={scorers.map((id) => ({ id, label: playerName(id) }))} />
      {goalType !== 'own_goal' && <Select label="Assist" value={assistId} onChange={setAssistId} options={[{ id: '', label: 'No assist' }, ...assisters.map((id) => ({ id, label: playerName(id) }))]} />}
      <label className="text-xs font-bold text-white/45">Minute<input className={inputClass} value={minute} onChange={(input) => setMinute(input.target.value)} /></label>
      <label className="text-xs font-bold text-white/45">Added<input className={inputClass} value={addedMinute} onChange={(input) => setAddedMinute(input.target.value)} /></label>
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
  onStat,
}: {
  matchId: string;
  period?: string;
  disabled: boolean;
  onEvent: (body: Record<string, unknown>) => void;
  onStat: (body: Record<string, unknown>) => void;
}) {
  const [tool, setTool] = useState('goal');
  const tools = [
    { id: 'goal', label: 'Goal' },
    { id: 'card', label: 'Card' },
    { id: 'sub', label: 'Substitution' },
    { id: 'other', label: 'Other event' },
    { id: 'stat', label: 'Manual statistic' },
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
        {tool === 'other' && <OtherForm matchId={matchId} period={period} disabled={disabled} onSubmit={onEvent} bare />}
        {tool === 'stat' && <ManualStats matchId={matchId} disabled={disabled} onSave={onStat} bare />}
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
  const minuteTouched = useRef(false);
  useEffect(() => {
    if (!minuteTouched.current && clock?.minute != null) setMinute(String(clock.minute));
  }, [clock?.minute]);
  if (!fixture) return null;
  const credited = side === 'home' ? fixture.homeId : fixture.awayId;
  const scorerTeam = goalType === 'own_goal' ? (side === 'home' ? fixture.awayId : fixture.homeId) : credited;
  const onTeam = (teamId: string) => [...pitch.entries()].filter(([, row]) => row.teamId === teamId && row.on && !row.dismissed).map(([id]) => id);
  const scorers = onTeam(scorerTeam);
  const assisters = onTeam(credited).filter((id) => id !== playerId);
  return (
    <form className={bare ? '' : 'rounded-2xl border border-white/10 bg-[#10192b] p-4'} onSubmit={(event) => {
      event.preventDefault();
      onSubmit({ type: 'goal', side, goalType, playerId, assistId: goalType === 'own_goal' ? '' : assistId, minute: Number(minute), addedMinute: Number(addedMinute), clientKey: crypto.randomUUID() });
    }}>
      {!bare && <h2 className="font-black">Goal</h2>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Select label="Team credited" value={side} onChange={(value) => setSide(value as 'home' | 'away')} options={[{ id: 'home', label: 'Home' }, { id: 'away', label: 'Away' }]} />
        <Select label="Type" value={goalType} onChange={setGoalType} options={[{ id: 'open_play', label: 'Open play' }, { id: 'penalty', label: 'Penalty' }, { id: 'free_kick', label: 'Free kick' }, { id: 'own_goal', label: 'Own goal' }]} />
        <Select label="Scorer" value={playerId} onChange={setPlayerId} options={[{ id: '', label: 'Choose' }, ...scorers.map((id) => ({ id, label: playerName(id) }))]} />
        {goalType !== 'own_goal' && <Select label="Assist (optional)" value={assistId} onChange={setAssistId} options={[{ id: '', label: 'No assist' }, ...assisters.map((id) => ({ id, label: playerName(id) }))]} />}
        <label className="text-xs font-bold text-white/45">Minute<input className={inputClass} value={minute} onChange={(event) => { minuteTouched.current = true; setMinute(event.target.value); }} /></label>
        <label className="text-xs font-bold text-white/45">Added<input className={inputClass} value={addedMinute} onChange={(event) => setAddedMinute(event.target.value)} /></label>
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
  return (
    <form className={bare ? '' : 'rounded-2xl border border-white/10 bg-[#10192b] p-4'} onSubmit={(event) => {
      event.preventDefault();
      onSubmit({ type: 'card', side, playerId, cardType, detail, clientKey: crypto.randomUUID() });
    }}>
      {!bare && <h2 className="font-black">Card</h2>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Select label="Team" value={side} onChange={(value) => setSide(value as 'home' | 'away')} options={[{ id: 'home', label: 'Home' }, { id: 'away', label: 'Away' }]} />
        <Select label="Card" value={cardType} onChange={setCardType} options={[{ id: 'yellow', label: 'Yellow' }, { id: 'second_yellow', label: 'Second yellow' }, { id: 'red', label: 'Direct red' }]} />
        <Select label="Player" value={playerId} onChange={setPlayerId} options={[{ id: '', label: 'Choose' }, ...options]} />
        <label className="text-xs font-bold text-white/45">Reason<input className={inputClass} value={detail} onChange={(event) => setDetail(event.target.value)} /></label>
      </div>
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
        <Select label="Team" value={side} onChange={(value) => setSide(value as 'home' | 'away')} options={[{ id: 'home', label: 'Home' }, { id: 'away', label: 'Away' }]} />
        <Select label="Off" value={playerId} onChange={setPlayerId} options={[{ id: '', label: 'Choose' }, ...outgoing]} />
        <Select label="On" value={relatedPlayerId} onChange={setRelatedPlayerId} options={[{ id: '', label: 'Choose' }, ...incoming]} />
      </div>
      <button type="submit" disabled={disabled || !playerId || !relatedPlayerId} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40">Record substitution</button>
    </form>
  );
}

function OtherForm({ matchId, period, disabled, onSubmit, bare = false }: { matchId: string; period?: string; disabled: boolean; onSubmit: (body: Record<string, unknown>) => void; bare?: boolean }) {
  const [type, setType] = useState('foul');
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [detail, setDetail] = useState('');
  const [scored, setScored] = useState(true);
  const fixture = getFixture(matchId);
  const pitch = usePitch(matchId);
  const teamId = side === 'home' ? fixture?.homeId : fixture?.awayId;
  const takers = [...pitch.entries()].filter(([, row]) => row.teamId === teamId && !row.dismissed).map(([id]) => ({ id, label: playerName(id) }));
  const [playerId, setPlayerId] = useState('');
  return (
    <form className={bare ? '' : 'rounded-2xl border border-white/10 bg-[#10192b] p-4'} onSubmit={(event) => {
      event.preventDefault();
      if (type === 'added_time') onSubmit({ type, addedMinute: Number(detail), clientKey: crypto.randomUUID() });
      else if (type === 'penalty_kick') onSubmit({ type, side, playerId, scored, clientKey: crypto.randomUUID() });
      else onSubmit({ type, side, detail, playerId: playerId || undefined, clientKey: crypto.randomUUID() });
    }}>
      {!bare && <h2 className="font-black">Other event</h2>}
      <div className="mt-3 grid gap-2">
        <Select label="Event" value={type} onChange={setType} options={['foul', 'free_kick', 'corner', 'offside', 'save', 'injury', 'penalty_awarded', 'penalty_missed', 'penalty_saved', 'var', 'added_time', 'note', 'penalty_kick'].map((id) => ({ id, label: id.replaceAll('_', ' ') }))} />
        {type !== 'added_time' && <Select label="Team" value={side} onChange={(value) => setSide(value as 'home' | 'away')} options={[{ id: 'home', label: 'Home' }, { id: 'away', label: 'Away' }]} />}
        {type === 'penalty_kick' && <Select label="Taker" value={playerId} onChange={setPlayerId} options={takers} />}
        {type === 'penalty_kick' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={scored} onChange={(event) => setScored(event.target.checked)} /> Scored</label>}
        {type !== 'penalty_kick' && (
          <label className="text-xs font-bold text-white/45">{type === 'added_time' ? 'Added minutes' : 'Detail'}
            <input className={inputClass} value={detail} onChange={(event) => setDetail(event.target.value)} />
          </label>
        )}
        {period !== 'penalties' && type === 'penalty_kick' && <p className="text-xs text-white/40">Start the shootout before recording kicks. They do not change the match score.</p>}
      </div>
      <button type="submit" disabled={disabled} className="mt-3 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-40">Record</button>
    </form>
  );
}

function ManualStats({ matchId, disabled, onSave, bare = false }: { matchId: string; disabled: boolean; onSave: (body: Record<string, unknown>) => void; bare?: boolean }) {
  const [metric, setMetric] = useState('corners');
  const [side, setSide] = useState('home');
  const [value, setValue] = useState('');
  return (
    <form className={bare ? '' : 'mt-4 rounded-2xl border border-white/10 bg-[#10192b] p-4'} onSubmit={(event) => { event.preventDefault(); onSave({ metric, side, value: Number(value) }); }}>
      {!bare && <h2 className="font-black">Manual team statistic</h2>}
      <p className="mt-1 text-xs text-white/40">Only numbers an official enters are stored. Possession and shots are never invented.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <Select label="Stat" value={metric} onChange={setMetric} options={['possession', 'shots', 'shots_on_target', 'shots_off_target', 'blocked_shots', 'corners', 'fouls', 'offsides', 'saves', 'passes', 'pass_accuracy'].map((id) => ({ id, label: id.replaceAll('_', ' ') }))} />
        <Select label="Team" value={side} onChange={setSide} options={[{ id: 'home', label: 'Home' }, { id: 'away', label: 'Away' }]} />
        <label className="text-xs font-bold text-white/45">Value<input className={inputClass} value={value} onChange={(event) => setValue(event.target.value)} /></label>
        <button type="submit" disabled={disabled || value === ''} className="self-end rounded-xl bg-white/10 px-3 py-2 text-sm font-bold disabled:opacity-40">Save</button>
      </div>
    </form>
  );
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

function PicturePicker({ preview, empty, round = false, required = false, inputKey, onFile }: {
  preview: string;
  empty: string;
  round?: boolean;
  required?: boolean;
  inputKey?: number;
  onFile: (file: File | null) => void;
}) {
  return (
    <label className="flex shrink-0 cursor-pointer flex-col items-center gap-2">
      <span className={`relative flex h-32 w-32 items-center justify-center overflow-hidden border border-dashed border-white/20 bg-[#0c1424] ${round ? 'rounded-full' : 'rounded-3xl'}`}>
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
              <DepartmentMark shortName={item.shortName} color={item.color} size={36} src={item.crestUrl || undefined} />
              <span className="min-w-0">
                <span className="block truncate">{item.name}</span>
                <span className="block text-xs font-semibold text-white/35">Group {item.group}{item.coach ? ` · ${item.coach}` : ''}</span>
              </span>
            </span>
            <button type="button" onClick={() => setEditing(item.id)} className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-[#f5c518]">Edit</button>
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
  const chooseLogo = (next: File | null) => {
    setFile(next);
    setPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return next ? URL.createObjectURL(next) : (initial?.crestUrl ?? '');
    });
  };
  return (
    <form className="mt-5 rounded-3xl border border-white/10 bg-[#10192b] p-5" onSubmit={async (event) => {
      event.preventDefault();
      try {
        if (!initial && !file) throw new Error('A team logo is required.');
        const image = file ? await imagePayload(file) : undefined;
        await desk(initial ? `/api/teams/${initial.id}` : '/api/teams', {
          method: initial ? 'PATCH' : 'POST',
          body: { name, shortName, group, coach, pitch, college: initial?.college ?? '', color: initial?.color ?? '#2450c8', ...(image ? { image } : {}) },
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
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
        <PicturePicker preview={preview} empty="Team logo" required={!initial} inputKey={logoKey} onFile={chooseLogo} />
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <Field label="Department name" value={name} onChange={setName} placeholder="Computer Science" required />
          <Field label="Short name" value={shortName} onChange={setShortName} placeholder="CS" required maxLength={8} />
          <Field label="Coach" value={coach} onChange={setCoach} placeholder="Coach name" />
          <Field label="Pitch" value={pitch} onChange={setPitch} placeholder="Campus pitch" />
          <div className="sm:col-span-2">
            <ChoiceRow label="Group" value={group} options={['A', 'B', 'C', 'D', 'E', 'F']} onChange={(value) => setGroup(value as GroupId)} />
          </div>
        </div>
      </div>
      <button type="submit" className="mt-5 w-full rounded-xl bg-[#f5c518] px-4 py-3 text-sm font-black text-[#102018] sm:w-auto">{initial ? 'Save team' : 'Create team'}</button>
    </form>
  );
}

function PlayerAdmin({ onMessage, onError }: { onMessage: (text: string) => void; onError: (text: string) => void }) {
  const [teamId, setTeamId] = useState(departments[0]?.id ?? '');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('MID');
  const [number, setNumber] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [photoKey, setPhotoKey] = useState(0);
  const squad = players.filter((player) => player.departmentId === teamId && player.registered !== false);
  const choosePhoto = (next: File | null) => {
    setFile(next);
    setPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current);
      return next ? URL.createObjectURL(next) : '';
    });
  };
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">SQUADS</p>
      <h1 className="mt-1 text-3xl font-black">Players</h1>
      <form className="mt-5 rounded-3xl border border-white/10 bg-[#10192b] p-5" onSubmit={async (event) => {
        event.preventDefault();
        try {
          if (!file) throw new Error('A player photo is required.');
          const image = await imagePayload(file);
          await desk('/api/players', { body: { name, teamId, position, number: Number(number), image } });
          setName('');
          setNumber('');
          setFile(null);
          setPhotoKey((value) => value + 1);
          setPreview((current) => {
            if (current.startsWith('blob:')) URL.revokeObjectURL(current);
            return '';
          });
          onMessage('Player registered.');
        } catch (reason) {
          onError(reason instanceof Error ? reason.message : 'Could not save the player.');
        }
      }}>
        <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">NEW PLAYER</p>
        <h2 className="mt-1 text-xl font-black">Register a player</h2>
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start">
          <PicturePicker preview={preview} empty="Player photo" round required inputKey={photoKey} onFile={choosePhoto} />
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Select label="Team" value={teamId} onChange={setTeamId} options={departments.map((team) => ({ id: team.id, label: team.name }))} />
            </div>
            <Field label="Player name" value={name} onChange={setName} placeholder="Full name" required />
            <Field label="Shirt number" value={number} onChange={setNumber} placeholder="10" required inputMode="numeric" />
            <div className="sm:col-span-2">
              <ChoiceRow label="Position" value={position} options={['GK', 'DEF', 'MID', 'FWD']} onChange={setPosition} />
            </div>
          </div>
        </div>
        <button type="submit" className="mt-5 w-full rounded-xl bg-[#f5c518] px-4 py-3 text-sm font-black text-[#102018] sm:w-auto">Add player</button>
      </form>
      <ul className="mt-6 space-y-2">
        {squad.map((player) => (
          <li key={player.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#10192b] px-3 py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-3"><Portrait name={player.name} src={player.photoUrl || undefined} size={40} /><span className="min-w-0"><span className="block truncate font-bold">{player.number} {player.name}</span><span className="block text-xs text-white/40">{player.position}</span></span></span>
            <span className="flex items-center gap-3 text-white/40">
              <span>{player.goals}G {player.assists}A {player.yellowCards ?? 0}Y {player.redCards ?? 0}R · {player.appearances ?? 0} apps</span>
              <select
                className="rounded-lg bg-[#0c1424] px-2 py-1 text-xs text-white"
                value={player.departmentId}
                onChange={async (event) => {
                  try {
                    await desk(`/api/players/${player.id}`, { method: 'PATCH', body: { name: player.name, teamId: event.target.value, position: player.position, number: player.number } });
                    onMessage('Player moved. Past match events stay with this player.');
                  } catch (reason) {
                    onError(reason instanceof Error ? reason.message : 'Could not move the player.');
                  }
                }}
              >
                {departments.map((team) => <option key={team.id} value={team.id}>{team.shortName}</option>)}
              </select>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewsAdmin({ onMessage, onError }: { onMessage: (text: string) => void; onError: (text: string) => void }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  return (
    <div>
      <h1 className="text-3xl font-black">News</h1>
      <form className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-[#10192b] p-4" onSubmit={async (event) => {
        event.preventDefault();
        try {
          await desk('/api/news', { body: { title, summary, body, category: 'News', time: 'Today' } });
          setTitle(''); setSummary(''); setBody('');
          onMessage('Story published.');
        } catch (reason) {
          onError(reason instanceof Error ? reason.message : 'Could not publish the story.');
        }
      }}>
        <label className="text-xs font-bold text-white/45">Title<input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="text-xs font-bold text-white/45">Summary<input className={inputClass} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
        <label className="text-xs font-bold text-white/45">Story<textarea className={inputClass} rows={4} value={body} onChange={(event) => setBody(event.target.value)} /></label>
        <button type="submit" className="rounded-xl bg-[#f5c518] px-4 py-2 text-sm font-black text-[#102018]">Publish</button>
      </form>
      <ul className="mt-4 space-y-2">
        {newsArticles.map((article) => (
          <li key={article.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
            <span>{article.title}</span>
            <button type="button" className="text-xs font-bold text-red-300" onClick={async () => {
              try {
                await desk(`/api/news/${article.id}`, { method: 'DELETE', body: {} });
                onMessage('Story removed.');
              } catch (reason) {
                onError(reason instanceof Error ? reason.message : 'Could not remove the story.');
              }
            }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RulesAdmin({ role, onMessage, onError }: { role: Role; onMessage: (text: string) => void; onError: (text: string) => void }) {
  const [halfMinutes, setHalfMinutes] = useState(String(leagueRules.halfMinutes));
  const [pointsWin, setPointsWin] = useState(String(leagueRules.pointsWin));
  const [maxSubs, setMaxSubs] = useState(String(leagueRules.maxSubs));
  const locked = role === 'reader' || role === 'match_admin' || role === 'team_manager';
  return (
    <form className="max-w-lg" onSubmit={async (event) => {
      event.preventDefault();
      try {
        await desk('/api/rules', { method: 'PATCH', body: { halfMinutes: Number(halfMinutes), pointsWin: Number(pointsWin), maxSubs: Number(maxSubs) } });
        onMessage('Competition rules saved. Matches already created keep their own half length.');
      } catch (reason) {
        onError(reason instanceof Error ? reason.message : 'Could not save the rules.');
      }
    }}>
      <h1 className="text-3xl font-black">Competition</h1>
      <p className="mt-1 text-sm text-white/45">Group tables use confirmed results only. Tie-break is points, goal difference, then goals scored.</p>
      <label className="mt-4 block text-xs font-bold text-white/45">Half length (minutes)<input className={inputClass} value={halfMinutes} onChange={(event) => setHalfMinutes(event.target.value)} /></label>
      <label className="mt-3 block text-xs font-bold text-white/45">Points for a win<input className={inputClass} value={pointsWin} onChange={(event) => setPointsWin(event.target.value)} /></label>
      <label className="mt-3 block text-xs font-bold text-white/45">Substitutions<input className={inputClass} value={maxSubs} onChange={(event) => setMaxSubs(event.target.value)} /></label>
      <button type="submit" disabled={locked} className="mt-4 rounded-xl bg-[#f5c518] px-4 py-2 text-sm font-black text-[#102018] disabled:opacity-40">Save rules</button>
    </form>
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
  return (
    <div>
      <h1 className="text-3xl font-black">Users</h1>
      <form className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-[#10192b] p-4 sm:grid-cols-2" onSubmit={async (event) => {
        event.preventDefault();
        try {
          await desk('/api/users', { body: { username, password, role: nextRole } });
          const data = await desk('/api/users');
          setUsers(data.users);
          setUsername('');
          setPassword('');
          onMessage('Account created.');
        } catch (reason) {
          onError(reason instanceof Error ? reason.message : 'Could not create the account.');
        }
      }}>
        <label className="text-xs font-bold text-white/45">Username<input className={inputClass} value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label className="text-xs font-bold text-white/45">Password<input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <Select label="Role" value={nextRole} onChange={(value) => setNextRole(value as Role)} options={['super_admin', 'match_admin', 'competition_manager', 'team_manager', 'reader'].map((id) => ({ id, label: id.replaceAll('_', ' ') }))} />
        <button type="submit" className="self-end rounded-xl bg-[#f5c518] px-4 py-2 text-sm font-black text-[#102018]">Create</button>
      </form>
      <ul className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/10">
        {users.map((account) => <li key={account.id} className="flex justify-between px-3 py-2 text-sm"><span>{account.username}</span><span className="text-white/40">{account.role.replaceAll('_', ' ')}</span></li>)}
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
