import { useMemo, useState, useEffect } from 'react';
import { MatchCard } from '../components/MatchCard';
import {
  cardTeam,
  fixtures,
  getTournamentTodayString,
  shiftDate,
  formatDateLabel,
  formatKickoff,
  TOURNAMENT_MATCH_DATES,
  TOURNAMENT_ACTIVE_MATCHDAY_DATE,
  MIN_TOURNAMENT_DATE,
  MAX_TOURNAMENT_DATE,
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
  const systemTodayStr = useMemo(() => getTournamentTodayString(), []);

  // Initial date:
  // If system date has matches, use system date.
  // Otherwise, default to the active tournament matchday date so fixtures are visible immediately.
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = getTournamentTodayString();
    const hasTodayFixtures = fixtures.some((f) => f.date === today);
    return hasTodayFixtures ? today : TOURNAMENT_ACTIVE_MATCHDAY_DATE;
  });

  const [calendarOpen, setCalendarOpen] = useState(false);

  // Status Filter
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
    if (selectedDate > MIN_TOURNAMENT_DATE) {
      setSelectedDate((prev) => shiftDate(prev, -1));
    }
  };

  const handleNextDay = () => {
    if (selectedDate < MAX_TOURNAMENT_DATE) {
      setSelectedDate((prev) => shiftDate(prev, 1));
    }
  };

  // Date label in tournament timezone
  const dateLabel = useMemo(
    () => formatDateLabel(selectedDate, systemTodayStr),
    [selectedDate, systemTodayStr],
  );

  const isMinDate = selectedDate <= MIN_TOURNAMENT_DATE;
  const isMaxDate = selectedDate >= MAX_TOURNAMENT_DATE;

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
  }, [selectedDate, status]);

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
  }, [selectedDate]);

  const liveMatchesCount = useMemo(
    () => fixtures.filter((f) => f.date === selectedDate && f.status === 'live').length,
    [selectedDate],
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
            disabled={isMinDate}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
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
            disabled={isMaxDate}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
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

                <div className="mt-2.5 space-y-1">
                  {TOURNAMENT_MATCH_DATES.map((dateStr) => {
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
                  })}
                </div>

                <div className="mt-3 border-t border-white/[0.08] pt-2.5">
                  <label htmlFor="jump-date-input" className="block text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1">
                    Custom date:
                  </label>
                  <input
                    id="jump-date-input"
                    type="date"
                    min={MIN_TOURNAMENT_DATE}
                    max={MAX_TOURNAMENT_DATE}
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
        <FilterPill active={status === 'live'} onClick={() => setStatus('live')}>
          <span className="flex items-center gap-1">
            {liveMatchesCount > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />}
            Live {liveMatchesCount > 0 ? `(${liveMatchesCount})` : ''}
          </span>
        </FilterPill>
        <FilterPill active={status === 'finished'} onClick={() => setStatus('finished')}>
          Finished
        </FilterPill>
        <FilterPill active={status === 'upcoming'} onClick={() => setStatus('upcoming')}>
          Upcoming
        </FilterPill>
      </div>

      {/* 4. Match Feed: Direct Vertically Spaced Fixture Cards */}
      <div className="mt-4 space-y-3">
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
          /* Concise & Dynamic Empty State */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#101622]/40 px-4 py-8 text-center">
            <CalendarX className="h-7 w-7 text-white/30" />
            <p className="mt-2 text-sm font-bold text-white">No matches scheduled for this date</p>
            <p className="mt-0.5 text-xs text-white/40">Try selecting another date or adjusting your filters.</p>

            {nearestFixtureDate && nearestFixtureDate !== selectedDate && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDate(nearestFixtureDate);
                  setStatus('all');
                }}
                className="mt-3 rounded-xl bg-[#f5c518] px-3.5 py-1.5 text-xs font-bold text-[#102018] shadow hover:bg-[#e5b510] transition-colors cursor-pointer"
              >
                View fixtures on {formatKickoff(nearestFixtureDate, '12:00')}
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
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
        active
          ? 'bg-[#f5c518] text-[#102018] shadow-sm font-bold'
          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

