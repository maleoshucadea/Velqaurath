import {
  SUPPORTED_MAJOR_CURRENCIES,
  DEFAULT_LIQUID_PAIRS,
  MARKET_STRENGTH_SCALE_FACTOR
} from '../config';
import {
  MarketQuote,
  CurrencyMarketStrength,
  PairContribution,
  StrengthThresholds,
  StrengthEngineOptions,
  StrengthClassification
} from '../types';

/**
 * Calculates a single pair's signed return contribution to a given currency.
 *
 * Orientation Rules:
 * - BASE currency: signed contribution = +pair daily return
 * - QUOTE currency: signed contribution = -pair daily return
 *
 * Daily Return Separation:
 * - Uses `dailyReturnPercent` if explicitly defined on the quote, falling back to `changePercent`.
 * - Ticks may update instantaneous price and timestamp, but the daily baseline remains preserved.
 */
export function calculatePairContribution(
  currencyCode: string,
  quote: MarketQuote
): PairContribution | null {
  const dailyReturn = quote.dailyReturnPercent ?? quote.changePercent;
  if (dailyReturn === null || dailyReturn === undefined || isNaN(dailyReturn)) {
    return null;
  }

  const cleanCode = currencyCode.toUpperCase();
  const base = quote.baseCurrency.toUpperCase();
  const quoteCurr = quote.quoteCurrency.toUpperCase();

  if (base === cleanCode) {
    return {
      pairSymbol: quote.symbol,
      pairReturnPercent: dailyReturn,
      role: 'BASE',
      signedContribution: dailyReturn,
      timestamp: quote.timestamp ?? Date.now()
    };
  }

  if (quoteCurr === cleanCode) {
    return {
      pairSymbol: quote.symbol,
      pairReturnPercent: dailyReturn,
      role: 'QUOTE',
      signedContribution: -dailyReturn,
      timestamp: quote.timestamp ?? Date.now()
    };
  }

  return null;
}

/**
 * Calculates deterministic currency market strengths across a relative currency basket.
 *
 * Transformation Pipeline:
 * 1. Calculate signed contribution per valid required pair for each currency.
 * 2. Calculate average signed return per currency: avgReturn = mean(signed contributions).
 * 3. Calculate basket mean return across all currencies with valid quotes: basketMean = mean(avgReturns).
 * 4. Basket-relative return: rawRelativeReturn = avgReturn - basketMean.
 * 5. Scaled score: scaledScore = rawRelativeReturn * scaleFactor (default 0.25).
 * 6. Rounded score: marketStrength = Math.round(scaledScore * 100) / 100.
 * 7. Classification:
 *    - If no quotes or disconnected: DATA_UNAVAILABLE (marketStrength: null)
 *    - If coverage < minCoverageThreshold: INSUFFICIENT_COVERAGE (marketStrength: null)
 *    - If marketStrength >= strongThreshold (+0.10): STRONG
 *    - If marketStrength <= weakThreshold (-0.10): WEAK
 *    - Otherwise: NEUTRAL
 */
