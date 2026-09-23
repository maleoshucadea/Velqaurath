import React from 'react';
import { TrendingUp, TrendingDown, ArrowLeftRight, Clock } from 'lucide-react';
import { PairIntelligence } from '../types';

interface TopPairCardProps {
  topPair: PairIntelligence | null;
  onSelectPair: (symbol: string) => void;
}

export const TopPairCard: React.FC<TopPairCardProps> = ({
  topPair,
  onSelectPair
}) => {
  if (!topPair) {
    return (
      <section className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
          <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide">
            Top Pair to Watch
          </h2>
          <span className="text-[11px] text-neutral-500 font-mono">Macro Focus</span>
        </div>
        <div className="py-6 text-center text-neutral-500 text-xs font-mono">
          DATA UNAVAILABLE: Connect live data feed to identify active macro pair divergences.
        </div>
      </section>
    );
  }

  const delta = topPair.relativeStrengthDelta ?? 0;
  const isBullish = topPair.orientationDirection === 'BULLISH_BASE';
  const isBearish = topPair.orientationDirection === 'BEARISH_BASE';

  return (
    <section className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide">
            Top Pair to Watch
          </h2>
          <span className="text-[10px] text-neutral-500 font-mono">· Highest Macro Delta</span>
        </div>
        <button
          onClick={() => onSelectPair(topPair.pair.symbol)}
          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono underline underline-offset-2"
        >
          View Full Intelligence →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-baseline gap-3 mb-2">
            <button
              onClick={() => onSelectPair(topPair.pair.symbol)}
              className="text-2xl font-bold tracking-tight text-neutral-100 hover:text-emerald-400 transition-colors font-mono"
            >
              {topPair.pair.symbol}
            </button>
            <div className="flex items-center gap-1 font-mono text-xs">
              {isBullish ? (
                <span className="text-emerald-400 flex items-center font-semibold">
                  <TrendingUp className="w-4 h-4 mr-0.5" />
                  BULLISH BIAS (Δ +{delta.toFixed(2)})
                </span>
              ) : isBearish ? (
                <span className="text-rose-400 flex items-center font-semibold">
                  <TrendingDown className="w-4 h-4 mr-0.5" />
                  BEARISH BIAS (Δ {delta.toFixed(2)})
                </span>
              ) : (
                <span className="text-neutral-400 font-semibold">
                  NEUTRAL (Δ {delta.toFixed(2)})
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-neutral-300 mb-3 leading-relaxed">
            {topPair.orientationExplanation}
          </p>
          <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <ArrowLeftRight className="w-3.5 h-3.5 text-neutral-400" /> State:
              </span>
              <span
                className={`font-mono text-xs font-bold ${
                  topPair.convergenceDivergence === 'CONVERGENCE'
                    ? 'text-emerald-400'
                    : topPair.convergenceDivergence === 'DIVERGENCE'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {topPair.convergenceDivergence}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 leading-snug">
              {topPair.convergenceExplanation}
            </p>
          </div>
        </div>

        <div className="space-y-2.5 bg-neutral-950/50 p-3 rounded border border-neutral-800/80 text-xs">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" /> Primary Session
              </span>
              <span className="text-neutral-200 font-medium">
                {topPair.sessionRelevance.primarySession}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-mono">
              Window: <span className="text-neutral-200">{topPair.watchWindow.watchWindow}</span>
            </p>
          </div>

          <div className="pt-2 border-t border-neutral-900 flex items-center justify-between">
            <span className="text-[11px] font-mono text-neutral-400">Watch State:</span>
            <span className="font-mono text-[11px] font-semibold text-neutral-200">
              {topPair.watchWindow.watchState}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-neutral-400">Catalyst Count:</span>
            <span className="font-mono text-[11px] text-neutral-200">
              {topPair.catalysts.length} Scheduled
            </span>
          </div>

          <div className="pt-2 border-t border-neutral-900">
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block mb-1">
              Top Structural Thesis
            </span>
            <p className="text-[11px] text-neutral-300 line-clamp-2">
              {topPair.thesis}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
