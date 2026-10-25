import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  deleteArticle,
  deleteDepartment,
  deleteFixture,
  deletePlayer,
  resetLeague,
  saveArticle,
  saveDepartment,
  saveFixture,
  savePlayer,
} from '../../data/editor';
import { newsArticles, type NewsArticle } from '../../data/news';
import {
  GROUPS,
  departments,
  fixtures,
  players,
  type Department,
  type Fixture,
  type GroupId,
  type MatchStatus,
  type Player,
} from '../../data/supercup';

const SESSION_KEY = 'ddu-admin-session';
const PASSWORD = 'supercup';

type Section = 'teams' | 'players' | 'matches' | 'news';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'teams', label: 'Teams' },
  { id: 'players', label: 'Players' },
  { id: 'matches', label: 'Matches' },
  { id: 'news', label: 'News' },
];

export function AdminPage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [section, setSection] = useState<Section>('teams');
  const [revision, setRevision] = useState(0);

  const refresh = () => setRevision((value) => value + 1);

  if (!authed) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <form
          className="rounded-3xl border border-white/10 bg-[#10192b] p-6"
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
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">SUPER CUP DESK</p>
          <h1 className="mt-2 text-2xl font-black text-white">Admin</h1>
          <p className="mt-2 text-sm text-white/55">Password: {PASSWORD}</p>
          <label className="mt-5 block text-xs font-semibold text-white/50">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#0c1424] px-3 py-2 text-sm text-white outline-none"
            />
          </label>
          {loginError && <p className="mt-2 text-sm text-red-400">{loginError}</p>}
          <button type="submit" className="mt-4 w-full rounded-xl bg-[#f5c518] py-2.5 text-sm font-black text-[#102018]">
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-5" data-revision={revision}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">SUPER CUP DESK</p>
          <h1 className="mt-1 text-3xl font-black text-white">Admin</h1>
          <p className="mt-1 text-sm text-white/50">Edits save in this browser and show on the public pages.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem(SESSION_KEY);
            setAuthed(false);
          }}
          className="text-sm font-semibold text-white/50"
        >
          Sign out
        </button>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-[#10192b] p-1">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            className={`rounded-xl py-2 text-xs font-bold sm:text-sm ${section === item.id ? 'bg-[#f5c518] text-[#102018]' : 'text-white/50'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {section === 'teams' && <TeamsPanel onChange={refresh} />}
        {section === 'players' && <PlayersPanel onChange={refresh} />}
        {section === 'matches' && <MatchesPanel onChange={refresh} />}
        {section === 'news' && <NewsPanel onChange={refresh} />}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <button type="button" onClick={() => navigate('/')} className="text-sm font-semibold text-white/50">
          View site
        </button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm('Restore the original Super Cup data? Your edits in this browser will be removed.')) return;
            resetLeague();
            refresh();
          }}
          className="text-sm font-semibold text-red-400"
        >
          Restore original data
        </button>
      </div>
    </div>
  );
}

function TeamsPanel({ onChange }: { onChange: () => void }) {
  const [draft, setDraft] = useState<Department | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');

  const openNew = () => {
    setError('');
    setIsNew(true);
    setDraft({
      id: '',
      name: '',
      shortName: '',
      college: '',
      group: 'A',
      color: '#2450c8',
      pitch: 'DDU Main Pitch',
    });
  };

  return (
    <section className="space-y-3">
      <PanelHead title="Departments" action="New team" onAction={openNew} />
      {draft && (
        <FormCard
          title={isNew ? 'New team' : 'Edit team'}
          error={error}
          onCancel={() => setDraft(null)}
          onSave={() => {
            const result = saveDepartment(draft, isNew);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setDraft(null);
            onChange();
          }}
        >
          <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <Field label="Short name" value={draft.shortName} onChange={(shortName) => setDraft({ ...draft, shortName })} />
          <Select label="Group" value={draft.group} onChange={(group) => setDraft({ ...draft, group: group as GroupId })} options={GROUPS.map((group) => ({ value: group, label: `Group ${group}` }))} />
          <Field label="Pitch" value={draft.pitch} onChange={(pitch) => setDraft({ ...draft, pitch })} />
          <label className="block text-xs font-semibold text-white/50">
            Color
            <input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} className="mt-1 h-10 w-full rounded-xl bg-transparent" />
          </label>
        </FormCard>
      )}
      {departments.map((department) => (
        <Row
          key={department.id}
          title={department.name}
          meta={`${department.shortName} · Group ${department.group}`}
          onEdit={() => {
            setError('');
            setIsNew(false);
            setDraft({ ...department });
          }}
          onDelete={() => {
            const result = deleteDepartment(department.id);
            if (!result.ok) {
              window.alert(result.error);
              return;
            }
            onChange();
          }}
        />
      ))}
    </section>
  );
}

