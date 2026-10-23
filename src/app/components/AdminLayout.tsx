import { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Newspaper, Calendar, LogOut, 
  Menu, X, ChevronRight, Shield
} from 'lucide-react';

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/news', label: 'News', icon: Newspaper, exact: false },
  { path: '/admin/matches', label: 'Matches', icon: Calendar, exact: false },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (item: typeof navItems[0]) => {
    if (item.exact) return location.pathname === item.path;
    return location.pathname.startsWith(item.path);
  };

  const NavLink = ({ item }: { item: typeof navItems[0] }) => {
    const active = isActive(item);
    return (
      <button
        onClick={() => {
          navigate(item.path);
          setSidebarOpen(false);
        }}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all group"
        style={{
          background: active
            ? 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.05))'
            : 'transparent',
          color: active ? '#ffd700' : '#9ca3af',
          border: active ? '1px solid rgba(255, 215, 0, 0.15)' : '1px solid transparent',
        }}
      >
        <item.icon className={`w-5 h-5 transition-colors ${active ? 'text-[#ffd700]' : 'text-gray-500 group-hover:text-gray-300'}`} />
        <span className="flex-1 text-left">{item.label}</span>
        {active && <ChevronRight className="w-4 h-4 text-[#ffd700]/50" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-[260px] z-50 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          background: 'rgba(26, 31, 46, 0.95)',
          borderRight: '1px solid rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Logo / Brand */}
        <div
          className="p-5 flex items-center gap-3"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 215, 0, 0.05))',
              border: '1px solid rgba(255, 215, 0, 0.15)',
            }}
          >
            <Shield className="w-5 h-5 text-[#ffd700]" />
          </div>
          <div>
            <h1 className="text-base font-black text-white leading-tight">Super Cup Admin</h1>
            <p className="text-[11px] text-gray-500">Management Console</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden p-1 hover:bg-white/10 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-4 space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest text-gray-600 font-bold px-4 mb-3">Main Menu</p>
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        {/* User Profile / Logout */}
        <div
          className="p-4"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] mb-3">
            <div className="w-9 h-9 rounded-full bg-[#ffd700]/20 flex items-center justify-center">
              <span className="text-[#ffd700] font-bold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'Admin'}</p>
              <p className="text-[11px] text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header
          className="sticky top-0 z-30 h-16 flex items-center px-4 lg:px-8"
          style={{
            background: 'rgba(10, 14, 26, 0.8)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-white/10 rounded-lg mr-3 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-400" />
          </button>

          {/* Breadcrumb-like page title */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
            <span className="text-white font-semibold">
              {navItems.find(item => isActive(item))?.label || 'Dashboard'}
            </span>
          </div>

          {/* Right side: Back to site */}
          <button
            onClick={() => navigate('/')}
            className="ml-auto text-xs text-gray-500 hover:text-[#ffd700] transition-colors flex items-center gap-1"
          >
            ← Back to Site
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-6xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}