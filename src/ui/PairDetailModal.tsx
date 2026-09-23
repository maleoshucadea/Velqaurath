import React from 'react';
import { PairIntelligence } from '../types';
import { X, ArrowUpRight, ArrowDownRight, Compass, ShieldAlert, Clock, Zap, ExternalLink } from 'lucide-react';

interface PairDetailModalProps {
  intelligence: PairIntelligence | null;
  onClose: () => void;
  onSelectCurrency?: (code: string) => void;
}

export const PairDetailModal: React.FC<PairDetailModalProps> = ({
  intelligence,
  onClose,
  onSelectCurrency
}) => {
  if (!intelligence) return null;

  const {
    pair,
    baseCurrency,
    quoteCurrency,
    baseState,
    quoteState,
    relativeStrengthDelta,
    orientationDirection,
    orientationExplanation,
    convergenceDivergence,
    convergenceExplanation,
    supportingEvidence,
    counterEvidence,
    catalysts,
    risks,
    thesis,
    invalidationConditions,
    sessionRelevance,
    watchWindow,
    lastUpdated,
    sources
  } = intelligence;

  const delta = relativeStrengthDelta ?? 0;
  const isBullish = orientationDirection === 'BULLISH_BASE';
  const isBearish = orientationDirection === 'BEARISH_BASE';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-neutral-950 border-l border-neutral-800 h-full overflow-y-auto p-4 sm:p-6 text-neutral-200">
        {/* 1. Header: Base Currency & Quote Currency */}
        <div className="flex items-start justify-between pb-4 border-b border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-neutral-100">
                {pair.symbol}
              </span>
              <span className="text-xs font-mono text-neutral-500">
                ({baseCurrency.code} Base / {quoteCurrency.code} Quote)
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => onSelectCurrency?.(baseCurrency.code)}
                className="text-xs font-mono text-emerald-400 hover:underline"
              >
                Inspect {baseCurrency.code} →
              </button>
              <span className="text-neutral-600">·</span>
              <button
                onClick={() => onSelectCurrency?.(quoteCurrency.code)}
                className="text-xs font-mono text-emerald-400 hover:underline"
              >
                Inspect {quoteCurrency.code} →
              </button>
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

        <div className="space-y-6 pt-4 text-xs">
          {/* 12. Thesis Header Banner */}
          <section className="bg-neutral-900/90 border border-neutral-800 p-3.5 rounded">
            <div className="flex items-center justify-between mb-1.5 font-mono text-[11px]">
              <span className="font-semibold text-neutral-400 uppercase tracking-wider">
                Macro Thesis
              </span>
              <span className="text-neutral-500">
                Updated {new Date(lastUpdated).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-neutral-100 font-medium leading-relaxed font-sans">
              {thesis}
            </p>
          </section>

          {/* 2 & 6. Relative Strength & Orientation Mathematics */}
          <section className="bg-neutral-900/60 border border-neutral-800 p-3.5 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                Relative Orientation
              </span>
              <div className="font-mono text-xs font-bold">
                {isBullish ? (
                  <span className="text-emerald-400 flex items-center">
                    <ArrowUpRight className="w-4 h-4 mr-0.5" /> BULLISH BASE (Δ +{delta.toFixed(2)})
                  </span>
                ) : isBearish ? (
                  <span className="text-rose-400 flex items-center">
                    <ArrowDownRight className="w-4 h-4 mr-0.5" /> BEARISH BASE (Δ {delta.toFixed(2)})
                  </span>
                ) : (
                  <span className="text-neutral-300">NEUTRAL (Δ {delta.toFixed(2)})</span>
                )}
              </div>
            </div>
            <p className="text-neutral-300 font-sans text-xs leading-relaxed">
              {orientationExplanation}
            </p>
          </section>

          {/* 6. Convergence / Divergence Assessment */}
          <section className="bg-neutral-900/60 border border-neutral-800 p-3.5 rounded">
            <div className="flex items-center justify-between mb-1.5 font-mono text-[11px]">
              <span className="font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" /> Alignment State
              </span>
              <span
                className={`font-bold ${
                  convergenceDivergence === 'CONVERGENCE'
                    ? 'text-emerald-400'
                    : convergenceDivergence === 'DIVERGENCE'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {convergenceDivergence}
              </span>
            </div>
            <p className="text-neutral-300 font-sans text-xs leading-relaxed">
              {convergenceExplanation}
            </p>
          </section>

          {/* 3, 4, 5. Fundamental & Central Bank Policy Comparison */}
          <section className="border-t border-neutral-800/80 pt-3">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 font-mono">
              Constituent Currency Comparison
            </h3>
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              {/* Base Currency Box */}
              <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded">
                <span className="text-neutral-400 text-[10px] uppercase block">Base Currency</span>
                <span className="font-bold text-sm text-neutral-100 block mt-0.5">{baseCurrency.code}</span>
                <div className="mt-2 space-y-1 text-[11px] text-neutral-300">
                  <div>Market: <span className="text-neutral-100">{baseState.marketStrength !== null ? `${baseState.marketStrength >= 0 ? '+' : ''}${baseState.marketStrength.toFixed(2)}` : 'N/A'}</span></div>
                  <div>Policy Rate: <span className="text-neutral-100">{baseState.centralBank.currentPolicyRate}%</span></div>
                  <div>Stance: <span className="text-neutral-100">{baseState.centralBank.stance}</span></div>
                  <div>Fund State: <span className="text-neutral-100">{baseState.fundamentalState.overallCondition}</span></div>
                </div>
              </div>

              {/* Quote Currency Box */}
              <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded">
                <span className="text-neutral-400 text-[10px] uppercase block">Quote Currency</span>
                <span className="font-bold text-sm text-neutral-100 block mt-0.5">{quoteCurrency.code}</span>
                <div className="mt-2 space-y-1 text-[11px] text-neutral-300">
                  <div>Market: <span className="text-neutral-100">{quoteState.marketStrength !== null ? `${quoteState.marketStrength >= 0 ? '+' : ''}${quoteState.marketStrength.toFixed(2)}` : 'N/A'}</span></div>
                  <div>Policy Rate: <span className="text-neutral-100">{quoteState.centralBank.currentPolicyRate}%</span></div>
                  <div>Stance: <span className="text-neutral-100">{quoteState.centralBank.stance}</span></div>
                  <div>Fund State: <span className="text-neutral-100">{quoteState.fundamentalState.overallCondition}</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* 10 & 11. Session Intelligence & Watch Window */}
          <section className="border-t border-neutral-800/80 pt-3">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" /> Session Intelligence & Watch Window
            </h3>
            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded space-y-2">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-neutral-400">Primary Session:</span>
                <span className="text-neutral-100 font-bold">{sessionRelevance.primarySession}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-neutral-400">Watch Window (UTC):</span>
                <span className="text-neutral-100 font-bold">{watchWindow.watchWindow}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-neutral-400">Watch State:</span>
                <span className="text-neutral-200 font-semibold">{watchWindow.watchState}</span>
              </div>
              <p className="text-neutral-300 text-xs font-sans leading-relaxed pt-1 border-t border-neutral-800/60">
                {watchWindow.whyThisWindowMatters}
              </p>
            </div>
          </section>

          {/* 7 & 8. Supporting Evidence vs Counter-Evidence */}
          <section className="border-t border-neutral-800/80 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded">
              <span className="font-mono text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-2">
                Supporting Evidence
              </span>
              <ul className="space-y-1.5 text-neutral-300 list-disc list-inside">
                {supportingEvidence.map((ev, idx) => (
                  <li key={idx} className="leading-tight text-[11px] font-sans">
                    {ev}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded">
              <span className="font-mono text-[11px] font-semibold text-rose-400 uppercase tracking-wider block mb-2">
                Counter-Evidence
              </span>
              <ul className="space-y-1.5 text-neutral-300 list-disc list-inside">
                {counterEvidence.map((ev, idx) => (
                  <li key={idx} className="leading-tight text-[11px] font-sans">
                    {ev}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 9. Upcoming Catalysts */}
          <section className="border-t border-neutral-800/80 pt-3">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Upcoming Pair Catalysts
            </h3>
            {catalysts.length === 0 ? (
              <p className="text-neutral-500 italic">No scheduled macro events in current window.</p>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px]">
                {catalysts.map(evt => (
                  <div key={evt.id} className="p-2 bg-neutral-900/50 border border-neutral-800/80 rounded flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-neutral-200 font-sans block text-xs">
                        {evt.currency} {evt.name}
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

          {/* 13. Thesis-Change & Invalidation Conditions */}
          <section className="border-t border-neutral-800/80 pt-3">
            <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Thesis Invalidation Conditions
            </h3>
            <ul className="space-y-1.5 p-3 bg-neutral-900/40 border border-neutral-800 rounded text-neutral-300 list-disc list-inside">
              {invalidationConditions.map((cond, idx) => (
                <li key={idx} className="leading-tight text-[11px] font-sans">
                  {cond}
                </li>
              ))}
            </ul>
          </section>

          {/* 14. Sources & Provenance */}
          <section className="border-t border-neutral-800/80 pt-3 text-[11px] font-mono text-neutral-500 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>Provenance: Verified Primary Bank Records</span>
              {sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                >
                  {s.name} <ExternalLink className="w-2.5 h-2.5 inline" />
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
