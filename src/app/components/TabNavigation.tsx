import { useLanguage } from '../context/LanguageContext';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { t } = useLanguage();
  const tabs = [
    { id: 'matches', label: t('Matches') },
    { id: 'standings', label: t('Standings') },
    { id: 'stats', label: t('Stats') },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-lg" style={{
      background: 'rgba(26, 31, 46, 0.5)'
    }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-4 py-2.5 rounded-md transition-all font-semibold ${
            activeTab === tab.id
              ? 'text-black'
              : 'text-gray-400 hover:text-white'
          }`}
          style={{
            background: activeTab === tab.id ? '#ffd700' : 'transparent',
            fontFamily: 'Inter, sans-serif',
            fontWeight: activeTab === tab.id ? 800 : 600
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
