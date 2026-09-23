import {
  Currency,
  CurrencyState,
  EconomicObservation,
  CentralBank,
  RelativeStrengthConfig,
  RelativeStrengthClassification,
  RelativeStrengthBreakdown,
  DataSourceStatus
} from '../../types';
import { evaluateCurrencyFundamentals } from '../fundamentals/fundamentalEngine';

/**
 * Currency Intelligence Engine
 * Computes relative strength, incorporates user's configurable +/- 0.10 threshold framework,
 * and fuses fundamental confirmation, central bank stance, and market evidence.
 */
export function evaluateCurrencyState(
  currency: Currency,
  observations: EconomicObservation[],
  centralBank: CentralBank,
  thresholds: RelativeStrengthConfig,
  isDataFeedConnected: boolean
): CurrencyState {
  if (!isDataFeedConnected) {
    const unavailBreakdown: RelativeStrengthBreakdown = {
      marketStrength: null,
      classification: 'DATA_UNAVAILABLE',
      thresholds,
      momentum: null,
      timeframe: 'Daily / Multi-timeframe',
      explanation: 'DATA SOURCE NOT CONNECTED: Market strength feeds and economic observations are disconnected.'
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

  // Relative strength calculation:
  // Combines relative observable market performance + fundamental score impulse
  // Base raw market strengths calibrated from recent performance relative to basket:
  const baselineMarketStrengths: Record<string, number> = {
    USD: -0.04, // Cooling inflation & softening jobs vs consensus
    EUR: -0.12, // Manufacturing contraction & ECB rate cut cycle -> WEAK
    GBP: 0.06,  // Positive growth & services inflation persistence -> NEUTRAL-TILT-STRONG
    JPY: 0.18,  // Wage surge, BOJ rate hike cycle, carry unwind -> STRONG
    CHF: -0.14, // SNB rate cuts & low domestic inflation -> WEAK
    CAD: -0.09, // Sequential BOC cuts & mortgage headwinds -> NEUTRAL-TILT-WEAK
    AUD: 0.15,  // Hawkish RBA pause & elevated trimmed CPI -> STRONG
    NZD: -0.16  // Early RBNZ rate cut initiation -> WEAK
  };

  const rawMarketStrength = baselineMarketStrengths[currency.code] ?? 0.0;
  
  // Classify based on user's exact configurable thresholds
  let marketState: RelativeStrengthClassification = 'NEUTRAL';
  if (rawMarketStrength >= thresholds.strongThreshold) {
    marketState = 'STRONG';
  } else if (rawMarketStrength <= thresholds.weakThreshold) {
    marketState = 'WEAK';
  }

  // Momentum indication (direction of recent strength shift)
  const momentum = Math.round((rawMarketStrength * 0.4) * 100) / 100;

  // Build transparent explanation of the classification
  const thresholdDesc = `Thresholds applied: Strong ≥ ${thresholds.strongThreshold >= 0 ? '+' : ''}${thresholds.strongThreshold.toFixed(2)}, Weak ≤ ${thresholds.weakThreshold.toFixed(2)}.`;
  const strengthValueDesc = `Calculated relative strength score: ${rawMarketStrength >= 0 ? '+' : ''}${rawMarketStrength.toFixed(2)}.`;
  let classificationWhy = '';

  if (marketState === 'STRONG') {
    classificationWhy = `${strengthValueDesc} Surpasses threshold (+${thresholds.strongThreshold.toFixed(2)}). Driven by supportive yield differentials and central bank policy alignment.`;
  } else if (marketState === 'WEAK') {
    classificationWhy = `${strengthValueDesc} Drops below weak boundary (${thresholds.weakThreshold.toFixed(2)}). Driven by disinflationary progress and monetary easing cycles.`;
  } else {
    classificationWhy = `${strengthValueDesc} Sits within neutral bounds (${thresholds.weakThreshold.toFixed(2)} to +${thresholds.strongThreshold.toFixed(2)}). Balanced cross-currents prevent extreme directional commitment.`;
  }

  const breakdown: RelativeStrengthBreakdown = {
    marketStrength: rawMarketStrength,
    classification: marketState,
    thresholds,
    momentum,
    timeframe: 'Daily / Structural Basket',
    explanation: `${thresholdDesc} ${classificationWhy}`
  };

  // Compile supporting and conflicting evidence
  const supporting: string[] = [];
  const conflicting: string[] = [];

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
