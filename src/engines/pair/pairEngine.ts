import { getPairSessionRelevance, calculateWatchWindow } from '../session/sessionEngine';
import {
  CurrencyPair,
  CurrencyState,
  EconomicEvent,
  PairIntelligence,
  OrientationDirection,
  ConvergenceDivergenceType
} from '../../types';

export function evaluatePairIntelligence(
  pair: CurrencyPair,
  baseState: CurrencyState,
  quoteState: CurrencyState,
  events: EconomicEvent[],
  date: Date = new Date(),
  isDataFeedConnected: boolean = true
): PairIntelligence {
  if (
    !isDataFeedConnected ||
    baseState.overallState === 'DATA_UNAVAILABLE' ||
    quoteState.overallState === 'DATA_UNAVAILABLE' ||
    baseState.marketStrength === null ||
    quoteState.marketStrength === null
  ) {
    const watchWindow = calculateWatchWindow(pair, events, date, false);
    const sessionRel = getPairSessionRelevance(pair.symbol);
    const isMarketMissing =
      baseState.marketStrength === null || quoteState.marketStrength === null;
    const orientationExplanation = isMarketMissing
      ? `MARKET DATA UNAVAILABLE: Live market strength feed is missing for ${
          baseState.marketStrength === null ? pair.baseCurrency : ''
        }${
          baseState.marketStrength === null && quoteState.marketStrength === null ? ' and ' : ''
        }${
          quoteState.marketStrength === null ? pair.quoteCurrency : ''
        }. Connect market data feed to calculate relative orientation.`
      : 'DATA SOURCE NOT CONNECTED: Pair relative orientation cannot be calculated without authenticated inputs.';

    return {
      pair,
      baseCurrency: baseState.currency,
      quoteCurrency: quoteState.currency,
      baseState,
      quoteState,
      relativeStrengthDelta: null,
      orientationDirection: 'DATA_UNAVAILABLE',
      orientationExplanation,
      convergenceDivergence: 'DATA_UNAVAILABLE',
      convergenceExplanation:
        'Convergence analysis suspended until real market and fundamental feeds are connected.',
      supportingEvidence: [],
      counterEvidence: [],
      catalysts: [],
      risks: ['Market data feed not configured or offline; pair monitoring inactive.'],
      thesis: 'DATA UNAVAILABLE: Connect verified market provider to generate actionable pair thesis.',
      invalidationConditions: ['Awaiting data feed initialization.'],
      sessionRelevance: {
        primarySession: sessionRel.primarySession,
        relevantSessions: sessionRel.relevantSessions,
        structuralRationale: sessionRel.structuralRationale
      },
      watchWindow,
      lastUpdated: new Date().toISOString(),
      sources: []
    };
  }

  const baseStrength = baseState.marketStrength ?? 0;
  const quoteStrength = quoteState.marketStrength ?? 0;
  const relativeStrengthDelta = Math.round((baseStrength - quoteStrength) * 100) / 100;

  let orientationDirection: OrientationDirection = 'NEUTRAL';
  let orientationExplanation = '';

  if (relativeStrengthDelta >= 0.08) {
    orientationDirection = 'BULLISH_BASE';
    orientationExplanation = `Base currency (${pair.baseCurrency}: ${
      baseStrength >= 0 ? '+' : ''
    }${baseStrength.toFixed(2)}) is structurally stronger than Quote currency (${
      pair.quoteCurrency
    }: ${quoteStrength >= 0 ? '+' : ''}${quoteStrength.toFixed(
      2
    )}), creating an upward directional skew for ${pair.symbol} (Δ = +${relativeStrengthDelta.toFixed(
      2
    )}).`;
  } else if (relativeStrengthDelta <= -0.08) {
    orientationDirection = 'BEARISH_BASE';
    orientationExplanation = `Base currency (${pair.baseCurrency}: ${
      baseStrength >= 0 ? '+' : ''
    }${baseStrength.toFixed(2)}) is structurally weaker than Quote currency (${
      pair.quoteCurrency
    }: ${quoteStrength >= 0 ? '+' : ''}${quoteStrength.toFixed(
      2
    )}), creating a downward directional skew for ${pair.symbol} (Δ = ${relativeStrengthDelta.toFixed(
      2
    )}).`;
  } else {
    orientationDirection = 'NEUTRAL';
    orientationExplanation = `Relative strength differential between ${pair.baseCurrency} (${
      baseStrength >= 0 ? '+' : ''
    }${baseStrength.toFixed(2)}) and ${pair.quoteCurrency} (${
      quoteStrength >= 0 ? '+' : ''
    }${quoteStrength.toFixed(2)}) is tight (Δ = ${
      relativeStrengthDelta >= 0 ? '+' : ''
    }${relativeStrengthDelta.toFixed(2)}), reflecting a balanced, range-bound backdrop.`;
  }

  const baseFundScore = baseState.fundamentalState.fundamentalScore ?? 0;
  const quoteFundScore = quoteState.fundamentalState.fundamentalScore ?? 0;
  const fundDelta = Math.round((baseFundScore - quoteFundScore) * 100) / 100;

  const baseRate = baseState.centralBank.currentPolicyRate ?? 0;
  const quoteRate = quoteState.centralBank.currentPolicyRate ?? 0;
  const policyRateSpread = Math.round((baseRate - quoteRate) * 100) / 100;

  let convergenceDivergence: ConvergenceDivergenceType = 'MIXED';
  let convergenceExplanation = '';

  if (
    (relativeStrengthDelta > 0.05 && fundDelta > 0.02) ||
    (relativeStrengthDelta < -0.05 && fundDelta < -0.02)
  ) {
    convergenceDivergence = 'CONVERGENCE';
    convergenceExplanation = `Market strength (Δ = ${
      relativeStrengthDelta >= 0 ? '+' : ''
    }${relativeStrengthDelta.toFixed(2)}) and fundamental impulses (Fund Δ = ${
      fundDelta >= 0 ? '+' : ''
    }${fundDelta.toFixed(
      2
    )}) point in the same directional vector. Monetary policy expectations reinforce current price action.`;
  } else if (
    (relativeStrengthDelta > 0.05 && fundDelta < -0.02) ||
    (relativeStrengthDelta < -0.05 && fundDelta > 0.02)
  ) {
    convergenceDivergence = 'DIVERGENCE';
    convergenceExplanation = `DIVERGENCE DETECTED: Market price momentum (Δ = ${
      relativeStrengthDelta >= 0 ? '+' : ''
    }${relativeStrengthDelta.toFixed(2)}) conflicts with underlying fundamental trajectory (Fund Δ = ${
      fundDelta >= 0 ? '+' : ''
    }${fundDelta.toFixed(
      2
    )}). Caution warranted as market behavior resists macroeconomic fundamentals.`;
  } else {
    convergenceDivergence = 'MIXED';
    convergenceExplanation =
      'Mixed evidence profile: Cross-currents in inflation differentials and central bank guidance prevent full alignment between market strength and macro fundamentals.';
  }

  const supporting: string[] = [];
  const counter: string[] = [];

  if (orientationDirection === 'BULLISH_BASE') {
    supporting.push(
      `${pair.baseCurrency} displays superior relative strength score (${
        baseStrength >= 0 ? '+' : ''
      }${baseStrength.toFixed(2)}) compared to ${pair.quoteCurrency} (${
        quoteStrength >= 0 ? '+' : ''
      }${quoteStrength.toFixed(2)}).`
    );
    if (baseState.centralBank.stance === 'HAWKISH' || quoteState.centralBank.stance === 'DOVISH') {
      supporting.push(
        `Central bank policy divergence favors ${pair.baseCurrency} (${baseState.centralBank.institution}: ${baseState.centralBank.stance} vs ${quoteState.centralBank.institution}: ${quoteState.centralBank.stance}).`
      );
    }
    if (policyRateSpread > 0) {
      supporting.push(
        `Positive nominal policy rate carry differential of +${policyRateSpread.toFixed(
          2
        )}% favors ${pair.baseCurrency}.`
      );
    } else {
      counter.push(
        `Negative carry differential of ${policyRateSpread.toFixed(2)}% works against holding long ${
          pair.baseCurrency
        }.`
      );
    }
  } else if (orientationDirection === 'BEARISH_BASE') {
    supporting.push(
      `${pair.quoteCurrency} demonstrates superior relative strength score (${
        quoteStrength >= 0 ? '+' : ''
      }${quoteStrength.toFixed(2)}) over ${pair.baseCurrency} (${
        baseStrength >= 0 ? '+' : ''
      }${baseStrength.toFixed(2)}).`
    );
    if (quoteState.centralBank.stance === 'HAWKISH' || baseState.centralBank.stance === 'DOVISH') {
      supporting.push(
        `Monetary policy divergence favors ${pair.quoteCurrency} (${quoteState.centralBank.institution}: ${quoteState.centralBank.stance} vs ${baseState.centralBank.institution}: ${baseState.centralBank.stance}).`
      );
    }
    if (policyRateSpread < 0) {
      supporting.push(
        `Policy rate spread favors ${pair.quoteCurrency} by +${Math.abs(policyRateSpread).toFixed(
          2
        )}%.`
      );
    } else {
      counter.push(
        `Carry differential of +${policyRateSpread.toFixed(2)}% favors ${
          pair.baseCurrency
        }, posing carry cost to short ${pair.baseCurrency}.`
      );
    }
  } else {
    supporting.push(`Symmetric market evidence keeps ${pair.symbol} range-bound.`);
    counter.push(`Lack of decisive fundamental divergence limits directional follow-through.`);
  }

  if (baseState.conflictingEvidence.length > 0) {
    counter.push(`${pair.baseCurrency}: ${baseState.conflictingEvidence[0]}`);
  }
  if (quoteState.conflictingEvidence.length > 0) {
    counter.push(`${pair.quoteCurrency}: ${quoteState.conflictingEvidence[0]}`);
  }

  const pairEvents = events.filter(
    (e: EconomicEvent) => e.currency === pair.baseCurrency || e.currency === pair.quoteCurrency
  );

  let thesis = '';
  if (orientationDirection === 'BULLISH_BASE') {
    thesis = `Macro stance favors ${pair.baseCurrency} against ${
      pair.quoteCurrency
    }. The pair exhibits a +${relativeStrengthDelta.toFixed(
      2
    )} relative advantage supported by ${convergenceDivergence.toLowerCase()} between monetary trajectories and economic prints.`;
  } else if (orientationDirection === 'BEARISH_BASE') {
    thesis = `Macro stance favors ${pair.quoteCurrency} over ${
      pair.baseCurrency
    }. The pair faces a ${relativeStrengthDelta.toFixed(
      2
    )} drag driven by ${pair.quoteCurrency} outperformance and central bank divergence.`;
  } else {
    thesis = `Neutral thesis: ${pair.symbol} exhibits balanced fundamentals with no decisive policy tilt between ${pair.baseCurrency} and ${pair.quoteCurrency}.`;
  }

  const invalidationConditions = [
    `Shift in ${pair.baseCurrency} central bank stance from ${baseState.centralBank.stance} during upcoming scheduled decision.`,
    `Significant surprise on upcoming ${pair.quoteCurrency} inflation or employment release altering terminal rate path.`,
    `Relative strength differential reverting into neutral bounds (|Δ| < 0.05).`
  ];

  const risks = [
    `Unscheduled central bank official interventions or emergency communication.`,
    `Abrupt global risk-sentiment pivot affecting funding currencies.`,
    `Carry unwinds in high-yielding cross allocations.`
  ];

  const sessionRel = getPairSessionRelevance(pair.symbol);
  const watchWindow = calculateWatchWindow(pair, events, date, true);

  const sources = [
    {
      name: baseState.centralBank.sourceMetadata.sourceName,
      url: baseState.centralBank.sourceMetadata.sourceUrl,
      classification: 'FACT' as const
    },
    {
      name: quoteState.centralBank.sourceMetadata.sourceName,
      url: quoteState.centralBank.sourceMetadata.sourceUrl,
      classification: 'FACT' as const
    }
  ];

  return {
    pair,
    baseCurrency: baseState.currency,
    quoteCurrency: quoteState.currency,
    baseState,
    quoteState,
    relativeStrengthDelta,
    orientationDirection,
    orientationExplanation,
    convergenceDivergence,
    convergenceExplanation,
    supportingEvidence: supporting,
    counterEvidence: counter,
    catalysts: pairEvents,
    risks,
    thesis,
    invalidationConditions,
    sessionRelevance: {
      primarySession: sessionRel.primarySession,
      relevantSessions: sessionRel.relevantSessions,
      structuralRationale: sessionRel.structuralRationale
    },
    watchWindow,
    lastUpdated: new Date().toISOString(),
    sources
  };
}
