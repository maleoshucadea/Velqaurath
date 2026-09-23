import {
  DEFAULT_LIQUID_PAIRS,
  DEFAULT_FRESHNESS_THRESHOLD_SECONDS,
  BIQUOTE_API_BASE_URL,
  BIQUOTE_WS_HUB_URL
} from '../config';
import { MarketQuote, ProviderHealth, ProviderStatus } from '../types';

export const INTERNAL_TO_BIQUOTE: Record<string, string> = Object.freeze({
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

export const BIQUOTE_TO_INTERNAL: Record<string, string> = Object.freeze({
  EURUSD: 'EUR/USD',
  GBPUSD: 'GBP/USD',
  USDJPY: 'USD/JPY',
  USDCHF: 'USD/CHF',
  AUDUSD: 'AUD/USD',
  NZDUSD: 'NZD/USD',
  USDCAD: 'USD/CAD',
  EURGBP: 'EUR/GBP',
  EURJPY: 'EUR/JPY',
  GBPJPY: 'GBP/JPY',
  EURCHF: 'EUR/CHF',
  GBPCHF: 'GBP/CHF',
  AUDJPY: 'AUD/JPY',
  NZDJPY: 'NZD/JPY',
  CADJPY: 'CAD/JPY'
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
  requiredPairs?: string[];
  freshnessThresholdSeconds?: number;
  baseUrl?: string;
  hubUrl?: string;
  fetchFn?: typeof fetch;
  webSocketFactory?: (url: string) => WebSocket;
  onTick?: (quote: MarketQuote) => void;
  autoStartStream?: boolean;
}

export class BiquoteProvider {
  public readonly name: string = 'Biquote';
  public health: ProviderHealth = 'DISCONNECTED';
  public message: string =
    'Biquote live stream disconnected and no usable market data is available.';
  public lastFetchedAt: string | null = null;
  public lastSuccessfulUpdate: string | null = null;
  public lastQuotes: Map<string, MarketQuote> = new Map();
  public missingPairs: string[] = [];

  public streamState: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'OFFLINE' = 'DISCONNECTED';
  public isReconnecting: boolean = false;

  private requiredPairs: string[];
  private freshnessThresholdSeconds: number;
  private baseUrl: string;
  private hubUrl: string;
  private fetchFn: typeof fetch;
  private wsFactory: (url: string) => WebSocket;
  private onTickCallback?: (quote: MarketQuote) => void;

  private activeWs: WebSocket | null = null;
  private connectionGeneration: number = 0;
  private isExplicitlyClosed: boolean = false;
  private reconnectTimer: any = null;
  private reconnectAttempts: number = 0;
  private liveStreamPromise: Promise<void> | null = null;

  constructor(options: BiquoteProviderOptions = {}) {
    this.requiredPairs = options.requiredPairs ?? DEFAULT_LIQUID_PAIRS;
    this.freshnessThresholdSeconds =
      options.freshnessThresholdSeconds ?? DEFAULT_FRESHNESS_THRESHOLD_SECONDS;
    this.baseUrl = (options.baseUrl ?? BIQUOTE_API_BASE_URL).replace(/\/+$/, '');
    this.hubUrl = (options.hubUrl ?? BIQUOTE_WS_HUB_URL).replace(/\/+$/, '');
    this.fetchFn = options.fetchFn ?? ((...args) => globalThis.fetch(...args));
    this.wsFactory =
      options.webSocketFactory ?? ((url: string) => new (globalThis as any).WebSocket(url));
    this.onTickCallback = options.onTick;

    this.evaluateStatus();

    if (options.autoStartStream) {
      this.startLiveStream().catch((err) => {
        this.message = `Initial live stream failed: ${
          err instanceof Error ? err.message : String(err)
        }`;
      });
    }
  }

  public buildBatchUrl(symbols: string[] = [...this.requiredPairs]): string {
    const biquoteSymbols = symbols
      .map((s) => toBiquoteSymbol(s))
      .filter((s): s is string => s !== null);

    if (biquoteSymbols.length === 0) {
      return `${this.baseUrl}/api/latest`;
    }

    const query = biquoteSymbols.map((sym) => `symbols=${encodeURIComponent(sym)}`).join('&');
    return `${this.baseUrl}/api/latest?${query}`;
  }

  public async fetchDailyQuotes(
    symbols: string[] = [...this.requiredPairs]
  ): Promise<MarketQuote[]> {
    try {
      const url = this.buildBatchUrl(symbols);
      const response = await this.fetchFn(url, {
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const body = await response.json();
          if (body && typeof body.message === 'string') {
            errorDetail = body.message;
          }
        } catch {
          // ignore
        }
        throw new Error(`Biquote HTTP ${response.status}: ${errorDetail}`);
      }

      const json = await response.json();
      const normalizedQuotes: MarketQuote[] = [];
      const now = Date.now();

      for (const internalSym of symbols) {
        const biquoteSym = toBiquoteSymbol(internalSym);
        if (!biquoteSym) continue;

        const raw = json[biquoteSym];
        if (!raw) continue;

        const quote = this.normalizeQuote(raw, now);
        if (quote) {
          normalizedQuotes.push(quote);
          this.lastQuotes.set(internalSym, quote);
        }
      }

      this.lastFetchedAt = new Date(now).toISOString();
      this.lastSuccessfulUpdate = this.lastFetchedAt;
      this.evaluateStatus(symbols);
      return Array.from(this.lastQuotes.values());
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.evaluateStatus(symbols);
      if (this.lastQuotes.size === 0) {
        this.health = 'ERROR';
        this.message = `Failed to fetch REST snapshot from Biquote: ${errMsg}`;
      }
      return Array.from(this.lastQuotes.values());
    }
  }

  public normalizeQuote(raw: any, nowMs: number = Date.now()): MarketQuote | null {
    if (!raw || typeof raw !== 'object') return null;

    const internalSymbol = toInternalSymbol(raw.symbol);
    if (!internalSymbol) return null;

    if (typeof raw.bid !== 'number' || isNaN(raw.bid) || raw.bid <= 0) return null;
    if (typeof raw.ask !== 'number' || isNaN(raw.ask) || raw.ask <= 0) return null;
    if (raw.ask < raw.bid) return null;

    if (!raw.timestamp) return null;
    const timeMs = Date.parse(raw.timestamp);
    if (isNaN(timeMs)) return null;

    const [baseCurrency, quoteCurrency] = internalSymbol.split('/');
    if (!baseCurrency || !quoteCurrency) return null;

    const mid =
      typeof raw.mid === 'number' && !isNaN(raw.mid)
        ? raw.mid
        : Number(((raw.bid + raw.ask) / 2).toFixed(5));

    const changePercent =
      typeof raw.dayDiffPercent === 'number' && !isNaN(raw.dayDiffPercent)
        ? raw.dayDiffPercent
        : null;

    const open =
      changePercent !== null ? Number((mid / (1 + changePercent / 100)).toFixed(5)) : null;

    const change = open !== null ? Number((mid - open).toFixed(5)) : null;

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
      dailyReturnPercent: changePercent,
      timestamp: timeMs,
      interval: 'live',
      source: 'Biquote',
      sourceStatus: this.health,
      fetchedAt: new Date(nowMs).toISOString(),
      bid: raw.bid,
      ask: raw.ask,
      mid,
      spread:
        typeof raw.spread === 'number' && !isNaN(raw.spread)
          ? raw.spread
          : Number((raw.ask - raw.bid).toFixed(5)),
      providerTimestamp: raw.timestamp,
      receivedAt: new Date(nowMs).toISOString(),
      quoteAgeSeconds,
      stale,
      marketState: raw.marketState ?? 'open'
    };
  }

  public async startLiveStream(): Promise<void> {
    this.isExplicitlyClosed = false;

    // Idempotent: If already connected or active socket is open, no-op
    if (this.streamState === 'CONNECTED' && this.activeWs) {
      return;
    }

    // Idempotent: If a connection attempt is in-flight, return the shared promise
    if (this.liveStreamPromise) {
      return this.liveStreamPromise;
    }

    this.liveStreamPromise = this.internalStartLiveStream();
    try {
      await this.liveStreamPromise;
    } finally {
      this.liveStreamPromise = null;
    }
  }

  private async internalStartLiveStream(): Promise<void> {
    if (this.isExplicitlyClosed) return;
    if (this.streamState === 'CONNECTED' && this.activeWs) return;

    this.streamState = 'CONNECTING';
    this.connectionGeneration++;
    const currentGeneration = this.connectionGeneration;

    if (this.activeWs) {
      try {
        this.activeWs.onopen = null;
        this.activeWs.onmessage = null;
        this.activeWs.onerror = null;
        this.activeWs.onclose = null;
        this.activeWs.close();
      } catch {
        // ignore
      }
      this.activeWs = null;
    }

    this.evaluateStatus();

    try {
      const negotiateUrl = `${this.baseUrl}/hubs/tick/negotiate?negotiateVersion=1`;
      const negResponse = await this.fetchFn(negotiateUrl, {
        method: 'POST',
        headers: { Accept: 'application/json' }
      });

      if (this.connectionGeneration !== currentGeneration || this.isExplicitlyClosed) return;

      if (!negResponse.ok) {
        throw new Error(`SignalR negotiate failed with HTTP ${negResponse.status}`);
      }

      const negData = await negResponse.json();
      const token = negData.connectionToken || negData.connectionId;
      if (!token) {
        throw new Error('SignalR negotiate returned no connection token');
      }

      if (this.connectionGeneration !== currentGeneration || this.isExplicitlyClosed) return;

      const wsBase = this.baseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
      const wsUrl = `${wsBase}/hubs/tick?id=${encodeURIComponent(token)}`;

      const ws = this.wsFactory(wsUrl);
      this.activeWs = ws;

      let disconnectHandled = false;

      ws.onopen = () => {
        if (this.connectionGeneration !== currentGeneration || this.activeWs !== ws) return;
        this.streamState = 'CONNECTING';
        this.evaluateStatus();
        ws.send(JSON.stringify({ protocol: 'json', version: 1 }) + '\u001e');
      };

      ws.onmessage = (event) => {
        if (this.connectionGeneration !== currentGeneration || this.activeWs !== ws) return;

        const rawData = typeof event.data === 'string' ? event.data : String(event.data);
        const messages = rawData.split('\u001e').filter(Boolean);

        for (const msg of messages) {
          if (msg === '{}') {
            this.streamState = 'CONNECTED';
            this.reconnectAttempts = 0;
            this.isReconnecting = false;
            if (this.reconnectTimer) {
              clearTimeout(this.reconnectTimer);
              this.reconnectTimer = null;
            }

            const biquoteSymbols = this.requiredPairs
              .map(toBiquoteSymbol)
              .filter((s): s is string => s !== null);
            const subscribeMsg =
              JSON.stringify({
                type: 1,
                target: 'Subscribe',
                arguments: [biquoteSymbols]
              }) + '\u001e';
            ws.send(subscribeMsg);
            this.evaluateStatus();
          } else {
            try {
              const parsed = JSON.parse(msg);
              if (
                parsed.type === 1 &&
                parsed.target === 'ReceiveTick' &&
                Array.isArray(parsed.arguments) &&
                parsed.arguments[0]
              ) {
                const tickRaw = parsed.arguments[0];
                const normalized = this.normalizeQuote(tickRaw);
                if (normalized) {
                  this.lastQuotes.set(normalized.symbol, normalized);
                  this.lastSuccessfulUpdate = new Date().toISOString();
                  this.evaluateStatus();
                  this.onTickCallback?.(normalized);
                }
              } else if (parsed.type === 6) {
                try {
                  ws.send('{"type":6}\u001e');
                } catch {
                  // ignore
                }
              }
            } catch {
              // ignore malformed frame
            }
          }
        }
      };

      const onDisconnect = (reason: string) => {
        if (this.connectionGeneration !== currentGeneration || this.activeWs !== ws) return;
        if (disconnectHandled) return;
        disconnectHandled = true;
        this.handleStreamDisconnect(reason, currentGeneration);
      };

      ws.onerror = () => {
        onDisconnect('WebSocket error encountered');
      };

      ws.onclose = () => {
        onDisconnect('WebSocket connection closed');
      };
    } catch (err) {
      if (this.connectionGeneration === currentGeneration) {
        const errMsg = err instanceof Error ? err.message : String(err);
        this.handleStreamDisconnect(errMsg, currentGeneration);
      }
    }
  }

  private handleStreamDisconnect(reason: string, generation: number): void {
    if (this.isExplicitlyClosed) return;
    if (generation !== this.connectionGeneration) return;

    // Advance generation immediately so stale callbacks from this socket cannot trigger duplicate disconnects
    this.connectionGeneration++;

    if (this.activeWs) {
      try {
        this.activeWs.onopen = null;
        this.activeWs.onmessage = null;
        this.activeWs.onerror = null;
        this.activeWs.onclose = null;
        this.activeWs.close();
      } catch {
        // ignore
      }
      this.activeWs = null;
    }

    this.streamState = 'DISCONNECTED';
    this.isReconnecting = true;
    this.evaluateStatus();

    this.fetchDailyQuotes().catch(() => {});

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const delay = Math.min(30000, Math.round(2000 * Math.pow(1.5, this.reconnectAttempts++)));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.isExplicitlyClosed) {
        this.startLiveStream().catch(() => {});
      }
    }, delay);
  }

  public stopLiveStream(): void {
    this.isExplicitlyClosed = true;
    this.connectionGeneration++;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.activeWs) {
      try {
        this.activeWs.onopen = null;
        this.activeWs.onmessage = null;
        this.activeWs.onerror = null;
        this.activeWs.onclose = null;
        this.activeWs.close();
      } catch {
        // ignore
      }
      this.activeWs = null;
    }

    this.streamState = 'OFFLINE';
    this.isReconnecting = false;
    this.evaluateStatus();
  }

  public evaluateStatus(symbols: string[] = this.requiredPairs): void {
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
    const totalQuotes = this.lastQuotes.size;
    const allFreshAndComplete =
      freshCount === symbols.length && missing.length === 0 && stale.length === 0;

    if (this.streamState === 'CONNECTED' && allFreshAndComplete && !this.isReconnecting) {
      this.health = 'CONNECTED';
      this.message = `Biquote live stream connected. All ${symbols.length}/${symbols.length} pairs fresh.`;
    } else if (freshCount > 0 || totalQuotes > 0) {
      this.health = 'DEGRADED';
      if (this.streamState === 'CONNECTED') {
        this.message = `Biquote degraded: ${freshCount}/${symbols.length} fresh, ${stale.length} stale, ${missing.length} missing.`;
      } else if (this.isReconnecting || this.streamState === 'CONNECTING') {
        this.message = `Biquote live stream disconnected; REST market data remains available (${freshCount}/${symbols.length} fresh). Reconnecting.`;
      } else {
        this.message = `Biquote live stream disconnected; REST market data remains available (${freshCount}/${symbols.length} fresh).`;
      }
    } else if (this.streamState === 'CONNECTING') {
      this.health = 'CONNECTING';
      this.message = 'Connecting to Biquote live stream...';
    } else if (this.streamState === 'DISCONNECTED' || this.streamState === 'OFFLINE') {
      this.health = 'DISCONNECTED';
      this.message = 'Biquote live stream disconnected and no usable market data is available.';
    } else {
      this.health = 'ERROR';
      this.message = 'Biquote error: No valid market quotes available.';
    }
  }

  public getQuotes(): MarketQuote[] {
    this.evaluateStatus();
    return Array.from(this.lastQuotes.values());
  }

  public getStatus(): ProviderStatus {
    this.evaluateStatus();
    const quotes = Array.from(this.lastQuotes.values());
    const stalePairs = quotes.filter((q) => q.stale).map((q) => q.symbol);
    const freshQuotes = quotes.filter((q) => !q.stale && q.changePercent !== null);
    const ages = quotes.map((q) => q.quoteAgeSeconds ?? 0);
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
