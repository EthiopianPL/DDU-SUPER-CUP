import { Github, Globe, Heart, ShieldCheck } from 'lucide-react';

export function ContributorsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      {/* Hero Header Section */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#10192b] px-5 py-7 shadow-xl shadow-black/30">
        <img
          src="/brand/ddu-logo.png"
          alt=""
          className="pointer-events-none absolute -right-6 -top-6 h-44 w-44 object-contain opacity-25"
        />
        <div className="relative z-10">
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Dire Dawa University Super Cup
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            DDU Super Cup is a university football tournament project created to bring students together through football, encourage teamwork and sportsmanship, and celebrate the passion and spirit of competition at Dire Dawa University.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-white/10 pt-4 text-xs text-white/50">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#f5c518]" />
              Official Campus Tournament Platform
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-red-400" />
              Built for the DDU Community
            </span>
          </div>
        </div>
      </section>

      {/* Built By Section */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <span className="h-2 w-2 rounded-full bg-[#f5c518]" />
            Built By
          </h2>
          <span className="text-xs font-semibold text-[#f5c518]">2 Developers · One Project</span>
        </div>

        {/* Two-column layout on desktop, stacked on mobile */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Contributor 1 — Nahom Bekele */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#10192b] p-5 shadow-lg transition-all duration-200 hover:border-white/20 hover:bg-[#131f36]">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-full border border-[#f5c518]/30 bg-[#f5c518]/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[#f5c518]">
                  Core Contributor
                </span>
              </div>
              <h3 className="mt-2.5 text-xl font-black text-white">Nahom Bekele</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                Contributed to the platform’s design, architecture, and development, helping bring the DDU Super Cup experience to life.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              <a
                href="https://github.com/NahomDevX"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition-all hover:border-[#f5c518]/40 hover:bg-[#f5c518]/10 hover:text-[#f5c518]"
                aria-label="Nahom Bekele GitHub profile (opens in new tab)"
              >
                <Github className="h-3.5 w-3.5" />
                <span>GitHub</span>
                <span className="text-[11px]">↗</span>
              </a>

              <a
                href="https://nahombekele.pro.et"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition-all hover:border-[#f5c518]/40 hover:bg-[#f5c518]/10 hover:text-[#f5c518]"
                aria-label="Nahom Bekele Portfolio website (opens in new tab)"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>nahombekePort</span>
                <span className="text-[11px]">↗</span>
              </a>
            </div>
          </div>

          {/* Contributor 2 — Abrham Wendesen */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#10192b] p-5 shadow-lg transition-all duration-200 hover:border-white/20 hover:bg-[#131f36]">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-full border border-[#f5c518]/30 bg-[#f5c518]/10 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[#f5c518]">
                  Core Contributor
                </span>
              </div>
              <h3 className="mt-2.5 text-xl font-black text-white">Abrham Wendesen</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                Contributed to building and shaping the DDU Super Cup platform, working together to turn the project idea into reality.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              <a
                href="https://github.com/abrshiz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition-all hover:border-[#f5c518]/40 hover:bg-[#f5c518]/10 hover:text-[#f5c518]"
                aria-label="Abrham Wendesen GitHub profile (opens in new tab)"
              >
                <Github className="h-3.5 w-3.5" />
                <span>GitHub</span>
                <span className="text-[11px]">↗</span>
              </a>

              <a
                href="https://abrshiz.pro.et/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/80 transition-all hover:border-[#f5c518]/40 hover:bg-[#f5c518]/10 hover:text-[#f5c518]"
                aria-label="Abrham Wendesen Portfolio website (opens in new tab)"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>abrshiz.pro.et</span>
                <span className="text-[11px]">↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
