import { MarketSession } from '../types';

export const MARKET_SESSIONS: MarketSession[] = [
  {
    id: 'sess-sydney',
    name: 'Sydney',
    financialCentre: 'Sydney, Australia',
    timezone: 'Australia/Sydney',
    openHourLocal: 7,
    openMinuteLocal: 0,
    closeHourLocal: 16,
    closeMinuteLocal: 0,
    activeStatus: true,
    overlapsWith: ['sess-tokyo']
  },
  {
    id: 'sess-tokyo',
    name: 'Tokyo',
    financialCentre: 'Tokyo, Japan',
    timezone: 'Asia/Tokyo',
    openHourLocal: 9,
    openMinuteLocal: 0,
    closeHourLocal: 18,
    closeMinuteLocal: 0,
    activeStatus: true,
    overlapsWith: ['sess-sydney', 'sess-london']
  },
  {
    id: 'sess-london',
    name: 'London',
    financialCentre: 'London, United Kingdom',
    timezone: 'Europe/London',
    openHourLocal: 8,
    openMinuteLocal: 0,
    closeHourLocal: 16,
    closeMinuteLocal: 30,
    activeStatus: true,
    overlapsWith: ['sess-tokyo', 'sess-newyork']
  },
  {
    id: 'sess-newyork',
    name: 'New York',
    financialCentre: 'New York, United States',
    timezone: 'America/New_York',
    openHourLocal: 8,
    openMinuteLocal: 0,
    closeHourLocal: 17,
    closeMinuteLocal: 0,
    activeStatus: true,
    overlapsWith: ['sess-london']
  }
];

export interface SessionTimeInfo {
  session: MarketSession;
  isOpen: boolean;
  localHour: number;
  localMinute: number;
  localTimeFormatted: string;
  utcOffsetHours: number;
  isDstActive: boolean;
}

/**
 * Calculates current status for a given session at a specific instant,
 * dynamically extracting DST and local wall clock time using standard IANA timezones.
 */
export function getSessionInstantStatus(session: MarketSession, date = new Date()): SessionTimeInfo {
  // Format into session's local timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: session.timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZoneName: 'short'
  });

  const parts = formatter.formatToParts(date);
  const hourPart = parts.find(p => p.type === 'hour');
  const minutePart = parts.find(p => p.type === 'minute');
  const tzNamePart = parts.find(p => p.type === 'timeZoneName');

  const localHour = hourPart ? parseInt(hourPart.value, 10) : 0;
  const localMinute = minutePart ? parseInt(minutePart.value, 10) : 0;

  const currentLocalMinutes = localHour * 60 + localMinute;
  const openMinutes = session.openHourLocal * 60 + session.openMinuteLocal;
  const closeMinutes = session.closeHourLocal * 60 + session.closeMinuteLocal;

  // Day of week in local session
  const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: session.timezone,
    weekday: 'short'
  });
  const weekday = weekdayFormatter.format(date);
  const isWeekend = weekday === 'Sat' || weekday === 'Sun';

  let isOpen = false;
  if (!isWeekend) {
    if (openMinutes <= closeMinutes) {
      isOpen = currentLocalMinutes >= openMinutes && currentLocalMinutes < closeMinutes;
    } else {
      // Overnight wrap (if any)
      isOpen = currentLocalMinutes >= openMinutes || currentLocalMinutes < closeMinutes;
    }
  }

  // Calculate UTC offset
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  const utcParts = utcFormatter.formatToParts(date);
  const utcHour = parseInt(utcParts.find(p => p.type === 'hour')?.value || '0', 10);
  const utcMinute = parseInt(utcParts.find(p => p.type === 'minute')?.value || '0', 10);

  let offsetMinutes = (currentLocalMinutes - (utcHour * 60 + utcMinute));
  if (offsetMinutes > 720) offsetMinutes -= 1440;
  if (offsetMinutes < -720) offsetMinutes += 1440;
  const utcOffsetHours = Math.round((offsetMinutes / 60) * 10) / 10;

  // Check if DST is active by checking standard DST offset shift or zone naming
  const tzName = tzNamePart?.value || '';
  const isDstActive = 
    tzName.includes('DT') || 
    tzName.includes('BST') || 
    tzName.includes('AEDT') || 
    tzName.includes('Daylight') ||
    (session.timezone === 'Europe/London' && utcOffsetHours === 1) ||
    (session.timezone === 'America/New_York' && utcOffsetHours === -4) ||
    (session.timezone === 'Australia/Sydney' && utcOffsetHours === 11);

  const localTimeFormatted = `${String(localHour).padStart(2, '0')}:${String(localMinute).padStart(2, '0')}`;

  return {
    session,
    isOpen,
    localHour,
    localMinute,
    localTimeFormatted,
    utcOffsetHours,
    isDstActive
  };
}

/**
 * Returns currently open sessions, active overlaps, and upcoming sessions
 */
export function getActiveSessionOverview(date = new Date()) {
  const statuses = MARKET_SESSIONS.map(s => getSessionInstantStatus(s, date));
  const openSessions = statuses.filter(s => s.isOpen);
  const closedSessions = statuses.filter(s => !s.isOpen);

  // Active Overlaps
  const activeOverlaps: string[] = [];
  const openIds = new Set(openSessions.map(s => s.session.id));

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
