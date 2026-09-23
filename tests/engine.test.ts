/**
 * VELQOARATH Comprehensive Intelligence Engine & Market Data Provider Test Suite
 * 
 * Validates all 21 mandatory test requirements:
 * 1. Provider response normalization
 * 2. Correct EUR/USD orientation
 * 3. Correct USD/JPY orientation
 * 4. Correct contribution when EUR/USD rises
 * 5. Correct contribution when EUR/USD falls
 * 6. Correct contribution when USD/JPY rises
 * 7. Correct contribution when USD/JPY falls
 * 8. Currency aggregation
 * 9. Missing-pair handling
 * 10. Partial data coverage
 * 11. +0.10 threshold (Strong)
 * 12. -0.10 threshold (Weak)
 * 13. Exactly-neutral boundary behavior
 * 14. Provider not configured
 * 15. Provider error
 * 16. Cache behavior
 * 17. API key never appears in client bundle / logs sanitized
 * 18. No hardcoded baseline market strengths used by production engine
 * 19. Existing pair base/quote intelligence still works
 * 20. Existing session intelligence still works
 * 21. Existing fundamentals tests still pass
 */

import { VelqoarathApiService } from '../src/api/service';
import { globalStore } from '../src/data/store';
import { MARKET_SESSIONS, getSessionInstantStatus, getActiveSessionOverview } from '../src/data/sessions';
import { getPairSessionRelevance, calculateWatchWindow } from '../src/engines/session/sessionEngine';
import { evaluateCurrencyState } from '../src/engines/currency/currencyEngine';
import { evaluatePairIntelligence } from '../src/engines/pair/pairEngine';
import { INITIAL_CURRENCIES } from '../src/data/currencies';
import { INITIAL_PAIRS } from '../src/data/pairs';
import { INITIAL_CENTRAL_BANKS } from '../src/data/centralBanks';
import { VERIFIED_OBSERVATIONS } from '../src/data/benchmarkDataset';
import { EconomicEvent } from '../src/types';
import { TwelveDataProvider } from '../src/marketData/providers/TwelveDataProvider';
import { MarketDataCache } from '../src/marketData/cache/MarketDataCache';
import {
  calculatePairContribution,
  calculateCurrencyMarketStrengths
} from '../src/marketData/engine/marketStrengthEngine';
import { NormalizedMarketQuote, CurrencyMarketStrength } from '../src/marketData/types';
import { DEFAULT_LIQUID_PAIRS } from '../src/marketData/config';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${testName}${detail ? ` (${detail})` : ''}`);
    process.exitCode = 1;
  } else {
    passedTests++;
    console.log(`✅ PASS: ${testName}`);
  }
}

console.log('================================================================');
console.log('RUNNING VELQOARATH MARKET DATA & INTELLIGENCE ENGINE TESTS');
console.log('================================================================\n');

// -----------------------------------------------------------------
// TEST 1: Provider Response Normalization
// -----------------------------------------------------------------
{
  const provider = new TwelveDataProvider({ apiKey: 'test_key_dummy' });
  const mockApiResponse = {
    'EUR/USD': {
      symbol: 'EUR/USD',
      name: 'Euro / US Dollar',
      currency_base: 'EUR',
      currency_quote: 'USD',
      datetime: '2026-09-23',
      timestamp: 1727078400,
      open: '1.0820',
      high: '1.0890',
      low: '1.0810',
      close: '1.0875',
      percent_change: '0.5083',
      change: '0.0055'
    }
  };

  const normalized = provider.normalizeResponse(mockApiResponse, ['EUR/USD']);
  assert(normalized.length === 1, 'Test 1: Provider normalized 1 quote');
  const q = normalized[0];
  assert(q.symbol === 'EUR/USD', 'Test 1: Symbol correctly standardized');
  assert(q.baseCurrency === 'EUR', 'Test 1: Base currency is EUR');
  assert(q.quoteCurrency === 'USD', 'Test 1: Quote currency is USD');
  assert(q.open === 1.0820, 'Test 1: Open parsed as float');
  assert(q.close === 1.0875, 'Test 1: Close parsed as float');
  assert(q.changePercent === 0.5083, 'Test 1: Percent change parsed accurately');
  assert(q.interval === '1day', 'Test 1: Interval is 1day');
  assert(q.source === 'Twelve Data', 'Test 1: Source provenance is Twelve Data');
}

// -----------------------------------------------------------------
// TEST 2: Correct EUR/USD Orientation
// -----------------------------------------------------------------
{
  const quote: NormalizedMarketQuote = {
    symbol: 'EUR/USD',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    price: 1.0850,
    open: 1.0800,
    high: 1.0860,
    low: 1.0790,
    close: 1.0850,
    change: 0.0050,
    changePercent: 0.46,
    timestamp: Date.now(),
    interval: '1day',
    source: 'Twelve Data',
    sourceStatus: 'CONNECTED',
    fetchedAt: new Date().toISOString()
  };

  const eurContrib = calculatePairContribution('EUR', quote);
  const usdContrib = calculatePairContribution('USD', quote);

  assert(eurContrib !== null && eurContrib.role === 'BASE', 'Test 2: EUR is recognized as BASE role');
  assert(eurContrib?.signedContribution === 0.46, 'Test 2: EUR gets positive contribution (+0.46%) from rising EUR/USD');
  assert(usdContrib !== null && usdContrib.role === 'QUOTE', 'Test 2: USD is recognized as QUOTE role');
  assert(usdContrib?.signedContribution === -0.46, 'Test 2: USD gets negative contribution (-0.46%) from rising EUR/USD');
}

// -----------------------------------------------------------------
// TEST 3: Correct USD/JPY Orientation
// -----------------------------------------------------------------
{
  const quote: NormalizedMarketQuote = {
    symbol: 'USD/JPY',
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    price: 152.40,
    open: 151.20,
    high: 152.60,
    low: 151.10,
    close: 152.40,
    change: 1.20,
    changePercent: 0.79,
    timestamp: Date.now(),
    interval: '1day',
    source: 'Twelve Data',
    sourceStatus: 'CONNECTED',
    fetchedAt: new Date().toISOString()
  };

  const usdContrib = calculatePairContribution('USD', quote);
  const jpyContrib = calculatePairContribution('JPY', quote);

  assert(usdContrib?.role === 'BASE' && usdContrib.signedContribution === 0.79, 'Test 3: USD receives +0.79% contribution from rising USD/JPY');
  assert(jpyContrib?.role === 'QUOTE' && jpyContrib.signedContribution === -0.79, 'Test 3: JPY receives -0.79% contribution from rising USD/JPY');
}

// -----------------------------------------------------------------
// TEST 4: Correct Contribution When EUR/USD Rises
// -----------------------------------------------------------------
{
  const risingQuote: NormalizedMarketQuote = {
    symbol: 'EUR/USD',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    price: 1.0900,
    open: 1.0800,
    high: 1.0910,
    low: 1.0790,
    close: 1.0900,
    change: 0.0100,
    changePercent: 0.9259,
    timestamp: Date.now(),
    interval: '1day',
    source: 'Twelve Data',
    sourceStatus: 'CONNECTED',
    fetchedAt: new Date().toISOString()
  };

  const eur = calculatePairContribution('EUR', risingQuote);
  const usd = calculatePairContribution('USD', risingQuote);
  assert((eur?.signedContribution ?? 0) > 0, 'Test 4: EUR contribution is strictly positive when EUR/USD rises');
  assert((usd?.signedContribution ?? 0) < 0, 'Test 4: USD contribution is strictly negative when EUR/USD rises');
}

// -----------------------------------------------------------------
// TEST 5: Correct Contribution When EUR/USD Falls
// -----------------------------------------------------------------
{
  const fallingQuote: NormalizedMarketQuote = {
    symbol: 'EUR/USD',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    price: 1.0700,
    open: 1.0800,
    high: 1.0810,
    low: 1.0690,
    close: 1.0700,
    change: -0.0100,
    changePercent: -0.9259,
    timestamp: Date.now(),
    interval: '1day',
    source: 'Twelve Data',
    sourceStatus: 'CONNECTED',
    fetchedAt: new Date().toISOString()
  };

  const eur = calculatePairContribution('EUR', fallingQuote);
  const usd = calculatePairContribution('USD', fallingQuote);
  assert((eur?.signedContribution ?? 0) < 0, 'Test 5: EUR contribution is strictly negative when EUR/USD falls');
  assert((usd?.signedContribution ?? 0) > 0, 'Test 5: USD contribution is strictly positive when EUR/USD falls');
}

// -----------------------------------------------------------------
// TEST 6: Correct Contribution When USD/JPY Rises
// -----------------------------------------------------------------
{
  const risingUsdJpy: NormalizedMarketQuote = {
    symbol: 'USD/JPY',
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    price: 155.00,
    open: 153.00,
    high: 155.20,
    low: 152.90,
    close: 155.00,
    change: 2.00,
    changePercent: 1.307,
    timestamp: Date.now(),
    interval: '1day',
    source: 'Twelve Data',
    sourceStatus: 'CONNECTED',
    fetchedAt: new Date().toISOString()
  };

  const usd = calculatePairContribution('USD', risingUsdJpy);
  const jpy = calculatePairContribution('JPY', risingUsdJpy);
  assert((usd?.signedContribution ?? 0) > 0, 'Test 6: USD contribution is strictly positive when USD/JPY rises');
  assert((jpy?.signedContribution ?? 0) < 0, 'Test 6: JPY contribution is strictly negative when USD/JPY rises');
}

// -----------------------------------------------------------------
// TEST 7: Correct Contribution When USD/JPY Falls
// -----------------------------------------------------------------
{
  const fallingUsdJpy: NormalizedMarketQuote = {
    symbol: 'USD/JPY',
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    price: 150.00,
    open: 152.00,
    high: 152.10,
    low: 149.80,
    close: 150.00,
    change: -2.00,
    changePercent: -1.315,
    timestamp: Date.now(),
    interval: '1day',
    source: 'Twelve Data',
    sourceStatus: 'CONNECTED',
    fetchedAt: new Date().toISOString()
  };

  const usd = calculatePairContribution('USD', fallingUsdJpy);
  const jpy = calculatePairContribution('JPY', fallingUsdJpy);
  assert((usd?.signedContribution ?? 0) < 0, 'Test 7: USD contribution is strictly negative when USD/JPY falls');
  assert((jpy?.signedContribution ?? 0) > 0, 'Test 7: JPY contribution is strictly positive when USD/JPY falls');
}

// -----------------------------------------------------------------
// TEST 8: Currency Aggregation (Zero-sum relative strength)
// -----------------------------------------------------------------
{
  const testQuotes: NormalizedMarketQuote[] = [
    { symbol: 'EUR/USD', baseCurrency: 'EUR', quoteCurrency: 'USD', price: 1.08, open: 1.07, high: 1.09, low: 1.07, close: 1.08, change: 0.01, changePercent: 0.93, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' },
    { symbol: 'GBP/USD', baseCurrency: 'GBP', quoteCurrency: 'USD', price: 1.30, open: 1.29, high: 1.31, low: 1.29, close: 1.30, change: 0.01, changePercent: 0.77, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' },
    { symbol: 'USD/JPY', baseCurrency: 'USD', quoteCurrency: 'JPY', price: 150.0, open: 151.0, high: 151.2, low: 149.8, close: 150.0, change: -1.0, changePercent: -0.66, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' }
  ];

  const results = calculateCurrencyMarketStrengths(testQuotes, { strongThreshold: 0.10, weakThreshold: -0.10 });
  const usd = results.get('USD')!;
  // USD has 3 observations:
  // EUR/USD (+0.93% -> USD is QUOTE -> -0.93%)
  // GBP/USD (+0.77% -> USD is QUOTE -> -0.77%)
  // USD/JPY (-0.66% -> USD is BASE -> -0.66%)
  // Sum = -2.36%, Avg = -0.787%
  assert(usd.contributors.length === 3, 'Test 8: USD has exactly 3 contributing pairs');
  assert(Math.abs((usd.avgReturn ?? 0) - (-0.787)) < 0.01, 'Test 8: USD avgReturn matches arithmetic mean of signed contributions');
}

// -----------------------------------------------------------------
// TEST 9: Missing-Pair Handling
// -----------------------------------------------------------------
{
  // Feed has only 2 pairs out of 15
  const partialQuotes: NormalizedMarketQuote[] = [
    { symbol: 'EUR/USD', baseCurrency: 'EUR', quoteCurrency: 'USD', price: 1.08, open: 1.08, high: 1.08, low: 1.08, close: 1.08, change: 0, changePercent: 0.40, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' },
    { symbol: 'USD/JPY', baseCurrency: 'USD', quoteCurrency: 'JPY', price: 150, open: 150, high: 150, low: 150, close: 150, change: 0, changePercent: -0.40, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' }
  ];

  const results = calculateCurrencyMarketStrengths(partialQuotes, { strongThreshold: 0.10, weakThreshold: -0.10 });
  const cad = results.get('CAD')!;
  assert(cad.marketStrength === null, 'Test 9: Currency with 0 pairs (CAD) returns marketStrength: null');
  assert(cad.classification === 'DATA_UNAVAILABLE', 'Test 9: Currency with 0 pairs classified as DATA_UNAVAILABLE');
  assert(cad.coverage.available === 0, 'Test 9: Coverage available is 0');
}

// -----------------------------------------------------------------
// TEST 10: Partial Data Coverage Reporting
// -----------------------------------------------------------------
{
  const quotes: NormalizedMarketQuote[] = [
    { symbol: 'EUR/USD', baseCurrency: 'EUR', quoteCurrency: 'USD', price: 1.08, open: 1.08, high: 1.08, low: 1.08, close: 1.08, change: 0, changePercent: 0.20, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' },
    { symbol: 'EUR/GBP', baseCurrency: 'EUR', quoteCurrency: 'GBP', price: 0.85, open: 0.85, high: 0.85, low: 0.85, close: 0.85, change: 0, changePercent: 0.15, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' }
  ];

  const results = calculateCurrencyMarketStrengths(quotes, { strongThreshold: 0.10, weakThreshold: -0.10 });
  const eur = results.get('EUR')!;
  assert(eur.coverage.available === 2, 'Test 10: EUR has 2 pairs available');
  assert(eur.coverage.percent > 0 && eur.coverage.percent < 100, 'Test 10: Partial coverage accurately calculated as percentage');
}

// -----------------------------------------------------------------
// TEST 11: +0.10 Strong Threshold
// -----------------------------------------------------------------
{
  // Construct a basket where Currency A outperforms significantly
  const strongQuotes: NormalizedMarketQuote[] = [
    { symbol: 'AUD/USD', baseCurrency: 'AUD', quoteCurrency: 'USD', price: 0.68, open: 0.67, high: 0.68, low: 0.67, close: 0.68, change: 0.01, changePercent: 1.20, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' },
    { symbol: 'AUD/JPY', baseCurrency: 'AUD', quoteCurrency: 'JPY', price: 102.0, open: 100.5, high: 102.1, low: 100.4, close: 102.0, change: 1.5, changePercent: 1.49, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' },
    { symbol: 'EUR/USD', baseCurrency: 'EUR', quoteCurrency: 'USD', price: 1.08, open: 1.08, high: 1.08, low: 1.08, close: 1.08, change: 0, changePercent: 0.00, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' }
  ];

  const results = calculateCurrencyMarketStrengths(strongQuotes, { strongThreshold: 0.10, weakThreshold: -0.10 });
  const aud = results.get('AUD')!;
  assert(aud.marketStrength !== null && aud.marketStrength >= 0.10, 'Test 11: AUD marketStrength satisfies >= +0.10');
  assert(aud.classification === 'STRONG', 'Test 11: AUD correctly classified as STRONG');
}

// -----------------------------------------------------------------
// TEST 12: -0.10 Weak Threshold
// -----------------------------------------------------------------
{
  const weakQuotes: NormalizedMarketQuote[] = [
    { symbol: 'NZD/USD', baseCurrency: 'NZD', quoteCurrency: 'USD', price: 0.60, open: 0.61, high: 0.61, low: 0.59, close: 0.60, change: -0.01, changePercent: -1.40, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' },
    { symbol: 'NZD/JPY', baseCurrency: 'NZD', quoteCurrency: 'JPY', price: 90.0, open: 91.5, high: 91.6, low: 89.9, close: 90.0, change: -1.5, changePercent: -1.60, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' },
    { symbol: 'EUR/USD', baseCurrency: 'EUR', quoteCurrency: 'USD', price: 1.08, open: 1.08, high: 1.08, low: 1.08, close: 1.08, change: 0, changePercent: 0.00, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' }
  ];

  const results = calculateCurrencyMarketStrengths(weakQuotes, { strongThreshold: 0.10, weakThreshold: -0.10 });
  const nzd = results.get('NZD')!;
  assert(nzd.marketStrength !== null && nzd.marketStrength <= -0.10, 'Test 12: NZD marketStrength satisfies <= -0.10');
  assert(nzd.classification === 'WEAK', 'Test 12: NZD correctly classified as WEAK');
}

// -----------------------------------------------------------------
// TEST 13: Exactly-Neutral Boundary Behavior
// -----------------------------------------------------------------
{
  const flatQuotes: NormalizedMarketQuote[] = [
    { symbol: 'EUR/USD', baseCurrency: 'EUR', quoteCurrency: 'USD', price: 1.08, open: 1.08, high: 1.08, low: 1.08, close: 1.08, change: 0, changePercent: 0.00, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' },
    { symbol: 'USD/JPY', baseCurrency: 'USD', quoteCurrency: 'JPY', price: 150, open: 150, high: 150, low: 150, close: 150, change: 0, changePercent: 0.00, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' }
  ];

  const results = calculateCurrencyMarketStrengths(flatQuotes, { strongThreshold: 0.10, weakThreshold: -0.10 });
  const eur = results.get('EUR')!;
  assert(eur.marketStrength === 0.00, 'Test 13: Flat returns produce score of exactly 0.00');
  assert(eur.classification === 'NEUTRAL', 'Test 13: 0.00 is classified as NEUTRAL');
}

// -----------------------------------------------------------------
// TEST 14: Provider Not Configured
// -----------------------------------------------------------------
{
  // Provider without API key
  const unconfiguredProvider = new TwelveDataProvider({ apiKey: '' });
  const status = unconfiguredProvider.getStatus();
  assert(status.health === 'NOT_CONFIGURED', 'Test 14: Provider status is NOT_CONFIGURED when key is empty');
  assert(status.isConfigured === false, 'Test 14: isConfigured is false');

  const emptyQuotes = await unconfiguredProvider.fetchDailyQuotes();
  assert(emptyQuotes.length === 0, 'Test 14: fetchDailyQuotes returns empty array without throwing');
}

// -----------------------------------------------------------------
// TEST 15: Provider Error Resilience
// -----------------------------------------------------------------
{
  const failingFetch = async () => {
    throw new Error('Network timeout connecting to Twelve Data endpoint');
  };

  const failingProvider = new TwelveDataProvider({
    apiKey: 'sample_secret_key_12345',
    fetchFn: failingFetch as unknown as typeof fetch
  });

  const quotes = await failingProvider.fetchDailyQuotes(['EUR/USD']);
  const status = failingProvider.getStatus();
  assert(status.health === 'ERROR', 'Test 15: Provider health becomes ERROR on fetch exception');
  assert(quotes.length === 0, 'Test 15: No fabricated quotes returned on error');
}

// -----------------------------------------------------------------
// TEST 16: Cache Behavior
// -----------------------------------------------------------------
{
  const cache = new MarketDataCache(5000); // 5-second TTL
  const testData: NormalizedMarketQuote[] = [
    { symbol: 'EUR/USD', baseCurrency: 'EUR', quoteCurrency: 'USD', price: 1.08, open: 1.08, high: 1.08, low: 1.08, close: 1.08, change: 0, changePercent: 0.20, timestamp: Date.now(), interval: '1day', source: 'Twelve Data', sourceStatus: 'CONNECTED', fetchedAt: '' }
  ];

  assert(cache.getQuotes() === null, 'Test 16: Empty cache returns null');
  cache.setQuotes(testData);
  assert(cache.getQuotes() !== null, 'Test 16: Populated cache returns cached quotes');
  assert(cache.getQuotes()![0].symbol === 'EUR/USD', 'Test 16: Cached item matches');
  assert(!cache.isExpired(), 'Test 16: Cache is not expired immediately after set');

  cache.clear();
  assert(cache.getQuotes() === null, 'Test 16: Cache returns null after clear');
}

// -----------------------------------------------------------------
// TEST 17: API Key Never Appears in Client / Logs Sanitized
// -----------------------------------------------------------------
{
  const secretKey = 'my_super_secret_twelve_data_token_999';
  const failingWithSecretInUrl = async () => {
    throw new Error(`Connection failed to https://api.twelvedata.com/quote?apikey=${secretKey}`);
  };

  const provider = new TwelveDataProvider({
    apiKey: secretKey,
    fetchFn: failingWithSecretInUrl as unknown as typeof fetch
  });

  await provider.fetchDailyQuotes(['EUR/USD']);
  const status = provider.getStatus();
  assert(!status.message.includes(secretKey), 'Test 17: Sanitized error message strictly masks secret key');
  assert(status.message.includes('[REDACTED]'), 'Test 17: Secret replaced with [REDACTED]');
}

