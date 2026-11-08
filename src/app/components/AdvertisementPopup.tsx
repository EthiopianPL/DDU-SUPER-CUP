import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AdvertisementPopupProps {
  imageSrc?: string;
  altText?: string;
  durationSeconds?: number;
}

// Module-level fallback to ensure ad only shows once per site session in SPA navigation
let hasShownInSession = false;

export function AdvertisementPopup({
  imageSrc = '/advertisement/Shortcut.jpg',
  altText = 'Shortcut Poster',
  durationSeconds = 5,
}: AdvertisementPopupProps) {
  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds);

  useEffect(() => {
    // Check if app is already running in standalone (installed shortcut / PWA) mode
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        localStorage.getItem('app_installed') === 'true');

    if (isStandalone) {
      return;
    }

    // Check if ad was already shown during this session / initial site load
    let alreadyShown = hasShownInSession;
    try {
      if (sessionStorage.getItem('ad_popup_shown') === 'true') {
        alreadyShown = true;
      }
    } catch {}

    if (alreadyShown) {
      return;
    }

    // Mark as shown so returning/backing to the home page will not display it again
    hasShownInSession = true;
    try {
      sessionStorage.setItem('ad_popup_shown', 'true');
    } catch {}

    // App is not installed and ad not yet shown -> show popup
    setVisible(true);

    // Listen for install event to immediately hide and persist
    const handleAppInstalled = () => {
      try {
        localStorage.setItem('app_installed', 'true');
      } catch {}
      setVisible(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Countdown timer in seconds
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setVisible(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 transition-opacity duration-300 animate-in fade-in"
      onClick={() => setVisible(false)}
    >
      <div
        className="relative max-w-md w-full overflow-hidden rounded-2xl border border-white/20 bg-[#0d1627] shadow-2xl shadow-black/80 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poster image */}
        <img
          src={imageSrc}
          alt={altText}
          className="w-full h-auto object-cover block select-none"
        />

        {/* Bottom center: Seconds count + Cancel (X) button */}
        <div className="absolute bottom-3 inset-x-0 flex justify-center z-10 pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/85 px-3 py-1.5 shadow-2xl border border-white/30 backdrop-blur-md">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f5c518] text-[11px] font-black text-[#0b1329]">
              {secondsLeft}s
            </span>
            <button
              type="button"
              onClick={() => setVisible(false)}
              aria-label="Close"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-red-600 hover:scale-110 active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
