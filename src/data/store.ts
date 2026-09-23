import {
  Currency,
  CurrencyPair,
  EconomicObservation,
  CentralBank,
  EconomicEvent,
  DataSource,
  RelativeStrengthConfig,
  DataSourceStatus
} from '../types';
import {
  NormalizedMarketQuote,
  CurrencyMarketStrength,
  MarketProviderStatus,
  ProviderHealthState
} from '../marketData/types';
import { INITIAL_CURRENCIES } from './currencies';
import { INITIAL_PAIRS } from './pairs';
import { ECONOMIC_INDICATORS } from './indicators';
import { INITIAL_CENTRAL_BANKS } from './centralBanks';
import { MARKET_SESSIONS } from './sessions';
import { INITIAL_DATA_SOURCES } from './dataSources';
import { VERIFIED_OBSERVATIONS, SCHEDULED_ECONOMIC_EVENTS } from './benchmarkDataset';
import { SUPPORTED_MAJOR_CURRENCIES, DEFAULT_LIQUID_PAIRS } from '../marketData/config';

export interface AppDataState {
  isDataFeedConnected: boolean;
  currencies: Currency[];
  pairs: CurrencyPair[];
  centralBanks: CentralBank[];
  observations: EconomicObservation[];
  events: EconomicEvent[];
  dataSources: DataSource[];
  thresholds: RelativeStrengthConfig;
  lastUpdated: string;
  marketQuotes: NormalizedMarketQuote[];
  marketStrengths: Map<string, CurrencyMarketStrength>;
  marketProviderStatus: MarketProviderStatus;
}

// In-memory state singleton
class DataStore {
  private state: AppDataState;
  private listeners: Set<() => void> = new Set();

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
        strongThreshold: 0.10,
        weakThreshold: -0.10
      },
      lastUpdated: new Date().toISOString(),
      marketQuotes: [],
      marketStrengths: new Map(),
      marketProviderStatus: {
        providerName: 'Twelve Data',
        health: 'NOT_CONFIGURED',
        message: 'Twelve Data API key is not configured (TWELVE_DATA_API_KEY missing on server). Market data unavailable.',
        lastFetchedAt: null,
        quotesCount: 0,
        requiredPairsCount: DEFAULT_LIQUID_PAIRS.length,
        availablePairsCount: 0,
        missingPairs: [...DEFAULT_LIQUID_PAIRS],
        cacheExpiresAt: null,
        isConfigured: false
      }
    };
  }

  public getState(): AppDataState {
    return this.state;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public setMarketData(
    quotes: NormalizedMarketQuote[],
    strengths: Map<string, CurrencyMarketStrength>,
    status: MarketProviderStatus
  ) {
    const dsStatus: DataSourceStatus = status.health === 'CONNECTED'
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
      dataSources: this.state.dataSources.map(ds => {
        if (ds.id === 'src-twelvedata') {
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

  public toggleDataFeedConnection(connected?: boolean) {
    const nextState = connected !== undefined ? connected : !this.state.isDataFeedConnected;
    const nextStatus: DataSourceStatus = nextState ? 'CONNECTED' : 'NOT_CONNECTED';

    this.state = {
      ...this.state,
      isDataFeedConnected: nextState,
      dataSources: this.state.dataSources.map(ds => ({
        ...ds,
        status: nextStatus,
        lastSyncAt: nextState ? (ds.lastSyncAt ?? new Date().toISOString()) : null
      })),
      centralBanks: this.state.centralBanks.map(cb => ({
        ...cb,
        sourceMetadata: {
          ...cb.sourceMetadata,
          status: nextStatus
        }
      })),
      observations: this.state.observations.map(obs => ({
        ...obs,
        sourceStatus: nextStatus
      })),
      lastUpdated: new Date().toISOString()
    };
    this.notify();
  }

  public updateThresholds(strong: number, weak: number) {
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

  public addObservation(observation: EconomicObservation) {
    this.state = {
      ...this.state,
      observations: [observation, ...this.state.observations.filter(o => o.id !== observation.id)],
      lastUpdated: new Date().toISOString()
    };
    this.notify();
  }

  public addEvent(event: EconomicEvent) {
    this.state = {
      ...this.state,
      events: [event, ...this.state.events.filter(e => e.id !== event.id)],
      lastUpdated: new Date().toISOString()
    };
    this.notify();
  }
}

export const globalStore = new DataStore();