// -----------------------------------------------------------------
// TEST 18: No Hardcoded Baseline Market Strengths Used in Production Engine
// -----------------------------------------------------------------
{
  // When no market strength is supplied to evaluateCurrencyState, it MUST return null / DATA_UNAVAILABLE
  const usd = INITIAL_CURRENCIES.find(c => c.code === 'USD')!;
  const fed = INITIAL_CENTRAL_BANKS.find(c => c.associatedCurrency === 'USD')!;
  const thresholds = { strongThreshold: 0.10, weakThreshold: -0.10 };

  const unaugmentedState = evaluateCurrencyState(usd, VERIFIED_OBSERVATIONS, fed, thresholds, true, null);
  assert(unaugmentedState.marketStrength === null, 'Test 18: Market strength is null when no real market feed result is provided');
  assert(unaugmentedState.marketState === 'DATA_UNAVAILABLE', 'Test 18: Market state is DATA_UNAVAILABLE without hardcoded -0.04');
  assert(unaugmentedState.relativeStrengthBreakdown.explanation.includes('MARKET DATA UNAVAILABLE'), 'Test 18: Explanation honestly discloses unavailable data feed');
}

// -----------------------------------------------------------------
// TEST 19: Existing Pair Base/Quote Intelligence Still Works
// -----------------------------------------------------------------
{
  const pairUsdJpy = INITIAL_PAIRS.find(p => p.symbol === 'USD/JPY')!;
  const pairEurUsd = INITIAL_PAIRS.find(p => p.symbol === 'EUR/USD')!;

  const usd = INITIAL_CURRENCIES.find(c => c.code === 'USD')!;
  const jpy = INITIAL_CURRENCIES.find(c => c.code === 'JPY')!;
  const eur = INITIAL_CURRENCIES.find(c => c.code === 'EUR')!;
  const fed = INITIAL_CENTRAL_BANKS.find(c => c.associatedCurrency === 'USD')!;
  const boj = INITIAL_CENTRAL_BANKS.find(c => c.associatedCurrency === 'JPY')!;
  const ecb = INITIAL_CENTRAL_BANKS.find(c => c.associatedCurrency === 'EUR')!;
  const thresholds = { strongThreshold: 0.10, weakThreshold: -0.10 };

  // Feed with strong JPY and soft USD
  const jpyStrengthResult: CurrencyMarketStrength = {
    currency: 'JPY',
    marketStrength: 0.18,
    classification: 'STRONG',
    rawRelativeReturn: 0.72,
    avgReturn: 0.72,
    momentum: 0.07,
    coverage: { available: 7, required: 7, percent: 100 },
    contributors: [{ pairSymbol: 'USD/JPY', pairReturnPercent: -0.72, role: 'QUOTE', signedContribution: 0.72, timestamp: Date.now() }],
    explanation: 'STRONG relative performance across cross basket.',
    calculatedAt: new Date().toISOString(),
    providerStatus: 'CONNECTED',
    source: 'Twelve Data'
  };

  const usdStrengthResult: CurrencyMarketStrength = {
    currency: 'USD',
    marketStrength: -0.04,
    classification: 'NEUTRAL',
    rawRelativeReturn: -0.16,
    avgReturn: -0.16,
    momentum: -0.02,
    coverage: { available: 7, required: 7, percent: 100 },
    contributors: [{ pairSymbol: 'USD/JPY', pairReturnPercent: -0.72, role: 'BASE', signedContribution: -0.72, timestamp: Date.now() }],
    explanation: 'Subdued performance against Asian crosses.',
    calculatedAt: new Date().toISOString(),
    providerStatus: 'CONNECTED',
    source: 'Twelve Data'
  };

  const usdState = evaluateCurrencyState(usd, VERIFIED_OBSERVATIONS, fed, thresholds, true, usdStrengthResult);
  const jpyState = evaluateCurrencyState(jpy, VERIFIED_OBSERVATIONS, boj, thresholds, true, jpyStrengthResult);

  const usdjpyIntel = evaluatePairIntelligence(pairUsdJpy, usdState, jpyState, [], new Date(), true);
  // Base (USD: -0.04) minus Quote (JPY: +0.18) = -0.22 -> negative delta -> BEARISH_BASE
  assert(usdjpyIntel.relativeStrengthDelta === -0.22, 'Test 19: USD/JPY delta is -0.22');
  assert(usdjpyIntel.orientationDirection === 'BEARISH_BASE', 'Test 19: USD/JPY correctly evaluated as BEARISH_BASE');
}

