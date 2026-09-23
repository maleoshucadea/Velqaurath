import React, { useState, useEffect } from 'react';
import { VelqoarathApiService } from './api/service';
import { globalStore } from './data/store';
import {
  CurrencyState,
  PairIntelligence,
  DashboardPayload
} from './types';
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
import { LayoutDashboard, Coins, GitCompare, Clock, CalendarDays, Database } from 'lucide-react';

export default function App() {
  const [dashboard, setDashboard] = useState<DashboardPayload>(() => VelqoarathApiService.getDashboard());
  const [allPairs, setAllPairs] = useState<PairIntelligence[]>(() => VelqoarathApiService.getAllPairIntelligences());
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Selected detail entities
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null);
  const [selectedPairSymbol, setSelectedPairSymbol] = useState<string | null>(null);

  // Modals state
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isThresholdsOpen, setIsThresholdsOpen] = useState(false);

  // Subscribe to store updates and periodic clock refresh
  useEffect(() => {
    const updateState = () => {
      setDashboard(VelqoarathApiService.getDashboard());
      setAllPairs(VelqoarathApiService.getAllPairIntelligences());
    };

    // Initial and periodic fetch from server to get provider updates
    const fetchFromServer = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data: DashboardPayload = await res.json();
          setDashboard(data);
        }
      } catch {
        // Fallback to local service if server endpoint unreachable (e.g. testing)
      }
    };

    fetchFromServer();
    const unsubscribe = globalStore.subscribe(updateState);
    const interval = setInterval(updateState, 5000); // 5-second cadence for session clock precision
    const serverInterval = setInterval(fetchFromServer, 15000); // 15-second sync with server provider cache

    return () => {
      unsubscribe();
      clearInterval(interval);
      clearInterval(serverInterval);
    };
  }, []);

  const handleToggleFeed = () => {
    VelqoarathApiService.toggleDataFeed();
  };

  const handleUpdateThresholds = (strong: number, weak: number) => {
    VelqoarathApiService.updateThresholds(strong, weak);
  };

  const selectedCurrencyState = selectedCurrencyCode
    ? VelqoarathApiService.getCurrencyState(selectedCurrencyCode)
    : null;

  const selectedPairIntelligence = selectedPairSymbol
    ? VelqoarathApiService.getPairIntelligence(selectedPairSymbol)
    : null;

  const thresholds = globalStore.getState().thresholds;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-neutral-800 selection:text-emerald-300">
      {/* Top Header */}
      <Header
        dataStatus={dashboard.dataStatus}
        onOpenSources={() => setIsSourcesOpen(true)}
        onOpenThresholds={() => setIsThresholdsOpen(true)}
      />

      {/* Desktop Tab Switcher */}
      <div className="hidden md:block border-b border-neutral-800/80 bg-neutral-950/70 sticky top-14 z-20 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-1 py-1.5 font-mono text-xs">
          {[
            { id: 'dashboard' as NavTab, label: 'Terminal', icon: LayoutDashboard },
            { id: 'currencies' as NavTab, label: 'Currencies', icon: Coins },
            { id: 'pairs' as NavTab, label: 'Pairs Matrix', icon: GitCompare },
            { id: 'sessions' as NavTab, label: 'Sessions', icon: Clock },
            { id: 'calendar' as NavTab, label: 'Calendar', icon: CalendarDays },
            { id: 'sources' as NavTab, label: 'Sources', icon: Database },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                  isActive
                    ? 'bg-neutral-900 text-neutral-100 font-semibold border border-neutral-700/80'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : ''}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-12 space-y-4">
        {/* Data Status & Provenance Banner */}
        <DataStatusBanner
          dataStatus={dashboard.dataStatus}
          statusMessage={dashboard.dataStatusMessage}
          dataSources={dashboard.dataSources}
          marketProviderStatus={dashboard.marketProviderStatus}
          onToggleConnection={handleToggleFeed}
          onOpenSources={() => setIsSourcesOpen(true)}
        />

        {/* Tab 1: Terminal Overview (Dashboard) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Current Market State: Strongest, Neutral, Weakest */}
            <MarketStateSummary
              allCurrencies={dashboard.allCurrencies}
              strongCurrencies={dashboard.strongCurrencies}
              neutralCurrencies={dashboard.neutralCurrencies}
              weakCurrencies={dashboard.weakCurrencies}
              thresholds={thresholds}
              onSelectCurrency={code => setSelectedCurrencyCode(code)}
            />

            {/* Top Pair to Watch */}
            <TopPairCard
              topPair={dashboard.topPairToWatch}
              onSelectPair={symbol => setSelectedPairSymbol(symbol)}
            />

            {/* Currency Matrix */}
            <CurrencyMatrix
              currencies={dashboard.allCurrencies}
              onSelectCurrency={code => setSelectedCurrencyCode(code)}
            />

            {/* Session Intelligence */}
            <SessionIntelligenceCard
              sessions={dashboard.sessions.activeSessions.concat(dashboard.sessions.upcomingSessions)}
              activeOverlaps={dashboard.sessions.activeOverlaps}
              calendarEvents={dashboard.economicCalendar}
              onSelectPair={symbol => setSelectedPairSymbol(symbol)}
            />

            {/* Economic Calendar */}
            <EconomicCalendarTable
              events={dashboard.economicCalendar}
              onSelectCurrency={code => setSelectedCurrencyCode(code)}
            />
          </div>
        )}

        {/* Tab 2: Currencies View */}
        {activeTab === 'currencies' && (
          <div className="space-y-4">
            <MarketStateSummary
              allCurrencies={dashboard.allCurrencies}
              strongCurrencies={dashboard.strongCurrencies}
              neutralCurrencies={dashboard.neutralCurrencies}
              weakCurrencies={dashboard.weakCurrencies}
              thresholds={thresholds}
              onSelectCurrency={code => setSelectedCurrencyCode(code)}
            />
            <CurrencyMatrix
              currencies={dashboard.allCurrencies}
              onSelectCurrency={code => setSelectedCurrencyCode(code)}
            />
          </div>
        )}

        {/* Tab 3: Pairs View */}
        {activeTab === 'pairs' && (
          <PairsList
            pairIntelligences={allPairs}
            onSelectPair={symbol => setSelectedPairSymbol(symbol)}
          />
        )}

        {/* Tab 4: Sessions View */}
        {activeTab === 'sessions' && (
          <SessionsView
            sessions={dashboard.sessions.activeSessions.concat(dashboard.sessions.upcomingSessions)}
            calendarEvents={dashboard.economicCalendar}
            onSelectPair={symbol => setSelectedPairSymbol(symbol)}
          />
        )}

        {/* Tab 5: Calendar View */}
        {activeTab === 'calendar' && (
          <EconomicCalendarTable
            events={dashboard.economicCalendar}
            onSelectCurrency={code => setSelectedCurrencyCode(code)}
          />
        )}

        {/* Tab 6: Sources View */}
        {activeTab === 'sources' && (
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

      {/* Footer Attribution */}
      <footer className="w-full border-t border-neutral-900 py-4 px-4 text-center text-[10px] font-mono text-neutral-600">
        <p>VELQOARATH · Global Market Intelligence Terminal</p>
        <p className="mt-0.5 text-neutral-700">Built by Boogie · Fundamental intelligence for currencies. Not an execution venue.</p>
      </footer>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        currentTab={activeTab}
        onSelectTab={tab => {
          if (tab === 'sources') {
            setIsSourcesOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
      />

      {/* Modals */}
      <CurrencyDetailModal
        currencyState={selectedCurrencyState}
        events={dashboard.economicCalendar}
        onClose={() => setSelectedCurrencyCode(null)}
        onSelectPair={symbol => {
          setSelectedCurrencyCode(null);
          setSelectedPairSymbol(symbol);
        }}
      />

      <PairDetailModal
        intelligence={selectedPairIntelligence}
        onClose={() => setSelectedPairSymbol(null)}
        onSelectCurrency={code => {
          setSelectedPairSymbol(null);
          setSelectedCurrencyCode(code);
        }}
      />

      <ThresholdsModal
        currentThresholds={thresholds}
        isOpen={isThresholdsOpen}
        onClose={() => setIsThresholdsOpen(false)}
        onSave={handleUpdateThresholds}
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
