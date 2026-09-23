import { DEFAULT_CACHE_TTL_MS } from '../config';
import { MarketQuote, CacheInfo } from '../types';

interface InternalCacheEntry {
  data: MarketQuote[];
  timestamp: number;
  expiresAt: number;
}

export class MarketDataCache {
  private quotesCache: InternalCacheEntry | null = null;
  private defaultTtlMs: number;

  constructor(defaultTtlMs: number = DEFAULT_CACHE_TTL_MS) {
    this.defaultTtlMs = defaultTtlMs;
  }

  public getQuotes(): MarketQuote[] | null {
    if (!this.quotesCache) return null;
    const now = Date.now();
    if (now > this.quotesCache.expiresAt) {
      return null;
    }
    return this.quotesCache.data;
  }

  public getQuotesEvenIfExpired(): MarketQuote[] | null {
    return this.quotesCache ? this.quotesCache.data : null;
  }

  public setQuotes(quotes: MarketQuote[], ttlMs?: number): void {
    const duration = ttlMs ?? this.defaultTtlMs;
    const now = Date.now();
    this.quotesCache = {
      data: quotes,
      timestamp: now,
      expiresAt: now + duration
    };
  }

  public upsertQuote(quote: MarketQuote, ttlMs?: number): void {
    const duration = ttlMs ?? this.defaultTtlMs;
    const now = Date.now();
    if (!this.quotesCache) {
      this.quotesCache = {
        data: [quote],
        timestamp: now,
        expiresAt: now + duration
      };
      return;
    }

    const idx = this.quotesCache.data.findIndex((q) => q.symbol === quote.symbol);
    if (idx >= 0) {
      this.quotesCache.data[idx] = quote;
    } else {
      this.quotesCache.data.push(quote);
    }
    this.quotesCache.timestamp = now;
    this.quotesCache.expiresAt = now + duration;
  }

  public isExpired(): boolean {
    if (!this.quotesCache) return true;
    return Date.now() > this.quotesCache.expiresAt;
  }

  public hasData(): boolean {
    return this.quotesCache !== null && this.quotesCache.data.length > 0;
  }

  public getCacheInfo(): CacheInfo {
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
