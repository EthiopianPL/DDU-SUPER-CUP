import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MotmPoster } from './MotmPoster';
import type { MatchdayHighlight } from '../../data/motm';

interface MotmSliderProps {
  highlights: MatchdayHighlight[];
  autoSlideInterval?: number; // ms, default 5000
}

export function MotmSlider({ highlights, autoSlideInterval = 5000 }: MotmSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const total = highlights.length;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-slide effect: slides by itself every interval
  useEffect(() => {
    if (total <= 1 || isPaused) return;

    const timer = setInterval(() => {
      goToNext();
    }, autoSlideInterval);

    return () => clearInterval(timer);
  }, [total, isPaused, autoSlideInterval, goToNext]);

  if (!total) return null;

  // Single highlight: render static poster without slider controls
  if (total === 1) {
    return <MotmPoster highlight={highlights[0]} showDownload={false} />;
  }

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (touchStartX.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = touchStartY.current !== null ? e.changedTouches[0].clientY - touchStartY.current : 0;

    // Minimum swipe threshold
    if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div
      className="group/motm relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Sliding viewport */}
      <div className="w-full overflow-hidden rounded-3xl">
        <div
          className="flex w-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {highlights.map((highlight) => (
            <div key={highlight.matchId} className="w-full shrink-0">
              <MotmPoster highlight={highlight} showDownload={false} />
            </div>
          ))}
        </div>
      </div>

      {/* Floating Navigation Arrows */}
      <button
        type="button"
        title="Previous match MOTM"
        aria-label="Previous match MOTM"
        onClick={(e) => {
          e.stopPropagation();
          goToPrev();
        }}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-md opacity-0 group-hover/motm:opacity-100 transition-all hover:bg-black/90 hover:scale-105 active:scale-95 sm:opacity-80"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        type="button"
        title="Next match MOTM"
        aria-label="Next match MOTM"
        onClick={(e) => {
          e.stopPropagation();
          goToNext();
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-md opacity-0 group-hover/motm:opacity-100 transition-all hover:bg-black/90 hover:scale-105 active:scale-95 sm:opacity-80"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Indicator Dots & Auto-slide Badge */}
      <div className="mt-2.5 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          {highlights.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Go to MOTM game ${idx + 1}`}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentIndex
                  ? 'w-6 bg-[#f5c518] shadow-sm'
                  : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          Game {currentIndex + 1} of {total} · Auto-sliding
        </span>
      </div>
    </div>
  );
}

