import { Navigate, Outlet, useLocation } from 'react-router';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const showChrome = !['/login', '/signup'].includes(location.pathname);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070d18]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#f5c518] border-t-transparent" />
      </div>
    );
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070d18] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-80 w-80 rounded-full bg-[#2450c8]/25 blur-3xl" />
        <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-[#f5c518]/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-[#2f9e44]/15 blur-3xl" />
      </div>

      {showChrome && <Header />}
      <main className="w-full">
        <Outlet />
      </main>
      {showChrome && <BottomNav />}
    </div>
  );
}