export function calculateCurrencyMarketStrengths(
  quotes: MarketQuote[],
  thresholds: StrengthThresholds,
  options?: StrengthEngineOptions
): Map<string, CurrencyMarketStrength> {
  const currencies = options?.currencies ?? SUPPORTED_MAJOR_CURRENCIES;
  const requiredPairs = options?.requiredPairs ?? DEFAULT_LIQUID_PAIRS;
  const scaleFactor = options?.scaleFactor ?? MARKET_STRENGTH_SCALE_FACTOR;
  const minCoverageThreshold = options?.minCoverageThreshold ?? 0; // Default to 0 so any currency with valid pairs is calculated unless a strict threshold is requested
  const providerStatus = options?.providerStatus ?? (quotes.length > 0 ? 'CONNECTED' : 'NOT_CONFIGURED');
  const providerSource = options?.providerSource ?? (quotes.length > 0 ? quotes[0].source : 'Biquote');

  const resultMap = new Map<string, CurrencyMarketStrength>();
  const nowIso = new Date().toISOString();

  // Edge case: No quotes provided or provider is completely down/not configured
  if (quotes.length === 0 || providerStatus === 'NOT_CONFIGURED' || providerStatus === 'ERROR' || providerStatus === 'DISCONNECTED') {
    for (const code of currencies) {
      const requiredForCurrency = requiredPairs.filter((p) => {
        const [b, q] = p.split('/');
        return b === code || q === code;
      });

      resultMap.set(code, {
        currency: code,
        marketStrength: null,
        classification: 'DATA_UNAVAILABLE',
        rawRelativeReturn: null,
        avgReturn: null,
        momentum: null,
        coverage: {
          available: 0,
          required: requiredForCurrency.length,
          percent: 0,
          missingPairs: [...requiredForCurrency],
          validPairs: [],
          status: 'INSUFFICIENT'
        },
        contributors: [],
        explanation:
          providerStatus === 'NOT_CONFIGURED'
            ? 'MARKET DATA NOT CONFIGURED: Primary provider is awaiting initialization. Market strength is unavailable.'
            : `MARKET DATA UNAVAILABLE: Provider status is ${providerStatus}. No synthetic data substituted.`,
        calculatedAt: nowIso,
        providerStatus,
        source: providerSource
      });
    }
    return resultMap;
  }

  // 1. Filter quotes to valid, non-stale quotes belonging to the required pairs set
  const requiredSet = new Set(requiredPairs);
  const validQuotes = quotes.filter(
    (q) => requiredSet.has(q.symbol) && q.changePercent !== null && !isNaN(q.changePercent)
  );

  interface CurrencyIntermediate {
    code: string;
    requiredPairs: string[];
    validPairs: string[];
    missingPairs: string[];
    contributors: PairContribution[];
    avgReturn: number | null;
    coveragePercent: number;
    coverageRatio: number;
    hasSufficientCoverage: boolean;
  }

  const intermediates: CurrencyIntermediate[] = [];

  for (const code of currencies) {
    const requiredForCurrency = requiredPairs.filter((p) => {
      const [b, q] = p.split('/');
      return b === code || q === code;
    });

    const contributors: PairContribution[] = [];
    const validPairs: string[] = [];

    for (const q of validQuotes) {
      const contrib = calculatePairContribution(code, q);
      if (contrib !== null) {
        contributors.push(contrib);
        validPairs.push(q.symbol);
      }
    }

    const missingPairs = requiredForCurrency.filter((p) => !validPairs.includes(p));
    const availableCount = contributors.length;
    const requiredCount = requiredForCurrency.length;
    const coverageRatio = requiredCount > 0 ? availableCount / requiredCount : 0;
    const coveragePercent = Math.round(coverageRatio * 1000) / 10;
    const hasSufficientCoverage = availableCount > 0 && coverageRatio >= minCoverageThreshold;

    let avgReturn: number | null = null;
    if (contributors.length > 0) {
      const sum = contributors.reduce((acc, c) => acc + c.signedContribution, 0);
      avgReturn = sum / contributors.length;
    }

    intermediates.push({
      code,
      requiredPairs: requiredForCurrency,
      validPairs,
      missingPairs,
      contributors,
      avgReturn,
      coveragePercent,
      coverageRatio,
      hasSufficientCoverage
    });
  }

  // 2. Basket Mean across valid currencies
  const validIntermediates = intermediates.filter((i) => i.avgReturn !== null);
  const basketMean =
    validIntermediates.length > 0
      ? validIntermediates.reduce((acc, i) => acc + (i.avgReturn as number), 0) / validIntermediates.length
      : 0;

  // 3. Final calculations per currency
  for (const item of intermediates) {
    const availableCount = item.contributors.length;
    const requiredCount = item.requiredPairs.length;
    const coverageStatus =
      availableCount === requiredCount
        ? 'COMPLETE'
        : item.hasSufficientCoverage
        ? 'PARTIAL'
        : 'INSUFFICIENT';

    const coverageInfo = {
      available: availableCount,
      required: requiredCount,
      percent: item.coveragePercent,
      missingPairs: item.missingPairs,
      validPairs: item.validPairs,
      status: coverageStatus as 'COMPLETE' | 'PARTIAL' | 'INSUFFICIENT'
    };

    // If coverage is insufficient or zero quotes
    if (!item.hasSufficientCoverage || item.avgReturn === null) {
      const isZero = availableCount === 0;
      const classification: StrengthClassification = isZero
        ? 'DATA_UNAVAILABLE'
        : 'INSUFFICIENT_COVERAGE';

      resultMap.set(item.code, {
        currency: item.code,
        marketStrength: null,
        classification,
        rawRelativeReturn: null,
        avgReturn: item.avgReturn,
        momentum: null,
        coverage: coverageInfo,
        contributors: item.contributors,
        explanation: isZero
          ? `MARKET DATA UNAVAILABLE: Zero valid pair quotes observed for ${item.code} out of ${requiredCount} required pairs.`
          : `INSUFFICIENT COVERAGE: Only ${availableCount}/${requiredCount} pairs observed (${item.coveragePercent}% < minimum required ${(minCoverageThreshold * 100).toFixed(0)}%). Strength score withheld.`,
        calculatedAt: nowIso,
        providerStatus,
        source: providerSource,
        basketMean: Math.round(basketMean * 1000) / 1000
      });
      continue;
    }

    // Relative basket score calculation
    const rawRelativeReturn = item.avgReturn - basketMean;
    const scaledScore = rawRelativeReturn * scaleFactor;
    const marketStrength = Math.round(scaledScore * 100) / 100;
    const momentum = Math.round(marketStrength * 0.4 * 100) / 100;

    let classification: StrengthClassification = 'NEUTRAL';
    if (marketStrength >= thresholds.strongThreshold) {
      classification = 'STRONG';
    } else if (marketStrength <= thresholds.weakThreshold) {
      classification = 'WEAK';
    }

    const sortedContributors = [...item.contributors].sort(
      (a, b) => Math.abs(b.signedContribution) - Math.abs(a.signedContribution)
    );

    const topGainers = sortedContributors
      .filter((c) => c.signedContribution > 0)
      .slice(0, 2)
      .map((c) => `${c.pairSymbol} (+${c.signedContribution.toFixed(2)}%)`)
      .join(', ');

    const topDraggers = sortedContributors
      .filter((c) => c.signedContribution < 0)
      .slice(0, 2)
      .map((c) => `${c.pairSymbol} (${c.signedContribution.toFixed(2)}%)`)
      .join(', ');

    const signPrefix = marketStrength >= 0 ? '+' : '';
    const formulaSummary = `Formula: Mean (${item.avgReturn >= 0 ? '+' : ''}${item.avgReturn.toFixed(3)}%) - Basket Mean (${basketMean >= 0 ? '+' : ''}${basketMean.toFixed(3)}%) = ${rawRelativeReturn >= 0 ? '+' : ''}${rawRelativeReturn.toFixed(3)}% × ${scaleFactor} = ${signPrefix}${marketStrength.toFixed(2)}.`;
    const coverageSummary = `Coverage: ${availableCount}/${requiredCount} pairs (${item.coveragePercent}%).`;

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
      coverage: coverageInfo,
      contributors: sortedContributors,
      explanation,
      calculatedAt: nowIso,
      providerStatus,
      source: providerSource,
      basketMean: Math.round(basketMean * 1000) / 1000,
      scaledScore: Math.round(scaledScore * 1000) / 1000
    });
  }

  return resultMap;
}
