/**
 * VELQOARATH - Global Market Intelligence
 * Core Type Definitions
 * 
 * Defines entities for Currencies, Pairs, Indicators, Observations, Central Banks,
 * Sessions, Convergence/Divergence, Pair Intelligence, and Theses.
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CHF' | 'CAD' | 'AUD' | 'NZD' | string;

export interface Currency {
  id: string;
  code: CurrencyCode;
  name: string;
  symbol: string;
  region: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyPair {
  id: string;
  baseCurrency: CurrencyCode;
  quoteCurrency: CurrencyCode;
  symbol: string; // e.g. "EUR/USD"
  active: boolean;
  standardPipDigits?: number;
}

export type IndicatorCategory = 
  | 'INFLATION'
  | 'EMPLOYMENT'
  | 'GROWTH'
  | 'MONETARY_POLICY'
  | 'CONSUMER_ACTIVITY'
  | 'TRADE_BALANCE'
  | 'SENTIMENT';

export interface EconomicIndicator {
  id: string;
  code: string; // e.g. "CPI_YOY", "UNEMP_RATE"
  name: string;
  category: IndicatorCategory;
  unit: string; // "%", "k", "Index", "B"
  frequency: 'MONTHLY' | 'QUARTERLY' | 'WEEKLY' | 'IRREGULAR';
  highIsHawkish?: boolean; // Does a higher-than-expected print increase rate hike odds?
}

export type ObservationClassification = 'FACT' | 'EXPECTATION' | 'INTERPRETATION' | 'ENGINE_ANALYSIS';

export type DataSourceStatus = 'CONNECTED' | 'NOT_CONNECTED' | 'DATA_UNAVAILABLE' | 'STALE' | 'SOURCE_ERROR';

export interface DataSource {
  id: string;
  name: string;
  institution: string;
  url: string;
  coverage: string[];
  status: DataSourceStatus;
  lastSyncAt: string | null;
  reliabilityGrade: 'OFFICIAL_PRIMARY' | 'SECONDARY_CONSENSUS' | 'ESTIMATED';
}

export interface EconomicObservation {
  id: string;
  currency: CurrencyCode;
  indicatorId: string;
  indicatorName: string;
  category: IndicatorCategory;
  period: string; // e.g. "2026-Q1" or "Aug 2026"
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  unit: string;
  releaseTimestamp: string; // ISO 8601
  source: string; // Institution name
  sourceUrl: string;
  sourceStatus: DataSourceStatus;
  classification: ObservationClassification;
  notes?: string;
}

export type CentralBankStance = 'HAWKISH' | 'NEUTRAL' | 'DOVISH' | 'UNAVAILABLE';

export interface CentralBank {
  id: string;
  institution: string; // e.g. "Federal Reserve"
  associatedCurrency: CurrencyCode;
  currentPolicyRate: number | null;
  previousPolicyRate: number | null;
  latestDecisionDate: string | null;
  nextKnownDecisionDate: string | null;
  stance: CentralBankStance;
  stanceEvidence: string[];
  guidanceSummary: string | null;
  majorRisks: string[];
  sourceMetadata: {
    sourceName: string;
    sourceUrl: string;
    lastUpdated: string;
    status: DataSourceStatus;
  };
}

export type EventImportance = 'LOW' | 'MEDIUM' | 'HIGH';
export type EventStatus = 'UPCOMING' | 'ACTIVE' | 'RELEASED' | 'CANCELLED';

export interface EconomicEvent {
  id: string;
  name: string;
  currency: CurrencyCode;
  importance: EventImportance;
  scheduledTime: string; // ISO string
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  unit: string;
  source: string;
  sourceUrl?: string;
  status: EventStatus;
}

// User Configurable Relative Strength Thresholds
export interface RelativeStrengthConfig {
  strongThreshold: number; // default +0.10
  weakThreshold: number;   // default -0.10
}

export type RelativeStrengthClassification = 'STRONG' | 'NEUTRAL' | 'WEAK' | 'DATA_UNAVAILABLE';

export interface RelativeStrengthBreakdown {
  marketStrength: number | null;
  classification: RelativeStrengthClassification;
  thresholds: RelativeStrengthConfig;
  momentum: number | null;
  timeframe: string;
  explanation: string;
  source?: string;
  coverage?: {
    available: number;
    required: number;
    percent: number;
  };
  contributors?: Array<{
    pairSymbol: string;
    pairReturnPercent: number;
    role: 'BASE' | 'QUOTE';
    signedContribution: number;
  }>;
}

export interface PillarAssessment {
  currentCondition: string;
  recentChange: string;
  expectation: string;
  surprise: 'ABOVE' | 'IN_LINE' | 'BELOW' | 'NO_SURPRISE' | 'UNAVAILABLE';
  implication: string;
  dataAvailable: boolean;
  observations: EconomicObservation[];
}

export interface FundamentalState {
  monetaryPolicy: PillarAssessment;
  inflation: PillarAssessment;
  employment: PillarAssessment;
  growth: PillarAssessment;
  consumerBusinessActivity: PillarAssessment;
  tradeExternalBalance: PillarAssessment;
  commodityExposure: PillarAssessment;
  overallCondition: 'EXPANSIONARY' | 'NEUTRAL' | 'CONTRACTIONARY' | 'MIXED' | 'DATA_UNAVAILABLE';
  fundamentalScore: number | null; // explicit explainable aggregation
  scoreFormula: string;
}

export interface CurrencyState {
  currency: Currency;
  marketStrength: number | null;
  marketState: RelativeStrengthClassification;
  relativeStrengthBreakdown: RelativeStrengthBreakdown;
  fundamentalState: FundamentalState;
  centralBank: CentralBank;
  overallState: RelativeStrengthClassification;
  confidenceMetadata: {
    dataStatus: DataSourceStatus;
    observationCount: number;
    completenessPct: number;
    lastVerified: string | null;
  };
  supportingEvidence: string[];
  conflictingEvidence: string[];
}

export type ConvergenceState = 'CONVERGENCE' | 'MIXED' | 'DIVERGENCE' | 'DATA_UNAVAILABLE';

export type WatchState = 
  | 'WATCH'
  | 'ACTIVE'
  | 'EVENT-SENSITIVE'
  | 'LOW-ACTIVITY'
  | 'WAITING FOR CATALYST'
  | 'DATA UNAVAILABLE';

export interface WatchWindowInfo {
  sessionName: string;
  watchWindow: string; // e.g. "12:00 - 16:00 UTC (London/NY Overlap)"
  whyThisWindowMatters: string;
  upcomingCatalyst: EconomicEvent | null;
  riskState: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'DATA_UNAVAILABLE';
  watchState: WatchState;
}

export interface PairIntelligence {
  pair: CurrencyPair;
  baseCurrency: Currency;
  quoteCurrency: Currency;
  baseState: CurrencyState;
  quoteState: CurrencyState;
  relativeStrengthDelta: number | null; // Base strength - Quote strength
  orientationDirection: 'BULLISH_BASE' | 'BEARISH_BASE' | 'NEUTRAL' | 'DATA_UNAVAILABLE';
  orientationExplanation: string;
  convergenceDivergence: ConvergenceState;
  convergenceExplanation: string;
  supportingEvidence: string[];
  counterEvidence: string[];
  catalysts: EconomicEvent[];
  risks: string[];
  thesis: string;
  invalidationConditions: string[];
  sessionRelevance: {
    primarySession: string;
    relevantSessions: string[];
    structuralRationale: string;
  };
  watchWindow: WatchWindowInfo;
  lastUpdated: string;
  sources: Array<{ name: string; url: string; classification: ObservationClassification }>;
}

export interface MarketSession {
  id: string;
  name: string;
  financialCentre: string;
  timezone: string; // IANA e.g. "Europe/London"
  openHourLocal: number; // 24h format
  openMinuteLocal: number;
  closeHourLocal: number;
  closeMinuteLocal: number;
  activeStatus: boolean;
  overlapsWith: string[];
}

export interface SessionStatus {
  session: MarketSession;
  isOpen: boolean;
  localTimeFormatted: string;
  nextOpenFormatted: string;
  timeUntilOpenOrClose: string;
}

export interface DashboardPayload {
  dataStatus: DataSourceStatus;
  dataStatusMessage: string;
  lastUpdated: string;
  currenciesCount: number;
  strongCurrencies: CurrencyState[];
  neutralCurrencies: CurrencyState[];
  weakCurrencies: CurrencyState[];
  allCurrencies: CurrencyState[];
  topPairToWatch: PairIntelligence | null;
  sessions: {
    activeSessions: MarketSession[];
    upcomingSessions: MarketSession[];
    activeOverlaps: string[];
    currentTimeUtc: string;
  };
  economicCalendar: EconomicEvent[];
  dataSources: DataSource[];
  marketProviderStatus?: import('../marketData/types').MarketProviderStatus;
}
