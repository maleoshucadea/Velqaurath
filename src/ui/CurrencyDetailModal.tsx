import React from 'react';
import { CurrencyState, EconomicEvent } from '../types';
import { X, TrendingUp, TrendingDown, Minus, ExternalLink, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

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
    confidenceMetadata,
    supportingEvidence,
    conflictingEvidence
  } = currencyState;

  const relevantEvents = events.filter(e => e.currency === currency.code);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-neutral-950 border-l border-neutral-800 h-full overflow-y-auto p-4 sm:p-6 text-neutral-200">
        {/* 1. Currency Header */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-neutral-100">
                {currency.code}
              </span>
              <span className="text-sm text-neutral-400 font-sans">
                {currency.name}
              </span>
              <span className="text-xs font-mono text-neutral-500">
                · {currency.region}
              </span>
            </div>
            <p className="text-xs text-neutral-400 font-mono mt-1">
              Symbol: {currency.symbol} · Active Major Universe
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 pt-4 text-xs">
          {/* 2. Market State & Relative Strength Framework */}
          <section className="bg-neutral-900/70 border border-neutral-800 p-3.5 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                Relative Market Strength
              </span>
              <span
                className={`font-mono text-xs font-bold uppercase ${
                  marketState === 'STRONG'
                    ? 'text-emerald-400'
                    : marketState === 'WEAK'
                    ? 'text-rose-400'
                    : 'text-neutral-300'
                }`}
              >
                {marketState} ({marketStrength !== null ? `${marketStrength >= 0 ? '+' : ''}${marketStrength.toFixed(2)}` : 'UNAVAILABLE'})
              </span>
            </div>
            <p className="text-neutral-300 leading-relaxed font-sans text-xs">
              {relativeStrengthBreakdown.explanation}
            </p>
            <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-400">
              <span>Timeframe: {relativeStrengthBreakdown.timeframe}</span>
              <span>Momentum: {relativeStrengthBreakdown.momentum !== null ? `${relativeStrengthBreakdown.momentum >= 0 ? '+' : ''}${relativeStrengthBreakdown.momentum.toFixed(2)}` : '—'}</span>
            </div>

            {/* Contributing FX Pairs & Provenance */}
            {relativeStrengthBreakdown.contributors && relativeStrengthBreakdown.contributors.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-neutral-800/80">
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-1.5">
                  Observed FX Pair Contributions ({relativeStrengthBreakdown.coverage ? `${relativeStrengthBreakdown.coverage.available}/${relativeStrengthBreakdown.coverage.required} pairs · ${relativeStrengthBreakdown.coverage.percent}% coverage` : `${relativeStrengthBreakdown.contributors.length} pairs`})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px]">
                  {relativeStrengthBreakdown.contributors.map(c => (
                    <div key={c.pairSymbol} className="p-1.5 bg-neutral-950/60 rounded border border-neutral-800 flex justify-between items-center">
                      <span className="text-neutral-400 text-[10px]">{c.pairSymbol} ({c.role})</span>
                      <span className={`text-[10px] font-semibold tabular-nums ${c.signedContribution > 0 ? 'text-emerald-400' : c.signedContribution < 0 ? 'text-rose-400' : 'text-neutral-400'}`}>
                        {c.signedContribution > 0 ? '+' : ''}{c.signedContribution.toFixed(2)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 3. Fundamental State & Explicit Formula */}
          <section className="bg-neutral-900/70 border border-neutral-800 p-3.5 rounded">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                Fundamental Condition
              </span>
              <span className="font-mono text-xs font-bold text-neutral-100">
                {fundamentalState.overallCondition}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-mono mb-2">
              {fundamentalState.scoreFormula}
            </p>
          </section>

          {/* 4. Monetary Policy */}
          <section className="border-t border-neutral-800/80 pt-3">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 font-mono">
              Monetary Policy & Central Bank
            </h3>
            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-200">{centralBank.institution}</span>
                <span className="font-mono text-neutral-300">
                  Rate: {centralBank.currentPolicyRate !== null ? `${centralBank.currentPolicyRate}%` : 'N/A'}
                </span>
              </div>
              <p className="text-neutral-400">
                {fundamentalState.monetaryPolicy.currentCondition}
              </p>
              <p className="text-neutral-400">
                <span className="text-neutral-500 font-mono">Guidance: </span>
                {centralBank.guidanceSummary || 'Data dependent'}
              </p>
              <div className="text-[11px] text-neutral-500 font-mono pt-1">
                Next Decision Date: {centralBank.nextKnownDecisionDate || 'TBD'}
              </div>
            </div>
          </section>

          {/* 5, 6, 7. Macro Pillars: Inflation, Employment, Growth */}
          <section className="border-t border-neutral-800/80 pt-3">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 font-mono">
              Core Economic Pillars
            </h3>
            <div className="space-y-2">
              {/* Inflation */}
              <div className="p-2.5 bg-neutral-900/40 border border-neutral-800 rounded">
                <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                  <span className="font-semibold text-neutral-300 uppercase">Inflation</span>
                  <span className="text-neutral-400">
                    Surprise: <span className="text-neutral-200">{fundamentalState.inflation.surprise}</span>
                  </span>
                </div>
                <p className="text-neutral-300">{fundamentalState.inflation.currentCondition}</p>
                <p className="text-neutral-400 text-[11px] mt-1 font-mono">
                  {fundamentalState.inflation.implication}
                </p>
              </div>

              {/* Employment */}
              <div className="p-2.5 bg-neutral-900/40 border border-neutral-800 rounded">
                <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                  <span className="font-semibold text-neutral-300 uppercase">Employment</span>
                  <span className="text-neutral-400">
                    Surprise: <span className="text-neutral-200">{fundamentalState.employment.surprise}</span>
                  </span>
                </div>
                <p className="text-neutral-300">{fundamentalState.employment.currentCondition}</p>
                <p className="text-neutral-400 text-[11px] mt-1 font-mono">
                  {fundamentalState.employment.implication}
                </p>
              </div>

              {/* Growth */}
              <div className="p-2.5 bg-neutral-900/40 border border-neutral-800 rounded">
                <div className="flex items-center justify-between font-mono text-[11px] mb-1">
                  <span className="font-semibold text-neutral-300 uppercase">Growth (GDP & Activity)</span>
                  <span className="text-neutral-400">
                    Surprise: <span className="text-neutral-200">{fundamentalState.growth.surprise}</span>
                  </span>
                </div>
                <p className="text-neutral-300">{fundamentalState.growth.currentCondition}</p>
                <p className="text-neutral-400 text-[11px] mt-1 font-mono">
                  {fundamentalState.growth.implication}
                </p>
              </div>
            </div>
          </section>

          {/* 8, 9. Expectations & Recent Surprises */}
          <section className="border-t border-neutral-800/80 pt-3">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 font-mono">
              Observed Releases & Expectation Surprises
            </h3>
            {fundamentalState.inflation.observations.length === 0 && fundamentalState.employment.observations.length === 0 ? (
              <p className="text-neutral-500 italic">No historical observations logged for {currency.code}.</p>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px]">
                {[...fundamentalState.inflation.observations, ...fundamentalState.employment.observations, ...fundamentalState.growth.observations].map(obs => (
                  <div key={obs.id} className="p-2 bg-neutral-900/50 border border-neutral-800/80 rounded flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-neutral-200 font-sans block text-xs">
                        {obs.indicatorName} ({obs.period})
                      </span>
                      <span className="text-neutral-500 text-[10px]">
                        Prev: {obs.previous ?? '—'} · Exp: {obs.forecast ?? '—'} · Actual: {obs.actual ?? '—'}{obs.unit}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400">
                      {obs.classification}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 10. Upcoming Catalysts */}
          <section className="border-t border-neutral-800/80 pt-3">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 font-mono">
              Upcoming Catalysts
            </h3>
            {relevantEvents.length === 0 ? (
              <p className="text-neutral-500 italic">No scheduled upcoming events in horizon.</p>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px]">
                {relevantEvents.map(evt => (
                  <div key={evt.id} className="p-2 bg-neutral-900/50 border border-neutral-800/80 rounded flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-neutral-200 font-sans block text-xs">
                        {evt.name}
                      </span>
                      <span className="text-neutral-500 text-[10px]">
                        Scheduled: {new Date(evt.scheduledTime).toUTCString()}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold ${evt.importance === 'HIGH' ? 'text-rose-400' : 'text-amber-400'}`}>
                      {evt.importance}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 11 & 12. Supporting Evidence & Counter-Evidence */}
          <section className="border-t border-neutral-800/80 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Supporting Evidence */}
            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded">
              <span className="font-mono text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
                Supporting Evidence
              </span>
              {supportingEvidence.length === 0 ? (
                <p className="text-neutral-500 italic">No strong confirming evidence.</p>
              ) : (
                <ul className="space-y-1.5 text-neutral-300 list-disc list-inside">
                  {supportingEvidence.map((ev, idx) => (
                    <li key={idx} className="leading-tight text-[11px] font-sans">
                      {ev}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Counter-Evidence */}
            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded">
              <span className="font-mono text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-2">
                Counter-Evidence
              </span>
              {conflictingEvidence.length === 0 ? (
                <p className="text-neutral-500 italic">No material conflicting evidence.</p>
              ) : (
                <ul className="space-y-1.5 text-neutral-300 list-disc list-inside">
                  {conflictingEvidence.map((ev, idx) => (
                    <li key={idx} className="leading-tight text-[11px] font-sans">
                      {ev}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* 13 & 14. Last Updated & Source Information */}
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
