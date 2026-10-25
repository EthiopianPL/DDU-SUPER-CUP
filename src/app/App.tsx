import { BrowserRouter, Routes, Route } from 'react-router';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { MatchesPage } from './pages/MatchesPage';
import { MatchDetailsPage } from './pages/MatchDetailsPage';
import { TeamsPage } from './pages/TeamsPage';
import { TeamDetailsPage } from './pages/TeamDetailsPage';
import { GroupsPage } from './pages/GroupsPage';
import { NewsPage } from './pages/NewsPage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { StatisticsPage } from './pages/StatisticsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route path="matches" element={<MatchesPage />} />
          <Route path="match/:id" element={<MatchDetailsPage />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="team/:id" element={<TeamDetailsPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="news/:id" element={<NewsDetailPage />} />
          <Route path="stats" element={<StatisticsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
