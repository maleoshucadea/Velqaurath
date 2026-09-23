import { INITIAL_CURRENCIES } from './currencies';
import { INITIAL_PAIRS } from './pairs';
import { INITIAL_CENTRAL_BANKS } from './centralBanks';
import { INITIAL_DATA_SOURCES } from './dataSources';
import { VERIFIED_OBSERVATIONS, SCHEDULED_ECONOMIC_EVENTS } from './benchmarkDataset';
import { DEFAULT_LIQUID_PAIRS } from '../marketData/config';
import { evaluateCurrencyState } from '../engines/currency/currencyEngine';
import { evaluatePairIntelligence } from '../engines/pair/pairEngine';
import { getActiveSessionOverview } from './sessions';
import { marketDataService } from '../marketData/service/marketDataService';
import {
  Currency,
  Pair,
  CentralBank,
  EconomicObservation,
  EconomicEvent,
  DataSource,
  StrengthThresholds,
  ProviderStatus,
  MarketQuote,
  CurrencyMarketStrength,
  CurrencyState,
  PairIntelligence,
  DashboardPayload
} from '../types';

export interface DataStoreState {
  isDataFeedConnected: boolean;
  currencies: Currency[];
  pairs: Pair[];
  centralBanks: CentralBank[];
  observations: EconomicObservation[];
  events: EconomicEvent[];
  dataSources: DataSource[];
  thresholds: StrengthThresholds;
  lastUpdated: string;
  marketQuotes: MarketQuote[];
  marketStrengths: Map<string, CurrencyMarketStrength>;
  marketProviderStatus: ProviderStatus;
}

export class DataStore {
  private listeners: Set<() => void> = new Set();
  private state: DataStoreState;

  constructor() {
    this.state = {
      isDataFeedConnected: true,
      currencies: [...INITIAL_CURRENCIES],
      pairs: [...INITIAL_PAIRS],
      centralBanks: [...INITIAL_CENTRAL_BANKS],
      observations: [...VERIFIED_OBSERVATIONS],
      events: [...SCHEDULED_ECONOMIC_EVENTS],
      dataSources: [...INITIAL_DATA_SOURCES],
      thresholds: {
        strongThreshold: 0.1,
        weakThreshold: -0.1
      },
      lastUpdated: new Date().toISOString(),
      marketQuotes: [],
      marketStrengths: new Map<string, CurrencyMarketStrength>(),
      marketProviderStatus: {
        providerName: 'Biquote',
        activeProvider: 'Biquote',
        health: 'DISCONNECTED',
        message: 'Biquote live market data provider initialized. Awaiting initial connection.',
        lastFetchedAt: null,
        quotesCount: 0,
        requiredPairsCount: DEFAULT_LIQUID_PAIRS.length,
        availablePairsCount: 0,
        missingPairs: [...DEFAULT_LIQUID_PAIRS],
        stalePairs: [],
        oldestQuoteAge: null,
        streamState: 'DISCONNECTED',
        cacheExpiresAt: null,
        isConfigured: true,
        source: 'Biquote',
        fallbackAvailable: false,
        fallbackStatus: 'NOT_CONFIGURED'
      }
    };
  }

