import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, UserCheck, Award, MapPin, Users, Calendar, Search, Shield } from 'lucide-react';
import { MatchCard } from '../components/MatchCard';
import { DepartmentMark, Portrait } from '../components/DepartmentMark';
import { useLeagueVersion } from '../../data/live';
import {
  cardTeam,
  fixturesForDepartment,
  getDepartment,
  playersForDepartment,
  standingsFor,
  type Player,
} from '../../data/supercup';

type PositionFilter = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD';

export function TeamDetailsPage() {
  const version = useLeagueVersion();
  void version;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'squad' | 'fixtures'>('squad');
  const [posFilter, setPosFilter] = useState<PositionFilter>('ALL');
  const [search, setSearch] = useState('');

  const department = id ? getDepartment(id) : undefined;

  const squad = useMemo(() => {
    return department ? playersForDepartment(department.id) : [];
  }, [department]);

  const captain = useMemo(() => {
    return squad.find((p) => p.isCaptain) ?? squad.find((p) => p.position === 'FWD') ?? squad[0];
  }, [squad]);

  const matches = useMemo(() => {
    return department ? fixturesForDepartment(department.id) : [];
  }, [department]);

  const row = useMemo(() => {
    return department ? standingsFor(department.group).find((entry) => entry.department.id === department.id) : undefined;
  }, [department]);

  const filteredSquad = useMemo(() => {
    return squad.filter((p) => {
      if (p.registered === false) return false;
      if (posFilter !== 'ALL' && p.position !== posFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchNumber = String(p.number).includes(q);
        if (!matchName && !matchNumber) return false;
      }
      return true;
    });
  }, [squad, posFilter, search]);

  const squadByPosition = useMemo(() => {
    const order: PositionFilter[] = ['GK', 'DEF', 'MID', 'FWD'];
    const groups: { position: PositionFilter; label: string; players: Player[] }[] = [
      { position: 'GK', label: 'Goalkeepers', players: [] },
      { position: 'DEF', label: 'Defenders', players: [] },
      { position: 'MID', label: 'Midfielders', players: [] },
      { position: 'FWD', label: 'Forwards', players: [] },
    ];
    for (const p of filteredSquad) {
      const g = groups.find((grp) => grp.position === p.position);
      if (g) g.players.push(p);
    }
    return groups.filter((g) => g.players.length > 0);
  }, [filteredSquad]);

  if (!department) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 mb-4">
          <Shield className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-white">Team Not Found</h1>
        <p className="mt-2 text-sm text-white/50">
          We couldn&apos;t find a department matching &ldquo;{id}&rdquo;.
        </p>
        <button
          type="button"
          onClick={() => navigate('/discover?tab=teams')}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#f5c518] px-5 py-2.5 text-xs font-black text-[#102018] hover:bg-[#ffe27a] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Browse All Teams
        </button>
      </div>
    );
  }

  const coachName = department.coach?.trim();
  const coachPhoto = department.coachPhotoUrl?.trim();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      {/* Top Breadcrumb Nav */}
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/discover?tab=teams'))}
          className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/10 px-3 py-1 text-[11px] font-black text-[#f5c518] tracking-wider uppercase">
          Group {department.group}
        </span>
      </div>

      {/* Hero Profile Card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#131f37] to-[#0c1424] p-5 shadow-xl sm:p-6">
        {/* Ambient team color background glow */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full opacity-25 blur-3xl"
          style={{ background: department.color || '#2450c8' }}
        />

        <div className="relative z-10">
          {/* Header Row: Crest + Team Info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-white/10 bg-[#070d18]/80 p-2 shadow-md shrink-0">
                <DepartmentMark
                  id={department.id}
                  name={department.name}
                  shortName={department.shortName}
                  color={department.color}
                  size={60}
                  src={department.crestUrl || undefined}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
                    {department.name}
                  </h1>
                </div>
                <p className="mt-0.5 text-xs font-semibold text-white/60">
                  {department.shortName} · {department.college}
                </p>
              </div>
            </div>
          </div>

          {/* Key Facts Grid: Coach, Captain, Pitch */}
          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {/* Coach Card */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 backdrop-blur-sm transition hover:border-[#f5c518]/30 hover:bg-white/[0.08]">
              {coachPhoto ? (
                <div className="relative shrink-0">
                  <Portrait name={coachName || 'Coach'} src={coachPhoto} size={42} />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f5c518] text-[9px] font-black text-[#102018] shadow">
                    👔
                  </span>
                </div>
              ) : coachName ? (
                <div className="relative shrink-0">
                  <Portrait name={coachName} size={42} />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f5c518] text-[9px] font-black text-[#102018] shadow">
                    👔
                  </span>
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f5c518]/20 text-[#f5c518]">
                  <UserCheck className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Head Coach</p>
                  <span className="rounded bg-[#f5c518]/15 px-1 py-0.2 text-[9px] font-black text-[#f5c518]">TACTICIAN</span>
                </div>
                <p className="truncate text-sm font-bold text-white">
                  {coachName || <span className="text-white/45 italic">Not assigned</span>}
                </p>
              </div>
            </div>

            {/* Captain Card */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 backdrop-blur-sm transition hover:border-[#2450c8]/40 hover:bg-white/[0.08]">
              {captain?.photoUrl ? (
                <div className="relative shrink-0">
                  <Portrait name={captain.name} src={captain.photoUrl} size={42} id={captain.id} />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f5c518] text-[9px] font-black text-[#102018] shadow" title="Team Captain">
                    ©
                  </span>
                </div>
              ) : captain ? (
                <div className="relative shrink-0">
                  <Portrait name={captain.name} size={42} id={captain.id} />
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#f5c518] text-[9px] font-black text-[#102018] shadow" title="Team Captain">
                    ©
                  </span>
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2450c8]/25 text-[#60a5fa]">
                  <Award className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Team Captain</p>
                  <span className="rounded bg-[#f5c518]/20 px-1 py-0.2 text-[9px] font-black text-[#f5c518]">© CAPTAIN</span>
                </div>
                <p className="truncate text-sm font-bold text-white">
                  {captain ? (
                    <span>
                      {captain.name} <span className="text-[#f5c518] text-xs font-black">#{captain.number}</span>
                    </span>
                  ) : (
                    <span className="text-white/45 italic">TBA</span>
                  )}
                </p>
              </div>
            </div>

            {/* Home Pitch Card */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 backdrop-blur-sm transition hover:border-[#2f9e44]/40 hover:bg-white/[0.08]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2f9e44]/25 text-[#7ddea0]">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Home Pitch</p>
                <p className="truncate text-sm font-bold text-white">
                  {department.pitch || 'DDU Campus'}
                </p>
              </div>
            </div>
          </div>

          {/* Group Standing & Form Summary */}
          {row && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-[#070d18]/70 p-3.5">
              <div className="flex items-center justify-between border-b border-white/5 pb-2.5 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/70">Group {department.group} Standings</span>
                  {row.position > 0 && (
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-black text-[#f5c518]">
                      #{row.position}
                    </span>
                  )}
                </div>
                {row.form && row.form.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-white/40 mr-1">FORM</span>
                    {row.form.map((res, i) => (
                      <span
                        key={i}
                        className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${
                          res === 'W'
                            ? 'bg-[#2f9e44] text-white'
                            : res === 'D'
                            ? 'bg-amber-500 text-[#102018]'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {res}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-6 gap-2 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">P</p>
                  <p className="text-base font-black text-white">{row.played}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">W</p>
                  <p className="text-base font-black text-[#7ddea0]">{row.won}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">D</p>
                  <p className="text-base font-black text-white/80">{row.drawn}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">L</p>
                  <p className="text-base font-black text-rose-400">{row.lost}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">GD</p>
                  <p className="text-base font-black text-white">
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#f5c518]">PTS</p>
                  <p className="text-base font-black text-[#f5c518]">{row.points}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation: Squad vs Fixtures */}
      <div className="mt-6 flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('squad')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
            activeTab === 'squad'
              ? 'bg-[#f5c518] text-[#102018] shadow-sm'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Squad ({squad.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('fixtures')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
            activeTab === 'fixtures'
              ? 'bg-[#f5c518] text-[#102018] shadow-sm'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Fixtures ({matches.length})</span>
        </button>
      </div>

      {/* TAB CONTENT: SQUAD */}
      {activeTab === 'squad' && (
        <div className="mt-4 space-y-4">
          {/* Controls: Search + Position Filter */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search player or shirt #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#0c1424] py-2 pl-9 pr-3 text-xs text-white placeholder-white/35 outline-none focus:border-[#f5c518]/70"
              />
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'GK', 'DEF', 'MID', 'FWD'] as PositionFilter[]).map((pos) => {
                const active = posFilter === pos;
                return (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPosFilter(pos)}
                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase transition ${
                      active
                        ? 'bg-white/20 text-white font-black'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {pos}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grouped Position List */}
          {squadByPosition.length > 0 ? (
            squadByPosition.map(({ position, label, players: posPlayers }) => (
              <div key={position} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c1424]">
                <div className="flex items-center justify-between border-b border-white/10 bg-[#10192b] px-4 py-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-white/70">
                    {label}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-bold text-[#f5c518]">
                    {posPlayers.length}
                  </span>
                </div>

                <div className="divide-y divide-white/5">
                  {posPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/[0.02] transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Portrait name={player.name} src={player.photoUrl || undefined} size={36} id={player.id} />
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/10 text-xs font-black text-[#f5c518]">
                          {player.number}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="truncate text-sm font-bold text-white">{player.name}</p>
                            {player.isCaptain && (
                              <span
                                className="inline-flex items-center gap-0.5 rounded border border-[#f5c518]/40 bg-[#f5c518]/20 px-1.5 py-0.2 text-[9px] font-black text-[#f5c518] tracking-wider uppercase"
                                title="Team Captain"
                              >
                                © CAPTAIN
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-semibold text-white/40">
                            {player.position} · {player.appearances ?? 0} apps
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-white/80">
                          {player.goals} {player.goals === 1 ? 'goal' : 'goals'}
                        </p>
                        {player.assists ? (
                          <p className="text-[10px] text-white/40">{player.assists} assists</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0c1424] px-4 py-12 text-center">
              <Users className="mx-auto h-8 w-8 text-white/20 mb-2" />
              <p className="text-sm font-bold text-white/60">No players found</p>
              <p className="text-xs text-white/40 mt-1">
                {search ? `No players matching "${search}"` : 'No players registered in this squad.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: FIXTURES */}
      {activeTab === 'fixtures' && (
        <div className="mt-4 space-y-3">
          {matches.length > 0 ? (
            matches.map((fixture) => (
              <MatchCard
                key={fixture.id}
                id={fixture.id}
                homeTeam={cardTeam(fixture.homeId)}
                awayTeam={cardTeam(fixture.awayId)}
                homeScore={fixture.homeScore}
                awayScore={fixture.awayScore}
                status={fixture.status}
                time={`MD${fixture.matchday} · ${fixture.time}`}
                stadium={fixture.stadium}
                matchMinute={fixture.minute}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0c1424] px-4 py-12 text-center">
              <Calendar className="mx-auto h-8 w-8 text-white/20 mb-2" />
              <p className="text-sm font-bold text-white/60">No fixtures scheduled</p>
              <p className="text-xs text-white/40 mt-1">Matches for this team will appear here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
