import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { DepartmentMark } from './DepartmentMark';
import {
  HALF_SECONDS,
  MATCH_SECONDS,
  adjustScore,
  callHalfTime,
  formatMatchClock,
  fullTime,
  kickOff,
  setClockRunning,
} from '../../data/editor';
import { getDepartment, getFixture } from '../../data/supercup';
import { useMatchClock } from '../useMatchClock';

export function MatchControl({ id, onClose, onChange }: { id: string; onClose: () => void; onChange: () => void }) {
  const [error, setError] = useState('');
  const [ending, setEnding] = useState(false);
  const clock = useMatchClock(id, onChange);
  const fixture = getFixture(id);
  const home = fixture ? getDepartment(fixture.homeId) : undefined;
  const away = fixture ? getDepartment(fixture.awayId) : undefined;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!fixture || !home || !away) return null;

  const run = (action: () => { ok: boolean; error?: string }) => {
    const result = action();
    if (!result.ok) {
      setError(result.error ?? 'Could not update the match.');
      return;
    }
    setError('');
    setEnding(false);
    onChange();
  };

  const locked = fixture.status === 'finished';
  const live = fixture.status === 'live';
  const shown = clock ?? { total: (fixture.minute ?? 0) * 60, minute: fixture.minute ?? 0, seconds: 0, running: false };
  const atHalf = live && !shown.running && shown.total === HALF_SECONDS;
  const period = locked
    ? 'Full time'
    : !live
      ? 'Kickoff'
      : atHalf
        ? 'Half time'
        : shown.minute < 45
          ? shown.running
            ? 'First half'
            : 'First half paused'
          : shown.running
            ? 'Second half'
            : 'Second half paused';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-control-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#10192b] p-5 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p id="match-control-title" className="text-[11px] font-bold tracking-[0.16em] text-[#f5c518]">
              MATCH CONTROL
            </p>
            <p className="mt-1 text-sm text-white/45">
              Group {fixture.group} · MD{fixture.matchday} · {fixture.stadium}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-white/45">
            Close
          </button>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamScore
            name={home.shortName}
            color={home.color}
            score={fixture.homeScore ?? 0}
            disabled={!live}
            onAdd={() => run(() => adjustScore(id, 'home', 1))}
            onUndo={() => run(() => adjustScore(id, 'home', -1))}
          />
          <div className="text-center">
            <p className={`font-mono text-4xl font-black tabular-nums ${shown.running ? 'text-[#7ddea0]' : 'text-white'}`}>
              {locked ? 'FT' : formatMatchClock(shown)}
            </p>
            <p className="mt-1 text-[11px] font-bold tracking-wide text-white/45">{period}</p>
          </div>
          <TeamScore
            name={away.shortName}
            color={away.color}
            score={fixture.awayScore ?? 0}
            disabled={!live}
            onAdd={() => run(() => adjustScore(id, 'away', 1))}
            onUndo={() => run(() => adjustScore(id, 'away', -1))}
            align="end"
          />
        </div>

        <div className="mt-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-[#f5c518]" style={{ width: `${Math.min(100, (shown.total / MATCH_SECONDS) * 100)}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] font-semibold text-white/35">
            <span>0</span>
            <span>45</span>
            <span>90</span>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {fixture.status === 'upcoming' && (
            <button type="button" onClick={() => run(() => kickOff(id))} className="rounded-xl bg-[#f5c518] px-4 py-2.5 text-sm font-black text-[#102018]">
              Kick off
            </button>
          )}
          {live && !shown.running && (
            <button
              type="button"
              onClick={() => run(() => setClockRunning(id, true))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5c518] px-4 py-2.5 text-sm font-black text-[#102018]"
            >
              <Play className="h-4 w-4" />
              {atHalf ? 'Second half' : 'Resume'}
            </button>
          )}
          {live && shown.running && (
            <button
              type="button"
              onClick={() => run(() => setClockRunning(id, false))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          )}
          {live && shown.total < HALF_SECONDS && (
            <button type="button" onClick={() => run(() => callHalfTime(id))} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white">
              Half time
            </button>
          )}
          {live && !ending && (
            <button type="button" onClick={() => setEnding(true)} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white">
              Full time
            </button>
          )}
          {live && ending && (
            <>
              <button type="button" onClick={() => run(() => fullTime(id))} className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white">
                Lock result
              </button>
              <button type="button" onClick={() => setEnding(false)} className="rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold text-white">
                Keep playing
              </button>
            </>
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-white/40">
          {locked
            ? 'This result is locked. The table and the match page keep this score.'
            : 'The clock runs to 90:00. Goals update the score, the group table, and the lineup. Full time locks the match.'}
        </p>
      </div>
    </div>
  );
}

function TeamScore({
  name,
  color,
  score,
  disabled,
  onAdd,
  onUndo,
  align = 'start',
}: {
  name: string;
  color: string;
  score: number;
  disabled: boolean;
  onAdd: () => void;
  onUndo: () => void;
  align?: 'start' | 'end';
}) {
  return (
    <div className={`flex flex-col gap-2 ${align === 'end' ? 'items-end' : 'items-start'}`}>
      <DepartmentMark shortName={name} color={color} size={44} />
      <p className="text-3xl font-black tabular-nums text-white">{score}</p>
      <button
        type="button"
        disabled={disabled}
        onClick={onAdd}
        className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-30"
      >
        Goal
      </button>
      <button type="button" disabled={disabled || score === 0} onClick={onUndo} className="text-[11px] font-semibold text-white/40 disabled:opacity-30">
        Undo
      </button>
    </div>
  );
}
