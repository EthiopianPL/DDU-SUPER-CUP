import { useMemo, useState, useEffect } from 'react';
import { MatchCard } from '../components/MatchCard';
import { useLeagueVersion } from '../../data/live';
import {
  cardTeam,
  fixtures,
  getTournamentTodayString,
  shiftDate,
  formatDateLabel,
  sortFixturesByPriority,
} from '../../data/supercup';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarX,
} from 'lucide-react';

type StatusFilter = 'all' | 'live' | 'upcoming' | 'finished';

export function MatchesPage() {
  const version = useLeagueVersion();
  const systemTodayStr = useMemo(() => getTournamentTodayString(), []);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getTournamentTodayString();
  });

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [status, setStatus] = useState<StatusFilter>('all');

  // Close calendar popup on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#calendar-dropdown-container')) {
        setCalendarOpen(false);
      }
    };
    if (calendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [calendarOpen]);

  // Date navigation handlers
  const handlePrevDay = () => {
    setSelectedDate((prev) => shiftDate(prev, -1));
  };

  const handleNextDay = () => {
    setSelectedDate((prev) => shiftDate(prev, 1));
  };

  // Date label in tournament timezone
  const dateLabel = useMemo(
    () => formatDateLabel(selectedDate, systemTodayStr),
    [selectedDate, systemTodayStr],
  );

  const availableDates = useMemo(() => {
    return Array.from(new Set(fixtures.map((f) => f.date))).sort();
  }, [version]);

  // Filtered fixtures for the selected date and active status, sorted by smart priority:
  // 1. LIVE matches -> 2. UPCOMING matches (earliest first) -> 3. FINISHED matches (most recent first)
  const displayedFixtures = useMemo(() => {
    const filtered = fixtures.filter((fixture) => {
      // Date match
      if (fixture.date !== selectedDate) {
        return false;
      }

      // Status filter
      if (status !== 'all' && fixture.status !== status) {
        return false;
      }

      return true;
    });

    return sortFixturesByPriority(filtered);
  }, [selectedDate, status, version]);

  // Dynamically find the nearest date with fixtures without hardcoding any dates
  const nearestFixtureDate = useMemo(() => {
    const dates = Array.from(new Set(fixtures.map((f) => f.date))).sort();
    if (dates.length === 0) return null;

    const targetTime = new Date(`${selectedDate}T12:00:00Z`).getTime();
    let closest = dates[0];
    let minDiff = Infinity;

    for (const d of dates) {
      const diff = Math.abs(new Date(`${d}T12:00:00Z`).getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = d;
      }
    }
    return closest;
  }, [selectedDate, version]);

  const liveMatchesCount = useMemo(
    () => fixtures.filter((f) => f.date === selectedDate && f.status === 'live').length,
    [selectedDate, version],
  );

  return (
    <div className="mx-auto max-w-4xl px-3 pb-24 pt-3 sm:px-6 sm:pt-5">
      {/* Date Navigator */}
      <div className="relative grid grid-cols-[auto_1fr_auto] items-center rounded-2xl border border-white/[0.08] bg-[#121722] p-1.5 shadow-sm">
        {/* Left: Previous Day Arrow (Far Left) */}
        <div className="flex w-16 sm:w-20 items-center justify-start">
          <button
            id="btn-prev-day"
            type="button"
            onClick={handlePrevDay}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Previous day"
            title="Previous day"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Center: Mathematically Centered Date & Weekday */}
        <div className="flex flex-col items-center justify-center text-center px-1">
          <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
            {dateLabel.main}
          </span>
          <span className="text-[10px] font-semibold text-white/40">
            {dateLabel.sub}
          </span>
        </div>

        {/* Right: Next Day Arrow + Calendar Button */}
        <div className="flex w-16 sm:w-20 items-center justify-end gap-1">
          <button
            id="btn-next-day"
            type="button"
            onClick={handleNextDay}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Next day"
            title="Next day"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div id="calendar-dropdown-container" className="relative">
            <button
              id="btn-calendar-toggle"
              type="button"
              onClick={() => setCalendarOpen(!calendarOpen)}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                calendarOpen
                  ? 'border-[#f5c518] bg-[#f5c518]/15 text-[#f5c518]'
                  : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
              }`}
              aria-label="Select match date"
              title="Select match date"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>

            {/* Calendar Popover Menu */}
            {calendarOpen && (
              <div className="absolute right-0 top-11 z-30 w-64 rounded-2xl border border-white/15 bg-[#161c28] p-3 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#f5c518]">
                    Select Date
                  </span>
                  <span className="text-[10px] text-white/40">EAT (UTC+3)</span>
                </div>

                <div className="mt-2.5 max-h-48 overflow-y-auto space-y-1">
                  {availableDates.length > 0 ? (
                    availableDates.map((dateStr) => {
                      const count = fixtures.filter((f) => f.date === dateStr).length;
                      const isSelected = selectedDate === dateStr;
                      return (
                        <button
                          key={dateStr}
                          type="button"
                          onClick={() => {
                            setSelectedDate(dateStr);
                            setCalendarOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#f5c518] text-[#102018]'
                              : 'bg-white/5 text-white/80 hover:bg-white/10'
                          }`}
                        >
                          <span>{formatDateLabel(dateStr, systemTodayStr).main}</span>
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-[#102018]/70' : 'text-white/40'}`}>
                            {count} matches
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-2 py-3 text-center text-xs text-white/40">No fixtures scheduled.</p>
                  )}
                </div>

                <div className="mt-3 border-t border-white/[0.08] pt-2.5">
                  <label htmlFor="jump-date-input" className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
                    Custom date:
                  </label>
                  <input
                    id="jump-date-input"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedDate(e.target.value);
                        setCalendarOpen(false);
                      }
                    }}
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white focus:border-[#f5c518] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Compact Status-Filter Row (All, Live, Finished, Upcoming) */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1" aria-label="Filter matches by status">
        <FilterPill active={status === 'all'} onClick={() => setStatus('all')}>
          All
        </FilterPill>
        <FilterPill
          active={status === 'live'}
          onClick={() => setStatus('live')}
          count={liveMatchesCount > 0 ? liveMatchesCount : undefined}
          isLive={liveMatchesCount > 0}
        >
          Live
        </FilterPill>
        <FilterPill active={status === 'upcoming'} onClick={() => setStatus('upcoming')}>
          Upcoming
        </FilterPill>
        <FilterPill active={status === 'finished'} onClick={() => setStatus('finished')}>
          Finished
        </FilterPill>
      </div>

      {/* 4. Match List or Empty State */}
      <div className="mt-4 space-y-2.5">
        {displayedFixtures.length > 0 ? (
          displayedFixtures.map((fixture) => (
            <MatchCard
              key={fixture.id}
              id={fixture.id}
              homeTeam={cardTeam(fixture.homeId)}
              awayTeam={cardTeam(fixture.awayId)}
              homeScore={fixture.homeScore}
              awayScore={fixture.awayScore}
              status={fixture.status}
              time={fixture.time}
              stadium={fixture.stadium}
              matchMinute={fixture.minute}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-white/[0.08] bg-[#121722]/80 px-4 py-12 text-center shadow-inner">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/30">
              <CalendarX className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-bold text-white/70">
              No matches found for this date
            </p>
            <p className="mt-1 text-xs text-white/40">
              {status !== 'all'
                ? `No ${status} matches scheduled for ${dateLabel.main}. Try switching filters.`
                : `There are no matches scheduled for ${dateLabel.main}.`}
            </p>

            {/* Smart shortcut to jump to the nearest fixture day */}
            {nearestFixtureDate && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(nearestFixtureDate);
                  setStatus('all');
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[#f5c518]/30 bg-[#f5c518]/10 px-3.5 py-2 text-xs font-bold text-[#f5c518] transition-colors hover:bg-[#f5c518]/20 cursor-pointer"
              >
                <span>Jump to {formatDateLabel(nearestFixtureDate, systemTodayStr).main}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
  count,
  isLive,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  isLive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
        active
          ? 'bg-[#f5c518] text-[#102018] shadow-sm'
          : 'border border-white/5 bg-[#121722] text-white/60 hover:bg-white/10 hover:text-white'
      }`}
    >
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
      )}
      <span>{children}</span>
      {typeof count === 'number' && (
        <span
          className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black leading-none ${
            active ? 'bg-[#102018] text-[#f5c518]' : 'bg-white/10 text-white'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