function PlayersPanel({ onChange }: { onChange: () => void }) {
  const [teamId, setTeamId] = useState(departments[0]?.id ?? '');
  const [draft, setDraft] = useState<Player | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const squad = players.filter((player) => player.departmentId === teamId).sort((a, b) => a.number - b.number);

  const blank = (): Player => ({
    id: '',
    name: '',
    position: 'MID',
    number: 12,
    departmentId: teamId,
    goals: 0,
    assists: 0,
  });

  return (
    <section className="space-y-3">
      <PanelHead title="Players" action="New player" onAction={() => { setError(''); setIsNew(true); setDraft(blank()); }} />
      <Select
        label="Team"
        value={teamId}
        onChange={setTeamId}
        options={departments.map((department) => ({ value: department.id, label: department.name }))}
      />
      {draft && (
        <FormCard
          title={isNew ? 'New player' : 'Edit player'}
          error={error}
          onCancel={() => setDraft(null)}
          onSave={() => {
            const result = savePlayer(draft, isNew);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setTeamId(draft.departmentId);
            setDraft(null);
            onChange();
          }}
        >
          <Field label="Name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
          <Select label="Team" value={draft.departmentId} onChange={(departmentId) => setDraft({ ...draft, departmentId })} options={departments.map((department) => ({ value: department.id, label: department.name }))} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Number" value={String(draft.number)} onChange={(number) => setDraft({ ...draft, number: Number(number) })} />
            <Select label="Position" value={draft.position} onChange={(position) => setDraft({ ...draft, position: position as Player['position'] })} options={['GK', 'DEF', 'MID', 'FWD'].map((position) => ({ value: position, label: position }))} />
            <Field label="Goals" value={String(draft.goals)} onChange={(goals) => setDraft({ ...draft, goals: Number(goals) })} />
            <Field label="Assists" value={String(draft.assists)} onChange={(assists) => setDraft({ ...draft, assists: Number(assists) })} />
          </div>
        </FormCard>
      )}
      {squad.map((player) => (
        <Row
          key={player.id}
          title={`${player.number} ${player.name}`}
          meta={`${player.position} · ${player.goals} ${player.goals === 1 ? 'goal' : 'goals'} · ${player.assists} ${player.assists === 1 ? 'assist' : 'assists'}`}
          onEdit={() => { setError(''); setIsNew(false); setDraft({ ...player }); }}
          onDelete={() => { deletePlayer(player.id); onChange(); }}
        />
      ))}
      {squad.length === 0 && <p className="py-6 text-center text-sm text-white/40">No players for this team.</p>}
    </section>
  );
}

function MatchesPanel({ onChange }: { onChange: () => void }) {
  const [draft, setDraft] = useState<Fixture | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');
  const teamOptions = departments.map((department) => ({ value: department.id, label: department.name }));
  const ordered = [...fixtures].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

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
    <section className="space-y-3">
      <PanelHead title="Matches" action="New match" onAction={() => { setError(''); setIsNew(true); setDraft(blank()); }} />
      {draft && (
        <FormCard
          title={isNew ? 'New match' : 'Edit match'}
          error={error}
          onCancel={() => setDraft(null)}
          onSave={() => {
            const result = saveFixture(draft, isNew);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setDraft(null);
            onChange();
          }}
        >
          <Select label="Home" value={draft.homeId} onChange={(homeId) => setDraft({ ...draft, homeId })} options={teamOptions} />
          <Select label="Away" value={draft.awayId} onChange={(awayId) => setDraft({ ...draft, awayId })} options={teamOptions} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Matchday" value={String(draft.matchday)} onChange={(matchday) => setDraft({ ...draft, matchday: Number(matchday) as 1 | 2 | 3 })} options={[{ value: '1', label: '1' }, { value: '2', label: '2' }, { value: '3', label: '3' }]} />
            <Select label="Status" value={draft.status} onChange={(status) => setDraft({ ...draft, status: status as MatchStatus })} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'live', label: 'Live' }, { value: 'finished', label: 'Full time' }]} />
            <Field label="Date" value={draft.date} onChange={(date) => setDraft({ ...draft, date })} type="date" />
            <Field label="Kickoff" value={draft.time} onChange={(time) => setDraft({ ...draft, time })} type="time" />
          </div>
          <Field label="Stadium" value={draft.stadium} onChange={(stadium) => setDraft({ ...draft, stadium })} />
          {draft.status !== 'upcoming' && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Home score" value={String(draft.homeScore ?? 0)} onChange={(homeScore) => setDraft({ ...draft, homeScore: Number(homeScore) })} />
              <Field label="Away score" value={String(draft.awayScore ?? 0)} onChange={(awayScore) => setDraft({ ...draft, awayScore: Number(awayScore) })} />
              {draft.status === 'live' && <Field label="Minute" value={String(draft.minute ?? 1)} onChange={(minute) => setDraft({ ...draft, minute: Number(minute) })} />}
            </div>
          )}
        </FormCard>
      )}
      {ordered.map((fixture) => {
        const home = departments.find((department) => department.id === fixture.homeId);
        const away = departments.find((department) => department.id === fixture.awayId);
        const score = fixture.status === 'upcoming' ? fixture.time : `${fixture.homeScore ?? 0}-${fixture.awayScore ?? 0}`;
        return (
          <Row
            key={fixture.id}
            title={`${home?.shortName ?? '?'} vs ${away?.shortName ?? '?'}`}
            meta={`Group ${fixture.group} · MD${fixture.matchday} · ${fixture.date} · ${score} · ${fixture.status}`}
            onEdit={() => { setError(''); setIsNew(false); setDraft({ ...fixture }); }}
            onDelete={() => { deleteFixture(fixture.id); onChange(); }}
          />
        );
      })}
    </section>
  );
}

