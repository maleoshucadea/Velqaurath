import {
  CurrencyPair,
  EconomicEvent,
  WatchWindowInfo,
  WatchState,
  MarketSession
} from '../../types';
import { MARKET_SESSIONS, getActiveSessionOverview, getSessionInstantStatus } from '../../data/sessions';

export interface PairSessionRelevance {
  pairSymbol: string;
  primarySession: string;
  relevantSessions: string[];
  structuralRationale: string;
  peakLiquidityWindowUtc: string;
}

// Initial structural pair-to-session relationships
export const PAIR_SESSION_MAPPINGS: Record<string, PairSessionRelevance> = {
  'USD/JPY': {
    pairSymbol: 'USD/JPY',
    primarySession: 'Tokyo',
    relevantSessions: ['Tokyo', 'New York'],
    structuralRationale: 'Core volume centers on Tokyo fix (00:55 UTC) and NY morning overlap for Fed/BOJ macro repricing.',
    peakLiquidityWindowUtc: '00:00 - 06:00 UTC & 13:00 - 16:00 UTC'
  },
  'EUR/USD': {
    pairSymbol: 'EUR/USD',
    primarySession: 'London / New York',
    relevantSessions: ['London', 'New York'],
    structuralRationale: 'Peak global institutional turnover during London/NY overlap, absorbing Eurozone and US macro releases.',
    peakLiquidityWindowUtc: '12:00 - 16:30 UTC'
  },
  'GBP/USD': {
    pairSymbol: 'GBP/USD',
    primarySession: 'London / New York',
    relevantSessions: ['London', 'New York'],
    structuralRationale: 'London morning price discovery driven by ONS prints, followed by NY session liquidity.',
    peakLiquidityWindowUtc: '08:00 - 16:30 UTC'
  },
  'EUR/JPY': {
    pairSymbol: 'EUR/JPY',
    primarySession: 'Tokyo / London',
    relevantSessions: ['Tokyo', 'London'],
    structuralRationale: 'High cross-liquidity during Asian morning and European handover.',
    peakLiquidityWindowUtc: '07:00 - 11:00 UTC'
  },
  'AUD/JPY': {
    pairSymbol: 'AUD/JPY',
    primarySession: 'Sydney / Tokyo',
    relevantSessions: ['Sydney', 'Tokyo'],
    structuralRationale: 'Primary Asia-Pacific risk barometer. Deepest participation during Asian cash equity hours.',
    peakLiquidityWindowUtc: '00:00 - 07:00 UTC'
  },
  'USD/CAD': {
    pairSymbol: 'USD/CAD',
    primarySession: 'New York',
    relevantSessions: ['New York'],
    structuralRationale: 'Direct sensitivity to North American macroeconomic releases at 12:30 UTC and EIA energy storage data.',
    peakLiquidityWindowUtc: '12:00 - 18:00 UTC'
  },
  'EUR/GBP': {
    pairSymbol: 'EUR/GBP',
    primarySession: 'London',
    relevantSessions: ['London'],
    structuralRationale: 'European cross trading predominantly within London and continental European banking hours.',
    peakLiquidityWindowUtc: '08:00 - 15:00 UTC'
  },
  'USD/CHF': {
    pairSymbol: 'USD/CHF',
    primarySession: 'London / New York',
    relevantSessions: ['London', 'New York'],
    structuralRationale: 'European morning capital flows paired with US dollar afternoon liquidity.',
    peakLiquidityWindowUtc: '08:00 - 16:00 UTC'
  },
  'AUD/USD': {
    pairSymbol: 'AUD/USD',
    primarySession: 'Sydney / Tokyo',
    relevantSessions: ['Sydney', 'Tokyo', 'New York'],
    structuralRationale: 'Dual-session structure: Sydney/Tokyo covers domestic Australian data, NY absorbs commodity sentiment.',
    peakLiquidityWindowUtc: '01:00 - 06:00 UTC & 13:00 - 16:00 UTC'
  },
  'NZD/USD': {
    pairSymbol: 'NZD/USD',
    primarySession: 'Sydney / Tokyo',
    relevantSessions: ['Sydney', 'Tokyo', 'New York'],
    structuralRationale: 'Wellington/Sydney morning data releases followed by US macro session reactions.',
    peakLiquidityWindowUtc: '21:00 - 05:00 UTC & 13:00 - 16:00 UTC'
  },
  'GBP/JPY': {
    pairSymbol: 'GBP/JPY',
    primarySession: 'Tokyo / London',
    relevantSessions: ['Tokyo', 'London'],
    structuralRationale: 'Volatile cross active across both Asian afternoon and London market hours.',
    peakLiquidityWindowUtc: '07:00 - 14:00 UTC'
  },
  'CAD/JPY': {
    pairSymbol: 'CAD/JPY',
    primarySession: 'Tokyo / New York',
    relevantSessions: ['Tokyo', 'New York'],
    structuralRationale: 'Asian morning liquidity meets North American afternoon energy trading.',
    peakLiquidityWindowUtc: '00:00 - 06:00 UTC & 13:00 - 17:00 UTC'
  }
};

