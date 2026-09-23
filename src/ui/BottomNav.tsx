import React from 'react';
import { LayoutDashboard, Coins, GitCompare, Clock, CalendarDays, Database } from 'lucide-react';

export type NavTab = 'dashboard' | 'currencies' | 'pairs' | 'sessions' | 'calendar' | 'sources';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'dashboard' as NavTab, label: 'Terminal', icon: LayoutDashboard },
    { id: 'currencies' as NavTab, label: 'Currencies', icon: Coins },
    { id: 'pairs' as NavTab, label: 'Pairs', icon: GitCompare },
    { id: 'sessions' as NavTab, label: 'Sessions', icon: Clock },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: CalendarDays },
    { id: 'sources' as NavTab, label: 'Sources', icon: Database },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-lg border-t border-neutral-800/80 px-2 py-1.5 md:hidden">
      <div className="grid grid-cols-6 items-center max-w-md mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 rounded transition-colors ${
                isActive ? 'text-neutral-100' : 'text-neutral-500 hover:text-neutral-400'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : ''}`} />
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-semibold text-neutral-200' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 bg-emerald-400 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
