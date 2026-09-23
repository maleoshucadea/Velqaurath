import React from 'react';
import { MarketSession, EconomicEvent } from '../types';
import { getSessionInstantStatus, getActiveSessionOverview } from '../data/sessions';
import { PAIR_SESSION_MAPPINGS } from '../engines/session/sessionEngine';
import { Clock, Globe, Zap, CheckCircle2, XCircle } from 'lucide-react';

interface SessionsViewProps {
  sessions: MarketSession[];
  calendarEvents: EconomicEvent[];
  onSelectPair?: (symbol: string) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  sessions,
  calendarEvents,
  onSelectPair
}) => {
  const now = new Date();
  const sessionStatuses = sessions.map(s => getSessionInstantStatus(s, now));
  const overview = getActiveSessionOverview(now);

  const mappings = Object.values(PAIR_SESSION_MAPPINGS);

  return (
    <section className="space-y-4 text-neutral-200">
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400" /> Market Sessions & Liquidity Windows
            </h2>
            <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
              Calculated using authoritative IANA timezones and local DST transitions
            </p>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs font-bold text-neutral-100">
              {now.toUTCString()}
            </span>
          </div>
        </div>

        {/* Overlaps banner */}
        <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded mb-4">
          <span className="text-[11px] font-mono uppercase text-sky-400 font-bold block mb-1">
            Active Liquidity Overlaps
          </span>
          {overview.activeOverlaps.length === 0 ? (
            <p className="text-xs text-neutral-500 italic">
              No overlapping session window active at current UTC hour.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mt-1">
              {overview.activeOverlaps.map(ov => (
                <span
                  key={ov}
                  className="px-2.5 py-1 rounded bg-sky-950/50 border border-sky-600/40 text-sky-300 font-mono text-xs font-semibold"
                >
                  {ov}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Sessions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sessionStatuses.map(st => {
            const { session, isOpen, localTimeFormatted, utcOffsetHours, isDstActive } = st;
            return (
              <div
                key={session.id}
                className={`p-3 rounded border font-mono ${
                  isOpen
                    ? 'bg-neutral-900/90 border-emerald-500/40 shadow-sm'
                    : 'bg-neutral-950/50 border-neutral-800/80 text-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-neutral-100">{session.name}</span>
                  {isOpen ? (
                    <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> OPEN
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase text-neutral-600 font-medium">CLOSED</span>
                  )}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Local Time:</span>
                    <span className="text-neutral-200 font-bold tabular-nums">{localTimeFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">UTC Offset:</span>
                    <span className="text-neutral-300 tabular-nums">
                      {utcOffsetHours >= 0 ? `+${utcOffsetHours}` : utcOffsetHours}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">DST Status:</span>
                    <span className={isDstActive ? 'text-amber-400' : 'text-neutral-500'}>
                      {isDstActive ? 'DST Active' : 'Standard'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-neutral-800 text-[11px]">
                    <span className="text-neutral-500">Hours:</span>
                    <span className="text-neutral-400">
                      {String(session.openHourLocal).padStart(2, '0')}:{String(session.openMinuteLocal).padStart(2, '0')} - {String(session.closeHourLocal).padStart(2, '0')}:{String(session.closeMinuteLocal).padStart(2, '0')} Local
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Structural Pair Relevance Mapping */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
        <div className="pb-3 border-b border-neutral-800 mb-3">
          <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide">
            Pair / Session Relevance Architecture
          </h3>
          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Institutional liquidity windows and macro news release alignment
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mappings.map(m => (
            <div
              key={m.pairSymbol}
              onClick={() => onSelectPair?.(m.pairSymbol)}
              className="p-3 bg-neutral-950/70 border border-neutral-800 rounded hover:border-neutral-700 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between font-mono mb-1">
                <span className="font-bold text-sm text-neutral-100">{m.pairSymbol}</span>
                <span className="text-xs text-sky-400 font-semibold">{m.primarySession}</span>
              </div>
              <p className="text-xs text-neutral-300 font-sans leading-relaxed mb-2">
                {m.structuralRationale}
              </p>
              <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                <span>Peak Liquidity:</span>
                <span className="text-neutral-300">{m.peakLiquidityWindowUtc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
