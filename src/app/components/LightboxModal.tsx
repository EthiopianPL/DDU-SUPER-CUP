import React, { useEffect, useState, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ExternalLink } from 'lucide-react';

interface LightboxModalProps {
  images: string[];
  initialIndex?: number;
  alt?: string;
  onClose: () => void;
}

export function LightboxModal({
  images,
  initialIndex = 0,
  alt = '',
  onClose,
}: LightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(Math.max(0, Math.min(initialIndex, images.length - 1)));
  const [isZoomed, setIsZoomed] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const total = images.length;

  // Lock background scroll when modal is active
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const goToNext = useCallback(() => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    setIsZoomed(false);
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && total > 1) {
        goToNext();
      } else if (e.key === 'ArrowLeft' && total > 1) {
        goToPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToNext, goToPrev, total]);

  if (!total) return null;
  const currentImage = images[currentIndex];

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isZoomed) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (isZoomed || touchStartX.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = touchStartY.current !== null ? e.changedTouches[0].clientY - touchStartY.current : 0;

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
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md select-none animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Top action bar */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          {total > 1 && (
            <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white shadow-sm">
              {currentIndex + 1} / {total}
            </span>
          )}
          {alt && (
            <span className="truncate text-xs font-medium text-white/70 max-w-sm sm:max-w-md">
              {alt}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom toggle button */}
          <button
            type="button"
            onClick={() => setIsZoomed((z) => !z)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/20 active:scale-95"
            title={isZoomed ? 'Zoom out' : 'Zoom in'}
            aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
          >
            {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          </button>

          {/* Open original image link */}
          <a
            href={currentImage}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/20 active:scale-95"
            title="Open full resolution in new tab"
            aria-label="Open full resolution in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* Close modal */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-red-500/80 hover:text-white active:scale-95"
            title="Close (Esc)"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main image presentation area */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-auto p-2 sm:p-6"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Navigation arrows (desktop & tablet) */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/70 text-white shadow-xl backdrop-blur-md transition-all hover:bg-black/90 hover:scale-110 active:scale-95 border border-white/15"
              title="Previous photo"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/70 text-white shadow-xl backdrop-blur-md transition-all hover:bg-black/90 hover:scale-110 active:scale-95 border border-white/15"
              title="Next photo"
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </>
        )}

        {/* Ambient atmospheric backdrop */}
        <img
          src={currentImage}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover blur-3xl opacity-25 scale-125 select-none"
        />

        {/* Main photo: completely visible, never cropped */}
        <img
          src={currentImage}
          alt={alt ? `${alt} (${currentIndex + 1}/${total})` : `Photo ${currentIndex + 1}`}
          onClick={() => setIsZoomed((z) => !z)}
          className={`relative z-10 transition-all duration-200 select-none rounded-xl shadow-2xl ${
            isZoomed
              ? 'max-h-none max-w-none cursor-zoom-out scale-125 sm:scale-150'
              : 'max-h-[84vh] max-w-[92vw] object-contain cursor-zoom-in'
          }`}
        />
      </div>

      {/* Thumbnails row for multi-photo */}
      {total > 1 && (
        <div className="relative z-20 flex items-center justify-center gap-2 overflow-x-auto px-4 py-3 bg-black/60 backdrop-blur-md border-t border-white/10">
          {images.map((src, idx) => (
            <button
              key={`${src}-${idx}`}
              type="button"
              onClick={() => {
                setIsZoomed(false);
                setCurrentIndex(idx);
              }}
              className={`relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                idx === currentIndex
                  ? 'border-[#f5c518] ring-2 ring-[#f5c518]/40 scale-105 shadow-md'
                  : 'border-white/20 opacity-50 hover:opacity-100 hover:border-white/50'
              }`}
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
