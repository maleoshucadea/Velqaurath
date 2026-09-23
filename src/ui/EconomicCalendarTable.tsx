import React from 'react';
import { EconomicEvent } from '../types';

interface EconomicCalendarTableProps {
  events: EconomicEvent[];
  onSelectCurrency?: (code: string) => void;
}

export const EconomicCalendarTable: React.FC<EconomicCalendarTableProps> = ({
  events,
  onSelectCurrency
}) => {
  return (
    <section className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide">
            Economic Calendar
          </h2>
          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Scheduled releases · Primary central bank decisions
          </p>
        </div>
        <span className="text-[11px] font-mono text-neutral-500">
          {events.length} Events Tracked
        </span>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr className="border-b border-neutral-800 text-[11px] text-neutral-500 uppercase">
              <th className="py-2 px-2 font-medium">Time (UTC)</th>
              <th className="py-2 px-2 font-medium">Curr</th>
              <th className="py-2 px-2 font-medium font-sans">Event</th>
              <th className="py-2 px-2 font-medium">Imp</th>
              <th className="py-2 px-2 font-medium text-right">Prev</th>
              <th className="py-2 px-2 font-medium text-right">Consensus</th>
              <th className="py-2 px-2 font-medium text-right">Actual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {events.map(event => {
              const timeFormatted = new Date(event.scheduledTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'UTC'
              });
              const dateFormatted = new Date(event.scheduledTime).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC'
              });

              return (
                <tr key={event.id} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="py-2.5 px-2 text-neutral-400 whitespace-nowrap">
                    {dateFormatted} {timeFormatted}
                  </td>
                  <td className="py-2.5 px-2">
                    <button
                      onClick={() => onSelectCurrency?.(event.currency)}
                      className="font-bold text-neutral-200 hover:text-emerald-400 transition-colors"
                    >
                      {event.currency}
                    </button>
                  </td>
                  <td className="py-2.5 px-2 font-sans font-medium text-neutral-200 min-w-[200px]">
                    {event.name}
                    {event.source && (
                      <span className="block text-[10px] text-neutral-500 font-mono mt-0.5">
                        Source: {event.source}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`text-[10px] font-bold ${
                        event.importance === 'HIGH'
                          ? 'text-rose-400'
                          : event.importance === 'MEDIUM'
                          ? 'text-amber-400'
                          : 'text-neutral-500'
                      }`}
                    >
                      {event.importance}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right text-neutral-400 tabular-nums">
                    {event.previous !== null ? `${event.previous}${event.unit}` : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right text-neutral-300 tabular-nums">
                    {event.forecast !== null ? `${event.forecast}${event.unit}` : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {event.actual !== null ? (
                      <span className="font-bold text-emerald-400">
                        {event.actual}{event.unit}
                      </span>
                    ) : (
                      <span className="text-neutral-500 italic text-[10px]">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
