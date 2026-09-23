import { analyzeObservationExpectations } from '../expectations/expectationsEngine';
import { ECONOMIC_INDICATORS } from '../../data/indicators';
import {
  EconomicObservation,
  CentralBankPolicy,
  FundamentalPillar,
  MacroFundamentals,
  PillarCondition
} from '../../types';

export function evaluateCurrencyFundamentals(
  currency: string,
  observations: EconomicObservation[],
  centralBank: CentralBankPolicy,
  isDataFeedConnected: boolean
): MacroFundamentals {
  if (!isDataFeedConnected) {
    const unavailPillar: FundamentalPillar = {
      currentCondition: 'DATA SOURCE NOT CONNECTED',
      recentChange: 'DATA UNAVAILABLE',
      expectation: 'DATA UNAVAILABLE',
      surprise: 'UNAVAILABLE',
      implication: 'Fundamental pillar cannot be evaluated without authenticated live data feed.',
      dataAvailable: false,
      observations: []
    };

    return {
      monetaryPolicy: unavailPillar,
      inflation: unavailPillar,
      employment: unavailPillar,
      growth: unavailPillar,
      consumerBusinessActivity: unavailPillar,
      tradeExternalBalance: unavailPillar,
      commodityExposure: unavailPillar,
      overallCondition: 'DATA_UNAVAILABLE' as PillarCondition,
      fundamentalScore: null,
      scoreFormula: 'Calculation suspended: Data sources disconnected.'
    };
  }

  const currObs = observations.filter(
    (o) => o.currency === currency && o.sourceStatus === 'CONNECTED'
  );

  const cbStance = centralBank.stance;
  const cbRate =
    centralBank.currentPolicyRate !== null ? `${centralBank.currentPolicyRate}%` : 'N/A';
  const prevRate =
    centralBank.previousPolicyRate !== null ? `${centralBank.previousPolicyRate}%` : 'N/A';

  const monetaryPolicy: FundamentalPillar = {
    currentCondition: `Policy rate at ${cbRate} by ${centralBank.institution}. Stance: ${cbStance}.`,
    recentChange:
      centralBank.previousPolicyRate !== null && centralBank.currentPolicyRate !== null
        ? `Rate moved from ${prevRate} to ${cbRate} on ${
            centralBank.latestDecisionDate || 'recent meeting'
          }.`
        : 'No recent adjustment recorded.',
    expectation: centralBank.guidanceSummary || 'Data-dependent meeting-by-meeting approach.',
    surprise: 'NO_SURPRISE',
    implication:
      cbStance === 'HAWKISH'
        ? 'Restrictive monetary policy provides positive yield support.'
        : cbStance === 'DOVISH'
        ? 'Easing cycle compresses nominal yield advantage.'
        : 'Balanced stance reflects measured equilibrium.',
    dataAvailable: true,
    observations: []
  };

  const buildPillar = (category: string, defaultName: string): FundamentalPillar => {
    const categoryObs = currObs.filter((o) => o.category === category);
    if (categoryObs.length === 0) {
      return {
        currentCondition: `No authenticated ${defaultName.toLowerCase()} observation recorded.`,
        recentChange: 'DATA UNAVAILABLE',
        expectation: 'DATA UNAVAILABLE',
        surprise: 'UNAVAILABLE',
        implication: 'Awaiting primary statistical release.',
        dataAvailable: false,
        observations: []
      };
    }

    const latest = categoryObs[0];
    const indicatorMeta = ECONOMIC_INDICATORS.find(
      (i) => i.id === latest.indicatorId || i.code === latest.indicatorId
    );
    const expAnalysis = analyzeObservationExpectations(latest, indicatorMeta);

    const prevStr = latest.previous !== null ? `${latest.previous}${latest.unit}` : 'N/A';
    const actualStr = latest.actual !== null ? `${latest.actual}${latest.unit}` : 'N/A';
    const forecastStr =
      latest.forecast !== null ? `${latest.forecast}${latest.unit}` : 'Consensus unavailable';

    return {
      currentCondition: `${latest.indicatorName}: ${actualStr} (${latest.period}). Source: ${latest.source}.`,
      recentChange: `Previous reading was ${prevStr}. Trend: ${
        latest.actual !== null && latest.previous !== null
          ? latest.actual > latest.previous
            ? 'Increasing (+)'
            : latest.actual < latest.previous
            ? 'Decreasing (-)'
            : 'Unchanged'
          : 'Indeterminate'
      }.`,
      expectation: `Market consensus expectation was ${forecastStr}.`,
      surprise:
        expAnalysis.surpriseType === 'NO_FORECAST' ? 'NO_SURPRISE' : expAnalysis.surpriseType,
      implication: expAnalysis.monetaryPolicyImplication,
      dataAvailable: true,
      observations: categoryObs
    };
  };

  const inflation = buildPillar('INFLATION', 'Inflation');
  const employment = buildPillar('EMPLOYMENT', 'Employment');
  const growth = buildPillar('GROWTH', 'Growth');
  const consumerBusinessActivity = buildPillar('CONSUMER_ACTIVITY', 'Consumer Activity');
  const tradeExternalBalance = buildPillar('TRADE_BALANCE', 'Trade Balance');

  let commodityNotes = 'Standard industrialized economy profile.';
  if (currency === 'AUD')
    commodityNotes = 'High export sensitivity to iron ore, coal, and Chinese industrial demand.';
  if (currency === 'CAD')
    commodityNotes = 'Export correlation to crude oil (WTI) and Western Canadian Select pricing.';
  if (currency === 'NZD')
    commodityNotes = 'Terms of trade driven by global dairy auction (GDT) and agricultural exports.';
  if (currency === 'JPY' || currency === 'EUR')
    commodityNotes =
      'Net commodity/energy importer; elevated energy prices act as a negative terms-of-trade drag.';
  if (currency === 'CHF')
    commodityNotes = 'Safe-haven currency with gold and pharmaceutical export backing.';

  const commodityExposure: FundamentalPillar = {
    currentCondition: commodityNotes,
    recentChange: 'Terms-of-trade sensitivity tracked against energy and commodity indices.',
    expectation: 'Subject to global commodity cycle fluctuations.',
    surprise: 'NO_SURPRISE',
    implication:
      currency === 'AUD' || currency === 'CAD' || currency === 'NZD'
        ? 'Gains support during global resource and industrial expansion phases.'
        : 'Vulnerable to global energy price spikes.',
    dataAvailable: true,
    observations: []
  };

  let cbWeight = 0;
  if (cbStance === 'HAWKISH') cbWeight = 0.08;
  if (cbStance === 'DOVISH') cbWeight = -0.08;

  let infWeight = 0;
  if (inflation.surprise === 'ABOVE') infWeight = 0.04;
  if (inflation.surprise === 'BELOW') infWeight = -0.04;

  let empWeight = 0;
  if (employment.surprise === 'ABOVE') empWeight = 0.04;
  if (employment.surprise === 'BELOW') empWeight = -0.04;

  let gdpWeight = 0;
  if (growth.surprise === 'ABOVE') gdpWeight = 0.04;
  if (growth.surprise === 'BELOW') gdpWeight = -0.04;

  const totalScore = Math.round((cbWeight + infWeight + empWeight + gdpWeight) * 100) / 100;
  const scoreFormula = `Explicit Aggregate Formula: CB Stance (${
    cbWeight >= 0 ? '+' : ''
  }${cbWeight}) + Inflation Surprise (${
    infWeight >= 0 ? '+' : ''
  }${infWeight}) + Employment Surprise (${
    empWeight >= 0 ? '+' : ''
  }${empWeight}) + Growth Surprise (${gdpWeight >= 0 ? '+' : ''}${gdpWeight}) = ${
    totalScore >= 0 ? '+' : ''
  }${totalScore}`;

  let overallCondition: PillarCondition = 'NEUTRAL';
  if (totalScore >= 0.08) overallCondition = 'EXPANSIONARY';
  else if (totalScore <= -0.08) overallCondition = 'CONTRACTIONARY';
  else if (totalScore !== 0) overallCondition = 'MIXED';

  return {
    monetaryPolicy,
    inflation,
    employment,
    growth,
    consumerBusinessActivity,
    tradeExternalBalance,
    commodityExposure,
    overallCondition,
    fundamentalScore: totalScore,
    scoreFormula
  };
}
