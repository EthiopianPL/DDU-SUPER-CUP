import { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function InstallAppButton({ className = '' }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone (PWA) mode
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standaloneMode);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Do not render anything if already installed and running as standalone app
  if (isStandalone || installed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosModal(true);
    } else {
      // General instructions for browsers where prompt has already been dismissed
      setShowIosModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="Install DDU Super Cup App"
        className={`inline-flex items-center gap-1.5 rounded-xl border border-[#f5c518]/30 bg-[#f5c518]/10 px-3 py-1.5 text-xs font-bold text-[#f5c518] transition-all hover:bg-[#f5c518] hover:text-[#0b1329] active:scale-95 ${className}`}
      >
        <Download className="h-3.5 w-3.5" />
        <span>Install App</span>
      </button>

      {/* Instructions Modal for iOS / unsupported browsers */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#0d1627] p-6 shadow-2xl text-white">
            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <img
                src="/brand/ddu-logo.png"
                alt="DDU Super Cup"
                className="h-12 w-12 rounded-2xl border border-white/10 bg-[#070d18] p-1 object-contain"
              />
              <div>
                <h3 className="font-black text-base text-white">Install DDU Super Cup</h3>
                <p className="text-xs text-white/60">Fast access right on your home screen</p>
              </div>
            </div>

            {isIos ? (
              <div className="space-y-3 rounded-2xl bg-white/5 p-4 text-xs text-white/80">
                <p className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5c518] text-[11px] font-black text-[#0b1329]">1</span>
                  <span>Tap the <strong>Share</strong> button <Share className="inline h-3.5 w-3.5 text-[#f5c518] ml-1" /> at the bottom of Safari.</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5c518] text-[11px] font-black text-[#0b1329]">2</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="inline h-3.5 w-3.5 text-[#f5c518] ml-1" />.</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5c518] text-[11px] font-black text-[#0b1329]">3</span>
                  <span>Confirm with <strong>Add</strong> to launch it like a native app!</span>
                </p>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl bg-white/5 p-4 text-xs text-white/80">
                <p className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#f5c518] shrink-0" />
                  <span>Click the <strong>Install</strong> or <strong>App Available</strong> icon in your browser's address bar.</span>
                </p>
                <p className="text-[11px] text-white/50">
                  Or open your browser menu (⋮ / ⋯) and select <strong>Install DDU Super Cup</strong>.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              className="mt-5 w-full rounded-xl bg-[#f5c518] py-2.5 text-xs font-black text-[#0b1329] transition-transform active:scale-98"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
