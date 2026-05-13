import { Navigate, Outlet, useLocation } from 'react-router';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const showHeader = !['/login', '/signup'].includes(location.pathname);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#ffd700] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Gradient Background */}
      <div className="fixed inset-0 -z-10 bg-[#0a0e1a]">
        {/* Green Gradient - Top Left */}
        <div 
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #009639 0%, transparent 70%)' }}
        />
        
        {/* Gold Gradient - Top Right */}
        <div 
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #ffd700 0%, transparent 70%)' }}
        />
        
        {/* Red Gradient - Bottom Right */}
        <div 
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #da121a 0%, transparent 70%)' }}
        />
        
        {/* Green Gradient - Bottom Left */}
        <div 
          className="absolute -bottom-40 -left-20 w-80 h-80 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #009639 0%, transparent 70%)' }}
        />
      </div>

      {/* Main Content */}
      <div className="relative">
        {showHeader && <Header />}
        
        <div className="w-full">
          <Outlet />
        </div>

        {showHeader && <BottomNav />}
      </div>
    </div>
  );
}
