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
import { INITIAL_CURRENCIES } from './currencies';
import { INITIAL_PAIRS } from './pairs';
import { ECONOMIC_INDICATORS } from './indicators';
import { INITIAL_CENTRAL_BANKS } from './centralBanks';
import { MARKET_SESSIONS } from './sessions';
import { INITIAL_DATA_SOURCES } from './dataSources';
import { VERIFIED_OBSERVATIONS, SCHEDULED_ECONOMIC_EVENTS } from './benchmarkDataset';

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
}

// In-memory state singleton
class DataStore {
  private state: AppDataState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = {
      // Start with connected verified benchmark feed by default so user immediately sees live intelligence,
      // while providing an explicit toggle to inspect the DISCONNECTED state!
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
      lastUpdated: new Date().toISOString()
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

  public toggleDataFeedConnection(connected?: boolean) {
    const nextState = connected !== undefined ? connected : !this.state.isDataFeedConnected;
    const nextStatus: DataSourceStatus = nextState ? 'CONNECTED' : 'NOT_CONNECTED';

    this.state = {
      ...this.state,
      isDataFeedConnected: nextState,
      dataSources: this.state.dataSources.map(ds => ({
        ...ds,
        status: nextStatus,
        lastSyncAt: nextState ? new Date().toISOString() : null
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
