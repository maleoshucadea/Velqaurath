import {
  NormalizedMarketQuote,
  CurrencyMarketStrength,
  CurrencyPairContribution,
  ProviderHealthState
} from '../types';
import {
  RelativeStrengthConfig,
  RelativeStrengthClassification
} from '../../types';
import {
  SUPPORTED_MAJOR_CURRENCIES,
  DEFAULT_LIQUID_PAIRS,
  MARKET_STRENGTH_SCALE_FACTOR
} from '../config';

export interface MarketEngineOptions {
  currencies?: readonly string[];
  requiredPairs?: readonly string[];
  scaleFactor?: number;
  providerStatus?: ProviderHealthState;
  providerSource?: string;
}

/**
 * Calculates a single pair's signed contribution to a specific currency.
 * 
 * Base/Quote Orientation Rules:
 * - When pair is Base/Quote (e.g. EUR/USD):
 *   - Base currency (EUR) gains when pair rises (+return) and loses when pair falls (-return).
 *   - Quote currency (USD) loses when pair rises (-return) and gains when pair falls (+return).
 * - When pair is USD/JPY:
 *   - USD (Base) gains when pair rises (+return) and loses when pair falls (-return).
 *   - JPY (Quote) loses when pair rises (-return) and gains when pair falls (+return).
 */
export function calculatePairContribution(
  currencyCode: string,
  quote: NormalizedMarketQuote
): CurrencyPairContribution | null {
  if (quote.changePercent === null || isNaN(quote.changePercent)) {
    return null;
  }

  const cleanCode = currencyCode.toUpperCase();
  const base = quote.baseCurrency.toUpperCase();
  const quoteCurr = quote.quoteCurrency.toUpperCase();

  if (base === cleanCode) {
    return {
      pairSymbol: quote.symbol,
      pairReturnPercent: quote.changePercent,
      role: 'BASE',
      signedContribution: quote.changePercent,
      timestamp: quote.timestamp
    };
  }

  if (quoteCurr === cleanCode) {
    return {
      pairSymbol: quote.symbol,
      pairReturnPercent: quote.changePercent,
      role: 'QUOTE',
      signedContribution: -quote.changePercent,
      timestamp: quote.timestamp
    };
  }

  return null;
}

/**
 * Deterministic Currency Market Strength Engine.
 * 
 * Methodology:
 * 1. Filter valid FX pair returns from observed market data.
 * 2. Convert each pair's return into a signed directional contribution for each currency.
 * 3. Average the contributions for each currency to obtain its raw basket performance.
 * 4. Demean against the aggregate basket mean so relative strength is strictly zero-sum.
 * 5. Scale into the standard classification space using MARKET_STRENGTH_SCALE_FACTOR (0.25).
 * 6. Classify against configurable strong/weak thresholds (+0.10 / -0.10).
 * 7. Report explicit coverage statistics and contributing pairs.
 */
