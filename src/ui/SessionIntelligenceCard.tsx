import React from 'react';
import { Clock } from 'lucide-react';
import { MarketSession, EconomicEvent } from '../types';
import { calculateSessionStatus } from '../engines/session/sessionEngine';

interface SessionIntelligenceCardProps {
  sessions: MarketSession[];
  activeOverlaps: string[];
  calendarEvents: EconomicEvent[];
  onSelectPair?: (symbol: string) => void;
}

export const SessionIntelligenceCard: React.FC<SessionIntelligenceCardProps> = ({
  sessions,
  activeOverlaps,
  calendarEvents
}) => {
  const now = new Date();
  const sessionStatuses = sessions.map((s) => calculateSessionStatus(s, now));
  const activeFinancialCenters = sessionStatuses.filter((s) => s.isOpen);
  const nextCatalyst = calendarEvents.find((e) => new Date(e.scheduledTime).getTime() > now.getTime());
  const currentTimeUtc = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' }) + ' UTC';

  return (
    <section className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-sky-400" /> Session Intelligence
          </h2>
          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
            DST-aware session calculations · Real-time financial centres
          </p>
        </div>
        <div className="text-right">
          <span className="font-mono text-xs font-bold text-neutral-200 tabular-nums">
            {currentTimeUtc}
          </span>
          <span className="block text-[10px] text-neutral-500 font-mono">
            London/NY/Tokyo/Sydney
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        {/* Active Centres */}
        <div className="p-3 bg-neutral-950/70 border border-neutral-800/90 rounded">
          <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 block mb-2 font-medium">
            Active Financial Centres
          </span>
          {activeFinancialCenters.length === 0 ? (
            <p className="text-xs text-neutral-500 italic">Weekend or inter-session transition.</p>
          ) : (
            <div className="space-y-1.5 font-mono text-xs">
              {activeFinancialCenters.map((s) => (
                <div key={s.session.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-neutral-200">{s.session.name}</span>
                  </div>
                  <span className="text-[11px] text-neutral-400 tabular-nums">
                    {s.localTimeFormatted} ({s.utcOffsetHours >= 0 ? `+${s.utcOffsetHours}` : s.utcOffsetHours}h)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Session Overlaps */}
        <div className="p-3 bg-neutral-950/70 border border-neutral-800/90 rounded">
          <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 block mb-2 font-medium">
            Session Overlaps
          </span>
          {activeOverlaps.length === 0 ? (
            <p className="text-xs text-neutral-500 italic">No overlapping session windows active currently.</p>
          ) : (
            <div className="space-y-1 text-xs">
              {activeOverlaps.map((overlap) => (
                <div
                  key={overlap}
                  className="p-1.5 rounded bg-neutral-900/90 border border-sky-500/20 text-sky-300 font-medium font-mono text-[11px]"
                >
                  {overlap}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Next Catalyst */}
        <div className="p-3 bg-neutral-950/70 border border-neutral-800/90 rounded">
          <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 block mb-2 font-medium">
            Next Catalyst / Transition
          </span>
          {nextCatalyst ? (
            <div className="text-xs font-mono">
              <span className="text-neutral-400 block text-[10px] uppercase">Upcoming Catalyst</span>
              <span className="font-bold text-neutral-100 block mt-0.5 line-clamp-1">
                {nextCatalyst.currency} {nextCatalyst.name}
              </span>
              <span className="text-[11px] text-amber-400/90 block mt-1">
                {new Date(nextCatalyst.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC
              </span>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 italic">No immediate high-impact release scheduled.</p>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-neutral-800/80 flex flex-wrap items-center justify-between text-[11px] font-mono text-neutral-400 gap-2">
        <span>Structural Focus:</span>
        <div className="flex flex-wrap gap-2 text-neutral-300">
          <span className="text-neutral-500">
            Tokyo: <span className="text-neutral-200">USD/JPY · AUD/JPY</span>
          </span>
          <span className="text-neutral-700 hidden sm:inline">|</span>
          <span className="text-neutral-500">
            London: <span className="text-neutral-200">EUR/GBP · GBP/USD</span>
          </span>
          <span className="text-neutral-700 hidden sm:inline">|</span>
          <span className="text-neutral-500">
            New York: <span className="text-neutral-200">USD/CAD · EUR/USD</span>
          </span>
        </div>
      </div>
    </section>
  );
};
