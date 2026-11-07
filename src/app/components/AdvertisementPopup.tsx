import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AdvertisementPopupProps {
  imageSrc?: string;
  altText?: string;
  durationMs?: number;
}

export function AdvertisementPopup({
  imageSrc = '/advertisement/Shortcut.jpg',
  altText = 'Shortcut Poster',
  durationMs = 3000,
}: AdvertisementPopupProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [durationMs]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
      onClick={() => setVisible(false)}
    >
      <div
        className="relative max-w-md w-full overflow-hidden rounded-2xl border border-white/20 bg-[#0d1627] shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poster image */}
        <img
          src={imageSrc}
          alt={altText}
          className="w-full h-auto object-cover block select-none"
        />

        {/* Cancel (X) button on bottom center of the picture */}
        <div className="absolute bottom-3 inset-x-0 flex justify-center z-10 pointer-events-none">
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Close"
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-black/80 text-white shadow-xl border border-white/30 backdrop-blur-md transition-all hover:bg-red-600 hover:scale-110 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
