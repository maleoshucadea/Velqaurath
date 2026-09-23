import {
  MarketDataProvider,
  MarketProviderStatus,
  NormalizedMarketQuote,
  CurrencyMarketStrength,
  MarketCoverageReport
} from '../types';
import { BiquoteProvider } from '../providers/BiquoteProvider';
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
  private primaryProvider: MarketDataProvider;
  private secondaryProvider: MarketDataProvider | null = null;
  private activeProvider: MarketDataProvider;
  private cache: MarketDataCache;
  private requiredPairs: readonly string[];
  private currencies: readonly string[];
  private latestStrengths: Map<string, CurrencyMarketStrength> = new Map();
  private inFlightPromise: Promise<NormalizedMarketQuote[]> | null = null;

  constructor(
    primaryProvider?: MarketDataProvider,
    secondaryProvider?: MarketDataProvider,
    cacheTtlMs: number = DEFAULT_CACHE_TTL_MS,
    requiredPairs: readonly string[] = DEFAULT_LIQUID_PAIRS,
    currencies: readonly string[] = SUPPORTED_MAJOR_CURRENCIES
  ) {
    this.primaryProvider = primaryProvider ?? new BiquoteProvider({
      requiredPairs,
      onTick: (quote) => {
        this.cache.upsertQuote(quote);
      }
    });

    this.secondaryProvider = secondaryProvider ?? new TwelveDataProvider({ requiredPairs });
    this.activeProvider = this.primaryProvider;
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
    this.primaryProvider = provider;
    this.activeProvider = provider;
    this.cache.clear();
    this.latestStrengths.clear();
  }

  public setSecondaryProvider(provider: MarketDataProvider | null): void {
    this.secondaryProvider = provider;
  }

  public getProvider(): MarketDataProvider {
    return this.activeProvider;
  }

  public getPrimaryProvider(): MarketDataProvider {
    return this.primaryProvider;
  }

  public getSecondaryProvider(): MarketDataProvider | null {
    return this.secondaryProvider;
  }

  public async startLiveStream(): Promise<void> {
    if (this.primaryProvider.startLiveStream) {
      await this.primaryProvider.startLiveStream();
    }
  }

  public stopLiveStream(): void {
    if (this.primaryProvider.stopLiveStream) {
      this.primaryProvider.stopLiveStream();
    }
  }

  public getStatus(): MarketProviderStatus {
    const activeStatus = this.activeProvider.getStatus();
    const cacheInfo = this.cache.getCacheInfo();
    const secondaryStatus = this.secondaryProvider?.getStatus();

    return {
      ...activeStatus,
      activeProvider: this.activeProvider.name,
      source: this.activeProvider.name,
      cacheExpiresAt: cacheInfo.expiresAt,
      fallbackAvailable: secondaryStatus?.isConfigured ?? false,
      fallbackStatus: secondaryStatus?.health
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
        // Step 1: Attempt Primary Provider (Biquote)
        let primaryQuotes: NormalizedMarketQuote[] = [];
        try {
          primaryQuotes = await this.primaryProvider.fetchDailyQuotes([...this.requiredPairs]);
        } catch {
          primaryQuotes = [];
        }

        const primaryStatus = this.primaryProvider.getStatus();
        const freshPrimaryQuotes = primaryQuotes.filter(q => !q.stale && q.changePercent !== null);

        // If primary provider returned valid quotes with active/degraded state
        if (
          primaryQuotes.length > 0 &&
          (primaryStatus.health === 'CONNECTED' || (primaryStatus.health === 'DEGRADED' && freshPrimaryQuotes.length > 0))
        ) {
          this.activeProvider = this.primaryProvider;
          this.cache.setQuotes(primaryQuotes);
          return primaryQuotes;
        }

        // Step 2: Fallback to Secondary Provider (Twelve Data) if primary failed or returned 0 quotes
        if (this.secondaryProvider) {
          try {
            const secondaryQuotes = await this.secondaryProvider.fetchDailyQuotes([...this.requiredPairs]);
            const secondaryStatus = this.secondaryProvider.getStatus();

            if (secondaryQuotes.length > 0 && secondaryStatus.health !== 'ERROR') {
              this.activeProvider = this.secondaryProvider;
              this.cache.setQuotes(secondaryQuotes);
              return secondaryQuotes;
            }
          } catch {
            // Secondary fallback failed
          }
        }

        // Step 3: Neither succeeded with fresh data
        this.activeProvider = this.primaryProvider;
        if (primaryQuotes.length > 0) {
          this.cache.setQuotes(primaryQuotes);
          return primaryQuotes;
        }

        return [];
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
    const providerStatus = this.getStatus();

    const strengths = calculateCurrencyMarketStrengths(quotes, thresholds, {
      currencies: this.currencies,
      requiredPairs: this.requiredPairs,
      providerStatus: providerStatus.health,
      providerSource: providerStatus.activeProvider || providerStatus.providerName
    });

    this.latestStrengths = strengths;
    return strengths;
  }

  public getCachedCurrencyStrengths(
    thresholds: RelativeStrengthConfig = { strongThreshold: 0.10, weakThreshold: -0.10 }
  ): Map<string, CurrencyMarketStrength> {
    const cachedQuotes = this.cache.getQuotes();
    const providerStatus = this.getStatus();

    if (!cachedQuotes || cachedQuotes.length === 0) {
      return calculateCurrencyMarketStrengths([], thresholds, {
        currencies: this.currencies,
        requiredPairs: this.requiredPairs,
        providerStatus: providerStatus.health,
        providerSource: providerStatus.activeProvider || providerStatus.providerName
      });
    }

    return calculateCurrencyMarketStrengths(cachedQuotes, thresholds, {
      currencies: this.currencies,
      requiredPairs: this.requiredPairs,
      providerStatus: providerStatus.health,
      providerSource: providerStatus.activeProvider || providerStatus.providerName
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
    const status = this.getStatus();
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
