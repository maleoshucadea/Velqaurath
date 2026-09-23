import { globalStore } from '../data/store';
import { evaluateCurrencyState } from '../engines/currency/currencyEngine';
import { evaluatePairIntelligence } from '../engines/pair/pairEngine';
import { getPairSessionRelevance, calculateWatchWindow } from '../engines/session/sessionEngine';
import { getActiveSessionOverview, getSessionInstantStatus, MARKET_SESSIONS } from '../data/sessions';
import { ECONOMIC_INDICATORS } from '../data/indicators';
import { marketDataService } from '../marketData/service/marketDataService';
import {
  Currency,
  CurrencyPair,
  CurrencyState,
  PairIntelligence,
  DashboardPayload,
  DataSourceStatus
} from '../types';
import {
  NormalizedMarketQuote,
  CurrencyMarketStrength,
  MarketProviderStatus,
  MarketCoverageReport
} from '../marketData/types';

/**
 * High-performance, typed Service Layer implementing all API capabilities.
 * Operates seamlessly across server-side Express routes and client UI.
 */
export class VelqoarathApiService {
  public static getCurrencies(): Currency[] {
    return globalStore.getState().currencies;
  }

  public static getCurrencyByCode(code: string): Currency | null {
    const curr = globalStore.getState().currencies.find(c => c.code.toUpperCase() === code.toUpperCase());
    return curr || null;
  }

  public static getCurrencyState(code: string): CurrencyState | null {
    const state = globalStore.getState();
    const currency = state.currencies.find(c => c.code.toUpperCase() === code.toUpperCase());
    if (!currency) return null;

    const cb = state.centralBanks.find(b => b.associatedCurrency.toUpperCase() === currency.code.toUpperCase()) || {
      id: `cb-${currency.code.toLowerCase()}`,
      institution: `Central Bank of ${currency.name}`,
      associatedCurrency: currency.code,
      currentPolicyRate: null,
      previousPolicyRate: null,
      latestDecisionDate: null,
      nextKnownDecisionDate: null,
      stance: 'UNAVAILABLE',
      stanceEvidence: [],
      guidanceSummary: null,
      majorRisks: [],
      sourceMetadata: {
        sourceName: 'Primary Central Bank',
        sourceUrl: '',
        lastUpdated: state.lastUpdated,
        status: state.isDataFeedConnected ? 'CONNECTED' : 'NOT_CONNECTED'
      }
    };

    // Retrieve market strength from store cache or marketDataService
    const marketStrengths = state.marketStrengths.size > 0
      ? state.marketStrengths
      : marketDataService.getCachedCurrencyStrengths(state.thresholds);

    const marketStrengthResult = marketStrengths.get(currency.code.toUpperCase()) ?? null;

    return evaluateCurrencyState(
      currency,
      state.observations,
      cb,
      state.thresholds,
      state.isDataFeedConnected,
      marketStrengthResult
    );
  }

  public static getAllCurrencyStates(): CurrencyState[] {
    const currencies = globalStore.getState().currencies;
    return currencies.map(c => this.getCurrencyState(c.code)!).filter(Boolean);
  }

  public static getPairs(): CurrencyPair[] {
    return globalStore.getState().pairs;
  }

  public static getPairBySymbol(symbol: string): CurrencyPair | null {
    const clean = symbol.replace(/[-_]/g, '/').toUpperCase();
    return globalStore.getState().pairs.find(p => p.symbol === clean) || null;
  }

  public static getPairIntelligence(symbol: string, date = new Date()): PairIntelligence | null {
    const pair = this.getPairBySymbol(symbol);
    if (!pair) return null;

    const baseState = this.getCurrencyState(pair.baseCurrency);
    const quoteState = this.getCurrencyState(pair.quoteCurrency);
    if (!baseState || !quoteState) return null;

    const state = globalStore.getState();

    return evaluatePairIntelligence(
      pair,
      baseState,
      quoteState,
      state.events,
      date,
      state.isDataFeedConnected
    );
  }

  public static getAllPairIntelligences(date = new Date()): PairIntelligence[] {
    const pairs = globalStore.getState().pairs;
    return pairs
      .map(p => this.getPairIntelligence(p.symbol, date))
      .filter((pi): pi is PairIntelligence => pi !== null);
  }

  public static getEconomicIndicators() {
    return ECONOMIC_INDICATORS;
  }

  public static getEconomicObservations() {
    return globalStore.getState().observations;
  }

  public static getCentralBanks() {
    return globalStore.getState().centralBanks;
  }

  public static getEconomicEvents() {
    return globalStore.getState().events;
  }

  public static getSessions() {
    return MARKET_SESSIONS;
  }

  public static getCurrentSessions(date = new Date()) {
    const overview = getActiveSessionOverview(date);
    return {
      openSessions: overview.openSessions,
      activeOverlaps: overview.activeOverlaps,
      utcTimestamp: date.toISOString()
    };
  }

