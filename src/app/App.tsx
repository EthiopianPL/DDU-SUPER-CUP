import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { AdminRoute } from './components/AdminRoute';
import { HomePage } from './pages/HomePage';
import { MatchesPage } from './pages/MatchesPage';
import { MatchDetailsPage } from './pages/MatchDetailsPage';
import { TeamsPage } from './pages/TeamsPage';
import { TeamDetailsPage } from './pages/TeamDetailsPage';
import { PlayersPage } from './pages/PlayersPage';
import { PlayerProfilePage } from './pages/PlayerProfilePage';
import { StatsHubPage } from './pages/StatsHubPage';
import { HeadToHeadPage } from './pages/HeadToHeadPage';
import { SeasonArchivePage } from './pages/SeasonArchivePage';
import { NewsPage } from './pages/NewsPage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { AdminNewsPage } from './pages/AdminNewsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminMatchesPage } from './pages/AdminMatchesPage';
import { DiscoverPage } from './pages/DiscoverPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { FavoritePlayersPage } from './pages/FavoritePlayersPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PrivacySecurityPage } from './pages/PrivacySecurityPage';
import { LanguageProvider } from './context/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>

            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="matches" element={<MatchesPage />} />
              <Route path="discover" element={<DiscoverPage />} />  {/* Add this route */}
              <Route path="match/:id" element={<MatchDetailsPage />} />
              <Route path="teams" element={<TeamsPage />} />
              <Route path="team/:id" element={<TeamDetailsPage />} />
              <Route path="players" element={<PlayersPage />} />
              <Route path="player/:id" element={<PlayerProfilePage />} />
              <Route path="stats" element={<StatsHubPage />} />
              <Route path="head-to-head" element={<HeadToHeadPage />} />
              <Route path="archive" element={<SeasonArchivePage />} />
              <Route path="news" element={<NewsPage />} />
              <Route path="news/:id" element={<NewsDetailPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="profile/favorite-players" element={<FavoritePlayersPage />} />
              <Route path="profile/notifications" element={<NotificationsPage />} />
              <Route path="profile/privacy-security" element={<PrivacySecurityPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />  {/* Add this route */}

            </Route>

            {/* Admin Only Routes */}
            <Route path="/admin" element={<AdminRoute />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="news" element={<AdminNewsPage />} />
              <Route path="matches" element={<AdminMatchesPage />} />
            </Route>

            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
