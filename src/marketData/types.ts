export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD' | 'NZD';

export type PairRole = 'BASE' | 'QUOTE';

export type MarketDataHealth =
  | 'CONNECTED'
  | 'DEGRADED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'NOT_CONFIGURED'
  | 'CONNECTING';

export type ProviderHealth = MarketDataHealth;

export type StreamState =
  | 'CONNECTED'
  | 'CONNECTING'
  | 'DISCONNECTED'
  | 'RECONNECTING'
  | 'OFFLINE'
  | 'STOPPED';

export type StrengthClassification =
  | 'STRONG'
  | 'NEUTRAL'
  | 'WEAK'
  | 'DATA_UNAVAILABLE'
  | 'INSUFFICIENT_COVERAGE';

export interface MarketQuote {
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  price: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  change: number | null;
  changePercent: number | null;
  timestamp: number | null;
  interval: string;
  source: string;
  sourceStatus: 'CONNECTED' | 'DISCONNECTED' | 'STALE' | MarketDataHealth;
  fetchedAt: string;
  providerTimestamp?: string;
  receivedAt?: string;
  quoteAgeSeconds?: number;
  stale?: boolean;
  marketState?: string;
  bid?: number;
  ask?: number;
  mid?: number;
  spread?: number;
  dailyReturnPercent?: number | null; // Preserved daily return distinct from live tick change
}

export interface PairContribution {
  pairSymbol: string;
  pairReturnPercent: number;
  role: PairRole;
  signedContribution: number;
  timestamp: number;
}

export interface CurrencyCoverageInfo {
  available: number;
  required: number;
  percent: number;
  missingPairs?: string[];
  validPairs?: string[];
  status?: 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT';
}

export interface CurrencyMarketStrength {
  currency: string;
  marketStrength: number | null;
  classification: StrengthClassification;
  rawRelativeReturn: number | null;
  avgReturn: number | null;
  momentum: number | null;
  coverage: CurrencyCoverageInfo;
  contributors: PairContribution[];
  explanation: string;
  calculatedAt: string;
  providerStatus: MarketDataHealth | string;
  source: string;
  basketMean?: number;
  scaledScore?: number;
}

export interface ProviderStatus {
  providerName: string;
  activeProvider: string;
  health: MarketDataHealth;
  streamState: StreamState;
  message: string;
  lastFetchedAt: string | null;
  lastSuccessfulUpdate?: string | null;
  quotesCount: number;
  requiredPairsCount: number;
  availablePairsCount: number;
  missingPairs: string[];
  stalePairs: string[];
  oldestQuoteAge: number | null;
  cacheExpiresAt: string | null;
  isConfigured: boolean;
  source: string;
  fallbackAvailable?: boolean;
  fallbackStatus?: string;
}

export interface MarketCoverageReport {
  overallHealth: MarketDataHealth;
  totalRequiredPairs: number;
  availablePairs: number;
  missingPairs: string[];
  currencyCoverage: Record<string, CurrencyCoverageInfo>;
  generatedAt: string;
}

export interface CacheInfo {
  hasData: boolean;
  isExpired: boolean;
  cachedAt: string | null;
  expiresAt: string | null;
  count: number;
}

export interface StrengthThresholds {
  strongThreshold: number;
  weakThreshold: number;
}

export interface StrengthEngineOptions {
  currencies?: string[];
  requiredPairs?: string[];
  scaleFactor?: number;
  minCoverageThreshold?: number; // Minimum coverage ratio required (e.g. 0.5 = 50%)
  providerStatus?: MarketDataHealth | string;
  providerSource?: string;
}
