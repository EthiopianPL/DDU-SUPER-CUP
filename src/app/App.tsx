import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { DiscoverPage } from './pages/DiscoverPage';
import { MatchesPage } from './pages/MatchesPage';
import { MatchDetailsPage } from './pages/MatchDetailsPage';
import { TeamDetailsPage } from './pages/TeamDetailsPage';
import { NewsPage } from './pages/NewsPage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { AdminPage } from './pages/AdminPage';

function RedirectToDiscover({ defaultTab }: { defaultTab: 'groups' | 'stats' }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  if (!searchParams.has('tab')) {
    searchParams.set('tab', defaultTab);
  }
  return <Navigate to={`/discover?${searchParams.toString()}`} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="groups" element={<RedirectToDiscover defaultTab="groups" />} />
          <Route path="teams" element={<RedirectToDiscover defaultTab="groups" />} />
          <Route path="departments" element={<RedirectToDiscover defaultTab="groups" />} />
          <Route path="stats" element={<RedirectToDiscover defaultTab="stats" />} />
          <Route path="statistics" element={<RedirectToDiscover defaultTab="stats" />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="match/:id" element={<MatchDetailsPage />} />
          <Route path="team/:id" element={<TeamDetailsPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="news/:id" element={<NewsDetailPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
