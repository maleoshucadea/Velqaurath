import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Coins,
  ArrowLeftRight,
  Clock,
  Calendar,
  Database
} from 'lucide-react';
import { globalStore } from './data/store';
import { DashboardPayload, PairIntelligence, StrengthThresholds } from './types';
import { Header } from './ui/Header';
import { BottomNav, NavTab } from './ui/BottomNav';
import { MarketStateSummary } from './ui/MarketStateSummary';
import { CurrencyMatrix } from './ui/CurrencyMatrix';
import { TopPairCard } from './ui/TopPairCard';
import { SessionIntelligenceCard } from './ui/SessionIntelligenceCard';
import { EconomicCalendarTable } from './ui/EconomicCalendarTable';
import { DataStatusBanner } from './ui/DataStatusBanner';
import { CurrencyDetailModal } from './ui/CurrencyDetailModal';
import { PairDetailModal } from './ui/PairDetailModal';
import { ThresholdsModal } from './ui/ThresholdsModal';
import { DataSourcesModal } from './ui/DataSourcesModal';
import { PairsList } from './ui/PairsList';
import { SessionsView } from './ui/SessionsView';

export function App() {
  const [dashboard, setDashboard] = useState<DashboardPayload>(() => globalStore.getDashboard());
  const [pairIntelligences, setPairIntelligences] = useState<PairIntelligence[]>(() =>
    globalStore.getAllPairIntelligences()
  );
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isThresholdsOpen, setIsThresholdsOpen] = useState(false);

  useEffect(() => {
    const updateLocalState = () => {
      setDashboard(globalStore.getDashboard());
      setPairIntelligences(globalStore.getAllPairIntelligences());
    };

    const fetchServerData = async () => {
      try {
        const [dashRes, pairsRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/pairs')
        ]);

        if (dashRes.ok) {
          const dashData: DashboardPayload = await dashRes.json();
          setDashboard(dashData);

          if (dashData.marketProviderStatus) {
            globalStore.setMarketData(
              [],
              new Map(),
              dashData.marketProviderStatus
            );
          }
        }

        if (pairsRes.ok) {
          const pairsData = await pairsRes.json();
          setPairIntelligences(pairsData);
        }
      } catch {
        // Fallback to local store only on network failure
        updateLocalState();
      }
    };

    fetchServerData();

    const unsubscribe = globalStore.subscribe(updateLocalState);
    const pollInterval = setInterval(fetchServerData, 3000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  const handleToggleFeed = () => {
    globalStore.toggleDataFeed();
  };

  const handleSaveThresholds = (strong: number, weak: number) => {
    globalStore.updateThresholds(strong, weak);
  };

  const currencyDetail = selectedCurrency
    ? globalStore.getCurrencyState(selectedCurrency)
    : null;

  const pairDetail = selectedPair
    ? globalStore.getPairIntelligence(selectedPair)
    : null;

  const currentThresholds: StrengthThresholds = globalStore.getState().thresholds;

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Terminal', icon: LayoutDashboard },
    { id: 'currencies' as NavTab, label: 'Currencies', icon: Coins },
    { id: 'pairs' as NavTab, label: 'Pairs Matrix', icon: ArrowLeftRight },
    { id: 'sessions' as NavTab, label: 'Sessions', icon: Clock },
    { id: 'calendar' as NavTab, label: 'Calendar', icon: Calendar },
    { id: 'sources' as NavTab, label: 'Sources', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-neutral-800 selection:text-emerald-300">
      {/* Top Header */}
      <Header
        dataStatus={dashboard.dataStatus}
        onOpenSources={() => setIsSourcesOpen(true)}
        onOpenThresholds={() => setIsThresholdsOpen(true)}
      />

      {/* Desktop Navigation */}
      <div className="hidden md:block border-b border-neutral-800/80 bg-neutral-950/70 sticky top-14 z-20 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 py-1.5 font-mono text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                  isActive
                    ? 'bg-neutral-900 text-neutral-100 font-semibold border border-neutral-700/80'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-12 space-y-4">
        {/* Live Data Status Banner */}
        <DataStatusBanner
          dataStatus={dashboard.dataStatus}
          statusMessage={dashboard.dataStatusMessage}
          dataSources={dashboard.dataSources}
          marketProviderStatus={dashboard.marketProviderStatus}
          onToggleConnection={handleToggleFeed}
          onOpenSources={() => setIsSourcesOpen(true)}
        />

        {/* Tab Views */}
        {currentTab === 'dashboard' && (
          <div className="space-y-4">
            <MarketStateSummary
              allCurrencies={dashboard.allCurrencies}
              strongCurrencies={dashboard.strongCurrencies}
              neutralCurrencies={dashboard.neutralCurrencies}
              weakCurrencies={dashboard.weakCurrencies}
              thresholds={currentThresholds}
              onSelectCurrency={(code) => setSelectedCurrency(code)}
            />

            <TopPairCard
              topPair={dashboard.topPairToWatch}
              onSelectPair={(symbol) => setSelectedPair(symbol)}
            />

            <CurrencyMatrix
              currencies={dashboard.allCurrencies}
              onSelectCurrency={(code) => setSelectedCurrency(code)}
            />

            <SessionIntelligenceCard
              sessions={dashboard.sessions.activeSessions.concat(dashboard.sessions.upcomingSessions)}
              activeOverlaps={dashboard.sessions.activeOverlaps}
              calendarEvents={dashboard.economicCalendar}
              onSelectPair={(symbol) => setSelectedPair(symbol)}
            />

            <EconomicCalendarTable
              events={dashboard.economicCalendar}
              onSelectCurrency={(code) => setSelectedCurrency(code)}
            />
          </div>
        )}

        {currentTab === 'currencies' && (
          <div className="space-y-4">
            <MarketStateSummary
              allCurrencies={dashboard.allCurrencies}
              strongCurrencies={dashboard.strongCurrencies}
              neutralCurrencies={dashboard.neutralCurrencies}
              weakCurrencies={dashboard.weakCurrencies}
              thresholds={currentThresholds}
              onSelectCurrency={(code) => setSelectedCurrency(code)}
            />
            <CurrencyMatrix
              currencies={dashboard.allCurrencies}
              onSelectCurrency={(code) => setSelectedCurrency(code)}
            />
          </div>
        )}

        {currentTab === 'pairs' && (
          <PairsList
            pairIntelligences={pairIntelligences}
            onSelectPair={(symbol) => setSelectedPair(symbol)}
          />
        )}

        {currentTab === 'sessions' && (
          <SessionsView
            sessions={dashboard.sessions.activeSessions.concat(dashboard.sessions.upcomingSessions)}
            calendarEvents={dashboard.economicCalendar}
            onSelectPair={(symbol) => setSelectedPair(symbol)}
          />
        )}

        {currentTab === 'calendar' && (
          <EconomicCalendarTable
            events={dashboard.economicCalendar}
            onSelectCurrency={(code) => setSelectedCurrency(code)}
          />
        )}

        {currentTab === 'sources' && (
          <div className="space-y-4">
            <div className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-lg">
              <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide mb-1">
                Data Provenance & Agency Directory
              </h2>
              <p className="text-xs text-neutral-400 leading-relaxed font-sans mb-4">
                VELQOARATH maintains zero-fabrication standards. Below is the active registry of primary government agencies and central bank sources underpinning all macro observations.
              </p>
              <button
                onClick={() => setIsSourcesOpen(true)}
                className="px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold border border-neutral-700 transition-colors"
              >
                Open Full Provenance Inspector & Toggle Controls →
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-neutral-900 py-4 px-4 text-center text-[10px] font-mono text-neutral-600">
        <p>VELQOARATH · Global Market Intelligence Terminal</p>
        <p className="mt-0.5 text-neutral-700">
          Built by Boogie · Fundamental intelligence for currencies. Not an execution venue.
        </p>
      </footer>

      {/* Mobile Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'sources') {
            setIsSourcesOpen(true);
          } else {
            setCurrentTab(tab);
          }
        }}
      />

      {/* Modals */}
      <CurrencyDetailModal
        currencyState={currencyDetail}
        events={dashboard.economicCalendar}
        onClose={() => setSelectedCurrency(null)}
        onSelectPair={(pair) => {
          setSelectedCurrency(null);
          setSelectedPair(pair);
        }}
      />

      <PairDetailModal
        intelligence={pairDetail}
        onClose={() => setSelectedPair(null)}
        onSelectCurrency={(curr) => {
          setSelectedPair(null);
          setSelectedCurrency(curr);
        }}
      />

      <ThresholdsModal
        currentThresholds={currentThresholds}
        isOpen={isThresholdsOpen}
        onClose={() => setIsThresholdsOpen(false)}
        onSave={handleSaveThresholds}
      />

      <DataSourcesModal
        dataSources={dashboard.dataSources}
        dataStatus={dashboard.dataStatus}
        marketProviderStatus={dashboard.marketProviderStatus}
        isOpen={isSourcesOpen}
        onClose={() => setIsSourcesOpen(false)}
        onToggleConnection={handleToggleFeed}
      />
    </div>
  );
}

export default App;