function NewsPanel({ onChange }: { onChange: () => void }) {
  const [draft, setDraft] = useState<NewsArticle | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState('');

  const blank = (): NewsArticle => ({ id: '', title: '', category: 'News', time: 'Today', summary: '', body: '' });

  return (
    <section className="space-y-3">
      <PanelHead title="Stories" action="New story" onAction={() => { setError(''); setIsNew(true); setDraft(blank()); }} />
      {draft && (
        <FormCard
          title={isNew ? 'New story' : 'Edit story'}
          error={error}
          onCancel={() => setDraft(null)}
          onSave={() => {
            const result = saveArticle(draft, isNew);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setDraft(null);
            onChange();
          }}
        >
          <Field label="Title" value={draft.title} onChange={(title) => setDraft({ ...draft, title })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" value={draft.category} onChange={(category) => setDraft({ ...draft, category })} />
            <Field label="Time label" value={draft.time} onChange={(time) => setDraft({ ...draft, time })} />
          </div>
          <Field label="Summary" value={draft.summary} onChange={(summary) => setDraft({ ...draft, summary })} />
          <label className="block text-xs font-semibold text-white/50">
            Story
            <textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} rows={5} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0c1424] px-3 py-2 text-sm text-white outline-none" />
          </label>
        </FormCard>
      )}
      {newsArticles.map((article) => (
        <Row
          key={article.id}
          title={article.title}
          meta={`${article.category} · ${article.time}`}
          onEdit={() => { setError(''); setIsNew(false); setDraft({ ...article }); }}
          onDelete={() => { deleteArticle(article.id); onChange(); }}
        />
      ))}
    </section>
  );
}

function PanelHead({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <button type="button" onClick={onAction} className="rounded-full bg-[#f5c518] px-3 py-1.5 text-xs font-black text-[#102018]">
        {action}
      </button>
    </div>
  );
}

function FormCard({
  title,
  error,
  onSave,
  onCancel,
  children,
}: {
  title: string;
  error: string;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-[#f5c518]/30 bg-[#10192b] p-4">
      <h3 className="text-sm font-black text-white">{title}</h3>
      {children}
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onSave} className="rounded-xl bg-[#f5c518] px-4 py-2 text-sm font-black text-[#102018]">Save</button>
        <button type="button" onClick={onCancel} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white">Cancel</button>
      </div>
    </div>
  );
}

function Row({ title, meta, onEdit, onDelete }: { title: string; meta: string; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#10192b] px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white">{title}</p>
        <p className="truncate text-[11px] text-white/40">{meta}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button type="button" onClick={onEdit} className="text-xs font-bold text-[#f5c518]">Edit</button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete ${title}?`)) onDelete();
          }}
          className="text-xs font-bold text-red-400"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label className="block text-xs font-semibold text-white/50">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0c1424] px-3 py-2 text-sm text-white outline-none" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block text-xs font-semibold text-white/50">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-[#0c1424] px-3 py-2 text-sm text-white outline-none">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
