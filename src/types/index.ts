import {
  CurrencyMarketStrength,
  MarketQuote,
  ProviderStatus,
  StrengthClassification
} from '../marketData/types';

export * from '../marketData/types';

export type ObservationClassification =
  | 'FACT'
  | 'EXPECTATION'
  | 'INTERPRETATION'
  | 'ENGINE_ANALYSIS';

export type CentralBankStance = 'HAWKISH' | 'DOVISH' | 'NEUTRAL' | 'UNAVAILABLE';

export type MacroEconomicCondition =
  | 'EXPANSIONARY'
  | 'CONTRACTIONARY'
  | 'NEUTRAL'
  | 'MIXED'
  | 'DATA_UNAVAILABLE';

export type PillarCondition = MacroEconomicCondition;

export type PairOrientationDirection =
  | 'BULLISH_BASE'
  | 'BEARISH_BASE'
  | 'NEUTRAL'
  | 'DATA_UNAVAILABLE';

export type OrientationDirection = PairOrientationDirection;

export type ConvergenceDivergenceState =
  | 'CONVERGENCE'
  | 'DIVERGENCE'
  | 'MIXED'
  | 'DATA_UNAVAILABLE';

export type ConvergenceDivergenceType = ConvergenceDivergenceState;

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  region: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pair {
  id: string;
  symbol: string;
  baseCurrency: string;
  quoteCurrency: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CurrencyPair = Pair;

export interface CentralBankSourceMetadata {
  sourceName: string;
  sourceUrl: string;
  lastUpdated: string;
  status: 'CONNECTED' | 'NOT_CONNECTED';
}

export interface CentralBank {
  id: string;
  institution: string;
  associatedCurrency: string;
  currentPolicyRate: number | null;
  previousPolicyRate: number | null;
  latestDecisionDate: string | null;
  nextKnownDecisionDate: string | null;
  stance: CentralBankStance;
  stanceEvidence: string[];
  guidanceSummary: string | null;
  majorRisks: string[];
  sourceMetadata: CentralBankSourceMetadata;
}

export type CentralBankPolicy = CentralBank;

export interface EconomicIndicator {
  id: string;
  name: string;
  code: string;
  category: string;
  frequency: string;
  unit: string;
  description?: string;
  institution?: string;
  sourceUrl?: string;
  highIsHawkish?: boolean;
}

export interface EconomicObservation {
  id: string;
  currency: string;
  indicatorId: string;
  indicatorName: string;
  period: string;
  releaseDate: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  unit: string;
  classification: ObservationClassification;
  sourceName: string;
  sourceUrl: string;
  sourceStatus: 'CONNECTED' | 'NOT_CONNECTED';
  notes?: string;
  category?: string;
  source?: string;
}

export interface EconomicEvent {
  id: string;
  name: string;
  currency: string;
  importance: 'HIGH' | 'MEDIUM' | 'LOW';
  scheduledTime: string;
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  unit: string;
  source?: string;
  status: 'UPCOMING' | 'RELEASED' | 'CANCELLED';
}

export interface DataSource {
  id: string;
  name: string;
  institution: string;
  coverage: string[];
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'SOURCE_ERROR';
  reliabilityGrade: string;
  url: string;
  lastSyncAt: string | null;
}

export interface FundamentalPillar {
  currentCondition: string;
  recentChange: string;
  expectation: string;
  surprise: string;
  implication: string;
  dataAvailable: boolean;
  observations: EconomicObservation[];
}

export interface MacroFundamentals {
  monetaryPolicy: FundamentalPillar;
  inflation: FundamentalPillar;
  employment: FundamentalPillar;
  growth: FundamentalPillar;
  consumerBusinessActivity: FundamentalPillar;
  tradeExternalBalance: FundamentalPillar;
  commodityExposure: FundamentalPillar;
  overallCondition: PillarCondition;
  fundamentalScore: number | null;
  scoreFormula: string;
}

export interface FundamentalPillarAnalysis {
  category: string;
  currentCondition: string;
  surprise: 'POSITIVE' | 'NEGATIVE' | 'IN_LINE' | 'NO_DATA';
  implication: string;
  observations: EconomicObservation[];
}

export interface CurrencyFundamentals {
  currency: string;
  fundamentalScore: number | null;
  overallCondition: MacroEconomicCondition;
  inflation: FundamentalPillarAnalysis;
  employment: FundamentalPillarAnalysis;
  growth: FundamentalPillarAnalysis;
  summary: string;
  calculatedAt: string;
  sources: { name: string; url: string; classification: ObservationClassification }[];
}

export interface RelativeStrengthBreakdown {
  marketStrength: number | null;
  classification: StrengthClassification;
  thresholds: { strongThreshold: number; weakThreshold: number };
  momentum: number | null;
  timeframe: string;
  explanation: string;
  source: string;
  coverage?: { available: number; required: number; percent: number };
  contributors?: {
    pairSymbol: string;
    pairReturnPercent: number;
    role: string;
    signedContribution: number;
  }[];
}

export interface CurrencyState {
  currency: Currency;
  marketStrength: number | null;
  marketState: StrengthClassification;
  relativeStrengthBreakdown: RelativeStrengthBreakdown;
  fundamentalState: MacroFundamentals | CurrencyFundamentals;
  centralBank: CentralBank;
  overallState: StrengthClassification;
  confidenceMetadata: {
    dataStatus: 'CONNECTED' | 'NOT_CONNECTED';
    observationCount: number;
    completenessPct: number;
    lastVerified: string | null;
  };
  supportingEvidence: string[];
  conflictingEvidence: string[];
}

export interface PairSessionRelevance {
  primarySession: string;
  relevantSessions: string[];
  structuralRationale: string;
  peakLiquidityWindowUtc?: string;
}

export interface WatchWindow {
  watchState:
    | 'ACTIVE'
    | 'UPCOMING'
    | 'EVENT-SENSITIVE'
    | 'MONITORING'
    | 'WAITING FOR CATALYST'
    | 'LOW-ACTIVITY'
    | 'WATCH'
    | 'DATA_UNAVAILABLE'
    | 'DATA UNAVAILABLE';
  watchWindow: string;
  rationale?: string;
  sessionName?: string;
  whyThisWindowMatters?: string;
  upcomingCatalyst?: EconomicEvent | null;
  riskState?: string;
}

export interface PairIntelligence {
  pair: Pair;
  baseCurrency: Currency;
  quoteCurrency: Currency;
  baseState: CurrencyState;
  quoteState: CurrencyState;
  relativeStrengthDelta: number | null;
  orientationDirection: PairOrientationDirection;
  orientationExplanation: string;
  convergenceDivergence: ConvergenceDivergenceState;
  convergenceExplanation: string;
  supportingEvidence: string[];
  counterEvidence: string[];
  catalysts: EconomicEvent[];
  risks: string[];
  thesis: string;
  invalidationConditions: string[];
  sessionRelevance: PairSessionRelevance;
  watchWindow: WatchWindow;
  lastUpdated: string;
  sources: { name: string; url: string; classification: ObservationClassification }[];
}

export interface MarketSession {
  id: string;
  name: string;
  financialCenter?: string;
  financialCentre?: string;
  primaryCurrencies?: string[];
  openHourUtcStandard?: number;
  closeHourUtcStandard?: number;
  openHourLocal: number;
  openMinuteLocal: number;
  closeHourLocal: number;
  closeMinuteLocal: number;
  timeZone?: string;
  timezone?: string;
  hasDst?: boolean;
  activeStatus?: boolean;
  overlapsWith?: string[];
}

export interface SessionInstantStatus {
  session: MarketSession;
  isOpen: boolean;
  localTimeFormatted: string;
  utcOffsetHours: number;
  dstActive: boolean;
}

export interface SessionOverview {
  openSessions: SessionInstantStatus[];
  closedSessions: SessionInstantStatus[];
  activeOverlaps: string[];
  currentTimeUtc: string;
}

export interface SessionIntelligence {
  activeSessions: MarketSession[];
  upcomingSessions: MarketSession[];
  activeOverlaps: string[];
  currentTimeUtc: string;
}

export interface DashboardPayload {
  dataStatus: 'CONNECTED' | 'NOT_CONNECTED';
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
  marketProviderStatus: ProviderStatus;
}