export function getPairSessionRelevance(pairSymbol: string): PairSessionRelevance {
  const clean = pairSymbol.replace(/[-_]/g, '/').toUpperCase();
  if (PAIR_SESSION_MAPPINGS[clean]) {
    return PAIR_SESSION_MAPPINGS[clean];
  }

  // Fallback structural estimation based on constituent currencies
  const [base, quote] = clean.split('/');
  const sessions: string[] = [];
  if (base === 'USD' || quote === 'USD') sessions.push('New York');
  if (base === 'EUR' || quote === 'EUR' || base === 'GBP' || quote === 'GBP' || base === 'CHF' || quote === 'CHF') sessions.push('London');
  if (base === 'JPY' || quote === 'JPY') sessions.push('Tokyo');
  if (base === 'AUD' || quote === 'AUD' || base === 'NZD' || quote === 'NZD') sessions.push('Sydney');

  const primarySession = sessions.length > 1 ? `${sessions[0]} / ${sessions[1]}` : (sessions[0] || 'London');

  return {
    pairSymbol: clean,
    primarySession,
    relevantSessions: sessions,
    structuralRationale: `Constituent currency sessions dictate primary market liquidity for ${clean}.`,
    peakLiquidityWindowUtc: '08:00 - 16:00 UTC'
  };
}

/**
 * Watch Window Engine (Part 10 & 11)
 * Evaluates active sessions, upcoming catalysts, and produces the pair watch window.
 */
export function calculateWatchWindow(
  pair: CurrencyPair,
  events: EconomicEvent[],
  date = new Date(),
  isDataFeedConnected = true
): WatchWindowInfo {
  if (!isDataFeedConnected) {
    return {
      sessionName: 'DATA UNAVAILABLE',
      watchWindow: 'DATA SOURCE NOT CONNECTED',
      whyThisWindowMatters: 'Session monitoring requires active connection to real-time clock and calendar feeds.',
      upcomingCatalyst: null,
      riskState: 'DATA_UNAVAILABLE',
      watchState: 'DATA UNAVAILABLE'
    };
  }

  const relevance = getPairSessionRelevance(pair.symbol);
  const sessionOverview = getActiveSessionOverview(date);

  // Find upcoming catalysts relevant to base or quote currency
  const nowMs = date.getTime();
  const pairEvents = events.filter(e => {
    const isPairCurrency = e.currency === pair.baseCurrency || e.currency === pair.quoteCurrency;
    const eventTime = new Date(e.scheduledTime).getTime();
    return isPairCurrency && eventTime >= nowMs;
  }).sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());

  const upcomingCatalyst = pairEvents[0] || null;

  // Determine watch state and risk
  let watchState: WatchState = 'LOW-ACTIVITY';
  let riskState: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' = 'LOW';
  let whyThisWindowMatters = relevance.structuralRationale;

  // Check if primary session is currently active
  const openSessionNames = sessionOverview.openSessions.map(s => s.session.name);
  const isPrimaryActive = relevance.relevantSessions.some(rs => openSessionNames.includes(rs));

  if (upcomingCatalyst) {
    const hoursUntil = (new Date(upcomingCatalyst.scheduledTime).getTime() - nowMs) / (1000 * 60 * 60);

    if (hoursUntil <= 4 && hoursUntil >= 0) {
      watchState = 'EVENT-SENSITIVE';
      riskState = upcomingCatalyst.importance === 'HIGH' ? 'HIGH' : 'ELEVATED';
      whyThisWindowMatters = `Upcoming ${upcomingCatalyst.currency} ${upcomingCatalyst.name} scheduled in ${Math.round(hoursUntil * 10) / 10} hours. Pre-event volatility and spread widening may occur.`;
    } else if (hoursUntil <= 24) {
      watchState = isPrimaryActive ? 'ACTIVE' : 'WAITING FOR CATALYST';
      riskState = upcomingCatalyst.importance === 'HIGH' ? 'MODERATE' : 'LOW';
      whyThisWindowMatters = `Awaiting ${upcomingCatalyst.currency} catalyst (${upcomingCatalyst.name}). Structural trading active in ${relevance.primarySession}.`;
    } else {
      watchState = isPrimaryActive ? 'ACTIVE' : 'WATCH';
      riskState = 'LOW';
    }
  } else {
    watchState = isPrimaryActive ? 'ACTIVE' : 'WATCH';
  }

  return {
    sessionName: relevance.primarySession,
    watchWindow: relevance.peakLiquidityWindowUtc,
    whyThisWindowMatters,
    upcomingCatalyst,
    riskState,
    watchState
  };
}
