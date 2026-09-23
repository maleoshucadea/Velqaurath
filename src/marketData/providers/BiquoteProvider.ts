import {
  MarketDataProvider,
  MarketProviderStatus,
  NormalizedMarketQuote,
  ProviderHealthState
} from '../types';
import {
  DEFAULT_LIQUID_PAIRS,
  DEFAULT_FRESHNESS_THRESHOLD_SECONDS,
  BIQUOTE_API_BASE_URL,
  BIQUOTE_WS_HUB_URL
} from '../config';

/**
 * Raw Biquote quote schema observed from REST and WebSocket endpoints.
 */
export interface BiquoteRawQuote {
  symbol: string;
  bid: number;
  ask: number;
  mid?: number;
  last?: number;
  high?: number;
  low?: number;
  direction?: string;
  dayDiffPercent?: number;
  timestamp?: string; // e.g. "2026-09-23T16:57:33Z"
  time?: string;
  source?: string;
  spread?: number;
  marketState?: string;
  stale?: boolean;
  quoteAgeSeconds?: number;
}

/**
 * Deterministic mapping between internal symbols (e.g. "EUR/USD")
 * and Biquote symbols (e.g. "EURUSD").
 */
const INTERNAL_TO_BIQUOTE: Readonly<Record<string, string>> = Object.freeze({
  'EUR/USD': 'EURUSD',
  'GBP/USD': 'GBPUSD',
  'USD/JPY': 'USDJPY',
  'USD/CHF': 'USDCHF',
  'AUD/USD': 'AUDUSD',
  'NZD/USD': 'NZDUSD',
  'USD/CAD': 'USDCAD',
  'EUR/GBP': 'EURGBP',
  'EUR/JPY': 'EURJPY',
  'GBP/JPY': 'GBPJPY',
  'EUR/CHF': 'EURCHF',
  'GBP/CHF': 'GBPCHF',
  'AUD/JPY': 'AUDJPY',
  'NZD/JPY': 'NZDJPY',
  'CAD/JPY': 'CADJPY'
});

const BIQUOTE_TO_INTERNAL: Readonly<Record<string, string>> = Object.freeze({
  'EURUSD': 'EUR/USD',
  'GBPUSD': 'GBP/USD',
  'USDJPY': 'USD/JPY',
  'USDCHF': 'USD/CHF',
  'AUDUSD': 'AUD/USD',
  'NZDUSD': 'NZD/USD',
  'USDCAD': 'USD/CAD',
  'EURGBP': 'EUR/GBP',
  'EURJPY': 'EUR/JPY',
  'GBPJPY': 'GBP/JPY',
  'EURCHF': 'EUR/CHF',
  'GBPCHF': 'GBP/CHF',
  'AUDJPY': 'AUD/JPY',
  'NZDJPY': 'NZD/JPY',
  'CADJPY': 'CAD/JPY'
});

export function toBiquoteSymbol(internalSymbol: string): string | null {
  const clean = internalSymbol.trim().toUpperCase();
  return INTERNAL_TO_BIQUOTE[clean] ?? null;
}

export function toInternalSymbol(biquoteSymbol: string): string | null {
  const clean = biquoteSymbol.trim().toUpperCase();
  return BIQUOTE_TO_INTERNAL[clean] ?? null;
}

export interface BiquoteProviderOptions {
  requiredPairs?: readonly string[];
  freshnessThresholdSeconds?: number;
  baseUrl?: string;
  hubUrl?: string;
  fetchFn?: typeof fetch;
  webSocketFactory?: (url: string) => any;
  autoStartStream?: boolean;
  onTick?: (quote: NormalizedMarketQuote) => void;
}

/**
 * Biquote Market Data Provider Adapter.
 * 
 * Primary live market data feed providing:
 * - REST batch snapshots (via repeated symbols parameters)
 * - Real-time SignalR WebSocket streaming (via /hubs/tick)
 * - Zero API key configuration required
 * - Sub-second live forex pricing with strict freshness auditing
 */
export class BiquoteProvider implements MarketDataProvider {
  public readonly name = 'Biquote';

  private health: ProviderHealthState = 'DISCONNECTED';
  private message: string = 'Biquote provider initialized. Ready to connect.';
  private lastFetchedAt: string | null = null;
  private lastSuccessfulUpdate: string | null = null;
  private lastQuotes: Map<string, NormalizedMarketQuote> = new Map();
  private missingPairs: string[] = [];

  private readonly requiredPairs: readonly string[];
  private readonly freshnessThresholdSeconds: number;
  private readonly baseUrl: string;
  private readonly hubUrl: string;
  private readonly fetchFn: typeof fetch;
  private readonly wsFactory: (url: string) => any;
  private readonly onTickCallback?: (quote: NormalizedMarketQuote) => void;

