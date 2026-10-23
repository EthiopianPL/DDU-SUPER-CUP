import { useNavigate } from 'react-router';
import { BrandLockup } from './BrandLockup';

export function Header() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070d18]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center px-4 py-3">
        <BrandLockup size="sm" onClick={() => navigate('/')} />
      </div>
    </header>
  );
}
