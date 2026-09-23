import { RelativeStrengthClassification, RelativeStrengthConfig } from '../types';

export type ProviderHealthState =
  | 'NOT_CONFIGURED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'ERROR'
  | 'DISCONNECTED';

/**
 * Normalized internal representation of an FX market observation.
 * Decoupled from Twelve Data, Biquote, or any external vendor response schema.
 */
export interface NormalizedMarketQuote {
  symbol: string;             // e.g. "EUR/USD"
  baseCurrency: string;       // e.g. "EUR"
  quoteCurrency: string;      // e.g. "USD"
  price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  change: number | null;
  changePercent: number | null; // e.g. +0.35 meaning +0.35%
  timestamp: number | null;   // Milliseconds epoch
  interval: string;           // "1day" or "live"
  source: string;             // "Biquote" | "Twelve Data"
  sourceStatus: ProviderHealthState;
  fetchedAt: string;          // ISO string
  // Real-time freshness & market state fields
  bid?: number | null;
  ask?: number | null;
  mid?: number | null;
  spread?: number | null;
  providerTimestamp?: string | null; // Original provider timestamp string
  receivedAt?: string;               // ISO string when received locally
  quoteAgeSeconds?: number;          // Age in seconds relative to current time
  stale?: boolean;                   // true if quoteAgeSeconds > freshnessThreshold
  marketState?: string;              // "open" | "closed"
}

/**
 * Individual pair contribution to a currency's market strength.
 */
export interface CurrencyPairContribution {
  pairSymbol: string;
  pairReturnPercent: number;  // e.g. +0.45%
  role: 'BASE' | 'QUOTE';
  signedContribution: number; // +return if BASE, -return if QUOTE
  timestamp: number | null;
}

/**
 * Calculated Market Strength result for a currency.
 */
export interface CurrencyMarketStrength {
  currency: string;
  marketStrength: number | null; // e.g. +0.12 or null if unavailable
  classification: RelativeStrengthClassification;
  rawRelativeReturn: number | null;
  avgReturn: number | null;
  momentum: number | null;
  coverage: {
    available: number;
    required: number;
    percent: number;
  };
  contributors: CurrencyPairContribution[];
  explanation: string;
  calculatedAt: string;
  providerStatus: ProviderHealthState;
  source: string;
}

/**
 * Status and diagnostic information for a market data provider.
 */
export interface MarketProviderStatus {
  providerName: string;
  activeProvider?: string;
  health: ProviderHealthState;
  message: string;
  lastFetchedAt: string | null;
  lastSuccessfulUpdate?: string | null;
  quotesCount: number;
  requiredPairsCount: number;
  availablePairsCount: number;
  missingPairs: string[];
  stalePairs?: string[];
  oldestQuoteAge?: number | null;
  streamState?: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'OFFLINE';
  cacheExpiresAt: string | null;
  isConfigured: boolean;
  source?: string;
  fallbackAvailable?: boolean;
  fallbackStatus?: ProviderHealthState;
}

/**
 * Data coverage diagnostic across pairs and currencies.
 */
export interface MarketCoverageReport {
  overallHealth: ProviderHealthState;
  totalRequiredPairs: number;
  availablePairs: number;
  missingPairs: string[];
  currencyCoverage: Record<string, { available: number; required: number; percent: number }>;
  generatedAt: string;
}

/**
 * Generic Market Data Provider abstraction.
 * Allows swappable adapters (Biquote, Twelve Data, etc.) without altering the intelligence engines.
 */
export interface MarketDataProvider {
  readonly name: string;
  getStatus(): MarketProviderStatus;
  fetchDailyQuotes(symbols?: string[]): Promise<NormalizedMarketQuote[]>;
  getQuotes?(): NormalizedMarketQuote[];
  startLiveStream?(): Promise<void>;
  stopLiveStream?(): void;
}

/**
 * Future provider interfaces to support without rewriting intelligence engines.
 */
export interface EconomicDataProvider {
  readonly name: string;
  fetchEconomicReleases(startDate: string, endDate: string): Promise<unknown[]>;
}

export interface CentralBankDataProvider {
  readonly name: string;
  fetchPolicyRates(): Promise<unknown[]>;
}

export interface NewsProvider {
  readonly name: string;
  fetchMacroHeadlines(currencies: string[]): Promise<unknown[]>;
}