// -----------------------------------------------------------------
// TEST 20: Existing Session Intelligence Still Works
// -----------------------------------------------------------------
{
  const london = MARKET_SESSIONS.find(s => s.id === 'sess-london')!;
  const newYork = MARKET_SESSIONS.find(s => s.id === 'sess-newyork')!;

  const winterDate = new Date('2026-01-15T14:00:00Z');
  const londonWinter = getSessionInstantStatus(london, winterDate);
  const nyWinter = getSessionInstantStatus(newYork, winterDate);
  assert(londonWinter.utcOffsetHours === 0, 'Test 20: London UTC offset is 0 in winter (GMT)');
  assert(nyWinter.utcOffsetHours === -5, 'Test 20: New York UTC offset is -5 in winter (EST)');

  const overlapTime = new Date('2026-07-15T14:30:00Z');
  const overview = getActiveSessionOverview(overlapTime);
  assert(overview.activeOverlaps.some(o => o.includes('London / New York')), 'Test 20: London / New York overlap detected at 14:30 UTC');

  const usdjpyRel = getPairSessionRelevance('USD/JPY');
  assert(usdjpyRel.primarySession.includes('Tokyo'), 'Test 20: USD/JPY maps to Tokyo');
}

// -----------------------------------------------------------------
// TEST 21: Existing Fundamentals & Data Toggle Tests Still Pass
// -----------------------------------------------------------------
{
  const pair = INITIAL_PAIRS.find(p => p.symbol === 'EUR/USD')!;
  const simulatedTime = new Date('2026-09-23T16:00:00Z');

  const testEvent: EconomicEvent = {
    id: 'evt-test-cpi',
    name: 'US Consumer Price Index (CPI)',
    currency: 'USD',
    importance: 'HIGH',
    scheduledTime: '2026-09-23T18:00:00Z',
    previous: 3.0,
    forecast: 2.9,
    actual: null,
    unit: '%',
    source: 'BLS',
    status: 'UPCOMING'
  };

  const watchWindow = calculateWatchWindow(pair, [testEvent], simulatedTime, true);
  assert(watchWindow.watchState === 'EVENT-SENSITIVE', 'Test 21: Upcoming high-impact event triggers EVENT-SENSITIVE');

  // Toggle off data feed test
  globalStore.toggleDataFeedConnection(false);
  const dash = VelqoarathApiService.getDashboard();
  assert(dash.dataStatus === 'NOT_CONNECTED', 'Test 21: Dashboard reflects NOT_CONNECTED when disconnected');
  globalStore.toggleDataFeedConnection(true);
}

console.log(`\n================================================================`);
console.log(`ALL 21 TESTS COMPLETED: ${passedTests}/${totalTests} PASSED`);
console.log(`================================================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
