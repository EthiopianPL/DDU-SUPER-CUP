import { BrowserRouter, Navigate, Routes, Route } from 'react-router';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { AdminRoute } from './components/AdminRoute';
import { HomePage } from './pages/HomePage';
import { MatchesPage } from './pages/MatchesPage';
import { MatchDetailsPage } from './pages/MatchDetailsPage';
import { TeamsPage } from './pages/TeamsPage';
import { TeamDetailsPage } from './pages/TeamDetailsPage';
import { GroupsPage } from './pages/GroupsPage';
import { NewsPage } from './pages/NewsPage';
import { NewsDetailPage } from './pages/NewsDetailPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { AdminNewsPage } from './pages/AdminNewsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminMatchesPage } from './pages/AdminMatchesPage';
import { LanguageProvider } from './context/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
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
              <Route path="discover" element={<Navigate to="/groups" replace />} />
              <Route path="players" element={<Navigate to="/teams" replace />} />
              <Route path="profile" element={<Navigate to="/" replace />} />
            </Route>

            <Route path="/admin" element={<AdminRoute />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="news" element={<AdminNewsPage />} />
              <Route path="matches" element={<AdminMatchesPage />} />
            </Route>

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
