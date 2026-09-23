import { NormalizedMarketQuote } from '../types';
import { DEFAULT_CACHE_TTL_MS } from '../config';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * Server-Side In-Memory Cache for Market Data Observations.
 * Prevents redundant external provider requests, protects rate limits,
 * and maintains configurable TTL.
 */
export class MarketDataCache {
  private quotesCache: CacheEntry<NormalizedMarketQuote[]> | null = null;
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = DEFAULT_CACHE_TTL_MS) {
    this.defaultTtlMs = defaultTtlMs;
  }

  public getQuotes(): NormalizedMarketQuote[] | null {
    if (!this.quotesCache) return null;
    const now = Date.now();
    if (now > this.quotesCache.expiresAt) {
      return null; // Expired
    }
    return this.quotesCache.data;
  }

  public getQuotesEvenIfExpired(): NormalizedMarketQuote[] | null {
    return this.quotesCache ? this.quotesCache.data : null;
  }

  public setQuotes(quotes: NormalizedMarketQuote[], ttlMs?: number): void {
    const duration = ttlMs ?? this.defaultTtlMs;
    const now = Date.now();
    this.quotesCache = {
      data: quotes,
      timestamp: now,
      expiresAt: now + duration
    };
  }

  public isExpired(): boolean {
    if (!this.quotesCache) return true;
    return Date.now() > this.quotesCache.expiresAt;
  }

  public hasData(): boolean {
    return this.quotesCache !== null && this.quotesCache.data.length > 0;
  }

  public getCacheInfo(): {
    hasData: boolean;
    isExpired: boolean;
    cachedAt: string | null;
    expiresAt: string | null;
    count: number;
  } {
    if (!this.quotesCache) {
      return {
        hasData: false,
        isExpired: true,
        cachedAt: null,
        expiresAt: null,
        count: 0
      };
    }
    return {
      hasData: true,
      isExpired: this.isExpired(),
      cachedAt: new Date(this.quotesCache.timestamp).toISOString(),
      expiresAt: new Date(this.quotesCache.expiresAt).toISOString(),
      count: this.quotesCache.data.length
    };
  }

  public clear(): void {
    this.quotesCache = null;
  }
}