  public static getUpcomingSessions(date = new Date()) {
    const overview = getActiveSessionOverview(date);
    return {
      closedSessions: overview.closedSessions,
      utcTimestamp: date.toISOString()
    };
  }

  public static getSessionIntelligence(symbol: string, date = new Date()) {
    const pair = this.getPairBySymbol(symbol);
    if (!pair) return null;

    const state = globalStore.getState();
    const relevance = getPairSessionRelevance(pair.symbol);
    const watchWindow = calculateWatchWindow(pair, state.events, date, state.isDataFeedConnected);

    return {
      pairSymbol: pair.symbol,
      relevance,
      watchWindow,
      sessionStatus: getActiveSessionOverview(date)
    };
  }

  public static getDashboard(date = new Date()): DashboardPayload {
    const state = globalStore.getState();
    const allStates = this.getAllCurrencyStates();
    const providerStatus = marketDataService.getStatus();

    let dataStatus: DataSourceStatus = state.isDataFeedConnected ? 'CONNECTED' : 'NOT_CONNECTED';
    let dataStatusMessage = state.isDataFeedConnected
      ? providerStatus.health === 'CONNECTED'
        ? 'LIVE DATA FEEDS CONNECTED: Twelve Data market quotes & official macroeconomic statistics active.'
        : providerStatus.health === 'NOT_CONFIGURED'
        ? 'MACRO FEEDS CONNECTED · MARKET DATA NOT CONFIGURED: Set TWELVE_DATA_API_KEY to populate live FX market strength.'
        : `MACRO FEEDS CONNECTED · MARKET DATA: ${providerStatus.message}`
      : 'DATA SOURCE NOT CONNECTED: Running in unaugmented intelligence mode. Connect verified feeds to populate.';

    const strongCurrencies = allStates.filter(s => s.marketState === 'STRONG');
    const neutralCurrencies = allStates.filter(s => s.marketState === 'NEUTRAL');
    const weakCurrencies = allStates.filter(s => s.marketState === 'WEAK');

    // Find top pair to watch based on real market strength delta
    const allIntelligences = this.getAllPairIntelligences(date);
    let topPairToWatch: PairIntelligence | null = null;

    if (allIntelligences.length > 0 && state.isDataFeedConnected) {
      const validPairsWithDelta = allIntelligences.filter(
        p => p.relativeStrengthDelta !== null && p.orientationDirection !== 'DATA_UNAVAILABLE'
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
      lastUpdated: state.lastUpdated,
      currenciesCount: state.currencies.length,
      strongCurrencies,
      neutralCurrencies,
      weakCurrencies,
      allCurrencies: allStates,
      topPairToWatch,
      sessions: {
        activeSessions: sessionOverview.openSessions.map(s => s.session),
        upcomingSessions: sessionOverview.closedSessions.map(s => s.session),
        activeOverlaps: sessionOverview.activeOverlaps,
        currentTimeUtc: date.toISOString()
      },
      economicCalendar: state.events,
      dataSources: state.dataSources,
      marketProviderStatus: providerStatus
    };
  }

  public static toggleDataFeed(connected?: boolean) {
    globalStore.toggleDataFeedConnection(connected);
    return {
      success: true,
      isDataFeedConnected: globalStore.getState().isDataFeedConnected
    };
  }

  public static updateThresholds(strong: number, weak: number) {
    globalStore.updateThresholds(strong, weak);
    return {
      success: true,
      thresholds: globalStore.getState().thresholds
    };
  }

  // --- Real Market Data Provider Methods ---

  public static getMarketDataStatus(): MarketProviderStatus {
    return marketDataService.getStatus();
  }

  public static async getMarketQuotes(forceRefresh = false): Promise<NormalizedMarketQuote[]> {
    return marketDataService.getQuotes(forceRefresh);
  }

  public static async getMarketStrengths(forceRefresh = false): Promise<CurrencyMarketStrength[]> {
    const state = globalStore.getState();
    const map = await marketDataService.getCurrencyStrengths(state.thresholds, forceRefresh);
    return Array.from(map.values());
  }

  public static getMarketCoverage(): MarketCoverageReport {
    return marketDataService.getCoverage();
  }

  public static async syncMarketData(forceRefresh = false): Promise<{
    status: MarketProviderStatus;
    quotesCount: number;
  }> {
    const state = globalStore.getState();
    const quotes = await marketDataService.getQuotes(forceRefresh);
    const strengths = await marketDataService.getCurrencyStrengths(state.thresholds, forceRefresh);
    const status = marketDataService.getStatus();

    globalStore.setMarketData(quotes, strengths, status);

    return {
      status,
      quotesCount: quotes.length
    };
  }
}
