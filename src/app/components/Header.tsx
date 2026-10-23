import { Menu, Search } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { SearchModal } from './SearchModal';
import { MobileMenu } from './MobileMenu';
import { LanguageSwitcher } from './LanguageSwitcher';
import { BrandLockup } from './BrandLockup';

export function Header() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070d18]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <BrandLockup size="sm" onClick={() => navigate('/')} />

          <div className="flex items-center gap-1">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="rounded-lg p-2 transition-colors hover:bg-white/10"
              aria-label="Search"
            >
              <Search className="h-5 w-5 text-white" />
            </button>
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="rounded-lg p-2 transition-colors hover:bg-white/10"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      </header>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </>
  );
}
