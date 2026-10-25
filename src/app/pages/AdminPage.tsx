import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Newspaper,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Timer,
  Trash2,
  Users,
} from 'lucide-react';
import { BrandLockup } from '../components/BrandLockup';
import { DepartmentMark } from '../components/DepartmentMark';
import { MatchControl } from '../components/MatchControl';
import {
  deleteArticle,
  deleteDepartment,
  deleteFixture,
  deletePlayer,
  resetLeague,
  saveArticle,
  saveDepartment,
  formatMatchClock,
  saveFixture,
  savePlayer,
} from '../../data/editor';
import { useMatchClock } from '../useMatchClock';
import { newsArticles, type NewsArticle } from '../../data/news';
import {
  GROUP_COLLEGES,
  GROUPS,
  departments,
  fixtures,
  getDepartment,
  players,
  standingsFor,
  type Department,
  type Fixture,
  type GroupId,
  type MatchStatus,
  type Player,
} from '../../data/supercup';

const SESSION_KEY = 'ddu-admin-session';
const PASSWORD = 'supercup';

type Section = 'overview' | 'teams' | 'players' | 'matches' | 'news';
type Tone = 'ok' | 'bad';

interface Notice {
  tone: Tone;
  text: string;
}

interface ConfirmState {
  title: string;
  body: string;
  action: () => void;
}

const NAV: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'teams', label: 'Teams', icon: Shield },
  { id: 'players', label: 'Players', icon: Users },
  { id: 'matches', label: 'Matches', icon: Calendar },
  { id: 'news', label: 'News', icon: Newspaper },
];

