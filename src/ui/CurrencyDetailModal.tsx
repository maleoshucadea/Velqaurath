import React from 'react';
import { X, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CurrencyState, EconomicEvent } from '../types';

interface CurrencyDetailModalProps {
  currencyState: CurrencyState | null;
  events: EconomicEvent[];
  onClose: () => void;
  onSelectPair?: (symbol: string) => void;
}

export const CurrencyDetailModal: React.FC<CurrencyDetailModalProps> = ({
  currencyState,
  events,
  onClose,
  onSelectPair
}) => {
  if (!currencyState) return null;

  const {
    currency,
    marketStrength,
    marketState,
    relativeStrengthBreakdown,
    fundamentalState,
    centralBank,
    overallState,
    supportingEvidence,
    conflictingEvidence,
    confidenceMetadata
  } = currencyState;

  const upcomingEvents = events.filter((e) => e.currency === currency.code);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-neutral-950 border-l border-neutral-800 h-full overflow-y-auto p-4 sm:p-6 text-neutral-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-neutral-100">
                {currency.code}
              </span>
              <span className="text-xs font-mono text-neutral-500">
                ({currency.name} · {currency.region})
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 font-mono text-xs text-neutral-400">
              <span>Overall Stance:</span>
              <span
                className={`font-bold ${
                  overallState === 'STRONG'
                    ? 'text-emerald-400'
                    : overallState === 'WEAK'
                    ? 'text-rose-400'
                    : 'text-neutral-300'
                }`}
              >
                {overallState}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-5 text-xs">
          {/* Market Strength Section */}
          <section className="p-3 bg-neutral-900/50 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
              <h3 className="font-mono text-xs font-bold text-neutral-200 uppercase tracking-wider">
                Market Strength Breakdown
              </h3>
              <span
                className={`font-mono text-xs font-bold ${
                  marketState === 'STRONG'
                    ? 'text-emerald-400'
                    : marketState === 'WEAK'
                    ? 'text-rose-400'
                    : 'text-neutral-300'
                }`}
              >
                {marketStrength !== null ? `${marketStrength >= 0 ? '+' : ''}${marketStrength.toFixed(2)}` : 'UNAVAILABLE'} ({marketState})
              </span>
            </div>
            <p className="text-neutral-300 leading-relaxed mb-2 font-sans">
              {relativeStrengthBreakdown.explanation}
            </p>
            {relativeStrengthBreakdown.contributors && (
              <div className="mt-2 pt-2 border-t border-neutral-800/80">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-1.5">
                  Pair Contributors ({relativeStrengthBreakdown.contributors.length})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px]">
                  {relativeStrengthBreakdown.contributors.map((c) => (
                    <div
                      key={c.pairSymbol}
                      onClick={() => onSelectPair?.(c.pairSymbol)}
                      className="p-1.5 rounded bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 cursor-pointer flex justify-between"
                    >
                      <span className="text-neutral-300">{c.pairSymbol}</span>
                      <span
                        className={
                          c.signedContribution > 0
                            ? 'text-emerald-400'
                            : c.signedContribution < 0
                            ? 'text-rose-400'
                            : 'text-neutral-500'
                        }
                      >
                        {c.signedContribution >= 0 ? '+' : ''}
                        {c.signedContribution.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Central Bank Section */}
          <section className="p-3 bg-neutral-900/50 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2">
              <h3 className="font-mono text-xs font-bold text-neutral-200 uppercase tracking-wider">
                Central Bank Policy ({centralBank.institution})
              </h3>
              <span
                className={`font-mono text-xs font-bold ${
                  centralBank.stance === 'HAWKISH'
                    ? 'text-emerald-400'
                    : centralBank.stance === 'DOVISH'
                    ? 'text-rose-400'
                    : 'text-neutral-300'
                }`}
              >
                {centralBank.stance} ({centralBank.currentPolicyRate !== null ? `${centralBank.currentPolicyRate}%` : 'N/A'})
              </span>
            </div>
            <p className="text-neutral-300 leading-relaxed font-sans mb-2">
              {centralBank.guidanceSummary || 'Data dependent stance.'}
            </p>
            {centralBank.stanceEvidence.length > 0 && (
              <div className="mt-2 pt-2 border-t border-neutral-800/80 text-[11px] font-mono text-neutral-400 space-y-1">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                  Policy Evidence:
                </span>
                {centralBank.stanceEvidence.map((ev, idx) => (
                  <p key={idx}>• {ev}</p>
                ))}
              </div>
            )}
          </section>

          {/* Economic Pillars */}
          <section className="border-t border-neutral-800/80 pt-3">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 font-mono">
              Core Economic Pillars
            </h3>
            <div className="space-y-2">
              <div className="p-2.5 bg-neutral-900/40 border border-neutral-800 rounded">
                <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                  <span className="font-semibold text-neutral-300 uppercase">Inflation</span>
                  <span className="text-neutral-400">
                    Surprise: <span className="text-neutral-200">{fundamentalState.inflation.surprise}</span>
                  </span>
                </div>
                <p className="text-neutral-300">{fundamentalState.inflation.currentCondition}</p>
                <p className="text-neutral-400 text-[11px] mt-1 font-mono">{fundamentalState.inflation.implication}</p>
              </div>

              <div className="p-2.5 bg-neutral-900/40 border border-neutral-800 rounded">
                <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                  <span className="font-semibold text-neutral-300 uppercase">Employment</span>
                  <span className="text-neutral-400">
                    Surprise: <span className="text-neutral-200">{fundamentalState.employment.surprise}</span>
                  </span>
                </div>
                <p className="text-neutral-300">{fundamentalState.employment.currentCondition}</p>
                <p className="text-neutral-400 text-[11px] mt-1 font-mono">{fundamentalState.employment.implication}</p>
              </div>

              <div className="p-2.5 bg-neutral-900/40 border border-neutral-800 rounded">
                <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                  <span className="font-semibold text-neutral-300 uppercase">Growth (GDP & Activity)</span>
                  <span className="text-neutral-400">
                    Surprise: <span className="text-neutral-200">{fundamentalState.growth.surprise}</span>
                  </span>
                </div>
                <p className="text-neutral-300">{fundamentalState.growth.currentCondition}</p>
                <p className="text-neutral-400 text-[11px] mt-1 font-mono">{fundamentalState.growth.implication}</p>
              </div>
            </div>
          </section>

          {/* Upcoming Catalysts */}
          <section className="border-t border-neutral-800/80 pt-3">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 font-mono">
              Upcoming Catalysts
            </h3>
            {upcomingEvents.length === 0 ? (
              <p className="text-neutral-500 italic">No scheduled upcoming events in horizon.</p>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px]">
                {upcomingEvents.map((e) => (
                  <div key={e.id} className="p-2 bg-neutral-900/50 border border-neutral-800/80 rounded flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-neutral-200 font-sans block text-xs">{e.name}</span>
                      <span className="text-neutral-500 text-[10px]">Scheduled: {new Date(e.scheduledTime).toUTCString()}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${e.importance === 'HIGH' ? 'text-rose-400' : 'text-amber-400'}`}>
                      {e.importance}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Evidence */}
          <section className="border-t border-neutral-800/80 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded">
              <span className="font-mono text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
                Supporting Evidence
              </span>
              {supportingEvidence.length === 0 ? (
                <p className="text-neutral-500 italic">No strong confirming evidence.</p>
              ) : (
                <ul className="space-y-1.5 text-neutral-300 list-disc list-inside">
                  {supportingEvidence.map((ev, i) => (
                    <li key={i} className="leading-tight text-[11px] font-sans">{ev}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded">
              <span className="font-mono text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-2">
                Counter-Evidence
              </span>
              {conflictingEvidence.length === 0 ? (
                <p className="text-neutral-500 italic">No material conflicting evidence.</p>
              ) : (
                <ul className="space-y-1.5 text-neutral-300 list-disc list-inside">
                  {conflictingEvidence.map((ev, i) => (
                    <li key={i} className="leading-tight text-[11px] font-sans">{ev}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Source Provenance */}
          <section className="border-t border-neutral-800/80 pt-3 text-[11px] font-mono text-neutral-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span>Source: {centralBank.sourceMetadata.sourceName}</span>
              {centralBank.sourceMetadata.sourceUrl && (
                <a
                  href={centralBank.sourceMetadata.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                >
                  Verify <ExternalLink className="w-3 h-3 inline" />
                </a>
              )}
            </div>
            <div>
              Last Verified: {confidenceMetadata.lastVerified ? new Date(confidenceMetadata.lastVerified).toUTCString() : 'N/A'}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
