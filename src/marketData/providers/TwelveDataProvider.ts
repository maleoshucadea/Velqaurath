import {
  MarketDataProvider,
  MarketProviderStatus,
  NormalizedMarketQuote,
  ProviderHealthState
} from '../types';
import { DEFAULT_LIQUID_PAIRS } from '../config';

interface TwelveDataQuoteResponse {
  symbol?: string;
  name?: string;
  exchange?: string;
  currency_base?: string;
  currency_quote?: string;
  datetime?: string;
  timestamp?: number;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  previous_close?: string;
  change?: string;
  percent_change?: string;
  is_market_open?: boolean;
  status?: string;
  message?: string;
  code?: number;
}

type TwelveDataBatchResponse = Record<string, TwelveDataQuoteResponse> | TwelveDataQuoteResponse;

export interface TwelveDataProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  requiredPairs?: readonly string[];
}

/**
 * Twelve Data Market Data Provider Adapter.
 * Normalizes HTTP FX market data into clean, internal NormalizedMarketQuote representations.
 * Strictly avoids exposing secrets, handles rate limits, and surfaces honest health states.
 */
export class TwelveDataProvider implements MarketDataProvider {
  public readonly name = 'Twelve Data';
  private apiKey: string | null = null;
  private baseUrl: string;
  private fetchFn: typeof fetch;
  private requiredPairs: readonly string[];

  private health: ProviderHealthState = 'NOT_CONFIGURED';
  private message: string = '';
  private lastFetchedAt: string | null = null;
  private lastQuotes: NormalizedMarketQuote[] = [];
  private missingPairs: string[] = [];

  constructor(options?: TwelveDataProviderOptions) {
    // Server-side environment variable support
    const envKey = typeof process !== 'undefined' && process.env ? process.env.TWELVE_DATA_API_KEY : undefined;
    const resolvedKey = options?.apiKey ?? envKey ?? '';

    this.baseUrl = options?.baseUrl ?? 'https://api.twelvedata.com';
    this.fetchFn = options?.fetchFn ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : (undefined as unknown as typeof fetch));
    this.requiredPairs = options?.requiredPairs ?? DEFAULT_LIQUID_PAIRS;

