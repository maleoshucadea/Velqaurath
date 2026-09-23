import { MarketSession } from '../types';

export interface MarketSessionData extends MarketSession {
  financialCenter: string;
  primaryCurrencies: string[];
  openHourUtcStandard: number;
  closeHourUtcStandard: number;
  openHourLocal: number;
  openMinuteLocal: number;
  closeHourLocal: number;
  closeMinuteLocal: number;
  timeZone: string;
  hasDst: boolean;
  activeStatus: boolean;
  overlapsWith: string[];
}

export const MARKET_SESSIONS: MarketSessionData[] = [
  {
    id: 'sess-sydney',
    name: 'Sydney',
    financialCenter: 'Sydney, Australia',
    financialCentre: 'Sydney, Australia',
    primaryCurrencies: ['AUD', 'NZD'],
    openHourUtcStandard: 21,
    closeHourUtcStandard: 6,
    openHourLocal: 7,
    openMinuteLocal: 0,
    closeHourLocal: 16,
    closeMinuteLocal: 0,
    timeZone: 'Australia/Sydney',
    timezone: 'Australia/Sydney',
    hasDst: true,
    activeStatus: true,
    overlapsWith: ['sess-tokyo']
  },
  {
    id: 'sess-tokyo',
    name: 'Tokyo',
    financialCenter: 'Tokyo, Japan',
    financialCentre: 'Tokyo, Japan',
    primaryCurrencies: ['JPY'],
    openHourUtcStandard: 0,
    closeHourUtcStandard: 9,
    openHourLocal: 9,
    openMinuteLocal: 0,
    closeHourLocal: 18,
    closeMinuteLocal: 0,
    timeZone: 'Asia/Tokyo',
    timezone: 'Asia/Tokyo',
    hasDst: false,
    activeStatus: true,
    overlapsWith: ['sess-sydney', 'sess-london']
  },
  {
    id: 'sess-london',
    name: 'London',
    financialCenter: 'London, United Kingdom',
    financialCentre: 'London, United Kingdom',
    primaryCurrencies: ['EUR', 'GBP', 'CHF'],
    openHourUtcStandard: 8,
    closeHourUtcStandard: 16,
    openHourLocal: 8,
    openMinuteLocal: 0,
    closeHourLocal: 16,
    closeMinuteLocal: 30,
    timeZone: 'Europe/London',
    timezone: 'Europe/London',
    hasDst: true,
    activeStatus: true,
    overlapsWith: ['sess-tokyo', 'sess-newyork']
  },
  {
    id: 'sess-newyork',
    name: 'New York',
    financialCenter: 'New York, United States',
    financialCentre: 'New York, United States',
    primaryCurrencies: ['USD', 'CAD'],
    openHourUtcStandard: 13,
    closeHourUtcStandard: 22,
    openHourLocal: 8,
    openMinuteLocal: 0,
    closeHourLocal: 17,
    closeMinuteLocal: 0,
    timeZone: 'America/New_York',
    timezone: 'America/New_York',
    hasDst: true,
    activeStatus: true,
    overlapsWith: ['sess-london']
  }
];

export function getSessionInstantStatus(session: MarketSession, date: Date = new Date()) {
  const tz = session.timezone || session.timeZone;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZoneName: 'short'
  });

  const parts = formatter.formatToParts(date);
  const hourPart = parts.find((p) => p.type === 'hour');
  const minutePart = parts.find((p) => p.type === 'minute');
  const tzNamePart = parts.find((p) => p.type === 'timeZoneName');

  const localHour = hourPart ? parseInt(hourPart.value, 10) : 0;
  const localMinute = minutePart ? parseInt(minutePart.value, 10) : 0;
  const currentLocalMinutes = localHour * 60 + localMinute;

  const openMinutes = session.openHourLocal * 60 + session.openMinuteLocal;
  const closeMinutes = session.closeHourLocal * 60 + session.closeMinuteLocal;

  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short'
  });
  const weekday = weekdayFormatter.format(date);
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';

  let isOpen = false;
  if (!isWeekend) {
    if (openMinutes <= closeMinutes) {
      isOpen = currentLocalMinutes >= openMinutes && currentLocalMinutes < closeMinutes;
    } else {
      isOpen = currentLocalMinutes >= openMinutes || currentLocalMinutes < closeMinutes;
    }
  }

  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  const utcParts = utcFormatter.formatToParts(date);
  const utcHour = parseInt(utcParts.find((p) => p.type === 'hour')?.value || '0', 10);
  const utcMinute = parseInt(utcParts.find((p) => p.type === 'minute')?.value || '0', 10);

  let offsetMinutes = currentLocalMinutes - (utcHour * 60 + utcMinute);
  if (offsetMinutes > 720) offsetMinutes -= 1440;
  if (offsetMinutes < -720) offsetMinutes += 1440;
  const utcOffsetHours = Math.round((offsetMinutes / 60) * 10) / 10;

  const tzName = tzNamePart?.value || '';
  const isDstActive =
    tzName.includes('DT') ||
    tzName.includes('BST') ||
    tzName.includes('AEDT') ||
    tzName.includes('Daylight') ||
    (tz === 'Europe/London' && utcOffsetHours === 1) ||
    (tz === 'America/New_York' && utcOffsetHours === -4) ||
    (tz === 'Australia/Sydney' && utcOffsetHours === 11);

  const localTimeFormatted = `${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(
    2,
    '0'
  )}`;

  return {
    session,
    isOpen,
    localHour,
    localMinute,
    localTimeFormatted,
    utcOffsetHours,
    isDstActive,
    dstActive: isDstActive
  };
}

export function getActiveSessionOverview(date: Date = new Date()) {
  const statuses = MARKET_SESSIONS.map((s) => getSessionInstantStatus(s, date));
  const openSessions = statuses.filter((s) => s.isOpen);
  const closedSessions = statuses.filter((s) => !s.isOpen);

  const activeOverlaps: string[] = [];
  const openIds = new Set(openSessions.map((s) => s.session.id));

  if (openIds.has('sess-sydney') && openIds.has('sess-tokyo')) {
    activeOverlaps.push('Sydney / Tokyo (Asia-Pacific)');
  }
  if (openIds.has('sess-tokyo') && openIds.has('sess-london')) {
    activeOverlaps.push('Tokyo / London (Asia-Europe Transition)');
  }
  if (openIds.has('sess-london') && openIds.has('sess-newyork')) {
    activeOverlaps.push('London / New York (Global Liquidity Peak)');
  }

  return {
    openSessions,
    closedSessions,
    activeOverlaps,
    date
  };
}
