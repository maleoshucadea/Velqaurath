import { EconomicObservation, EconomicIndicator } from '../../types';

export interface ExpectationAnalysis {
  observationId: string;
  currency: string;
  indicatorName: string;
  actual: number | null;
  forecast: number | null;
  previous: number | null;
  unit: string;
  surpriseType: 'ABOVE' | 'BELOW' | 'IN_LINE' | 'NO_FORECAST' | 'UNAVAILABLE';
  surpriseDelta: number | null;
  percentageSurprise: number | null;
  directionSummary: string;
  monetaryPolicyImplication: string;
  classification: 'ENGINE_ANALYSIS';
}

export function analyzeObservationExpectations(
  obs: EconomicObservation,
  indicatorMeta?: EconomicIndicator
): ExpectationAnalysis {
  if (obs.actual === null || obs.sourceStatus !== 'CONNECTED') {
    return {
      observationId: obs.id,
      currency: obs.currency,
      indicatorName: obs.indicatorName,
      actual: obs.actual,
      forecast: obs.forecast,
      previous: obs.previous,
      unit: obs.unit,
      surpriseType: 'UNAVAILABLE',
      surpriseDelta: null,
      percentageSurprise: null,
      directionSummary: 'DATA UNAVAILABLE / NOT CONNECTED',
      monetaryPolicyImplication: 'No interpretation possible without authenticated factual data release.',
      classification: 'ENGINE_ANALYSIS'
    };
  }

  if (obs.forecast === null) {
    return {
      observationId: obs.id,
      currency: obs.currency,
      indicatorName: obs.indicatorName,
      actual: obs.actual,
      forecast: null,
      previous: obs.previous,
      unit: obs.unit,
      surpriseType: 'NO_FORECAST',
      surpriseDelta: null,
      percentageSurprise: null,
      directionSummary: `Actual printed at ${obs.actual}${obs.unit} without market consensus forecast.`,
      monetaryPolicyImplication: 'Assess historical trend and central bank target band.',
      classification: 'ENGINE_ANALYSIS'
    };
  }

  const delta = Math.round((obs.actual - obs.forecast) * 100) / 100;
  const pctDelta =
    obs.forecast !== 0
      ? Math.round(((obs.actual - obs.forecast) / Math.abs(obs.forecast)) * 1000) / 10
      : 0;

  let surpriseType: 'ABOVE' | 'BELOW' | 'IN_LINE' = 'IN_LINE';
  const tolerance = Math.abs(obs.forecast) * 0.02 > 0.05 ? 0.05 : 0.02;

  if (delta > tolerance) {
    surpriseType = 'ABOVE';
  } else if (delta < -tolerance) {
    surpriseType = 'BELOW';
  }

  let directionSummary = '';
  let monetaryPolicyImplication = '';
  const highIsHawkish = indicatorMeta?.highIsHawkish ?? true;

  if (surpriseType === 'ABOVE') {
    directionSummary = `Actual (${obs.actual}${obs.unit}) exceeded consensus forecast (${obs.forecast}${obs.unit}) by +${delta}${obs.unit} (+${pctDelta}%).`;
    if (obs.category === 'INFLATION') {
      monetaryPolicyImplication =
        'Upside inflation surprise pressures central bank to prolong restrictive stance or delay rate cuts.';
    } else if (obs.category === 'EMPLOYMENT') {
      monetaryPolicyImplication = highIsHawkish
        ? 'Labor market resilience reduces urgency for policy accommodation.'
        : 'Rising unemployment increases pressure for central bank easing.';
    } else if (obs.category === 'GROWTH') {
      monetaryPolicyImplication = 'Stronger domestic demand supports neutral-to-tight monetary posture.';
    } else {
      monetaryPolicyImplication = 'Data print exceeds consensus baseline.';
    }
  } else if (surpriseType === 'BELOW') {
    directionSummary = `Actual (${obs.actual}${obs.unit}) missed consensus forecast (${obs.forecast}${obs.unit}) by ${delta}${obs.unit} (${pctDelta}%).`;
    if (obs.category === 'INFLATION') {
      monetaryPolicyImplication =
        'Disinflation surprise reinforces room for central bank monetary easing.';
    } else if (obs.category === 'EMPLOYMENT') {
      monetaryPolicyImplication = highIsHawkish
        ? 'Softening labor market accelerates expectations of rate reductions.'
        : 'Tightening unemployment metric keeps hawkish bias active.';
    } else if (obs.category === 'GROWTH') {
      monetaryPolicyImplication = 'Subdued growth dampens inflationary momentum, skewing expectations dovish.';
    } else {
      monetaryPolicyImplication = 'Data print lagged consensus expectations.';
    }
  } else {
    directionSummary = `Actual (${obs.actual}${obs.unit}) landed broadly in line with consensus forecast (${obs.forecast}${obs.unit}).`;
    monetaryPolicyImplication = 'Maintains prevailing policy path with minimal expectation repricing.';
  }

  return {
    observationId: obs.id,
    currency: obs.currency,
    indicatorName: obs.indicatorName,
    actual: obs.actual,
    forecast: obs.forecast,
    previous: obs.previous,
    unit: obs.unit,
    surpriseType,
    surpriseDelta: delta,
    percentageSurprise: pctDelta,
    directionSummary,
    monetaryPolicyImplication,
    classification: 'ENGINE_ANALYSIS'
  };
}