  private ws: any = null;
  private isExplicitlyClosed: boolean = false;
  private reconnectTimer: any = null;
  private reconnectAttempts: number = 0;
  private streamState: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING' | 'OFFLINE' = 'DISCONNECTED';

  constructor(options: BiquoteProviderOptions = {}) {
    this.requiredPairs = options.requiredPairs ?? DEFAULT_LIQUID_PAIRS;
    this.freshnessThresholdSeconds = options.freshnessThresholdSeconds ?? DEFAULT_FRESHNESS_THRESHOLD_SECONDS;
    this.baseUrl = (options.baseUrl ?? BIQUOTE_API_BASE_URL).replace(/\/+$/, '');
    this.hubUrl = (options.hubUrl ?? BIQUOTE_WS_HUB_URL).replace(/\/+$/, '');
    this.fetchFn = options.fetchFn ?? ((...args) => globalThis.fetch(...args));
    this.wsFactory = options.webSocketFactory ?? ((url: string) => new (globalThis as any).WebSocket(url));
    this.onTickCallback = options.onTick;

    if (options.autoStartStream) {
      this.startLiveStream().catch(err => {
        this.message = `Initial live stream failed: ${err instanceof Error ? err.message : String(err)}`;
      });
    }
  }

  /**
   * Builds the REST batch URL using repeated symbols query parameters.
   * Example: https://biquote.io/api/latest?symbols=EURUSD&symbols=GBPUSD
   */
  public buildBatchUrl(symbols: string[] = [...this.requiredPairs]): string {
    const biquoteSymbols = symbols
      .map(s => toBiquoteSymbol(s))
      .filter((s): s is string => s !== null);

    if (biquoteSymbols.length === 0) {
      return `${this.baseUrl}/api/latest`;
    }

    const query = biquoteSymbols.map(sym => `symbols=${encodeURIComponent(sym)}`).join('&');
    return `${this.baseUrl}/api/latest?${query}`;
  }

