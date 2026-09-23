import { DEFAULT_LIQUID_PAIRS } from '../config';
import { MarketQuote, ProviderStatus, ProviderHealth } from '../types';

export interface TwelveDataProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
  requiredPairs?: string[];
}

export class TwelveDataProvider {
  public readonly name = 'Twelve Data';
  public apiKey: string | null = null;
  public health: ProviderHealth = 'NOT_CONFIGURED';
  public message: string = '';
  public lastFetchedAt: string | null = null;
  public lastQuotes: MarketQuote[] = [];
  public missingPairs: string[] = [];

  private baseUrl: string;
  private fetchFn: typeof fetch | undefined;
  private requiredPairs: string[];

  constructor(options?: TwelveDataProviderOptions) {
    const envKey =
      typeof process !== 'undefined' && process.env ? process.env.TWELVE_DATA_API_KEY : undefined;
    const resolvedKey = options?.apiKey ?? envKey ?? '';

    this.baseUrl = options?.baseUrl ?? 'https://api.twelvedata.com';
    this.fetchFn = options?.fetchFn ?? (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : undefined);
    this.requiredPairs = options?.requiredPairs ?? DEFAULT_LIQUID_PAIRS;

    if (resolvedKey && resolvedKey.trim().length > 0) {
      this.apiKey = resolvedKey.trim();
      this.health = 'DISCONNECTED';
      this.message = 'Twelve Data API key configured. Ready to fetch market quotes.';
    } else {
      this.apiKey = null;
      this.health = 'NOT_CONFIGURED';
      this.message =
        'Twelve Data API key is not configured (TWELVE_DATA_API_KEY missing on server). Market data unavailable.';
    }
  }

  public getStatus(): ProviderStatus {
    return {
      providerName: this.name,
      activeProvider: this.name,
      source: this.name,
      health: this.health,
      message: this.message,
      lastFetchedAt: this.lastFetchedAt,
      quotesCount: this.lastQuotes.length,
      requiredPairsCount: this.requiredPairs.length,
      availablePairsCount: this.lastQuotes.filter((q) => q.changePercent !== null).length,
      missingPairs: [...this.missingPairs],
      stalePairs: [],
      oldestQuoteAge: null,
      streamState: 'STOPPED',
      cacheExpiresAt: null,
      isConfigured: this.apiKey !== null,
      fallbackAvailable: this.apiKey !== null,
      fallbackStatus: this.health
    };
  }

  public async fetchDailyQuotes(
    symbols: string[] = [...this.requiredPairs]
  ): Promise<MarketQuote[]> {
    if (!this.apiKey) {
      this.health = 'NOT_CONFIGURED';
      this.message =
        'Twelve Data API key is not configured (TWELVE_DATA_API_KEY missing on server). Market data unavailable.';
      return [];
    }

    if (!this.fetchFn) {
      this.health = 'ERROR';
      this.message = 'Global fetch API is unavailable in runtime environment.';
      return [];
    }

    this.health = 'CONNECTING';

    try {
      const symbolsParam = encodeURIComponent(symbols.join(','));
      const url = `${this.baseUrl}/quote?symbol=${symbolsParam}&apikey=${this.apiKey}&interval=1day`;

      const response = await this.fetchFn(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errBody = await response.json();
          if (errBody && typeof errBody.message === 'string') {
            errorDetail = errBody.message;
          }
        } catch {
          // ignore
        }
        throw new Error(`Twelve Data HTTP error ${response.status}: ${errorDetail}`);
      }

      const json = await response.json();

      if (typeof json === 'object' && json !== null && 'status' in json && json.status === 'error') {
        const errObj = json as { message?: string; code?: number };
        const rawMsg =
          typeof errObj.message === 'string'
            ? errObj.message
            : `Twelve Data returned error code ${errObj.code ?? 'unknown'}`;
        const errorMsg = this.sanitizeMessage(rawMsg);
        this.health = 'ERROR';
        this.message = `Provider error: ${errorMsg}`;
        return this.lastQuotes;
      }

      const normalized = this.normalizeResponse(json, symbols);
      this.lastQuotes = normalized;
      this.lastFetchedAt = new Date().toISOString();

      const availableSymbols = new Set(normalized.map((q) => q.symbol));
      this.missingPairs = symbols.filter((s) => !availableSymbols.has(s));

      if (normalized.length === 0) {
        this.health = 'ERROR';
        this.message = 'Provider returned no valid market quotes.';
      } else if (this.missingPairs.length > 0) {
        this.health = 'DEGRADED';
        this.message = `Partial market data: ${normalized.length}/${symbols.length} pairs received. Missing: ${this.missingPairs.join(
          ', '
        )}`;
      } else {
        this.health = 'CONNECTED';
        this.message = `Twelve Data connected. All ${normalized.length} pairs successfully observed.`;
      }

      return normalized;
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : String(err);
      const safeMessage = this.sanitizeMessage(rawMessage);
      this.health = 'ERROR';
      this.message = `Failed to fetch from Twelve Data: ${safeMessage}`;
      return this.lastQuotes;
    }
  }

  private normalizeResponse(response: any, requestedSymbols: string[]): MarketQuote[] {
    const results: MarketQuote[] = [];
    const nowIso = new Date().toISOString();

    if ('symbol' in response && typeof response.symbol === 'string' && response.symbol.length > 0) {
      const q = this.normalizeSingleQuote(response, nowIso);
      if (q) results.push(q);
      return results;
    }

    const batchMap = response as Record<string, any>;
    for (const symbol of requestedSymbols) {
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
    raw: any,
    nowIso: string,
    fallbackSymbol?: string
  ): MarketQuote | null {
    const rawSymbol = raw.symbol || fallbackSymbol;
    if (!rawSymbol) return null;

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
      price: price !== null && !isNaN(price) ? price : null,
      open: open !== null && !isNaN(open) ? open : null,
      high: high !== null && !isNaN(high) ? high : null,
      low: low !== null && !isNaN(low) ? low : null,
      close: close !== null && !isNaN(close) ? close : null,
      change: change !== null && !isNaN(change) ? change : null,
      changePercent: changePercent !== null && !isNaN(changePercent) ? changePercent : null,
      dailyReturnPercent: changePercent !== null && !isNaN(changePercent) ? changePercent : null,
      timestamp: timestamp && !isNaN(timestamp) ? timestamp : null,
      interval: '1day',
      source: this.name,
      sourceStatus: 'CONNECTED',
      fetchedAt: nowIso
    };
  }

  private sanitizeMessage(msg: string): string {
    if (!this.apiKey) return msg;
    return msg.split(this.apiKey).join('[REDACTED]');
  }
}
