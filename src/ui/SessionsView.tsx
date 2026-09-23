import React from 'react';
import { Clock } from 'lucide-react';
import { MarketSession, EconomicEvent } from '../types';
import { calculateSessionStatus, PAIR_SESSION_RELEVANCE } from '../engines/session/sessionEngine';

interface SessionsViewProps {
  sessions: MarketSession[];
  calendarEvents: EconomicEvent[];
  onSelectPair?: (symbol: string) => void;
}

export const SessionsView: React.FC<SessionsViewProps> = ({
  sessions,
  onSelectPair
}) => {
  const now = new Date();
  const sessionStatuses = sessions.map((s) => calculateSessionStatus(s, now));
  const relevanceList = Object.values(PAIR_SESSION_RELEVANCE);

  return (
    <section className="space-y-4 text-neutral-200">
      {/* Session Centers */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400" /> Global Financial Centers
            </h2>
            <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
              Real-time clock · Daylight Saving Time detection
            </p>
          </div>
          <div className="text-xs font-mono text-neutral-400">
            UTC: <span className="text-neutral-200 font-bold">{now.toISOString().slice(11, 19)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {sessionStatuses.map((st) => {
            const sess = st.session;
            return (
              <div
                key={sess.id}
                className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-lg font-mono"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-neutral-100">{sess.name}</span>
                  {st.isOpen ? (
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
                    <span className="text-neutral-200 font-bold tabular-nums">{st.localTimeFormatted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">UTC Offset:</span>
                    <span className="text-neutral-300 tabular-nums">
                      {st.utcOffsetHours >= 0 ? `+${st.utcOffsetHours}` : st.utcOffsetHours}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">DST Status:</span>
                    <span className={st.isDstActive ? 'text-amber-400' : 'text-neutral-500'}>
                      {st.isDstActive ? 'DST Active' : 'Standard'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-neutral-800 text-[11px]">
                    <span className="text-neutral-500">Hours:</span>
                    <span className="text-neutral-400">
                      {String(sess.openHourLocal).padStart(2, '0')}:{String(sess.openMinuteLocal).padStart(2, '0')} - {String(sess.closeHourLocal).padStart(2, '0')}:{String(sess.closeMinuteLocal).padStart(2, '0')} Local
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Relevance Architecture */}
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
          {relevanceList.map((rel) => (
            <div
              key={rel.pairSymbol}
              onClick={() => onSelectPair?.(rel.pairSymbol)}
              className="p-3 bg-neutral-950/70 border border-neutral-800 rounded hover:border-neutral-700 cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between font-mono mb-1">
                <span className="font-bold text-sm text-neutral-100">{rel.pairSymbol}</span>
                <span className="text-xs text-sky-400 font-semibold">{rel.primarySession}</span>
              </div>
              <p className="text-xs text-neutral-300 font-sans leading-relaxed mb-2">
                {rel.structuralRationale}
              </p>
              <div className="pt-2 border-t border-neutral-900 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                <span>Peak Liquidity:</span>
                <span className="text-neutral-300">{rel.peakLiquidityWindowUtc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