export function calculateCurrencyMarketStrengths(
  quotes: NormalizedMarketQuote[],
  thresholds: RelativeStrengthConfig,
  options?: MarketEngineOptions
): Map<string, CurrencyMarketStrength> {
  const currencies = options?.currencies ?? SUPPORTED_MAJOR_CURRENCIES;
  const requiredPairs = options?.requiredPairs ?? DEFAULT_LIQUID_PAIRS;
  const scaleFactor = options?.scaleFactor ?? MARKET_STRENGTH_SCALE_FACTOR;
  const providerStatus = options?.providerStatus ?? (quotes.length > 0 ? 'CONNECTED' : 'NOT_CONFIGURED');
  const providerSource = options?.providerSource ?? (quotes.length > 0 ? quotes[0].source : 'Twelve Data');

  const resultMap = new Map<string, CurrencyMarketStrength>();
  const nowIso = new Date().toISOString();

  // If no quotes are available or provider is not connected, produce explicit DATA_UNAVAILABLE states
  if (quotes.length === 0 || providerStatus === 'NOT_CONFIGURED' || providerStatus === 'ERROR') {
    for (const code of currencies) {
      const totalExpectedForCurrency = requiredPairs.filter(p => {
        const [b, q] = p.split('/');
        return b === code || q === code;
      }).length;

      resultMap.set(code, {
        currency: code,
        marketStrength: null,
        classification: 'DATA_UNAVAILABLE',
        rawRelativeReturn: null,
        avgReturn: null,
        momentum: null,
        coverage: {
          available: 0,
          required: totalExpectedForCurrency,
          percent: 0
        },
        contributors: [],
        explanation: providerStatus === 'NOT_CONFIGURED'
          ? `MARKET DATA NOT CONFIGURED: Twelve Data API key is not configured on the server. Market strength is unavailable.`
          : `MARKET DATA UNAVAILABLE: Provider status is ${providerStatus}. No synthetic data substituted.`,
        calculatedAt: nowIso,
        providerStatus,
        source: providerSource
      });
    }
    return resultMap;
  }

  // Step 1 & 2: Extract signed contributions for each currency
  interface CurrencyIntermediate {
    code: string;
    contributors: CurrencyPairContribution[];
    avgReturn: number | null;
    requiredCount: number;
  }

  const intermediates: CurrencyIntermediate[] = [];

  for (const code of currencies) {
    const requiredForCurrency = requiredPairs.filter(p => {
      const [b, q] = p.split('/');
      return b === code || q === code;
    });

    const contributors: CurrencyPairContribution[] = [];
    for (const q of quotes) {
      const contrib = calculatePairContribution(code, q);
      if (contrib !== null) {
        contributors.push(contrib);
      }
    }

    let avgReturn: number | null = null;
    if (contributors.length > 0) {
      const sum = contributors.reduce((acc, c) => acc + c.signedContribution, 0);
      avgReturn = sum / contributors.length;
    }

    intermediates.push({
      code,
      contributors,
      avgReturn,
      requiredCount: requiredForCurrency.length
    });
  }

  // Step 3: Compute basket average across currencies with valid observations
  const validIntermediates = intermediates.filter(i => i.avgReturn !== null);
  const basketMean = validIntermediates.length > 0
    ? validIntermediates.reduce((acc, i) => acc + (i.avgReturn as number), 0) / validIntermediates.length
    : 0;

  // Step 4, 5, 6: Demean, scale, and classify
  for (const item of intermediates) {
    const availableCount = item.contributors.length;
    const requiredCount = item.requiredCount;
    const coveragePercent = requiredCount > 0
      ? Math.round((availableCount / requiredCount) * 1000) / 10
      : 0;

    if (item.avgReturn === null) {
      resultMap.set(item.code, {
        currency: item.code,
        marketStrength: null,
        classification: 'DATA_UNAVAILABLE',
        rawRelativeReturn: null,
        avgReturn: null,
        momentum: null,
        coverage: {
          available: 0,
          required: requiredCount,
          percent: 0
        },
        contributors: [],
        explanation: `MARKET DATA UNAVAILABLE: Zero valid pair quotes observed for ${item.code}.`,
        calculatedAt: nowIso,
        providerStatus,
        source: providerSource
      });
      continue;
    }

    // Demean vs basket
    const rawRelativeReturn = item.avgReturn - basketMean;

    // Scale into classification space
    const scaledScore = rawRelativeReturn * scaleFactor;
    const marketStrength = Math.round(scaledScore * 100) / 100;
    const momentum = Math.round(marketStrength * 0.4 * 100) / 100;

    // Classify
    let classification: RelativeStrengthClassification = 'NEUTRAL';
    if (marketStrength >= thresholds.strongThreshold) {
      classification = 'STRONG';
    } else if (marketStrength <= thresholds.weakThreshold) {
      classification = 'WEAK';
    }

    // Sort contributors by impact
    const sortedContributors = [...item.contributors].sort(
      (a, b) => Math.abs(b.signedContribution) - Math.abs(a.signedContribution)
    );

    const topGainers = sortedContributors
      .filter(c => c.signedContribution > 0)
      .slice(0, 2)
      .map(c => `${c.pairSymbol} (+${c.signedContribution.toFixed(2)}%)`)
      .join(', ');

    const topDraggers = sortedContributors
      .filter(c => c.signedContribution < 0)
      .slice(0, 2)
      .map(c => `${c.pairSymbol} (${c.signedContribution.toFixed(2)}%)`)
      .join(', ');

    // Construct human-readable explanation
    const signPrefix = marketStrength >= 0 ? '+' : '';
    const formulaSummary = `Formula: Mean Return (${item.avgReturn >= 0 ? '+' : ''}${item.avgReturn.toFixed(3)}%) - Basket Mean (${basketMean >= 0 ? '+' : ''}${basketMean.toFixed(3)}%) = ${rawRelativeReturn >= 0 ? '+' : ''}${rawRelativeReturn.toFixed(3)}% × ${scaleFactor} = ${signPrefix}${marketStrength.toFixed(2)}.`;
    const coverageSummary = `Coverage: ${availableCount}/${requiredCount} pairs (${coveragePercent}%).`;

    let driverText = '';
    if (topGainers && topDraggers) {
      driverText = `Bolstered by ${topGainers}; dragged by ${topDraggers}.`;
    } else if (topGainers) {
      driverText = `Supported by ${topGainers}.`;
    } else if (topDraggers) {
      driverText = `Pressured by ${topDraggers}.`;
    } else {
      driverText = `Flat price action across basket.`;
    }

    let thresholdText = '';
    if (classification === 'STRONG') {
      thresholdText = `Classified STRONG (≥ +${thresholds.strongThreshold.toFixed(2)}).`;
    } else if (classification === 'WEAK') {
      thresholdText = `Classified WEAK (≤ ${thresholds.weakThreshold.toFixed(2)}).`;
    } else {
      thresholdText = `Classified NEUTRAL (${thresholds.weakThreshold.toFixed(2)} < score < +${thresholds.strongThreshold.toFixed(2)}).`;
    }

    const explanation = `${thresholdText} ${driverText} ${coverageSummary} ${formulaSummary}`;

    resultMap.set(item.code, {
      currency: item.code,
      marketStrength,
      classification,
      rawRelativeReturn: Math.round(rawRelativeReturn * 1000) / 1000,
      avgReturn: Math.round(item.avgReturn * 1000) / 1000,
      momentum,
      coverage: {
        available: availableCount,
        required: requiredCount,
        percent: coveragePercent
      },
      contributors: sortedContributors,
      explanation,
      calculatedAt: nowIso,
      providerStatus,
      source: providerSource
    });
  }

  return resultMap;
}
