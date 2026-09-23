/**
 * Market Data Configuration
 * Centralizes all symbol lists, currency definitions, cache durations,
 * and mathematical scaling constants.
 */

export const SUPPORTED_MAJOR_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'NZD'
] as const;

export type SupportedCurrency = typeof SUPPORTED_MAJOR_CURRENCIES[number];

/**
 * Liquid major and cross pairs used to calculate currency relative strength.
 * At least 15 liquid pairs ensuring every major currency has multiple cross observations.
 */
export const DEFAULT_LIQUID_PAIRS: readonly string[] = [
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'USD/CHF',
  'AUD/USD',
  'NZD/USD',
  'USD/CAD',
  'EUR/GBP',
  'EUR/JPY',
  'GBP/JPY',
  'EUR/CHF',
  'GBP/CHF',
  'AUD/JPY',
  'NZD/JPY',
  'CAD/JPY'
] as const;

/**
 * Cache duration for D1 market data.
 * Default: 10 minutes (600,000 ms).
 * Respects Twelve Data free tier limits while keeping observations fresh.
 */
export const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Cache duration for provider health checks (1 minute).
 */
export const HEALTH_CACHE_TTL_MS = 60 * 1000;

/**
 * Default freshness threshold for live market quotes (30 seconds).
 * Quotes older than this threshold are marked stale and excluded from live calculation.
 */
export const DEFAULT_FRESHNESS_THRESHOLD_SECONDS = 30;

/**
 * Biquote Public Endpoints
 * No API key required. Anonymous rate limit: 15,000 req/min.
 */
export const BIQUOTE_API_BASE_URL = 'https://biquote.io';
export const BIQUOTE_WS_HUB_URL = 'wss://biquote.io/hubs/tick';

/**
 * Scaling factor (lambda) for mapping demeaned daily percentage return into
 * the [-0.30, +0.30] classification score space.
 * 
 * Example:
 * An outperformance of +0.40% relative to the basket mean yields:
 * +0.40 * 0.25 = +0.10 (STRONG threshold).
 * An underperformance of -0.40% yields:
 * -0.40 * 0.25 = -0.10 (WEAK threshold).
 */
export const MARKET_STRENGTH_SCALE_FACTOR = 0.25;