  public getState(): DataStoreState {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public setMarketData(
    quotes: MarketQuote[],
    strengths: Map<string, CurrencyMarketStrength>,
    status: ProviderStatus
  ): void {
    const dsStatus =
      status.health === 'CONNECTED'
        ? 'CONNECTED'
        : status.health === 'DEGRADED'
        ? 'CONNECTED'
        : status.health === 'ERROR'
        ? 'SOURCE_ERROR'
        : 'NOT_CONNECTED';

    this.state = {
      ...this.state,
      marketQuotes: quotes,
      marketStrengths: strengths,
      marketProviderStatus: status,
      dataSources: this.state.dataSources.map((ds) => {
        if (ds.id === 'src-twelvedata' || ds.id === 'src-biquote') {
          return {
            ...ds,
            status: dsStatus,
            lastSyncAt: status.lastFetchedAt
          };
        }
        return ds;
      }),
      lastUpdated: new Date().toISOString()
    };
    this.notify();
  }

  public toggleDataFeedConnection(connected?: boolean): void {
    const nextState = connected !== undefined ? connected : !this.state.isDataFeedConnected;
    const nextStatus = nextState ? 'CONNECTED' : 'NOT_CONNECTED';

    this.state = {
      ...this.state,
      isDataFeedConnected: nextState,
      dataSources: this.state.dataSources.map((ds) => ({
        ...ds,
        status: nextStatus,
        lastSyncAt: nextState ? ds.lastSyncAt ?? new Date().toISOString() : null
      })),
      centralBanks: this.state.centralBanks.map((cb) => ({
        ...cb,
        sourceMetadata: {
          ...cb.sourceMetadata,
          status: nextStatus
        }
      })),
      observations: this.state.observations.map((obs) => ({
        ...obs,
        sourceStatus: nextStatus
      })),
      lastUpdated: new Date().toISOString()
    };
    this.notify();
  }

  public toggleDataFeed(connected?: boolean): void {
    this.toggleDataFeedConnection(connected);
  }

  public updateThresholds(strong: number, weak: number): void {
    this.state = {
      ...this.state,
      thresholds: {
        strongThreshold: strong,
        weakThreshold: weak
      },
      lastUpdated: new Date().toISOString()
    };
    this.notify();
  }

  public addObservation(observation: EconomicObservation): void {
    this.state = {
      ...this.state,
      observations: [observation, ...this.state.observations.filter((o) => o.id !== observation.id)],
      lastUpdated: new Date().toISOString()
    };
    this.notify();
  }

  public addEvent(event: EconomicEvent): void {
    this.state = {
      ...this.state,
      events: [event, ...this.state.events.filter((e) => e.id !== event.id)],
      lastUpdated: new Date().toISOString()
    };
    this.notify();
  }

  public getCurrencyState(code: string): CurrencyState | null {
    const currency = this.state.currencies.find(
      (c) => c.code.toUpperCase() === code.toUpperCase()
    );
    if (!currency) return null;

    const cb =
      this.state.centralBanks.find(
        (b) => b.associatedCurrency.toUpperCase() === currency.code.toUpperCase()
      ) || {
        id: `cb-${currency.code.toLowerCase()}`,
        institution: `Central Bank of ${currency.name}`,
        associatedCurrency: currency.code,
        currentPolicyRate: null,
        previousPolicyRate: null,
        latestDecisionDate: null,
        nextKnownDecisionDate: null,
        stance: 'UNAVAILABLE' as const,
        stanceEvidence: [],
        guidanceSummary: null,
        majorRisks: [],
        sourceMetadata: {
          sourceName: 'Primary Central Bank',
          sourceUrl: '',
          lastUpdated: this.state.lastUpdated,
          status: this.state.isDataFeedConnected ? ('CONNECTED' as const) : ('NOT_CONNECTED' as const)
        }
      };

    const marketStrengths =
      this.state.marketStrengths.size > 0
        ? this.state.marketStrengths
        : marketDataService.getCachedCurrencyStrengths(this.state.thresholds);

    const marketStrengthResult = marketStrengths.get(currency.code.toUpperCase()) ?? null;

    return evaluateCurrencyState(
      currency,
      this.state.observations,
      cb,
      this.state.thresholds,
      this.state.isDataFeedConnected,
      marketStrengthResult
    );
  }

  public getAllCurrencyStates(): CurrencyState[] {
    return this.state.currencies
      .map((c) => this.getCurrencyState(c.code))
      .filter((s): s is CurrencyState => s !== null);
  }

  public getPairIntelligence(symbol: string, date: Date = new Date()): PairIntelligence | null {
    const clean = symbol.replace(/[-_]/g, '/').toUpperCase();
    const pair = this.state.pairs.find((p) => p.symbol === clean);
    if (!pair) return null;

    const baseState = this.getCurrencyState(pair.baseCurrency);
    const quoteState = this.getCurrencyState(pair.quoteCurrency);
    if (!baseState || !quoteState) return null;

    return evaluatePairIntelligence(
      pair,
      baseState,
      quoteState,
      this.state.events,
      date,
      this.state.isDataFeedConnected
    );
  }

  public getAllPairIntelligences(date: Date = new Date()): PairIntelligence[] {
    return this.state.pairs
      .map((p) => this.getPairIntelligence(p.symbol, date))
      .filter((pi): pi is PairIntelligence => pi !== null);
  }

  public getDashboard(date: Date = new Date()): DashboardPayload {
    const allStates = this.getAllCurrencyStates();
    const providerStatus = marketDataService.getStatus();

    const dataStatus = this.state.isDataFeedConnected ? 'CONNECTED' : 'NOT_CONNECTED';
    const dataStatusMessage = this.state.isDataFeedConnected
      ? providerStatus.health === 'CONNECTED'
        ? `LIVE DATA FEEDS CONNECTED: ${
            providerStatus.activeProvider || providerStatus.providerName
          } market quotes & official macroeconomic statistics active.`
        : providerStatus.health === 'NOT_CONFIGURED'
        ? 'MACRO FEEDS CONNECTED · MARKET DATA NOT CONFIGURED: Awaiting live market data feed.'
        : `MACRO FEEDS CONNECTED · MARKET DATA: ${providerStatus.message}`
      : 'DATA SOURCE NOT CONNECTED: Running in unaugmented intelligence mode. Connect verified feeds to populate.';

    const strongCurrencies = allStates.filter((s) => s.marketState === 'STRONG');
    const neutralCurrencies = allStates.filter((s) => s.marketState === 'NEUTRAL');
    const weakCurrencies = allStates.filter((s) => s.marketState === 'WEAK');

    const allIntelligences = this.getAllPairIntelligences(date);
    let topPairToWatch: PairIntelligence | null = null;

    if (allIntelligences.length > 0 && this.state.isDataFeedConnected) {
      const validPairsWithDelta = allIntelligences.filter(
        (p) => p.relativeStrengthDelta !== null && p.orientationDirection !== 'DATA_UNAVAILABLE'
      );
      if (validPairsWithDelta.length > 0) {
        const sorted = [...validPairsWithDelta].sort((a, b) => {
          const deltaA = Math.abs(a.relativeStrengthDelta ?? 0);
          const deltaB = Math.abs(b.relativeStrengthDelta ?? 0);
          return deltaB - deltaA;
        });
        topPairToWatch = sorted[0];
      }
    }

    const sessionOverview = getActiveSessionOverview(date);

    return {
      dataStatus,
      dataStatusMessage,
      lastUpdated: this.state.lastUpdated,
      currenciesCount: this.state.currencies.length,
      strongCurrencies,
      neutralCurrencies,
      weakCurrencies,
      allCurrencies: allStates,
      topPairToWatch,
      sessions: {
        activeSessions: sessionOverview.openSessions.map((s) => s.session),
        upcomingSessions: sessionOverview.closedSessions.map((s) => s.session),
        activeOverlaps: sessionOverview.activeOverlaps,
        currentTimeUtc: date.toISOString()
      },
      economicCalendar: this.state.events,
      dataSources: this.state.dataSources,
      marketProviderStatus: providerStatus
    };
  }
}

export const globalStore = new DataStore();
