import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function getArticleImages(article?: { imageUrl?: string; imageUrls?: string[] }): string[] {
  if (!article) return [];
  if (Array.isArray(article.imageUrls) && article.imageUrls.length > 0) {
    const valid = article.imageUrls.filter((url) => typeof url === 'string' && url.trim().length > 0);
    if (valid.length > 0) return valid;
  }
  if (article.imageUrl && typeof article.imageUrl === 'string' && article.imageUrl.trim().length > 0) {
    return [article.imageUrl];
  }
  return [];
}

interface NewsImageSliderProps {
  images: string[];
  alt?: string;
  className?: string;
  onImageClick?: () => void;
}

export function NewsImageSlider({
  images,
  alt = '',
  className = 'h-48 w-full',
  onImageClick,
}: NewsImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const mouseStartX = useRef<number | null>(null);
  const isMouseDown = useRef(false);
  const hasSwiped = useRef(false);

  const total = images.length;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  if (!total) return null;

  // Single photo: render static image without controls
  if (total === 1) {
    return (
      <div
        className={`relative overflow-hidden bg-black/40 ${className}`}
        onClick={onImageClick}
      >
        <img
          src={images[0]}
          alt={alt}
          draggable={false}
          className="h-full w-full object-cover select-none"
        />
      </div>
    );
  }

  // Touch handlers for mobile swiping
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    hasSwiped.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const diffX = e.touches[0].clientX - touchStartX.current;
    const diffY = e.touches[0].clientY - touchStartY.current;

    // Detect intentional horizontal swipe
    if (Math.abs(diffX) > 15 && Math.abs(diffX) > Math.abs(diffY)) {
      hasSwiped.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = touchStartY.current !== null ? e.changedTouches[0].clientY - touchStartY.current : 0;

    // Minimum swipe threshold: 35px horizontally and more horizontal than vertical
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    } else if (!hasSwiped.current && Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
      if (onImageClick) onImageClick();
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Mouse drag handlers for desktop swiping
  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDown.current = true;
    mouseStartX.current = e.clientX;
    hasSwiped.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown.current || mouseStartX.current === null) return;
    const diffX = e.clientX - mouseStartX.current;
    if (Math.abs(diffX) > 15) {
      hasSwiped.current = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isMouseDown.current) return;
    if (mouseStartX.current !== null) {
      const diffX = e.clientX - mouseStartX.current;
      if (Math.abs(diffX) > 40) {
        if (diffX < 0) {
          goToNext();
        } else {
          goToPrev();
        }
      } else if (!hasSwiped.current) {
        if (onImageClick) onImageClick();
      }
    }
    isMouseDown.current = false;
    mouseStartX.current = null;
  };

  const handleMouseLeave = () => {
    isMouseDown.current = false;
    mouseStartX.current = null;
  };

  return (
    <div
      className={`group/slider relative overflow-hidden bg-black/40 select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Sliding track */}
      <div
        className="flex h-full w-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {images.map((src, index) => (
          <div key={`${src}-${index}`} className="relative h-full w-full shrink-0">
            <img
              src={src}
              alt={alt ? `${alt} (${index + 1}/${total})` : ''}
              draggable={false}
              className="h-full w-full object-cover select-none pointer-events-none"
            />
          </div>
        ))}
      </div>

      {/* Counter Badge */}
      <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm backdrop-blur-md">
        <span>{currentIndex + 1}</span>
        <span className="text-white/60">/</span>
        <span>{total}</span>
      </div>

      {/* Swipe Indicator Pill (Subtle hint) */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-md opacity-80 group-hover/slider:opacity-100 transition-opacity">
        <span>Swipe</span>
      </div>

      {/* Navigation Arrows */}
      <button
        type="button"
        title="Previous photo"
        aria-label="Previous photo"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          goToPrev();
        }}
        className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-md transition-all hover:bg-black/90 hover:scale-105 active:scale-95"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        type="button"
        title="Next photo"
        aria-label="Next photo"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          goToNext();
        }}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-md transition-all hover:bg-black/90 hover:scale-105 active:scale-95"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-2.5 left-0 right-0 z-10 flex items-center justify-center gap-1.5">
        {images.map((_, index) => (
          <button
            key={index}
            type="button"
            aria-label={`Go to photo ${index + 1}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setCurrentIndex(index);
            }}
            className={`h-1.5 rounded-full transition-all ${
              index === currentIndex
                ? 'w-5 bg-[#f5c518] shadow-sm'
                : 'w-1.5 bg-white/45 hover:bg-white/75'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

