import React from 'react';
import { X, TrendingUp, TrendingDown, Clock, ShieldAlert, ArrowLeftRight } from 'lucide-react';
import { PairIntelligence } from '../types';

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
    lastUpdated
  } = intelligence;

  const delta = relativeStrengthDelta ?? 0;
  const isBullish = orientationDirection === 'BULLISH_BASE';
  const isBearish = orientationDirection === 'BEARISH_BASE';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-neutral-950 border-l border-neutral-800 h-full overflow-y-auto p-4 sm:p-6 text-neutral-200">
        {/* Header */}
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

        <div className="py-4 space-y-4 text-xs">
          {/* Macro Bias Banner */}
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 mb-2 font-mono">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider">
                Macro Relative Bias
              </span>
              <span className="text-xs font-bold">
                {isBullish ? (
                  <span className="text-emerald-400 flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 mr-1" /> BULLISH BIAS (Δ +{delta.toFixed(2)})
                  </span>
                ) : isBearish ? (
                  <span className="text-rose-400 flex items-center">
                    <TrendingDown className="w-3.5 h-3.5 mr-1" /> BEARISH BIAS (Δ {delta.toFixed(2)})
                  </span>
                ) : (
                  <span className="text-neutral-400">NEUTRAL (Δ {delta.toFixed(2)})</span>
                )}
              </span>
            </div>
            <p className="text-neutral-300 leading-relaxed font-sans">{orientationExplanation}</p>
          </div>

          {/* Convergence / Divergence */}
          <div className="p-3 bg-neutral-900/60 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80 mb-2 font-mono">
              <span className="text-[11px] text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-neutral-400" /> Market vs Fundamental Alignment
              </span>
              <span
                className={`text-xs font-bold ${
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
            <p className="text-neutral-300 leading-relaxed font-sans">{convergenceExplanation}</p>
          </div>

          {/* Structural Thesis */}
          <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-1.5 font-semibold">
              Structural Macro Thesis
            </span>
            <p className="text-neutral-200 leading-relaxed font-sans">{thesis}</p>
          </div>

          {/* Invalidation Conditions */}
          <div className="p-3 bg-neutral-950/80 border border-neutral-800 rounded">
            <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 block mb-1.5 font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Invalidation Conditions
            </span>
            <ul className="space-y-1.5 text-neutral-300 list-disc list-inside font-sans">
              {invalidationConditions.map((cond, idx) => (
                <li key={idx} className="leading-snug">{cond}</li>
              ))}
            </ul>
          </div>

          {/* Session Relevance & Watch Window */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded">
              <span className="text-[11px] font-mono uppercase tracking-wider text-sky-400 block mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Institutional Session
              </span>
              <p className="font-bold text-neutral-200 font-mono text-sm">{sessionRelevance.primarySession}</p>
              <p className="text-neutral-400 text-[11px] mt-1 font-sans">{sessionRelevance.structuralRationale}</p>
            </div>

            <div className="p-3 bg-neutral-900/40 border border-neutral-800 rounded">
              <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 block mb-1">
                Watch Window State
              </span>
              <p className="font-bold text-neutral-200 font-mono text-sm">{watchWindow.watchState}</p>
              <p className="text-neutral-400 text-[11px] font-mono mt-1">Window: {watchWindow.watchWindow}</p>
            </div>
          </div>

          {/* Evidence Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded">
              <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 block mb-1.5 font-semibold">
                Supporting Evidence ({supportingEvidence.length})
              </span>
              <ul className="space-y-1 text-neutral-300 list-disc list-inside">
                {supportingEvidence.map((ev, idx) => (
                  <li key={idx} className="leading-snug">{ev}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded">
              <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400 block mb-1.5 font-semibold">
                Counter-Evidence / Risks ({counterEvidence.length})
              </span>
              <ul className="space-y-1 text-neutral-300 list-disc list-inside">
                {counterEvidence.map((ev, idx) => (
                  <li key={idx} className="leading-snug">{ev}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Upcoming Catalysts */}
          <div className="border-t border-neutral-800 pt-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block mb-2 font-semibold">
              Relevant Scheduled Catalysts ({catalysts.length})
            </span>
            {catalysts.length === 0 ? (
              <p className="text-neutral-500 italic font-mono text-[11px]">No upcoming events for {pair.symbol}.</p>
            ) : (
              <div className="space-y-1.5 font-mono text-[11px]">
                {catalysts.map((cat) => (
                  <div key={cat.id} className="p-2 bg-neutral-900/60 border border-neutral-800 rounded flex items-center justify-between">
                    <div>
                      <span className="text-neutral-200 font-sans font-medium">{cat.currency} {cat.name}</span>
                      <span className="text-neutral-500 text-[10px] block">{new Date(cat.scheduledTime).toUTCString()}</span>
                    </div>
                    <span className={`text-[10px] font-bold ${cat.importance === 'HIGH' ? 'text-rose-400' : 'text-amber-400'}`}>
                      {cat.importance}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-neutral-800/80 text-[10px] font-mono text-neutral-600 flex justify-between">
            <span>VELQOARATH Macro Engine</span>
            <span>Updated: {new Date(lastUpdated).toUTCString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
