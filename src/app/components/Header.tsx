// src/app/components/Header.tsx
import { Menu, Bell, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { SearchModal } from './SearchModal';
import { MobileMenu } from './MobileMenu';
import { LanguageSwitcher } from './LanguageSwitcher';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{
        background: 'rgba(10, 14, 26, 0.9)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div className="flex items-center justify-between px-4 py-4">
          <button 
            onClick={() => {
              onMenuClick?.();
              setIsMenuOpen(true);
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6 text-white" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-1 h-8 bg-[#009639]" />
              <div className="w-1 h-8 bg-[#ffd700]" />
              <div className="w-1 h-8 bg-[#da121a]" />
            </div>
            <h1 
              className="text-xl tracking-tight text-white cursor-pointer"
              style={{ 
                fontFamily: 'Inter, sans-serif',
                fontWeight: 900
              }}
              onClick={() => navigate('/')}
            >
              EPL
            </h1>
          </div>
          
          <div className="flex gap-2 items-center">
            <LanguageSwitcher />
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <Search className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={() => navigate('/profile/notifications')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors relative"
            >
              <Bell className="w-6 h-6 text-white" />
              <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </div>
      </header>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}
