import { useNavigate } from 'react-router';
import { ChevronRight, Flame, Calendar, Newspaper, Award } from 'lucide-react';
import { MatchCard } from '../components/MatchCard';
import { MotmSlider } from '../components/MotmSlider';
import { cardTeam, competitionName, fixtures, latestResults, topScorers, sortFixturesByPriority } from '../../data/supercup';
import { getLatestMotmHighlights } from '../../data/motm';
import { newsArticles } from '../../data/news';
import { useLeagueVersion } from '../../data/live';
import { DepartmentMark } from '../components/DepartmentMark';
import { stripHtml } from '../utils/richText';
import { AdvertisementPopup } from '../components/AdvertisementPopup';
import { NewsImageSlider, getArticleImages } from '../components/NewsImageSlider';

export function HomePage() {
  const navigate = useNavigate();
  const version = useLeagueVersion();
  void version;
  const live = sortFixturesByPriority(fixtures.filter((fixture) => fixture.status === 'live'));
  const upcoming = sortFixturesByPriority(
    fixtures.filter((fixture) => fixture.status === 'upcoming'),
  ).slice(0, 2);
  const leader = topScorers(1)[0];
  const results = latestResults(2);
  const stories = [...newsArticles].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 2);
  const motmHighlights = getLatestMotmHighlights(2, fixtures);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-5">
      {/* 5-Second Poster Popup with (X) Cancel Button */}
      <AdvertisementPopup
        imageSrc="/advertisement/Shortcut.jpg"
        altText="Add DDU Super Cup to Your Home Screen"
        durationSeconds={5}
      />

      <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-[#10192b] px-5 py-6">
        <img src="/brand/ddu-logo.png" alt="" className="pointer-events-none absolute -right-1 -top-1 h-35 w-35 object-contain opacity-30" />
        <p className="text-[11px] font-semibold tracking-[0.22em] text-[#f5c518]">DIRE DAWA UNIVERSITY</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white">Super Cup</h1>
        <p className="mt-2 max-w-sm text-sm text-white/60">Department football.</p>
      </section>

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <Flame className="h-5 w-5 text-red-500" />
            Live games
          </h2>
          <button type="button" onClick={() => navigate('/matches')} className="flex items-center text-sm font-semibold text-[#f5c518]">
            Matches <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {live.map((fixture) => (
            <MatchCard
              key={fixture.id}
              id={fixture.id}
              homeTeam={cardTeam(fixture.homeId)}
              awayTeam={cardTeam(fixture.awayId)}
              homeScore={fixture.homeScore}
              awayScore={fixture.awayScore}
              status="live"
              stadium={fixture.stadium}
              matchMinute={fixture.minute}
            />
          ))}
          {!live.length && <p className="rounded-2xl border border-white/10 bg-[#10192b] px-4 py-6 text-sm text-white/50">No games are live.</p>}
        </div>
      </section>

      {/* MAN OF THE MATCH / MATCHDAY HIGHLIGHTS */}
      {motmHighlights.length > 0 && (
        <section className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-black tracking-wide text-white">
              <Award className="h-5 w-5 text-[#f5c518]" />
              MAN OF THE MATCH
            </h2>
            {motmHighlights.length > 1 && (
              <span className="text-[11px] font-bold tracking-wider text-[#f5c518]">
                LATEST {motmHighlights.length} GAMES
              </span>
            )}
          </div>
          <MotmSlider highlights={motmHighlights} />
        </section>
      )}

      {results.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-lg font-black tracking-wide text-white">Latest results</h2>
          <div className="space-y-3">
            {results.map((fixture) => (
              <MatchCard
                key={fixture.id}
                id={fixture.id}
                homeTeam={cardTeam(fixture.homeId)}
                awayTeam={cardTeam(fixture.awayId)}
                homeScore={fixture.homeScore}
                awayScore={fixture.awayScore}
                status="finished"
                stadium={fixture.stadium}
                showDate
                date={fixture.date}
                competition={competitionName}
              />
            ))}
          </div>
        </section>
      )}

      {leader?.department && (
        <button
          type="button"
          onClick={() => navigate('/discover?tab=stats')}
          className="mb-6 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#10192b] px-4 py-4 text-left"
        >
          <span>
            <span className="text-[11px] font-semibold tracking-[0.16em] text-[#f5c518]">TOP SCORER</span>
            <span className="mt-1 block text-lg font-black text-white">{leader.name}</span>
            <span className="mt-1 flex items-center gap-2 text-xs text-white/50">
              <DepartmentMark
                id={leader.department.id}
                name={leader.department.name}
                shortName={leader.department.shortName}
                color={leader.department.color}
                size={22}
                src={leader.department.crestUrl || undefined}
              />
              {leader.department.name}
            </span>
          </span>
          <span className="text-right">
            <span className="block text-3xl font-black text-[#f5c518]">{leader.goals}</span>
            <span className="text-xs text-white/40">goals</span>
          </span>
        </button>
      )}

      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <Calendar className="h-5 w-5 text-[#f5c518]" />
            Next fixtures
          </h2>
          <button type="button" onClick={() => navigate('/matches')} className="flex items-center text-sm font-semibold text-[#f5c518]">
            Matches <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {upcoming.map((fixture) => (
            <MatchCard
              key={fixture.id}
              id={fixture.id}
              homeTeam={cardTeam(fixture.homeId)}
              awayTeam={cardTeam(fixture.awayId)}
              status="upcoming"
              time={`${fixture.date} · ${fixture.time}`}
              stadium={fixture.stadium}
            />
          ))}
          {!upcoming.length && <p className="rounded-2xl border border-white/10 bg-[#10192b] px-4 py-6 text-sm text-white/50">No upcoming fixtures.</p>}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <Newspaper className="h-5 w-5 text-[#f5c518]" />
            News
          </h2>
          <button type="button" onClick={() => navigate('/news')} className="flex items-center text-sm font-semibold text-[#f5c518]">
            All news <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {stories.map((article) => {
            const images = getArticleImages(article);
            return (
              <div
                key={article.id}
                className="group w-full overflow-hidden rounded-2xl border border-white/10 bg-[#10192b] text-left transition-colors hover:border-white/20"
              >
                {images.length > 0 && (
                  <NewsImageSlider
                    images={images}
                    alt={stripHtml(article.title)}
                    className="h-40 sm:h-48 w-full"
                    onImageClick={() => navigate(`/news/${article.id}`)}
                  />
                )}
                <div
                  className="cursor-pointer p-4"
                  onClick={() => navigate(`/news/${article.id}`)}
                >
                  <div className="flex items-center gap-2 text-[11px] font-semibold">
                    <span className="rounded-full bg-[#f5c518] px-2 py-0.5 text-[#102018]">{article.category}</span>
                    <span className="text-white/40">{article.time}</span>
                  </div>
                  <h3 className="mt-2 text-base font-black text-white group-hover:text-[#f5c518] transition-colors">{stripHtml(article.title)}</h3>
                  <p className="mt-1 text-sm text-white/60">{stripHtml(article.summary)}</p>
                </div>
              </div>
            );
          })}
          {!stories.length && <p className="rounded-2xl border border-white/10 bg-[#10192b] px-4 py-6 text-sm text-white/50">No stories yet.</p>}
        </div>
      </section>
    </div>
  );
}
