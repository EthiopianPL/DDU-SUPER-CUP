import { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, CheckCircle2, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type PlatformTab = 'android' | 'ios' | 'pc';

export function InstallAppButton({ className = '' }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [platformTab, setPlatformTab] = useState<PlatformTab>('android');
  const [installed, setInstalled] = useState(false);
  const [downloadTriggered, setDownloadTriggered] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone (PWA) mode
    const standaloneMode =
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true);
    setIsStandalone(standaloneMode);

    // Device detection
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIos(isIosDevice);
    setIsAndroid(isAndroidDevice);

    if (isAndroidDevice) {
      setPlatformTab('android');
    } else if (isIosDevice) {
      setPlatformTab('ios');
    } else {
      setPlatformTab('pc');
    }

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

  const triggerApkDownload = () => {
    setDownloadTriggered(true);
    const link = document.createElement('a');
    link.href = '/DDU%20Super%20Cup_V2.apk';
    link.download = 'DDU Super Cup_V2.apk';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInstallClick = async () => {
    if (isAndroid) {
      triggerApkDownload();
      setPlatformTab('android');
      setShowModal(true);
    } else if (isIos) {
      setPlatformTab('ios');
      setShowModal(true);
    } else {
      setPlatformTab('pc');
      setShowModal(true);
    }
  };

  const handlePcInstallPrompt = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  // Do not render button if already running in standalone app mode
  if (isStandalone || installed) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        title="Install DDU Super Cup App or Download APK"
        className={`inline-flex items-center gap-1.5 rounded-xl border border-[#f5c518]/30 bg-[#f5c518]/10 px-3 py-1.5 text-xs font-bold text-[#f5c518] transition-all hover:bg-[#f5c518] hover:text-[#0b1329] active:scale-95 cursor-pointer ${className}`}
      >
        <Download className="h-3.5 w-3.5" />
        <span>Install App</span>
      </button>

      {/* Cross-Platform Installation & APK Download Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#0d1627] p-5 sm:p-6 shadow-2xl text-white">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/brand/ddu-logo.png"
                alt="DDU Super Cup"
                className="h-12 w-12 rounded-2xl border border-white/10 bg-[#070d18] p-1 object-contain shrink-0"
              />
              <div>
                <h3 className="font-black text-base text-white">Install DDU Super Cup</h3>
                <p className="text-xs text-white/60">Choose your device or download the APK</p>
              </div>
            </div>

            {/* Platform Selector Tabs */}
            <div className="grid grid-cols-3 gap-1 rounded-2xl bg-white/5 p-1 mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPlatformTab('android')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all cursor-pointer ${
                  platformTab === 'android'
                    ? 'bg-[#f5c518] text-[#0b1329] shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Android</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatformTab('ios')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all cursor-pointer ${
                  platformTab === 'ios'
                    ? 'bg-[#f5c518] text-[#0b1329] shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>iPhone/iOS</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatformTab('pc')}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 transition-all cursor-pointer ${
                  platformTab === 'pc'
                    ? 'bg-[#f5c518] text-[#0b1329] shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>PC / Web</span>
              </button>
            </div>

            {/* Tab 1: Android APK Mode */}
            {platformTab === 'android' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-center">
                  <span className="inline-block rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                    Official Android Package · V2.0
                  </span>
                  <p className="mt-1.5 text-xs text-white/80">
                    {downloadTriggered
                      ? 'Download started! Once downloaded, open the file to install.'
                      : 'Download the standalone Android APK installer directly.'}
                  </p>
                  <a
                    href="/DDU%20Super%20Cup_V2.apk"
                    download="DDU Super Cup_V2.apk"
                    onClick={() => setDownloadTriggered(true)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5c518] py-2.5 text-xs font-black text-[#0b1329] shadow-lg hover:bg-amber-300 active:scale-98 transition-all"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download DDU Super Cup_V2.apk (168 KB)</span>
                  </a>
                </div>

                <div className="space-y-2.5 rounded-2xl bg-white/5 p-3.5 text-xs text-white/80">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#f5c518]" />
                    <span>How to install:</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">1</span>
                    <span>Tap <strong>Download</strong> and wait for the file to finish.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">2</span>
                    <span>Open <strong>DDU Super Cup_V2.apk</strong> from notifications or your Downloads folder.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white">3</span>
                    <span>If prompted, tap <strong>Settings</strong> &gt; allow <strong>Install unknown apps</strong>, then tap <strong>Install</strong>.</span>
                  </p>
                </div>
              </div>
            )}

            {/* Tab 2: iOS Mode */}
            {platformTab === 'ios' && (
              <div className="space-y-3 rounded-2xl bg-white/5 p-4 text-xs text-white/80">
                <span className="inline-block rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-300 mb-1">
                  Safari Add to Home Screen
                </span>
                <p className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5c518] text-[11px] font-black text-[#0b1329]">1</span>
                  <span>Tap the <strong>Share</strong> button <Share className="inline h-3.5 w-3.5 text-[#f5c518] ml-1" /> at the bottom of Safari.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5c518] text-[11px] font-black text-[#0b1329]">2</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="inline h-3.5 w-3.5 text-[#f5c518] ml-1" />.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f5c518] text-[11px] font-black text-[#0b1329]">3</span>
                  <span>Tap <strong>Add</strong> in the top-right corner to launch it as a full-screen app!</span>
                </p>
              </div>
            )}

            {/* Tab 3: PC / Desktop Mode */}
            {platformTab === 'pc' && (
              <div className="space-y-3.5">
                {/* Desktop PWA */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <span className="inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                    Desktop Web App
                  </span>
                  <p className="mt-1 text-xs text-white/70">
                    Install DDU Super Cup as a fast standalone app on Windows, macOS, or ChromeOS.
                  </p>
                  {deferredPrompt ? (
                    <button
                      type="button"
                      onClick={handlePcInstallPrompt}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f5c518] py-2 text-xs font-black text-[#0b1329] hover:bg-amber-300 transition-colors cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Install on this PC / Mac</span>
                    </button>
                  ) : (
                    <div className="mt-2 text-[11px] text-white/50 bg-black/20 p-2.5 rounded-xl">
                      Click the <strong>Install</strong> or <strong>App Available</strong> icon in your browser's address bar (Chrome, Edge, Brave), or open the menu (⋮ / ⋯) and select <strong>Install DDU Super Cup</strong>.
                    </div>
                  )}
                </div>

                {/* Android APK Download Option on PC */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <span className="inline-block rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                    Android APK (Transfer to Phone)
                  </span>
                  <p className="mt-1 text-xs text-white/70">
                    Download the Android APK file to transfer to your phone or tablet.
                  </p>
                  <a
                    href="/DDU%20Super%20Cup_V2.apk"
                    download="DDU Super Cup_V2.apk"
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 py-2 text-xs font-black text-white hover:bg-white/20 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download APK (168 KB)</span>
                  </a>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-4 w-full rounded-xl bg-white/10 py-2 text-xs font-bold text-white/70 hover:bg-white/15 hover:text-white transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
