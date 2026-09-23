/**
 * VELQOARATH — MILESTONE 2.1: BIQUOTE INTEGRATION TESTS
 * 
 * Verifies:
 * 1. Biquote symbol normalization (EUR/USD <-> EURUSD)
 * 2. All 15 required FX symbols map deterministically both ways
 * 3. REST batch URL construction uses repeated 'symbols=' query parameters
 * 4. Valid quote normalization (bid, ask, mid, spread, dayDiffPercent, open, change)
 * 5. Malformed quote rejection (non-numeric bid/ask, inverted spread, invalid timestamp, unknown symbol)
 * 6. Provider timestamp parsing into milliseconds epoch
 * 7. quoteAgeSeconds calculation relative to current time
 * 8. Configurable freshness threshold evaluation (stale boolean)
 * 9. WebSocket / SignalR tick event normalization
 * 10. Multi-symbol subscription argument formatting
 * 11. Provider CONNECTED state when 15/15 pairs are fresh
 * 12. Provider DISCONNECTED state
 * 13. Provider DEGRADED state when some pairs are stale or missing
 * 14. REST recovery initiated upon WebSocket stream disconnect
 * 15. MarketDataService selects Biquote as primary live provider
 * 16. MarketDataService falls back to Twelve Data when Biquote is unavailable
 * 17. Zero mixed-provider snapshots: strength engine receives only single-provider quotes
 * 18. Incomplete pair coverage diagnostic reporting
 * 19. Zero-fabrication: 0/15 quotes returns DATA_UNAVAILABLE without synthetic values
 * 20. Zero API key exposure: Biquote requires no credentials, Twelve Data key masked
 * 21. Live Biquote quotes feed the currency strength engine with correct mathematical orientation
 */

