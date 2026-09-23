import { BiquoteProvider } from '../providers/BiquoteProvider';
import { TwelveDataProvider } from '../providers/TwelveDataProvider';
import { MarketDataCache } from '../cache/MarketDataCache';
import { calculateCurrencyMarketStrengths } from '../engine/marketStrengthEngine';
import {
  DEFAULT_LIQUID_PAIRS,
  SUPPORTED_MAJOR_CURRENCIES,
  DEFAULT_CACHE_TTL_MS
} from '../config';
import {
  MarketQuote,
  ProviderStatus,
  CurrencyMarketStrength,
  StrengthThresholds,
  MarketCoverageReport,
  CurrencyCoverageInfo
} from '../types';

export class MarketDataService {
  private static instance: MarketDataService | null = null;
  private primaryProvider: BiquoteProvider;
  private secondaryProvider: TwelveDataProvider | null = null;
  private activeProvider: BiquoteProvider | TwelveDataProvider;
  private cache: MarketDataCache;
  private requiredPairs: string[];
  private currencies: string[];
  private latestStrengths: Map<string, CurrencyMarketStrength> = new Map();
  private inFlightPromise: Promise<MarketQuote[]> | null = null;

  constructor(
    primaryProvider?: BiquoteProvider,
    secondaryProvider?: TwelveDataProvider,
    cacheTtlMs: number = DEFAULT_CACHE_TTL_MS,
    requiredPairs: string[] = DEFAULT_LIQUID_PAIRS,
    currencies: string[] = SUPPORTED_MAJOR_CURRENCIES
  ) {
    this.requiredPairs = requiredPairs;
    this.currencies = currencies;
    this.cache = new MarketDataCache(cacheTtlMs);

    this.primaryProvider =
      primaryProvider ??
      new BiquoteProvider({
        requiredPairs,
        onTick: (quote) => {
          this.cache.upsertQuote(quote);
        }
      });

    this.secondaryProvider =
      secondaryProvider ??
      new TwelveDataProvider({
        requiredPairs
      });

    this.activeProvider = this.primaryProvider;
  }

  public static getInstance(): MarketDataService {
    if (!MarketDataService.instance) {
      MarketDataService.instance = new MarketDataService();
    }
    return MarketDataService.instance;
  }

  public setProvider(provider: BiquoteProvider | TwelveDataProvider): void {
    this.primaryProvider = provider as BiquoteProvider;
    this.activeProvider = provider;
    this.cache.clear();
    this.latestStrengths.clear();
  }

  public setSecondaryProvider(provider: TwelveDataProvider | null): void {
    this.secondaryProvider = provider;
  }

  public getProvider(): BiquoteProvider | TwelveDataProvider {
    return this.activeProvider;
  }

  public getPrimaryProvider(): BiquoteProvider {
    return this.primaryProvider;
  }

  public getSecondaryProvider(): TwelveDataProvider | null {
    return this.secondaryProvider;
  }

  public async startLiveStream(): Promise<void> {
    if (this.primaryProvider && typeof this.primaryProvider.startLiveStream === 'function') {
      await this.primaryProvider.startLiveStream();
    }
  }

  public stopLiveStream(): void {
    if (this.primaryProvider && typeof this.primaryProvider.stopLiveStream === 'function') {
      this.primaryProvider.stopLiveStream();
    }
  }

  public getStatus(): ProviderStatus {
    const activeStatus = this.activeProvider.getStatus();
    const cacheInfo = this.cache.getCacheInfo();
    const secondaryStatus = this.secondaryProvider?.getStatus();

    return {
      ...activeStatus,
      activeProvider: this.activeProvider.name,
      source: this.activeProvider.name,
      cacheExpiresAt: cacheInfo.expiresAt,
      fallbackAvailable: secondaryStatus?.isConfigured ?? false,
      fallbackStatus: secondaryStatus?.health ?? 'NOT_CONFIGURED'
    };
  }

  public async getQuotes(forceRefresh: boolean = false): Promise<MarketQuote[]> {
    if (!forceRefresh) {
      const cached = this.cache.getQuotes();
      if (cached && cached.length > 0) {
        return cached;
      }
    }

    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.inFlightPromise = (async () => {
      try {
        let primaryQuotes: MarketQuote[] = [];
        try {
          primaryQuotes = await this.primaryProvider.fetchDailyQuotes([...this.requiredPairs]);
        } catch {
          primaryQuotes = [];
        }

        const primaryStatus = this.primaryProvider.getStatus();
        const freshPrimaryQuotes = primaryQuotes.filter(
          (q) => !q.stale && q.changePercent !== null && !isNaN(q.changePercent)
        );

        if (
          primaryQuotes.length > 0 &&
          (primaryStatus.health === 'CONNECTED' ||
            (primaryStatus.health === 'DEGRADED' && freshPrimaryQuotes.length > 0))
        ) {
          this.activeProvider = this.primaryProvider;
          this.cache.setQuotes(primaryQuotes);
          return primaryQuotes;
        }

        if (this.secondaryProvider) {
          try {
            const secondaryQuotes = await this.secondaryProvider.fetchDailyQuotes([
              ...this.requiredPairs
            ]);
            const secondaryStatus = this.secondaryProvider.getStatus();
            if (secondaryQuotes.length > 0 && secondaryStatus.health !== 'ERROR') {
              this.activeProvider = this.secondaryProvider;
              this.cache.setQuotes(secondaryQuotes);
              return secondaryQuotes;
            }
          } catch {
            // Secondary failed
          }
        }

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
    thresholds: StrengthThresholds = { strongThreshold: 0.1, weakThreshold: -0.1 },
    forceRefresh: boolean = false
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
    thresholds: StrengthThresholds = { strongThreshold: 0.1, weakThreshold: -0.1 }
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
    thresholds: StrengthThresholds = { strongThreshold: 0.1, weakThreshold: -0.1 }
  ): Promise<CurrencyMarketStrength | null> {
    const strengths = await this.getCurrencyStrengths(thresholds);
    return strengths.get(code.toUpperCase()) ?? null;
  }

  public getCoverage(): MarketCoverageReport {
    const status = this.getStatus();
    const cachedQuotes = this.cache.getQuotesEvenIfExpired() ?? [];
    const availableQuotesMap = new Map<string, MarketQuote>(
      cachedQuotes.map((q) => [q.symbol, q])
    );
    const missingPairs = this.requiredPairs.filter((p) => !availableQuotesMap.has(p));

    const currencyCoverage: Record<string, CurrencyCoverageInfo> = {};
    for (const code of this.currencies) {
      const required = this.requiredPairs.filter((p) => {
        const [b, q] = p.split('/');
        return b === code || q === code;
      });
      const available = required.filter((p) => availableQuotesMap.has(p));
      const percent =
        required.length > 0 ? Math.round((available.length / required.length) * 1000) / 10 : 0;
      currencyCoverage[code] = {
        available: available.length,
        required: required.length,
        percent,
        missingPairs: required.filter((p) => !availableQuotesMap.has(p)),
        validPairs: available
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
