import { Languages } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <label
      className="flex items-center gap-2 rounded-full px-3 py-2 text-sm text-white shadow-lg cursor-pointer"
      style={{
        background: 'rgba(10, 14, 26, 0.92)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <Languages className="h-4 w-4 text-[#ffd700]" />
      <span className="hidden sm:inline">{t('Language')}</span>
      <select
        aria-label={t('Switch language')}
        value={language}
        onChange={(event) => setLanguage(event.target.value as 'en' | 'am')}
        className="bg-transparent text-white outline-none cursor-pointer"
      >
        <option value="en" className="text-black">
          EN
        </option>
        <option value="am" className="text-black">
          አማ
        </option>
      </select>
    </label>
  );
}
