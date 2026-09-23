import {
  MarketDataProvider,
  MarketProviderStatus,
  NormalizedMarketQuote,
  CurrencyMarketStrength,
  MarketCoverageReport
} from '../types';
import { TwelveDataProvider } from '../providers/TwelveDataProvider';
import { MarketDataCache } from '../cache/MarketDataCache';
import { calculateCurrencyMarketStrengths } from '../engine/marketStrengthEngine';
import {
  DEFAULT_LIQUID_PAIRS,
  SUPPORTED_MAJOR_CURRENCIES,
  DEFAULT_CACHE_TTL_MS
} from '../config';
import { RelativeStrengthConfig } from '../../types';

export class MarketDataService {
  private static instance: MarketDataService | null = null;
  private provider: MarketDataProvider;
  private cache: MarketDataCache;
  private requiredPairs: readonly string[];
  private currencies: readonly string[];
  private latestStrengths: Map<string, CurrencyMarketStrength> = new Map();
  private inFlightPromise: Promise<NormalizedMarketQuote[]> | null = null;

  constructor(
    provider?: MarketDataProvider,
    cacheTtlMs: number = DEFAULT_CACHE_TTL_MS,
    requiredPairs: readonly string[] = DEFAULT_LIQUID_PAIRS,
    currencies: readonly string[] = SUPPORTED_MAJOR_CURRENCIES
  ) {
    this.provider = provider ?? new TwelveDataProvider({ requiredPairs });
    this.cache = new MarketDataCache(cacheTtlMs);
    this.requiredPairs = requiredPairs;
    this.currencies = currencies;
  }

  public static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  public setProvider(provider: MarketDataProvider): void {
    this.provider = provider;
    this.cache.clear();
    this.latestStrengths.clear();
  }

  public getProvider(): MarketDataProvider {
    return this.provider;
  }

  public getStatus(): MarketProviderStatus {
    const providerStatus = this.provider.getStatus();
    const cacheInfo = this.cache.getCacheInfo();

    return {
      ...providerStatus,
      cacheExpiresAt: cacheInfo.expiresAt
    };
  }

  public async getQuotes(forceRefresh = false): Promise<NormalizedMarketQuote[]> {
    if (!forceRefresh) {
      const cached = this.cache.getQuotes();
      if (cached && cached.length > 0) {
        return cached;
      }
    }

    // Deduplicate concurrent in-flight fetches
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.inFlightPromise = (async () => {
      try {
        const quotes = await this.provider.fetchDailyQuotes([...this.requiredPairs]);
        if (quotes.length > 0) {
          this.cache.setQuotes(quotes);
        }
        return quotes;
      } finally {
        this.inFlightPromise = null;
      }
    })();

    return this.inFlightPromise;
  }

  public async getCurrencyStrengths(
    thresholds: RelativeStrengthConfig = { strongThreshold: 0.10, weakThreshold: -0.10 },
    forceRefresh = false
  ): Promise<Map<string, CurrencyMarketStrength>> {
    const quotes = await this.getQuotes(forceRefresh);
    const providerStatus = this.provider.getStatus();

    const strengths = calculateCurrencyMarketStrengths(quotes, thresholds, {
      currencies: this.currencies,
      requiredPairs: this.requiredPairs,
      providerStatus: providerStatus.health,
      providerSource: providerStatus.providerName
    });

    this.latestStrengths = strengths;
    return strengths;
  }

  public getCachedCurrencyStrengths(
    thresholds: RelativeStrengthConfig = { strongThreshold: 0.10, weakThreshold: -0.10 }
  ): Map<string, CurrencyMarketStrength> {
    const cachedQuotes = this.cache.getQuotes();
    const providerStatus = this.provider.getStatus();

    if (!cachedQuotes || cachedQuotes.length === 0) {
      // Re-calculate or return explicit unavailable
      return calculateCurrencyMarketStrengths([], thresholds, {
        currencies: this.currencies,
        requiredPairs: this.requiredPairs,
        providerStatus: providerStatus.health,
        providerSource: providerStatus.providerName
      });
    }

    return calculateCurrencyMarketStrengths(cachedQuotes, thresholds, {
      currencies: this.currencies,
      requiredPairs: this.requiredPairs,
      providerStatus: providerStatus.health,
      providerSource: providerStatus.providerName
    });
  }

  public async getCurrencyStrength(
    code: string,
    thresholds: RelativeStrengthConfig = { strongThreshold: 0.10, weakThreshold: -0.10 }
  ): Promise<CurrencyMarketStrength | null> {
    const strengths = await this.getCurrencyStrengths(thresholds);
    return strengths.get(code.toUpperCase()) ?? null;
  }

  public getCoverage(): MarketCoverageReport {
    const status = this.provider.getStatus();
    const cachedQuotes = this.cache.getQuotesEvenIfExpired() ?? [];
    const availableQuotesMap = new Map(cachedQuotes.map(q => [q.symbol, q]));

    const missingPairs = this.requiredPairs.filter(p => !availableQuotesMap.has(p));

    const currencyCoverage: Record<string, { available: number; required: number; percent: number }> = {};
    for (const code of this.currencies) {
      const required = this.requiredPairs.filter(p => {
        const [b, q] = p.split('/');
        return b === code || q === code;
      });
      const available = required.filter(p => availableQuotesMap.has(p));
      const percent = required.length > 0
        ? Math.round((available.length / required.length) * 1000) / 10
        : 0;

      currencyCoverage[code] = {
        available: available.length,
        required: required.length,
        percent
      };
    }

    return {
      overallHealth: status.health,
      totalRequiredPairs: this.requiredPairs.length,
      availablePairs: this.requiredPairs.length - missingPairs.length,
      missingPairs,
      currencyCoverage,
      generatedAt: new Date().toISOString()
    };
  }

  public clearCache(): void {
    this.cache.clear();
    this.latestStrengths.clear();
  }
}

export const marketDataService = MarketDataService.getInstance();