  /**
   * Fetches latest quotes for required FX pairs via Biquote REST API.
   */
  public async fetchDailyQuotes(symbols: string[] = [...this.requiredPairs]): Promise<NormalizedMarketQuote[]> {
    this.health = this.lastQuotes.size > 0 ? this.health : 'CONNECTING';

    try {
      const url = this.buildBatchUrl(symbols);
      const response = await this.fetchFn(url, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const body = await response.json() as Record<string, unknown>;
          if (body && typeof body.message === 'string') {
            errorDetail = body.message;
          }
        } catch {
          // ignore
        }
        throw new Error(`Biquote HTTP ${response.status}: ${errorDetail}`);
      }

      const json = await response.json() as Record<string, unknown>;
      const normalizedQuotes: NormalizedMarketQuote[] = [];
      const now = Date.now();

      for (const internalSym of symbols) {
        const biquoteSym = toBiquoteSymbol(internalSym);
        if (!biquoteSym) continue;

        const raw = json[biquoteSym] as BiquoteRawQuote | undefined;
        if (!raw) continue;

        const quote = this.normalizeQuote(raw, now);
        if (quote) {
          normalizedQuotes.push(quote);
          this.lastQuotes.set(internalSym, quote);
        }
      }

      this.lastFetchedAt = new Date(now).toISOString();
      this.lastSuccessfulUpdate = this.lastFetchedAt;

      // Evaluate coverage and freshness
      this.evaluateStatus(symbols);

      return Array.from(this.lastQuotes.values());
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.health = this.lastQuotes.size > 0 ? 'DEGRADED' : 'ERROR';
      this.message = `Failed to fetch REST snapshot from Biquote: ${errMsg}`;
      return Array.from(this.lastQuotes.values());
    }
  }

  /**
   * Normalizes a raw Biquote quote (REST or WebSocket) into NormalizedMarketQuote.
   * Rejects malformed quotes deterministically. Never fabricates missing values.
   */
  public normalizeQuote(raw: BiquoteRawQuote, nowMs = Date.now()): NormalizedMarketQuote | null {
    if (!raw || typeof raw !== 'object') return null;

    const internalSymbol = toInternalSymbol(raw.symbol);
    if (!internalSymbol) return null;

    // Validate bid and ask
    if (typeof raw.bid !== 'number' || isNaN(raw.bid) || raw.bid <= 0) return null;
    if (typeof raw.ask !== 'number' || isNaN(raw.ask) || raw.ask <= 0) return null;
    if (raw.ask < raw.bid) return null; // Inverted spread is invalid

    // Validate timestamp
    if (!raw.timestamp) return null;
    const timeMs = Date.parse(raw.timestamp);
    if (isNaN(timeMs)) return null;

    const [baseCurrency, quoteCurrency] = internalSymbol.split('/');
    if (!baseCurrency || !quoteCurrency) return null;

    // Calculate mid price
    const mid = typeof raw.mid === 'number' && !isNaN(raw.mid)
      ? raw.mid
      : Number(((raw.bid + raw.ask) / 2).toFixed(5));

    // Calculate change and changePercent
    const changePercent = typeof raw.dayDiffPercent === 'number' && !isNaN(raw.dayDiffPercent)
      ? raw.dayDiffPercent
      : null;

    const open = changePercent !== null
      ? Number((mid / (1 + changePercent / 100)).toFixed(5))
      : null;

    const change = open !== null
      ? Number((mid - open).toFixed(5))
      : null;

    // Calculate quote age and staleness
    const quoteAgeSeconds = Math.max(0, Math.round((nowMs - timeMs) / 1000));
    const stale = quoteAgeSeconds > this.freshnessThresholdSeconds;

    return {
      symbol: internalSymbol,
      baseCurrency,
      quoteCurrency,
      price: mid,
      open,
      high: typeof raw.high === 'number' && !isNaN(raw.high) ? raw.high : null,
      low: typeof raw.low === 'number' && !isNaN(raw.low) ? raw.low : null,
      close: mid,
      change,
      changePercent,
      timestamp: timeMs,
      interval: 'live',
      source: 'Biquote',
      sourceStatus: this.health,
      fetchedAt: new Date(nowMs).toISOString(),
      bid: raw.bid,
      ask: raw.ask,
      mid,
      spread: typeof raw.spread === 'number' && !isNaN(raw.spread)
        ? raw.spread
        : Number((raw.ask - raw.bid).toFixed(5)),
      providerTimestamp: raw.timestamp,
      receivedAt: new Date(nowMs).toISOString(),
      quoteAgeSeconds,
      stale,
      marketState: raw.marketState ?? 'open'
    };
  }

  /**
   * Starts the live SignalR WebSocket streaming connection.
   */
  public async startLiveStream(): Promise<void> {
    if (this.streamState === 'CONNECTED' || this.streamState === 'CONNECTING') {
      return;
    }

    this.isExplicitlyClosed = false;
    this.streamState = 'CONNECTING';

    try {
      // 1. Negotiate with SignalR Hub
      const negotiateUrl = `${this.baseUrl}/hubs/tick/negotiate?negotiateVersion=1`;
      const negResponse = await this.fetchFn(negotiateUrl, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      });

      if (!negResponse.ok) {
        throw new Error(`SignalR negotiate failed with HTTP ${negResponse.status}`);
      }

      const negData = await negResponse.json() as Record<string, any>;
      const token = negData.connectionToken || negData.connectionId;
      if (!token) {
        throw new Error('SignalR negotiate returned no connection token');
      }

      // Convert HTTP URL to WebSocket URL
      const wsBase = this.baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
      const wsUrl = `${wsBase}/hubs/tick?id=${encodeURIComponent(token)}`;

      this.ws = this.wsFactory(wsUrl);

      this.ws.onopen = () => {
        this.streamState = 'CONNECTING';
        // Send SignalR protocol handshake
        this.ws.send(JSON.stringify({ protocol: 'json', version: 1 }) + '\x1e');
      };

      this.ws.onmessage = (event: any) => {
        const rawData = typeof event.data === 'string' ? event.data : String(event.data);
        const messages = rawData.split('\x1e').filter(Boolean);

        for (const msg of messages) {
          if (msg === '{}') {
            // Handshake confirmed -> subscribe to required symbols
            this.streamState = 'CONNECTED';
            this.reconnectAttempts = 0;
            const biquoteSymbols = this.requiredPairs
              .map(toBiquoteSymbol)
              .filter((s): s is string => s !== null);

            const subscribeMsg = JSON.stringify({
              type: 1,
              target: 'Subscribe',
              arguments: [biquoteSymbols]
            }) + '\x1e';
            this.ws.send(subscribeMsg);
          } else {
            try {
              const parsed = JSON.parse(msg);
              if (parsed.type === 1 && parsed.target === 'ReceiveTick' && Array.isArray(parsed.arguments) && parsed.arguments[0]) {
                const tickRaw = parsed.arguments[0] as BiquoteRawQuote;
                const normalized = this.normalizeQuote(tickRaw);
                if (normalized) {
                  this.lastQuotes.set(normalized.symbol, normalized);
                  this.lastSuccessfulUpdate = new Date().toISOString();
                  this.evaluateStatus();
                  this.onTickCallback?.(normalized);
                }
              } else if (parsed.type === 6) {
                // SignalR keep-alive ping
                this.ws.send('{"type":6}\x1e');
              }
            } catch {
              // Ignore unparseable frames
            }
          }
        }
      };

      this.ws.onerror = (_err: any) => {
        if (!this.isExplicitlyClosed) {
          this.handleStreamDisconnect('WebSocket error encountered');
        }
      };

      this.ws.onclose = () => {
        if (!this.isExplicitlyClosed) {
          this.handleStreamDisconnect('WebSocket connection closed');
        }
      };

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.handleStreamDisconnect(errMsg);
    }
  }

  /**
   * Handles stream disconnect with controlled exponential backoff reconnect
   * and fallback REST snapshot recovery.
   */
  private handleStreamDisconnect(reason: string): void {
    this.streamState = 'DISCONNECTED';
    this.health = this.lastQuotes.size > 0 ? 'DEGRADED' : 'DISCONNECTED';
    this.message = `Live stream disconnected (${reason}). Triggering REST recovery.`;

    if (this.isExplicitlyClosed) return;

    // Trigger REST recovery snapshot so data remains updated during reconnect
    this.fetchDailyQuotes().catch(() => {});

    // Schedule reconnect with exponential backoff (2s, 4s, 8s... max 30s)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(30000, 2000 * Math.pow(1.5, this.reconnectAttempts++));
    this.reconnectTimer = setTimeout(() => {
      this.startLiveStream().catch(() => {});
    }, delay);
  }

  /**
   * Stops the live stream and cleans up resources.
   */
  public stopLiveStream(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.streamState = 'OFFLINE';
    this.health = 'DISCONNECTED';
    this.message = 'Live stream stopped.';
  }

  /**
   * Evaluates freshness and overall health across the required pairs.
   */
  private evaluateStatus(symbols: readonly string[] = this.requiredPairs): void {
    const now = Date.now();
    const missing: string[] = [];
    const stale: string[] = [];
    let freshCount = 0;

    for (const sym of symbols) {
      const quote = this.lastQuotes.get(sym);
      if (!quote || quote.timestamp === null) {
        missing.push(sym);
        continue;
      }

      const age = Math.max(0, Math.round((now - quote.timestamp) / 1000));
      quote.quoteAgeSeconds = age;
      quote.stale = age > this.freshnessThresholdSeconds;

      if (quote.stale) {
        stale.push(sym);
      } else {
        freshCount++;
      }
    }

    this.missingPairs = missing;

    if (freshCount === symbols.length && missing.length === 0) {
      this.health = 'CONNECTED';
      this.message = `Biquote connected. All ${symbols.length}/${symbols.length} pairs live and fresh.`;
    } else if (freshCount > 0 || this.lastQuotes.size > 0) {
      this.health = 'DEGRADED';
      this.message = `Biquote degraded: ${freshCount}/${symbols.length} fresh, ${stale.length} stale, ${missing.length} missing.`;
    } else if (this.health === 'DISCONNECTED' || this.health === 'CONNECTING') {
      // Maintain initial DISCONNECTED or CONNECTING state before first observation
    } else {
      this.health = 'ERROR';
      this.message = 'Biquote error: No valid market quotes available.';
    }
  }

  public getQuotes(): NormalizedMarketQuote[] {
    this.evaluateStatus();
    return Array.from(this.lastQuotes.values());
  }

  public getStatus(): MarketProviderStatus {
    this.evaluateStatus();
    const quotes = Array.from(this.lastQuotes.values());
    const stalePairs = quotes.filter(q => q.stale).map(q => q.symbol);
    const freshQuotes = quotes.filter(q => !q.stale && q.changePercent !== null);
    const ages = quotes.map(q => q.quoteAgeSeconds ?? 0);
    const oldestQuoteAge = ages.length > 0 ? Math.max(...ages) : null;

    return {
      providerName: this.name,
      activeProvider: this.name,
      health: this.health,
      message: this.message,
      lastFetchedAt: this.lastFetchedAt,
      lastSuccessfulUpdate: this.lastSuccessfulUpdate,
      quotesCount: quotes.length,
      requiredPairsCount: this.requiredPairs.length,
      availablePairsCount: freshQuotes.length,
      missingPairs: [...this.missingPairs],
      stalePairs,
      oldestQuoteAge,
      streamState: this.streamState,
      cacheExpiresAt: null,
      isConfigured: true,
      source: this.name
    };
  }
}
