import React, { useState, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { LightboxModal } from './LightboxModal';

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
  enableLightbox?: boolean;
  fit?: 'contain' | 'cover';
}

export function NewsImageSlider({
  images,
  alt = '',
  className = 'h-48 w-full',
  onImageClick,
  enableLightbox = false,
  fit = 'contain',
}: NewsImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
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

  const handleSingleClick = () => {
    if (enableLightbox) {
      setLightboxOpen(true);
    } else if (onImageClick) {
      onImageClick();
    }
  };

  const handleSlideClick = () => {
    if (enableLightbox) {
      setLightboxOpen(true);
    } else if (onImageClick) {
      onImageClick();
    }
  };

  // Single photo: render static image with ambient blurred backdrop so whole photo is 100% visible
  if (total === 1) {
    const isContain = fit === 'contain';
    return (
      <>
        <div
          className={`group/slider relative overflow-hidden bg-[#070d18] flex items-center justify-center select-none ${
            onImageClick || enableLightbox ? 'cursor-pointer' : ''
          } ${className}`}
          onClick={handleSingleClick}
        >
          {/* Ambient blurred backdrop to fill empty space with matching tones */}
          {isContain && (
            <img
              src={images[0]}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-35 scale-110 pointer-events-none select-none"
            />
          )}

          {/* Vignette overlay */}
          {isContain && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
          )}

          {/* Main uncropped photo */}
          <img
            src={images[0]}
            alt={alt}
            draggable={false}
            className={`relative z-10 select-none ${
              isContain
                ? 'h-full w-full max-h-full max-w-full object-contain'
                : 'h-full w-full object-cover'
            }`}
          />

          {/* Fullscreen view badge */}
          {enableLightbox && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(true);
              }}
              className="absolute right-3 bottom-3 z-20 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md transition-all hover:bg-black/90 hover:text-white hover:scale-105 active:scale-95 border border-white/10"
              title="View full photo"
              aria-label="View full photo"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Full photo</span>
            </button>
          )}
        </div>

        {lightboxOpen && (
          <LightboxModal
            images={images}
            initialIndex={0}
            alt={alt}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </>
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

    if (Math.abs(diffX) > 15 && Math.abs(diffX) > Math.abs(diffY)) {
      hasSwiped.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = touchStartY.current !== null ? e.changedTouches[0].clientY - touchStartY.current : 0;

    // Swipe threshold
    if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) {
        goToNext();
      } else {
        goToPrev();
      }
    } else if (!hasSwiped.current && Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
      handleSlideClick();
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
        handleSlideClick();
      }
    }
    isMouseDown.current = false;
    mouseStartX.current = null;
  };

  const handleMouseLeave = () => {
    isMouseDown.current = false;
    mouseStartX.current = null;
  };

  const isContain = fit === 'contain';

  return (
    <>
      <div
        className={`group/slider relative overflow-hidden bg-[#070d18] select-none ${
          onImageClick || enableLightbox ? 'cursor-pointer' : ''
        } ${className}`}
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
            <div
              key={`${src}-${index}`}
              className="relative h-full w-full shrink-0 flex items-center justify-center overflow-hidden bg-[#070d18]"
            >
              {/* Ambient blurred backdrop for uncropped aspect ratios */}
              {isContain && (
                <img
                  src={src}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="absolute inset-0 h-full w-full object-cover blur-2xl opacity-35 scale-110 pointer-events-none select-none"
                />
              )}

              {/* Vignette overlay */}
              {isContain && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
              )}

              {/* Main photo: completely visible, never cropped */}
              <img
                src={src}
                alt={alt ? `${alt} (${index + 1}/${total})` : ''}
                draggable={false}
                className={`relative z-10 select-none pointer-events-none ${
                  isContain
                    ? 'h-full w-full max-h-full max-w-full object-contain'
                    : 'h-full w-full object-cover'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Counter Badge */}
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-bold text-white shadow-md backdrop-blur-md border border-white/10">
          <span>{currentIndex + 1}</span>
          <span className="text-white/60">/</span>
          <span>{total}</span>
        </div>

        {/* Swipe Indicator Pill (Subtle hint) */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold text-white/80 backdrop-blur-md opacity-80 group-hover/slider:opacity-100 transition-opacity border border-white/5">
          <span>Swipe</span>
        </div>

        {/* Full view button */}
        {enableLightbox && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(true);
            }}
            className="absolute right-3 bottom-3 z-20 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white/90 backdrop-blur-md transition-all hover:bg-black/90 hover:text-white hover:scale-105 active:scale-95 border border-white/10"
            title="View full photo"
            aria-label="View full photo"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Full photo</span>
          </button>
        )}

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
          className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-md transition-all hover:bg-black/90 hover:scale-105 active:scale-95 border border-white/10"
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
          className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-md backdrop-blur-md transition-all hover:bg-black/90 hover:scale-105 active:scale-95 border border-white/10"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Dot Indicators */}
        <div className="absolute bottom-2.5 left-0 right-0 z-10 flex items-center justify-center gap-1.5 pointer-events-none">
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
              className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                index === currentIndex
                  ? 'w-5 bg-[#f5c518] shadow-sm'
                  : 'w-1.5 bg-white/45 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      </div>

      {lightboxOpen && (
        <LightboxModal
          images={images}
          initialIndex={currentIndex}
          alt={alt}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
