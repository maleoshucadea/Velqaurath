import {
  Currency,
  CurrencyState,
  EconomicObservation,
  CentralBank,
  RelativeStrengthConfig,
  RelativeStrengthClassification,
  RelativeStrengthBreakdown
} from '../../types';
import { CurrencyMarketStrength } from '../../marketData/types';
import { evaluateCurrencyFundamentals } from '../fundamentals/fundamentalEngine';

/**
 * Currency Intelligence Engine
 * Computes overall currency state by synthesizing:
 * 1. Real provider-calculated market strength (Twelve Data D1 / liquid cross basket)
 * 2. Multi-pillar macroeconomic fundamental evaluations
 * 3. Central bank stance and policy rate differentials
 * 4. User's configurable +/- 0.10 threshold framework
 * 
 * CORE PRINCIPLE: Never fabricates market strength when data source is disconnected or missing.
 */
export function evaluateCurrencyState(
  currency: Currency,
  observations: EconomicObservation[],
  centralBank: CentralBank,
  thresholds: RelativeStrengthConfig,
  isDataFeedConnected: boolean,
  marketStrengthResult?: CurrencyMarketStrength | null
): CurrencyState {
  // If data feed is toggled off or market strength is unavailable
  if (!isDataFeedConnected) {
    const unavailBreakdown: RelativeStrengthBreakdown = {
      marketStrength: null,
      classification: 'DATA_UNAVAILABLE',
      thresholds,
      momentum: null,
      timeframe: 'D1 / Market Feed Disconnected',
      explanation: 'DATA SOURCE NOT CONNECTED: Market strength feeds and economic observations are disconnected.',
      source: 'Twelve Data'
    };

    const emptyFundamentals = evaluateCurrencyFundamentals(currency.code, observations, centralBank, false);

    return {
      currency,
      marketStrength: null,
      marketState: 'DATA_UNAVAILABLE',
      relativeStrengthBreakdown: unavailBreakdown,
      fundamentalState: emptyFundamentals,
      centralBank,
      overallState: 'DATA_UNAVAILABLE',
      confidenceMetadata: {
        dataStatus: 'NOT_CONNECTED',
        observationCount: 0,
        completenessPct: 0,
        lastVerified: null
      },
      supportingEvidence: [],
      conflictingEvidence: []
    };
  }

  // Evaluate fundamentals for this currency
  const fundamentals = evaluateCurrencyFundamentals(currency.code, observations, centralBank, true);
  const relevantObs = observations.filter(o => o.currency === currency.code && o.sourceStatus === 'CONNECTED');

  // Check if real market strength result was provided
  const hasValidMarketStrength = marketStrengthResult !== undefined &&
    marketStrengthResult !== null &&
    marketStrengthResult.marketStrength !== null;

  if (!hasValidMarketStrength) {
    const unavailMsg = marketStrengthResult?.explanation ||
      'MARKET DATA UNAVAILABLE: Market strength data feed not connected or provider key missing.';

    const unavailBreakdown: RelativeStrengthBreakdown = {
      marketStrength: null,
      classification: 'DATA_UNAVAILABLE',
      thresholds,
      momentum: null,
      timeframe: 'D1 / Awaiting Feed',
      explanation: unavailMsg,
      source: marketStrengthResult?.source ?? 'Twelve Data',
      coverage: marketStrengthResult?.coverage
    };

    return {
      currency,
      marketStrength: null,
      marketState: 'DATA_UNAVAILABLE',
      relativeStrengthBreakdown: unavailBreakdown,
      fundamentalState: fundamentals,
      centralBank,
      overallState: 'DATA_UNAVAILABLE',
      confidenceMetadata: {
        dataStatus: 'CONNECTED',
        observationCount: relevantObs.length,
        completenessPct: Math.min(100, Math.round((relevantObs.length / 5) * 100)),
        lastVerified: new Date().toISOString()
      },
      supportingEvidence: centralBank.stanceEvidence.slice(0, 2),
      conflictingEvidence: []
    };
  }

  // Real calculated market strength from Twelve Data basket
  const rawMarketStrength = marketStrengthResult.marketStrength as number;
  const marketState: RelativeStrengthClassification = marketStrengthResult.classification;
  const momentum = marketStrengthResult.momentum;

  const breakdown: RelativeStrengthBreakdown = {
    marketStrength: rawMarketStrength,
    classification: marketState,
    thresholds,
    momentum,
    timeframe: 'D1 Basket (Twelve Data)',
    explanation: marketStrengthResult.explanation,
    source: marketStrengthResult.source,
    coverage: marketStrengthResult.coverage,
    contributors: marketStrengthResult.contributors.map(c => ({
      pairSymbol: c.pairSymbol,
      pairReturnPercent: c.pairReturnPercent,
      role: c.role,
      signedContribution: c.signedContribution
    }))
  };

  // Compile supporting and conflicting evidence
  const supporting: string[] = [];
  const conflicting: string[] = [];

  // Market observation evidence from real contributors
  if (marketStrengthResult.contributors.length > 0) {
    const sorted = [...marketStrengthResult.contributors].sort(
      (a, b) => Math.abs(b.signedContribution) - Math.abs(a.signedContribution)
    );
    const topPositive = sorted.filter(c => c.signedContribution > 0)[0];
    const topNegative = sorted.filter(c => c.signedContribution < 0)[0];

    if (topPositive) {
      if (marketState === 'STRONG' || marketState === 'NEUTRAL') {
        supporting.push(`${topPositive.pairSymbol} performance (+${topPositive.signedContribution.toFixed(2)}%) bolstered ${currency.code} relative standing.`);
      } else {
        conflicting.push(`${topPositive.pairSymbol} gained (+${topPositive.signedContribution.toFixed(2)}%) despite overall weak currency profile.`);
      }
    }

    if (topNegative) {
      if (marketState === 'WEAK' || marketState === 'NEUTRAL') {
        supporting.push(`${topNegative.pairSymbol} performance (${topNegative.signedContribution.toFixed(2)}%) weighed on ${currency.code}.`);
      } else {
        conflicting.push(`${topNegative.pairSymbol} lagged (${topNegative.signedContribution.toFixed(2)}%), exerting counter-drag.`);
      }
    }
  }

  // Central Bank stance evidence
  if (centralBank.stance === 'HAWKISH') {
    if (marketState === 'STRONG') {
      supporting.push(`${centralBank.institution} maintains a hawkish stance (Policy Rate: ${centralBank.currentPolicyRate}%).`);
    } else {
      conflicting.push(`${centralBank.institution} maintains hawkish posture despite subdued market score.`);
    }
  } else if (centralBank.stance === 'DOVISH') {
    if (marketState === 'WEAK') {
      supporting.push(`${centralBank.institution} is actively easing (Policy Rate: ${centralBank.currentPolicyRate}%).`);
    } else {
      conflicting.push(`${centralBank.institution} is easing, conflicting with resilient market momentum.`);
    }
  }

  // Central bank specific evidence notes
  centralBank.stanceEvidence.forEach(ev => {
    supporting.push(ev);
  });

  // Observation surprises evidence
  relevantObs.forEach(obs => {
    if (obs.actual !== null && obs.forecast !== null) {
      const diff = obs.actual - obs.forecast;
      if (Math.abs(diff) > 0.05) {
        if (diff > 0) {
          if (marketState === 'STRONG' || marketState === 'NEUTRAL') {
            supporting.push(`${obs.indicatorName} exceeded forecast (${obs.actual}${obs.unit} vs ${obs.forecast}${obs.unit}) for ${obs.period}.`);
          } else {
            conflicting.push(`Upside print on ${obs.indicatorName} (${obs.actual}${obs.unit} vs ${obs.forecast}${obs.unit}) contradicts weak thesis.`);
          }
        } else {
          if (marketState === 'WEAK' || marketState === 'NEUTRAL') {
            supporting.push(`${obs.indicatorName} missed forecast (${obs.actual}${obs.unit} vs ${obs.forecast}${obs.unit}) for ${obs.period}.`);
          } else {
            conflicting.push(`Downside print on ${obs.indicatorName} (${obs.actual}${obs.unit} vs ${obs.forecast}${obs.unit}) contradicts strong thesis.`);
          }
        }
      }
    }
  });

  // Overall State synthesis:
  // Synthesizes market relative strength with fundamental state
  let overallState: RelativeStrengthClassification = marketState;
  if (marketState === 'STRONG' && fundamentals.overallCondition === 'CONTRACTIONARY') {
    overallState = 'NEUTRAL'; // Divergence dampens overall commitment
  } else if (marketState === 'WEAK' && fundamentals.overallCondition === 'EXPANSIONARY') {
    overallState = 'NEUTRAL';
  }

  const confidencePct = Math.min(100, Math.round((relevantObs.length / 5) * 100));

  return {
    currency,
    marketStrength: rawMarketStrength,
    marketState,
    relativeStrengthBreakdown: breakdown,
    fundamentalState: fundamentals,
    centralBank,
    overallState,
    confidenceMetadata: {
      dataStatus: 'CONNECTED',
      observationCount: relevantObs.length,
      completenessPct: confidencePct,
      lastVerified: new Date().toISOString()
    },
    supportingEvidence: supporting,
    conflictingEvidence: conflicting
  };
}