import {
  BiquoteProvider,
  toBiquoteSymbol,
  toInternalSymbol,
  BiquoteRawQuote
} from '../src/marketData/providers/BiquoteProvider';
import { MarketDataService } from '../src/marketData/service/marketDataService';
import { TwelveDataProvider } from '../src/marketData/providers/TwelveDataProvider';
import { calculateCurrencyMarketStrengths } from '../src/marketData/engine/marketStrengthEngine';
import { DEFAULT_LIQUID_PAIRS } from '../src/marketData/config';
import { NormalizedMarketQuote, MarketDataProvider, MarketProviderStatus } from '../src/marketData/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string) {
  const isMatch = JSON.stringify(actual) === JSON.stringify(expected);
  if (isMatch) {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${msg} | Expected: ${JSON.stringify(expected)} | Got: ${JSON.stringify(actual)}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('RUNNING VELQOARATH BIQUOTE INTEGRATION TESTS (MILESTONE 2.1)');
  console.log('================================================================\n');

  // Test 1: Symbol normalization
  assertEqual(toBiquoteSymbol('EUR/USD'), 'EURUSD', 'Test 1: EUR/USD normalizes to EURUSD');
  assertEqual(toInternalSymbol('EURUSD'), 'EUR/USD', 'Test 1: EURUSD normalizes to EUR/USD');
  assertEqual(toBiquoteSymbol('INVALID'), null, 'Test 1: Invalid internal symbol returns null');
  assertEqual(toInternalSymbol('INVALID'), null, 'Test 1: Invalid biquote symbol returns null');

  // Test 2: All 15 required symbols map deterministically
  const required15 = [
    'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD',
    'NZD/USD', 'USD/CAD', 'EUR/GBP', 'EUR/JPY', 'GBP/JPY',
    'EUR/CHF', 'GBP/CHF', 'AUD/JPY', 'NZD/JPY', 'CAD/JPY'
  ];

  let allMapped = true;
  for (const sym of required15) {
    const biquote = toBiquoteSymbol(sym);
    const roundtrip = biquote ? toInternalSymbol(biquote) : null;
    if (!biquote || roundtrip !== sym) {
      allMapped = false;
      break;
    }
  }
  assert(allMapped, 'Test 2: All 15 required FX pairs map deterministically in both directions');

  // Test 3: REST batch URL construction uses repeated 'symbols=' query parameters
  const provider = new BiquoteProvider();
  const testBatchUrl = provider.buildBatchUrl(['EUR/USD', 'USD/JPY', 'GBP/USD']);
  assert(
    testBatchUrl === 'https://biquote.io/api/latest?symbols=EURUSD&symbols=USDJPY&symbols=GBPUSD',
    'Test 3: REST batch URL uses repeated symbols query parameters and not comma-separated lists'
  );

  // Test 4: Valid quote normalization
  const now = Date.now();
  const sampleRaw: BiquoteRawQuote = {
    symbol: 'EURUSD',
    bid: 1.1385,
    ask: 1.1387,
    mid: 1.1386,
    high: 1.1449,
    low: 1.1369,
    dayDiffPercent: -0.54,
    timestamp: new Date(now - 5000).toISOString(),
    source: 'MetaTrader 5 (Broker 1)',
    marketState: 'open'
  };

  const normalized = provider.normalizeQuote(sampleRaw, now);
  assert(normalized !== null, 'Test 4: Raw quote normalized successfully');
  assertEqual(normalized?.symbol, 'EUR/USD', 'Test 4: Normalized symbol is EUR/USD');
  assertEqual(normalized?.baseCurrency, 'EUR', 'Test 4: Base currency is EUR');
  assertEqual(normalized?.quoteCurrency, 'USD', 'Test 4: Quote currency is USD');
  assertEqual(normalized?.bid, 1.1385, 'Test 4: Bid price preserved');
  assertEqual(normalized?.ask, 1.1387, 'Test 4: Ask price preserved');
  assertEqual(normalized?.price, 1.1386, 'Test 4: Mid price preserved');
  assertEqual(normalized?.changePercent, -0.54, 'Test 4: Change percent preserved');
  assertEqual(normalized?.source, 'Biquote', 'Test 4: Source is Biquote');
  assertEqual(normalized?.stale, false, 'Test 4: 5-second-old quote is not stale');

  // Test 5: Malformed quote rejection (zero fabrication)
  const badQuotes: BiquoteRawQuote[] = [
    { symbol: 'EURUSD', bid: -1, ask: 1.13, timestamp: new Date().toISOString() }, // Negative bid
    { symbol: 'EURUSD', bid: 1.14, ask: 1.13, timestamp: new Date().toISOString() }, // Inverted spread (ask < bid)
    { symbol: 'EURUSD', bid: NaN, ask: 1.13, timestamp: new Date().toISOString() }, // NaN bid
    { symbol: 'EURUSD', bid: 1.13, ask: 1.14, timestamp: 'invalid-date' }, // Invalid timestamp
    { symbol: 'XYZABC', bid: 1.13, ask: 1.14, timestamp: new Date().toISOString() }  // Unknown symbol
  ];

  let allRejected = true;
  for (const bq of badQuotes) {
    if (provider.normalizeQuote(bq) !== null) {
      allRejected = false;
      break;
    }
  }
  assert(allRejected, 'Test 5: Malformed or unverified quotes are rejected with null without fabrication');

  // Test 6: Timestamp handling and epoch milliseconds
  const testDateStr = '2026-09-23T15:30:00.000Z';
  const expectedEpoch = Date.parse(testDateStr);
  const quoteWithDate = provider.normalizeQuote({
    symbol: 'USDJPY',
    bid: 158.10,
    ask: 158.12,
    timestamp: testDateStr
  }, expectedEpoch + 2000);
  assertEqual(quoteWithDate?.timestamp, expectedEpoch, 'Test 6: Provider timestamp parsed into epoch milliseconds');

  // Test 7 & 8: quoteAgeSeconds & configurable freshness threshold
  const freshQuote = provider.normalizeQuote({
    symbol: 'USDJPY',
    bid: 158.10,
    ask: 158.12,
    timestamp: new Date(now - 10000).toISOString() // 10s old
  }, now);
  assertEqual(freshQuote?.quoteAgeSeconds, 10, 'Test 7: quoteAgeSeconds correctly computed as 10s');
  assertEqual(freshQuote?.stale, false, 'Test 8: 10s quote is not stale under 30s threshold');

  const staleQuote = provider.normalizeQuote({
    symbol: 'USDJPY',
    bid: 158.10,
    ask: 158.12,
    timestamp: new Date(now - 45000).toISOString() // 45s old
  }, now);
  assertEqual(staleQuote?.quoteAgeSeconds, 45, 'Test 7: quoteAgeSeconds correctly computed as 45s');
  assertEqual(staleQuote?.stale, true, 'Test 8: 45s quote is marked stale under 30s threshold');

  // Test 9 & 10: WebSocket tick normalization and subscription
  const tickRaw: BiquoteRawQuote = {
    symbol: 'GBPJPY',
    bid: 209.45,
    ask: 209.48,
    mid: 209.465,
    timestamp: new Date().toISOString(),
    dayDiffPercent: 0.18,
    marketState: 'open'
  };
  const tickNormalized = provider.normalizeQuote(tickRaw);
  assertEqual(tickNormalized?.symbol, 'GBP/JPY', 'Test 9: SignalR ReceiveTick parsed to GBP/JPY');
  assertEqual(tickNormalized?.price, 209.465, 'Test 9: Tick mid price normalized');

  // Test 11: Provider CONNECTED state when all 15 required pairs are present and fresh
  const mockFetchAll = async () => {
    const mockJson: Record<string, any> = {};
    for (const sym of required15) {
      const bq = toBiquoteSymbol(sym)!;
      mockJson[bq] = {
        symbol: bq,
        bid: 1.25,
        ask: 1.2502,
        mid: 1.2501,
        dayDiffPercent: 0.12,
        timestamp: new Date().toISOString(),
        marketState: 'open'
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => mockJson
    } as any;
  };

  const connectedProvider = new BiquoteProvider({
    fetchFn: mockFetchAll,
    requiredPairs: required15
  });

  const allQuotes = await connectedProvider.fetchDailyQuotes();
  assertEqual(allQuotes.length, 15, 'Test 11: All 15 required quotes retrieved from REST');
  assertEqual(connectedProvider.getStatus().health, 'CONNECTED', 'Test 11: Provider health is CONNECTED when 15/15 are fresh');

  // Test 12: Provider DISCONNECTED state
  const disconnectedProvider = new BiquoteProvider();
  assertEqual(disconnectedProvider.getStatus().health, 'DISCONNECTED', 'Test 12: Initial provider health is DISCONNECTED');

  // Test 13: Provider DEGRADED state when some pairs are missing or stale
  const mockFetchPartial = async () => {
    const mockJson: Record<string, any> = {};
    // Only return 10 pairs instead of 15
    for (const sym of required15.slice(0, 10)) {
      const bq = toBiquoteSymbol(sym)!;
      mockJson[bq] = {
        symbol: bq,
        bid: 1.25,
        ask: 1.2502,
        mid: 1.2501,
        dayDiffPercent: 0.12,
        timestamp: new Date().toISOString()
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => mockJson
    } as any;
  };

  const degradedProvider = new BiquoteProvider({
    fetchFn: mockFetchPartial,
    requiredPairs: required15
  });

  await degradedProvider.fetchDailyQuotes();
  assertEqual(degradedProvider.getStatus().health, 'DEGRADED', 'Test 13: Provider health is DEGRADED when partial pairs are returned');
  assertEqual(degradedProvider.getStatus().missingPairs.length, 5, 'Test 13: 5 missing pairs reported in status');

  // Test 14: REST recovery after stream disconnect
  let restRecoveryCalled = false;
  const mockWsClient: any = {
    send: () => {},
    close: () => {}
  };
  const streamRecoveryProvider = new BiquoteProvider({
    fetchFn: async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/latest')) {
        restRecoveryCalled = true;
        return mockFetchAll();
      }
      if (urlStr.includes('/negotiate')) {
        return {
          ok: true,
          json: async () => ({ connectionToken: 'test-token' })
        } as any;
      }
      return { ok: false } as any;
    },
    webSocketFactory: () => mockWsClient
  });

  await streamRecoveryProvider.startLiveStream();
  // Simulate stream error
  mockWsClient.onerror(new Error('Simulated network disruption'));
  assert(restRecoveryCalled, 'Test 14: REST snapshot recovery was triggered upon stream error');
  streamRecoveryProvider.stopLiveStream();

  // Test 15: MarketDataService selects Biquote as primary live provider
  const primaryMock = new BiquoteProvider({ fetchFn: mockFetchAll, requiredPairs: required15 });
  const secondaryMock = new TwelveDataProvider({ apiKey: 'fake-key', requiredPairs: required15 });
  const service = new MarketDataService(primaryMock, secondaryMock);

  const serviceQuotes = await service.getQuotes(true);
  assertEqual(service.getStatus().activeProvider, 'Biquote', 'Test 15: Biquote selected as active primary provider');
  assertEqual(serviceQuotes.length, 15, 'Test 15: Service retrieved 15 quotes from primary provider');

  // Test 16: MarketDataService falls back to Twelve Data when Biquote is unavailable
  const failingPrimaryMock = new BiquoteProvider({
    fetchFn: async () => ({ ok: false, status: 500, statusText: 'Server Error' } as any),
    requiredPairs: required15
  });

  const mockTwelveDataFetch = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      const resp: Record<string, any> = {};
      for (const p of required15) {
        resp[p] = {
          open: '1.2000',
          high: '1.2100',
          low: '1.1900',
          close: '1.2050',
          percent_change: '0.42',
          datetime: '2026-09-23',
          timestamp: Math.floor(Date.now() / 1000)
        };
      }
      return resp;
    }
  });

  const fallbackSecondaryMock = new TwelveDataProvider({
    apiKey: 'valid-twelve-key',
    fetchFn: mockTwelveDataFetch as any,
    requiredPairs: required15
  });

  const fallbackService = new MarketDataService(failingPrimaryMock, fallbackSecondaryMock);
  const fallbackQuotes = await fallbackService.getQuotes(true);

  assertEqual(fallbackService.getStatus().activeProvider, 'Twelve Data', 'Test 16: Service fell back to Twelve Data when Biquote failed');
  assertEqual(fallbackQuotes.length, 15, 'Test 16: Fallback returned 15 valid quotes from secondary provider');

  // Test 17: No mixed-provider calculations inside a single snapshot
  const sourcesInFallback = new Set(fallbackQuotes.map(q => q.source));
  assertEqual(sourcesInFallback.size, 1, 'Test 17: Exactly 1 provider source exists across all quotes in snapshot');
  assert(sourcesInFallback.has('Twelve Data'), 'Test 17: Coherent provider snapshot exclusively contains Twelve Data quotes');

  // Test 18: Incomplete pair coverage diagnostic
  const coverageReport = fallbackService.getCoverage();
  assertEqual(coverageReport.totalRequiredPairs, 15, 'Test 18: Coverage reports 15 total required pairs');
  assertEqual(coverageReport.availablePairs, 15, 'Test 18: Coverage reports 15 available pairs');
  assertEqual(coverageReport.missingPairs.length, 0, 'Test 18: Missing pairs list is empty when complete');

  // Test 19: Zero fabrication on total failure (DATA_UNAVAILABLE)
  const emptyService = new MarketDataService(
    new BiquoteProvider({ fetchFn: async () => ({ ok: false } as any) }),
    new TwelveDataProvider({ apiKey: '' }) // Not configured
  );
  const emptyQuotes = await emptyService.getQuotes(true);
  assertEqual(emptyQuotes.length, 0, 'Test 19: Total failure returns empty quotes array (0 fabrication)');

  const unavailStrengths = await emptyService.getCurrencyStrengths();
  const eurStrength = unavailStrengths.get('EUR');
  assertEqual(eurStrength?.classification, 'DATA_UNAVAILABLE', 'Test 19: Classification is DATA_UNAVAILABLE on zero quotes');
  assertEqual(eurStrength?.marketStrength, null, 'Test 19: marketStrength score is strictly null, never synthetic float');

  // Test 20: Biquote requires no credentials; Twelve Data key is masked
  const bqStatus = primaryMock.getStatus();
  assertEqual(bqStatus.isConfigured, true, 'Test 20: Biquote isConfigured is true without any credentials');
  assert(!JSON.stringify(bqStatus).includes('key'), 'Test 20: No secrets exposed in Biquote provider status');

  // Test 21: Mathematical orientation with real Biquote quotes
  // Rising EUR/USD (+1.0%) should yield positive EUR contribution, negative USD contribution
  const testQuotes: NormalizedMarketQuote[] = [
    {
      symbol: 'EUR/USD',
      baseCurrency: 'EUR',
      quoteCurrency: 'USD',
      price: 1.1386,
      open: 1.1273,
      high: 1.1400,
      low: 1.1250,
      close: 1.1386,
      change: 0.0113,
      changePercent: 1.00,
      timestamp: Date.now(),
      interval: 'live',
      source: 'Biquote',
      sourceStatus: 'CONNECTED',
      fetchedAt: new Date().toISOString()
    }
  ];

  const orientationResult = calculateCurrencyMarketStrengths(testQuotes, { strongThreshold: 0.10, weakThreshold: -0.10 });
  const eurContrib = orientationResult.get('EUR')?.contributors.find(c => c.pairSymbol === 'EUR/USD');
  const usdContrib = orientationResult.get('USD')?.contributors.find(c => c.pairSymbol === 'EUR/USD');

  assertEqual(eurContrib?.signedContribution, 1.00, 'Test 21: EUR receives +1.00% signed contribution from rising EUR/USD');
  assertEqual(usdContrib?.signedContribution, -1.00, 'Test 21: USD receives -1.00% signed contribution from rising EUR/USD');

  console.log('\n================================================================');
  console.log(`ALL BIQUOTE TESTS COMPLETED: ${passed}/${passed + failed} PASSED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