    if (resolvedKey && resolvedKey.trim().length > 0) {
      this.apiKey = resolvedKey.trim();
      this.health = 'DISCONNECTED'; // Configured, awaiting first sync
      this.message = 'Twelve Data API key configured. Ready to fetch market quotes.';
    } else {
      this.apiKey = null;
      this.health = 'NOT_CONFIGURED';
      this.message = 'Twelve Data API key is not configured (TWELVE_DATA_API_KEY missing on server). Market data unavailable.';
    }
  }

  public getStatus(): MarketProviderStatus {
    return {
      providerName: this.name,
      health: this.health,
      message: this.message,
      lastFetchedAt: this.lastFetchedAt,
      quotesCount: this.lastQuotes.length,
      requiredPairsCount: this.requiredPairs.length,
      availablePairsCount: this.lastQuotes.filter(q => q.changePercent !== null).length,
      missingPairs: [...this.missingPairs],
      cacheExpiresAt: null, // Managed by MarketDataCache
      isConfigured: this.apiKey !== null
    };
  }

  public async fetchDailyQuotes(symbols: string[] = [...this.requiredPairs]): Promise<NormalizedMarketQuote[]> {
    if (!this.apiKey) {
      this.health = 'NOT_CONFIGURED';
      this.message = 'Twelve Data API key is not configured (TWELVE_DATA_API_KEY missing on server). Market data unavailable.';
      return [];
    }

    if (!this.fetchFn) {
      this.health = 'ERROR';
      this.message = 'Global fetch API is unavailable in runtime environment.';
      return [];
    }

    this.health = 'CONNECTING';

    try {
      // Twelve Data allows comma-separated symbols: e.g. EUR/USD,GBP/USD,...
      const symbolsParam = encodeURIComponent(symbols.join(','));
      const url = `${this.baseUrl}/quote?symbol=${symbolsParam}&apikey=${this.apiKey}&interval=1day`;

      const response = await this.fetchFn(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errBody = await response.json() as Record<string, unknown>;
          if (errBody && typeof errBody.message === 'string') {
            errorDetail = errBody.message;
          }
        } catch {
          // Keep response.statusText if body is not JSON
        }
        throw new Error(`Twelve Data HTTP error ${response.status}: ${errorDetail}`);
      }

      const json = await response.json() as TwelveDataBatchResponse;

      // Check for top-level Twelve Data error
      if (
        typeof json === 'object' &&
        json !== null &&
        'status' in json &&
        (json as Record<string, unknown>).status === 'error'
      ) {
        const errObj = json as Record<string, unknown>;
        const rawMsg = typeof errObj.message === 'string' ? errObj.message : `Twelve Data returned error code ${errObj.code ?? 'unknown'}`;
        const errorMsg = this.sanitizeMessage(rawMsg);
        this.health = 'ERROR';
        this.message = `Provider error: ${errorMsg}`;
        return this.lastQuotes; // Preserve last known quotes if available
      }

      const normalized = this.normalizeResponse(json, symbols);
      this.lastQuotes = normalized;
      this.lastFetchedAt = new Date().toISOString();

      // Check coverage
      const availableSymbols = new Set(normalized.map(q => q.symbol));
      this.missingPairs = symbols.filter(s => !availableSymbols.has(s));

      if (normalized.length === 0) {
        this.health = 'ERROR';
        this.message = 'Provider returned no valid market quotes.';
      } else if (this.missingPairs.length > 0) {
        this.health = 'DEGRADED';
        this.message = `Partial market data: ${normalized.length}/${symbols.length} pairs received. Missing: ${this.missingPairs.join(', ')}`;
      } else {
        this.health = 'CONNECTED';
        this.message = `Twelve Data connected. All ${normalized.length} pairs successfully observed.`;
      }

      return normalized;
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : String(err);
      const safeMessage = this.sanitizeMessage(rawMessage);
      this.health = 'ERROR';
      this.message = `Failed to fetch from Twelve Data: ${safeMessage}`;
      // Return last known valid observations if available, without inventing data
      return this.lastQuotes;
    }
  }

  /**
   * Normalizes Twelve Data JSON response into NormalizedMarketQuote array.
   */
  public normalizeResponse(
    response: TwelveDataBatchResponse,
    requestedSymbols: string[]
  ): NormalizedMarketQuote[] {
    const results: NormalizedMarketQuote[] = [];
    const nowIso = new Date().toISOString();

    // Case 1: Single symbol response
    if ('symbol' in response && typeof response.symbol === 'string' && response.symbol.length > 0) {
      const q = this.normalizeSingleQuote(response as TwelveDataQuoteResponse, nowIso);
      if (q) results.push(q);
      return results;
    }

    // Case 2: Multi-symbol response map: { "EUR/USD": { ... }, "GBP/USD": { ... } }
    const batchMap = response as Record<string, TwelveDataQuoteResponse>;
    for (const symbol of requestedSymbols) {
      // Look up by exact symbol or without slash
      const quoteObj = batchMap[symbol] ?? batchMap[symbol.replace('/', '')];
      if (quoteObj && quoteObj.status !== 'error') {
        const normalized = this.normalizeSingleQuote(quoteObj, nowIso, symbol);
        if (normalized) {
          results.push(normalized);
        }
      }
    }

    return results;
  }

  private normalizeSingleQuote(
    raw: TwelveDataQuoteResponse,
    nowIso: string,
    fallbackSymbol?: string
  ): NormalizedMarketQuote | null {
    const rawSymbol = raw.symbol || fallbackSymbol;
    if (!rawSymbol) return null;

    // Standardize symbol format e.g. "EUR/USD"
    let standardizedSymbol = rawSymbol;
    if (!standardizedSymbol.includes('/') && standardizedSymbol.length === 6) {
      standardizedSymbol = `${standardizedSymbol.slice(0, 3)}/${standardizedSymbol.slice(3)}`;
    }

    const parts = standardizedSymbol.split('/');
    const baseCurrency = raw.currency_base || parts[0] || '';
    const quoteCurrency = raw.currency_quote || parts[1] || '';

    const price = raw.close ? parseFloat(raw.close) : null;
    const open = raw.open ? parseFloat(raw.open) : null;
    const high = raw.high ? parseFloat(raw.high) : null;
    const low = raw.low ? parseFloat(raw.low) : null;
    const close = raw.close ? parseFloat(raw.close) : null;
    const change = raw.change ? parseFloat(raw.change) : null;

    // percent_change: e.g. "0.2306" or "-0.45"
    let changePercent: number | null = null;
    if (raw.percent_change !== undefined && raw.percent_change !== null) {
      const parsed = parseFloat(raw.percent_change);
      if (!isNaN(parsed)) {
        changePercent = parsed;
      }
    } else if (close !== null && open !== null && open !== 0) {
      changePercent = Math.round(((close - open) / open) * 100 * 10000) / 10000;
    }

    let timestamp: number | null = null;
    if (raw.timestamp) {
      timestamp = raw.timestamp * 1000;
    } else if (raw.datetime) {
      timestamp = new Date(raw.datetime).getTime();
    } else {
      timestamp = Date.now();
    }

    return {
      symbol: standardizedSymbol,
      baseCurrency,
      quoteCurrency,
      price: !isNaN(price as number) ? price : null,
      open: !isNaN(open as number) ? open : null,
      high: !isNaN(high as number) ? high : null,
      low: !isNaN(low as number) ? low : null,
      close: !isNaN(close as number) ? close : null,
      change: !isNaN(change as number) ? change : null,
      changePercent: changePercent !== null && !isNaN(changePercent) ? changePercent : null,
      timestamp: timestamp && !isNaN(timestamp) ? timestamp : null,
      interval: '1day',
      source: this.name,
      sourceStatus: 'CONNECTED',
      fetchedAt: nowIso
    };
  }

  /**
   * Sanitizes any error message to strictly prevent leaking API keys into logs or API responses.
   */
  private sanitizeMessage(msg: string): string {
    if (!this.apiKey) return msg;
    return msg.split(this.apiKey).join('[REDACTED]');
  }
}