function LiveClock({ id }: { id: string }) {
  const clock = useMatchClock(id);
  return <>{clock ? formatMatchClock(clock) : '00:00'}</>;
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-white/10 bg-[#0c1424] px-3 py-2.5 text-sm text-white outline-none focus:border-[#f5c518]/70';

export function AdminPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [section, setSection] = useState<Section>('overview');
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [teamGroup, setTeamGroup] = useState<'all' | GroupId>('all');
  const [matchStatus, setMatchStatus] = useState<'all' | MatchStatus>('all');
  const [focusMatchId, setFocusMatchId] = useState<string | null>(null);

  const refresh = () => setRevision((value) => value + 1);
  const notify = (text: string, tone: Tone = 'ok') => setNotice({ text, tone });

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (!authed) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <form
          className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#10192b] p-6"
          onSubmit={(event) => {
            event.preventDefault();
            if (password.trim() !== PASSWORD) {
              setLoginError('Wrong password.');
              return;
            }
            sessionStorage.setItem(SESSION_KEY, '1');
            setAuthed(true);
          }}
        >
          <BrandLockup />
          <h1 className="mt-6 text-2xl font-black text-white">Admin desk</h1>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Manage teams, players, matches, and news. Changes stay in this browser.
          </p>
          <p className="mt-3 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/70">
            Password: <span className="font-bold text-[#f5c518]">{PASSWORD}</span>
          </p>
          <label className="mt-4 block text-xs font-semibold text-white/50">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClass}
              autoComplete="current-password"
            />
          </label>
          {loginError && <p className="mt-2 text-sm text-red-300">{loginError}</p>}
          <button type="submit" className="mt-4 w-full rounded-xl bg-[#f5c518] py-2.5 text-sm font-black text-[#102018]">
            Enter desk
          </button>
        </form>
      </div>
    );
  }

  const counts = {
    overview: null,
    teams: departments.length,
    players: players.length,
    matches: fixtures.length,
    news: newsArticles.length,
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]" data-revision={revision}>
      <aside className="border-b border-white/10 bg-[#0b1220] lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-4 lg:block">
          <BrandLockup size="sm" onClick={() => navigate('/')} />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-3 lg:pb-0" aria-label="Admin sections">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            const count = counts[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold lg:w-full ${
                  active ? 'bg-[#f5c518] text-[#102018]' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {count !== null && (
                  <span className={`ml-auto text-xs ${active ? 'text-[#102018]/70' : 'text-white/35'}`}>{count}</span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="hidden px-3 py-4 lg:block">
          <button
            type="button"
            onClick={() => {
              setConfirm({
                title: 'Restore original data?',
                body: 'Teams, players, matches, and news in this browser go back to the sample league.',
                action: () => {
                  resetLeague();
                  refresh();
                  notify('Original league restored.');
                },
              });
            }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-white/45 hover:bg-white/5 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            Restore original
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 lg:px-8">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">SUPER CUP DESK</p>
            <p className="text-sm text-white/45">Saved in this browser</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white/60 hover:bg-white/5 hover:text-white"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View site
            </button>
            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem(SESSION_KEY);
                setAuthed(false);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white/60 hover:bg-white/5 hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </header>

        <div className="px-4 py-5 lg:px-8 lg:py-6">
          {notice && (
            <p
              role="status"
              className={`mb-4 rounded-xl px-3 py-2 text-sm ${notice.tone === 'ok' ? 'bg-[#2f9e44]/15 text-[#7ddea0]' : 'bg-red-500/10 text-red-300'}`}
            >
              {notice.text}
            </p>
          )}

          {section === 'overview' && (
            <Overview
              onOpen={(next) => setSection(next)}
              onGroup={(group) => {
                setTeamGroup(group);
                setSection('teams');
              }}
              onStatus={(status) => {
                setMatchStatus(status);
                setSection('matches');
              }}
              onEditMatch={(id) => {
                setFocusMatchId(id);
                setSection('matches');
              }}
            />
          )}
          {section === 'teams' && (
            <TeamsPanel
              group={teamGroup}
              onGroup={setTeamGroup}
              refresh={refresh}
              notify={notify}
              ask={setConfirm}
            />
          )}
          {section === 'players' && <PlayersPanel refresh={refresh} notify={notify} ask={setConfirm} />}
          {section === 'matches' && (
            <MatchesPanel
              status={matchStatus}
              onStatus={setMatchStatus}
              focusId={focusMatchId}
              onFocused={() => setFocusMatchId(null)}
              refresh={refresh}
              notify={notify}
              ask={setConfirm}
            />
          )}
          {section === 'news' && <NewsPanel refresh={refresh} notify={notify} ask={setConfirm} />}

          <button
            type="button"
            onClick={() => {
              setConfirm({
                title: 'Restore original data?',
                body: 'Teams, players, matches, and news in this browser go back to the sample league.',
                action: () => {
                  resetLeague();
                  refresh();
                  notify('Original league restored.');
                },
              });
            }}
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white/40 lg:hidden"
          >
            <RotateCcw className="h-4 w-4" />
            Restore original data
          </button>
        </div>
      </div>

      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}>
          <p className="text-sm leading-6 text-white/60">{confirm.body}</p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                confirm.action();
                setConfirm(null);
              }}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white"
            >
              Confirm
            </button>
            <button type="button" onClick={() => setConfirm(null)} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white">
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Overview({
  onOpen,
  onGroup,
  onStatus,
  onEditMatch,
}: {
  onOpen: (section: Section) => void;
  onGroup: (group: GroupId) => void;
  onStatus: (status: MatchStatus) => void;
  onEditMatch: (id: string) => void;
}) {
  const live = fixtures.filter((fixture) => fixture.status === 'live');
  const upcoming = fixtures.filter((fixture) => fixture.status === 'upcoming').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Overview</h1>
        <p className="mt-1 text-sm text-white/50">The public site reads these same lists.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Teams" value={departments.length} hint="Departments" onClick={() => onOpen('teams')} />
        <Stat label="Players" value={players.length} hint="Season squads" onClick={() => onOpen('players')} />
        <Stat label="Matches" value={fixtures.length} hint={`${live.length} live · ${upcoming} upcoming`} onClick={() => onStatus('live')} />
        <Stat label="Stories" value={newsArticles.length} hint="Published on the site" onClick={() => onOpen('news')} />
      </div>

      <section>
        <SectionTitle title="Groups" meta="Top of the table" />
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map((group) => {
            const table = standingsFor(group);
            const leader = table[0];
            const started = table.some((row) => row.played > 0);
            return (
              <button
                key={group}
                type="button"
                onClick={() => onGroup(group)}
                className="rounded-2xl border border-white/10 bg-[#10192b] p-4 text-left hover:border-white/20"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold tracking-[0.14em] text-[#f5c518]">GROUP {group}</p>
                  <span className="text-xs text-white/35">{departments.filter((department) => department.group === group).length} teams</span>
                </div>
                <p className="mt-2 text-sm text-white/45">{GROUP_COLLEGES[group]}</p>
                <p className="mt-3 text-sm font-bold text-white">
                  {started && leader ? `${leader.department.shortName} · ${leader.points} pts` : 'No results yet'}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <SectionTitle title="Live" meta="Open a match to run the clock" />
        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#10192b]">
          {live.length === 0 && <p className="px-4 py-6 text-sm text-white/40">No live matches.</p>}
          {live.map((fixture) => {
            const home = getDepartment(fixture.homeId);
            const away = getDepartment(fixture.awayId);
            return (
              <button
                key={fixture.id}
                type="button"
                onClick={() => onEditMatch(fixture.id)}
                className="flex w-full items-center justify-between gap-3 border-b border-white/5 px-4 py-3 text-left last:border-b-0 hover:bg-white/[0.03]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-white">
                    {home?.shortName} {fixture.homeScore ?? 0}–{fixture.awayScore ?? 0} {away?.shortName}
                  </span>
                  <span className="text-xs text-white/40">
                    <LiveClock id={fixture.id} /> · Group {fixture.group}
                  </span>
                </span>
                <span className="rounded-full bg-[#2f9e44]/20 px-2 py-1 text-[11px] font-bold text-[#7ddea0]">LIVE</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function TeamsPanel({
  group,
  onGroup,
  refresh,
  notify,
  ask,
}: {
  group: 'all' | GroupId;
  onGroup: (group: 'all' | GroupId) => void;
  refresh: () => void;
  notify: (text: string, tone?: Tone) => void;
  ask: (state: ConfirmState) => void;
}) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Department | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');

  const needle = query.trim().toLowerCase();
  const rows = departments
    .filter((department) => group === 'all' || department.group === group)
    .filter((department) => !needle || `${department.name} ${department.shortName}`.toLowerCase().includes(needle))
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));

  const openNew = () => {
    setError('');
    setIsNew(true);
    setDraft({
      id: '',
      name: '',
      shortName: '',
      college: '',
      group: group === 'all' ? 'A' : group,
      color: '#2450c8',
      pitch: 'DDU Main Pitch',
    });
  };

  return (
    <section>
      <Toolbar title="Teams" meta={`${rows.length} shown`} action="New team" onAction={openNew} />
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <SearchBox value={query} onChange={setQuery} placeholder="Search departments" />
        <Chips
          value={group}
          onChange={(value) => onGroup(value as 'all' | GroupId)}
          options={[{ value: 'all', label: 'All' }, ...GROUPS.map((item) => ({ value: item, label: item }))]}
        />
      </div>
      <List head={['Team', 'Group', 'Squad', '']}>
        {rows.map((department) => {
          const squad = players.filter((player) => player.departmentId === department.id).length;
          return (
            <tr key={department.id} className="border-b border-white/5 last:border-b-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <DepartmentMark shortName={department.shortName} color={department.color} size={36} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{department.name}</p>
                    <p className="text-xs text-white/40">{department.pitch}</p>
                  </div>
                </div>
              </td>
              <td className="px-3 py-3 text-sm text-white/70">Group {department.group}</td>
              <td className="px-3 py-3 text-sm text-white/50">{squad}</td>
              <td className="px-3 py-3">
                <Actions
                  onEdit={() => {
                    setError('');
                    setIsNew(false);
                    setDraft({ ...department });
                  }}
                  onDelete={() => {
                    const used = fixtures.some((fixture) => fixture.homeId === department.id || fixture.awayId === department.id);
                    if (used) {
                      notify('Delete this team’s matches before deleting the team.', 'bad');
                      return;
                    }
                    ask({
                      title: `Delete ${department.name}?`,
                      body: 'The squad is removed with the department.',
                      action: () => {
                        const result = deleteDepartment(department.id);
                        if (!result.ok) {
                          notify(result.error, 'bad');
                          return;
                        }
                        refresh();
                        notify('Team removed.');
                      },
                    });
                  }}
                />
              </td>
            </tr>
          );
        })}
      </List>
      {rows.length === 0 && <Empty text="No teams match this search." />}

      {draft && (
        <Modal title={isNew ? 'New team' : 'Edit team'} onClose={() => setDraft(null)}>
          <div className="space-y-3">
            <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
            <Field label="Short name" value={draft.shortName} onChange={(shortName) => setDraft({ ...draft, shortName })} />
            <Select
              label="Group"
              value={draft.group}
              onChange={(value) => setDraft({ ...draft, group: value as GroupId })}
              options={GROUPS.map((item) => ({ value: item, label: `Group ${item} · ${GROUP_COLLEGES[item]}` }))}
            />
            <Field label="Pitch" value={draft.pitch} onChange={(pitch) => setDraft({ ...draft, pitch })} />
            <label className="block text-xs font-semibold text-white/50">
              Color
              <input
                type="color"
                value={draft.color}
                onChange={(event) => setDraft({ ...draft, color: event.target.value })}
                className="mt-1.5 h-10 w-full rounded-xl bg-transparent"
              />
            </label>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <SaveRow
              onSave={() => {
                const result = saveDepartment(draft, isNew);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setDraft(null);
                refresh();
                notify(isNew ? 'Team created.' : 'Team updated.');
              }}
              onCancel={() => setDraft(null)}
            />
          </div>
        </Modal>
      )}
    </section>
  );
}

function PlayersPanel({
  refresh,
  notify,
  ask,
}: {
  refresh: () => void;
  notify: (text: string, tone?: Tone) => void;
  ask: (state: ConfirmState) => void;
}) {
  const [teamId, setTeamId] = useState(departments[0]?.id ?? '');
  const [position, setPosition] = useState<'all' | Player['position']>('all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Player | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');

  const teamOptions = departments.map((department) => ({ value: department.id, label: department.name }));
  const needle = query.trim().toLowerCase();
  const rows = players
    .filter((player) => !teamId || player.departmentId === teamId)
    .filter((player) => position === 'all' || player.position === position)
    .filter((player) => !needle || player.name.toLowerCase().includes(needle))
    .sort((a, b) => a.number - b.number || a.name.localeCompare(b.name));

  return (
    <section>
      <Toolbar
        title="Players"
        meta="Goals and assists here are season totals"
        action="New player"
        onAction={() => {
          setError('');
          setIsNew(true);
          setDraft({ id: '', name: '', position: 'MID', number: 12, departmentId: teamId, goals: 0, assists: 0 });
        }}
      />
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_220px]">
        <SearchBox value={query} onChange={setQuery} placeholder="Search players" />
        <Select value={teamId} onChange={setTeamId} options={teamOptions} />
      </div>
      <div className="mt-2">
        <Chips
          value={position}
          onChange={(value) => setPosition(value as 'all' | Player['position'])}
          options={['all', 'GK', 'DEF', 'MID', 'FWD'].map((item) => ({ value: item, label: item === 'all' ? 'All' : item }))}
        />
      </div>
      <List head={['#', 'Player', 'Pos', 'G', 'A', '']}>
        {rows.map((player) => {
          const team = getDepartment(player.departmentId);
          return (
            <tr key={player.id} className="border-b border-white/5 last:border-b-0">
              <td className="px-4 py-3 text-sm font-bold text-white/50">{player.number}</td>
              <td className="px-3 py-3">
                <p className="text-sm font-bold text-white">{player.name}</p>
                <p className="text-xs text-white/40">{team?.shortName ?? 'No team'}</p>
              </td>
              <td className="px-3 py-3 text-sm text-white/70">{player.position}</td>
              <td className="px-3 py-3 text-sm text-white">{player.goals}</td>
              <td className="px-3 py-3 text-sm text-white">{player.assists}</td>
              <td className="px-3 py-3">
                <Actions
                  onEdit={() => {
                    setError('');
                    setIsNew(false);
                    setDraft({ ...player });
                  }}
                  onDelete={() => {
                    ask({
                      title: `Delete ${player.name}?`,
                      body: 'The player leaves the squad. Match scores stay as they are.',
                      action: () => {
                        deletePlayer(player.id);
                        refresh();
                        notify('Player removed.');
                      },
                    });
                  }}
                />
              </td>
            </tr>
          );
        })}
      </List>
      {rows.length === 0 && <Empty text="No players match this filter." />}

      {draft && (
        <Modal title={isNew ? 'New player' : 'Edit player'} onClose={() => setDraft(null)}>
          <div className="space-y-3">
            <p className="text-xs leading-5 text-white/45">
              Season goals and assists feed Statistics. Ball and boot marks on a lineup follow that match’s score.
            </p>
            <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
            <Select label="Team" value={draft.departmentId} onChange={(departmentId) => setDraft({ ...draft, departmentId })} options={teamOptions} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Number" value={String(draft.number)} onChange={(number) => setDraft({ ...draft, number: Number(number) })} type="number" />
              <Select
                label="Position"
                value={draft.position}
                onChange={(value) => setDraft({ ...draft, position: value as Player['position'] })}
                options={['GK', 'DEF', 'MID', 'FWD'].map((item) => ({ value: item, label: item }))}
              />
              <Field label="Goals" value={String(draft.goals)} onChange={(goals) => setDraft({ ...draft, goals: Number(goals) })} type="number" />
              <Field label="Assists" value={String(draft.assists)} onChange={(assists) => setDraft({ ...draft, assists: Number(assists) })} type="number" />
            </div>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <SaveRow
              onSave={() => {
                const result = savePlayer(draft, isNew);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setTeamId(draft.departmentId);
                setDraft(null);
                refresh();
                notify(isNew ? 'Player created.' : 'Player updated.');
              }}
              onCancel={() => setDraft(null)}
            />
          </div>
        </Modal>
      )}
    </section>
  );
}

function MatchesPanel({
  status,
  onStatus,
  focusId,
  onFocused,
  refresh,
  notify,
  ask,
}: {
  status: 'all' | MatchStatus;
  onStatus: (status: 'all' | MatchStatus) => void;
  focusId: string | null;
  onFocused: () => void;
  refresh: () => void;
  notify: (text: string, tone?: Tone) => void;
  ask: (state: ConfirmState) => void;
}) {
  const [group, setGroup] = useState<'all' | GroupId>('all');
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Fixture | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const [controlId, setControlId] = useState<string | null>(null);
  const teamOptions = departments.map((department) => ({ value: department.id, label: `${department.shortName} · ${department.name}` }));

  useEffect(() => {
    if (!focusId) return;
    const fixture = fixtures.find((item) => item.id === focusId);
    if (!fixture || fixture.status === 'finished') notify('Full-time matches are locked.', 'bad');
    else setControlId(fixture.id);
    onFocused();
  }, [focusId, notify, onFocused]);

  const needle = query.trim().toLowerCase();
  const rows = [...fixtures]
    .filter((fixture) => status === 'all' || fixture.status === status)
    .filter((fixture) => group === 'all' || fixture.group === group)
    .filter((fixture) => {
      if (!needle) return true;
      const home = getDepartment(fixture.homeId);
      const away = getDepartment(fixture.awayId);
      return `${home?.name ?? ''} ${home?.shortName ?? ''} ${away?.name ?? ''} ${away?.shortName ?? ''}`.toLowerCase().includes(needle);
    })
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`) || a.group.localeCompare(b.group));

  const blank = (): Fixture => ({
    id: '',
    group: departments[0]?.group ?? 'A',
    matchday: 1,
    date: new Date().toISOString().slice(0, 10),
    time: '15:00',
    stadium: departments[0]?.pitch ?? 'DDU Main Pitch',
    homeId: departments[0]?.id ?? '',
    awayId: departments[1]?.id ?? '',
    status: 'upcoming',
  });

  return (
    <section>
      <Toolbar
        title="Matches"
        meta="Schedule the fixture, then run the clock to 90:00"
        action="New match"
        onAction={() => {
          setError('');
          setIsNew(true);
          setDraft(blank());
        }}
      />
      <div className="mt-4">
        <SearchBox value={query} onChange={setQuery} placeholder="Search teams" />
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <Chips
          value={status}
          onChange={(value) => onStatus(value as 'all' | MatchStatus)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'live', label: 'Live' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'finished', label: 'Finished' },
          ]}
        />
        <Chips
          value={group}
          onChange={(value) => setGroup(value as 'all' | GroupId)}
          options={[{ value: 'all', label: 'Groups' }, ...GROUPS.map((item) => ({ value: item, label: item }))]}
        />
      </div>
      <List head={['Fixture', 'Score', 'Status', '']}>
        {rows.map((fixture) => {
          const home = getDepartment(fixture.homeId);
          const away = getDepartment(fixture.awayId);
          const score = fixture.status === 'upcoming' ? fixture.time : `${fixture.homeScore ?? 0}–${fixture.awayScore ?? 0}`;
          return (
            <tr key={fixture.id} className="border-b border-white/5 last:border-b-0">
              <td className="px-4 py-3">
                <p className="text-sm font-bold text-white">
                  {home?.shortName ?? '—'} vs {away?.shortName ?? '—'}
                </p>
                <p className="text-xs text-white/40">
                  {fixture.date} · MD{fixture.matchday} · Group {fixture.group}
                </p>
              </td>
              <td className="px-3 py-3 text-sm font-bold text-white">{score}</td>
              <td className="px-3 py-3">
                <StatusPill status={fixture.status} />
              </td>
              <td className="px-3 py-3">
                <div className="flex justify-end">
                  {fixture.status === 'finished' ? (
                    <button
                      type="button"
                      aria-label="Match locked"
                      onClick={() => notify('Full-time matches are locked.', 'bad')}
                      className="rounded-lg p-2 text-white/35"
                    >
                      <Lock className="h-4 w-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label="Control match"
                        onClick={() => setControlId(fixture.id)}
                        className="rounded-lg p-2 text-[#7ddea0] hover:bg-[#2f9e44]/10"
                      >
                        <Timer className="h-4 w-4" />
                      </button>
                      {fixture.status === 'upcoming' && (
                        <button
                          type="button"
                          aria-label="Edit"
                          onClick={() => {
                            setError('');
                            setIsNew(false);
                            setDraft({ ...fixture });
                          }}
                          className="rounded-lg p-2 text-[#f5c518] hover:bg-[#f5c518]/10"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Delete"
                        onClick={() => {
                          ask({
                            title: 'Delete this match?',
                            body: 'The fixture leaves the list and the group table.',
                            action: () => {
                              const result = deleteFixture(fixture.id);
                              if (!result.ok) {
                                notify(result.error, 'bad');
                                return;
                              }
                              refresh();
                              notify('Match removed.');
                            },
                          });
                        }}
                        className="rounded-lg p-2 text-red-300 hover:bg-red-400/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </List>
      {rows.length === 0 && <Empty text="No matches match this filter." />}

      {draft && (
        <Modal title={isNew ? 'New match' : 'Edit match'} onClose={() => setDraft(null)}>
          <div className="space-y-3">
            <Select label="Home" value={draft.homeId} onChange={(homeId) => setDraft({ ...draft, homeId })} options={teamOptions} />
            <Select label="Away" value={draft.awayId} onChange={(awayId) => setDraft({ ...draft, awayId })} options={teamOptions} />
            <p className="text-xs leading-5 text-white/45">Kickoff, the clock, and the score are run from the match control. This form only schedules the fixture.</p>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Matchday"
                value={String(draft.matchday)}
                onChange={(matchday) => setDraft({ ...draft, matchday: Number(matchday) as 1 | 2 | 3 })}
                options={[
                  { value: '1', label: 'Matchday 1' },
                  { value: '2', label: 'Matchday 2' },
                  { value: '3', label: 'Matchday 3' },
                ]}
              />
              <Field label="Date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} type="date" />
              <Field label="Kickoff" value={draft.time} onChange={(time) => setDraft({ ...draft, time })} type="time" />
            </div>
            <Field label="Stadium" value={draft.stadium} onChange={(stadium) => setDraft({ ...draft, stadium })} />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <SaveRow
              onSave={() => {
                const result = saveFixture(draft, isNew);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setDraft(null);
                refresh();
                notify(isNew ? 'Match created.' : 'Match updated.');
              }}
              onCancel={() => setDraft(null)}
            />
          </div>
        </Modal>
      )}
      {controlId && <MatchControl id={controlId} onClose={() => setControlId(null)} onChange={refresh} />}
    </section>
  );
}

function NewsPanel({
  refresh,
  notify,
  ask,
}: {
  refresh: () => void;
  notify: (text: string, tone?: Tone) => void;
  ask: (state: ConfirmState) => void;
}) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<NewsArticle | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const needle = query.trim().toLowerCase();
  const rows = newsArticles.filter((article) => !needle || `${article.title} ${article.summary}`.toLowerCase().includes(needle));

  return (
    <section>
      <Toolbar
        title="News"
        meta={`${rows.length} stories`}
        action="New story"
        onAction={() => {
          setError('');
          setIsNew(true);
          setDraft({ id: '', title: '', category: 'News', time: 'Today', summary: '', body: '' });
        }}
      />
      <div className="mt-4">
        <SearchBox value={query} onChange={setQuery} placeholder="Search stories" />
      </div>
      <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#10192b]">
        {rows.map((article) => (
          <div key={article.id} className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{article.title}</p>
              <p className="truncate text-xs text-white/40">
                {article.category} · {article.time}
              </p>
            </div>
            <Actions
              onEdit={() => {
                setError('');
                setIsNew(false);
                setDraft({ ...article });
              }}
              onDelete={() => {
                ask({
                  title: 'Delete this story?',
                  body: article.title,
                  action: () => {
                    deleteArticle(article.id);
                    refresh();
                    notify('Story removed.');
                  },
                });
              }}
            />
          </div>
        ))}
        {rows.length === 0 && <p className="px-4 py-6 text-sm text-white/40">No stories match this search.</p>}
      </div>

      {draft && (
        <Modal title={isNew ? 'New story' : 'Edit story'} onClose={() => setDraft(null)}>
          <div className="space-y-3">
            <Field label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
              <Field label="Time label" value={draft.time} onChange={(time) => setDraft({ ...draft, time })} />
            </div>
            <Field label="Summary" value={draft.summary} onChange={(summary) => setDraft({ ...draft, summary })} />
            <label className="block text-xs font-semibold text-white/50">
              Story
              <textarea
                value={draft.body}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                rows={6}
                className={inputClass}
              />
            </label>
            {error && <p className="text-sm text-red-300">{error}</p>}
            <SaveRow
              onSave={() => {
                const result = saveArticle(draft, isNew);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                setDraft(null);
                refresh();
                notify(isNew ? 'Story published.' : 'Story updated.');
              }}
              onCancel={() => setDraft(null)}
            />
          </div>
        </Modal>
      )}
    </section>
  );
}

function Stat({ label, value, hint, onClick }: { label: string; value: number; hint: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-white/10 bg-[#10192b] p-4 text-left hover:border-[#f5c518]/40">
      <p className="text-[11px] font-bold tracking-[0.14em] text-white/40">{label.toUpperCase()}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-white/45">{hint}</p>
    </button>
  );
}

function SectionTitle({ title, meta }: { title: string; meta: string }) {
  return (
    <div>
      <h2 className="text-lg font-black text-white">{title}</h2>
      <p className="text-xs text-white/40">{meta}</p>
    </div>
  );
}

function Toolbar({ title, meta, action, onAction }: { title: string; meta: string; action: string; onAction: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black text-white">{title}</h1>
        <p className="mt-1 text-sm text-white/45">{meta}</p>
      </div>
      <button type="button" onClick={onAction} className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5c518] px-3 py-2 text-xs font-black text-[#102018]">
        <Plus className="h-3.5 w-3.5" />
        {action}
      </button>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="relative block min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-[#10192b] py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-[#f5c518]/70"
      />
    </label>
  );
}

function Chips({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex gap-1 overflow-x-auto">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
            value === option.value ? 'bg-[#f5c518] text-[#102018]' : 'bg-white/5 text-white/55'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function List({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-[#10192b]">
      <table className="w-full min-w-[520px] text-left">
        <thead>
          <tr className="border-b border-white/10">
            {head.map((label, index) => (
              <th key={`${label}-${index}`} className="px-3 py-2 text-[11px] font-semibold tracking-[0.12em] text-white/35 first:pl-4">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Actions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end">
      <button type="button" aria-label="Edit" onClick={onEdit} className="rounded-lg p-2 text-[#f5c518] hover:bg-[#f5c518]/10">
        <Pencil className="h-4 w-4" />
      </button>
      <button type="button" aria-label="Delete" onClick={onDelete} className="rounded-lg p-2 text-red-300 hover:bg-red-400/10">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function StatusPill({ status }: { status: MatchStatus }) {
  const styles = {
    live: 'bg-[#2f9e44]/20 text-[#7ddea0]',
    upcoming: 'bg-[#f5c518]/15 text-[#f5c518]',
    finished: 'bg-white/10 text-white/60',
  };
  const labels = { live: 'Live', upcoming: 'Upcoming', finished: 'Full time' };
  return <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${styles[status]}`}>{labels[status]}</span>;
}

function Empty({ text }: { text: string }) {
  return <p className="mt-3 text-center text-sm text-white/40">{text}</p>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="desk-dialog-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#10192b] p-5 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="desk-dialog-title" className="text-lg font-black text-white">
          {title}
        </h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function SaveRow({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onSave} className="rounded-xl bg-[#f5c518] px-4 py-2 text-sm font-black text-[#102018]">
        Save
      </button>
      <button type="button" onClick={onCancel} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white">
        Cancel
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-xs font-semibold text-white/50">
      {label}
      <input type={type} value={value} min={type === 'number' ? 0 : undefined} onChange={(event) => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label?: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block text-xs font-semibold text-white/50">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className={label ? inputClass : inputClass.replace('mt-1.5 ', '')}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
