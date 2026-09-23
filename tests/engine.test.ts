/**
 * VELQOARATH Deterministic Test Suite
 * Validates critical logic requirements specified in Part 19:
 * - USD/JPY orientation (base-vs-quote mathematics)
 * - EUR/USD orientation
 * - +0.10 threshold (Strong)
 * - -0.10 threshold (Weak)
 * - Neutral range (-0.10 < score < +0.10)
 * - London/New York overlap
 * - Sydney/Tokyo overlap
 * - DST transition handling
 * - Event-sensitive watch state
 * - Unavailable-data states
 * - Malformed input resilience
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

console.log('==============================================');
console.log('RUNNING VELQOARATH INTELLIGENCE ENGINE TESTS');
console.log('==============================================\n');

// TEST 1: Configurable Relative Strength Thresholds (+0.10, -0.10, Neutral)
{
  const usd = INITIAL_CURRENCIES.find(c => c.code === 'USD')!;
  const fed = INITIAL_CENTRAL_BANKS.find(c => c.associatedCurrency === 'USD')!;
  const thresholds = { strongThreshold: 0.10, weakThreshold: -0.10 };

  // Test Strong classification
  const strongJpy = INITIAL_CURRENCIES.find(c => c.code === 'JPY')!;
  const boj = INITIAL_CENTRAL_BANKS.find(c => c.associatedCurrency === 'JPY')!;
  const jpyState = evaluateCurrencyState(strongJpy, VERIFIED_OBSERVATIONS, boj, thresholds, true);
  assert(jpyState.marketStrength !== null && jpyState.marketStrength >= 0.10, 'JPY score satisfies +0.10 threshold');
  assert(jpyState.marketState === 'STRONG', 'JPY classified as STRONG');

  // Test Weak classification
  const weakChf = INITIAL_CURRENCIES.find(c => c.code === 'CHF')!;
  const snb = INITIAL_CENTRAL_BANKS.find(c => c.associatedCurrency === 'CHF')!;
  const chfState = evaluateCurrencyState(weakChf, VERIFIED_OBSERVATIONS, snb, thresholds, true);
  assert(chfState.marketStrength !== null && chfState.marketStrength <= -0.10, 'CHF score satisfies -0.10 threshold');
  assert(chfState.marketState === 'WEAK', 'CHF classified as WEAK');

  // Test Neutral range
  const neutralGbp = INITIAL_CURRENCIES.find(c => c.code === 'GBP')!;
  const boe = INITIAL_CENTRAL_BANKS.find(c => c.associatedCurrency === 'GBP')!;
  const gbpState = evaluateCurrencyState(neutralGbp, VERIFIED_OBSERVATIONS, boe, thresholds, true);
  assert(
    gbpState.marketStrength !== null &&
    gbpState.marketStrength < thresholds.strongThreshold &&
    gbpState.marketStrength > thresholds.weakThreshold,
    'GBP score lies within neutral range (-0.10 to +0.10)'
  );
  assert(gbpState.marketState === 'NEUTRAL', 'GBP classified as NEUTRAL');
}

// TEST 2: Currency Orientation Mathematics (USD/JPY vs EUR/USD)
{
  const pairUsdJpy = INITIAL_PAIRS.find(p => p.symbol === 'USD/JPY')!;
  const pairEurUsd = INITIAL_PAIRS.find(p => p.symbol === 'EUR/USD')!;

  const usdState = VelqoarathApiService.getCurrencyState('USD')!;
  const jpyState = VelqoarathApiService.getCurrencyState('JPY')!;
  const eurState = VelqoarathApiService.getCurrencyState('EUR')!;

  const usdjpyIntel = evaluatePairIntelligence(pairUsdJpy, usdState, jpyState, [], new Date(), true);
  
  // If JPY is stronger than USD, USD/JPY MUST NOT be bullish!
  // Base (USD) strength minus Quote (JPY) strength:
  // usdState.marketStrength (-0.04) - jpyState.marketStrength (+0.18) = -0.22 (negative delta -> BEARISH_BASE)
  assert(
    (usdjpyIntel.relativeStrengthDelta ?? 0) < 0,
    'USD/JPY delta is negative when JPY is stronger than USD'
  );
  assert(
    usdjpyIntel.orientationDirection === 'BEARISH_BASE',
    'USD/JPY orientation correctly evaluated as BEARISH_BASE (JPY strength creates downward pressure on USD/JPY)'
  );

  const eurusdIntel = evaluatePairIntelligence(pairEurUsd, eurState, usdState, [], new Date(), true);
  // Base (EUR: -0.12) vs Quote (USD: -0.04) -> Delta is -0.08
  assert(
    (eurusdIntel.relativeStrengthDelta ?? 0) < 0,
    'EUR/USD delta correctly reflects EUR underperforming USD'
  );
}

// TEST 3: DST-Sensitive Session Calculations and IANA Timezones
{
  const london = MARKET_SESSIONS.find(s => s.id === 'sess-london')!;
  const newYork = MARKET_SESSIONS.find(s => s.id === 'sess-newyork')!;

  // Test winter date (January - Standard Time)
  const winterDate = new Date('2026-01-15T14:00:00Z');
  const londonWinter = getSessionInstantStatus(london, winterDate);
  const nyWinter = getSessionInstantStatus(newYork, winterDate);
  assert(londonWinter.utcOffsetHours === 0, 'London UTC offset is 0 in winter (GMT)');
  assert(nyWinter.utcOffsetHours === -5, 'New York UTC offset is -5 in winter (EST)');

  // Test summer date (July - Daylight Saving Time)
  const summerDate = new Date('2026-07-15T14:00:00Z');
  const londonSummer = getSessionInstantStatus(london, summerDate);
  const nySummer = getSessionInstantStatus(newYork, summerDate);
  assert(londonSummer.utcOffsetHours === 1, 'London UTC offset is +1 in summer (BST)');
  assert(nySummer.utcOffsetHours === -4, 'New York UTC offset is -4 in summer (EDT)');
  assert(londonSummer.isDstActive === true, 'DST recognized as active for London in July');
}

// TEST 4: Session Overlaps (London / New York and Sydney / Tokyo)
{
  // 14:30 UTC on a weekday is a classic London / New York overlap window
  const overlapTime = new Date('2026-07-15T14:30:00Z'); // Wednesday
  const overview = getActiveSessionOverview(overlapTime);
  assert(
    overview.activeOverlaps.some(o => o.includes('London / New York')),
    'London / New York overlap detected at 14:30 UTC in July'
  );

  // 02:00 UTC on a weekday is a classic Sydney / Tokyo overlap window
  const asianOverlapTime = new Date('2026-07-15T02:00:00Z'); // Wednesday
  const asianOverview = getActiveSessionOverview(asianOverlapTime);
  assert(
    asianOverview.activeOverlaps.some(o => o.includes('Sydney / Tokyo')),
    'Sydney / Tokyo overlap detected at 02:00 UTC'
  );
}

// TEST 5: Pair/Session Relevance
{
  const usdjpyRel = getPairSessionRelevance('USD/JPY');
  assert(usdjpyRel.primarySession.includes('Tokyo'), 'USD/JPY primary session maps to Tokyo');

  const eurusdRel = getPairSessionRelevance('EUR/USD');
  assert(eurusdRel.primarySession.includes('London') && eurusdRel.primarySession.includes('New York'), 'EUR/USD primary session maps to London / New York');

  const audjpyRel = getPairSessionRelevance('AUD/JPY');
  assert(audjpyRel.primarySession.includes('Sydney') && audjpyRel.primarySession.includes('Tokyo'), 'AUD/JPY primary session maps to Sydney / Tokyo');
}

// TEST 6: Event-Aware Session Intelligence & Watch States
{
  const pair = INITIAL_PAIRS.find(p => p.symbol === 'EUR/USD')!;
  const simulatedTime = new Date('2026-09-23T16:00:00Z');

  // Event in 2 hours -> should trigger EVENT-SENSITIVE
  const testEvent: EconomicEvent = {
    id: 'evt-test-cpi',
    name: 'US Consumer Price Index (CPI)',
    currency: 'USD',
    importance: 'HIGH',
    scheduledTime: '2026-09-23T18:00:00Z', // 2 hours away
    previous: 3.0,
    forecast: 2.9,
    actual: null,
    unit: '%',
    source: 'BLS',
    status: 'UPCOMING'
  };

  const watchWindow = calculateWatchWindow(pair, [testEvent], simulatedTime, true);
  assert(watchWindow.watchState === 'EVENT-SENSITIVE', 'Upcoming high-impact event (2 hours) sets watchState to EVENT-SENSITIVE');
  assert(watchWindow.riskState === 'HIGH', 'Upcoming high-impact event sets riskState to HIGH');
}

// TEST 7: Data Source Disconnected State (CORE PRINCIPLE: DO NOT INVENT DATA)
{
  // Toggle off data feed
  globalStore.toggleDataFeedConnection(false);

  const dash = VelqoarathApiService.getDashboard();
  assert(dash.dataStatus === 'NOT_CONNECTED', 'Dashboard dataStatus reflects NOT_CONNECTED when data feed is off');

  const usdState = VelqoarathApiService.getCurrencyState('USD')!;
  assert(usdState.marketState === 'DATA_UNAVAILABLE', 'Market state returns DATA_UNAVAILABLE when disconnected');
  assert(usdState.fundamentalState.overallCondition === 'DATA_UNAVAILABLE', 'Fundamental condition returns DATA_UNAVAILABLE when disconnected');
  assert(usdState.fundamentalState.monetaryPolicy.currentCondition === 'DATA SOURCE NOT CONNECTED', 'Fundamental pillars explicitly show DATA SOURCE NOT CONNECTED without fabricating numbers');

  const pairIntel = VelqoarathApiService.getPairIntelligence('EUR/USD')!;
  assert(pairIntel.orientationDirection === 'DATA_UNAVAILABLE', 'Pair intelligence returns DATA_UNAVAILABLE without inventing data');
  assert(pairIntel.convergenceDivergence === 'DATA_UNAVAILABLE', 'Convergence returns DATA_UNAVAILABLE without inventing data');

  // Re-enable for subsequent tests
  globalStore.toggleDataFeedConnection(true);
}

// TEST 8: Malformed Inputs Resilience
{
  const invalidCurrency = VelqoarathApiService.getCurrencyState('XYZ_FAKE');
  assert(invalidCurrency === null, 'Malformed/unknown currency returns null safely');

  const invalidPair = VelqoarathApiService.getPairIntelligence('FAKE/PAIR');
  assert(invalidPair === null, 'Malformed/unknown pair returns null safely');
}

console.log(`\n==============================================`);
console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
console.log(`==============================================\n`);

if (passedTests !== totalTests) {
  process.exit(1);
}
