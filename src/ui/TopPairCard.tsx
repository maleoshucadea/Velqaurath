import React from 'react';
import { PairIntelligence } from '../types';
import { ArrowUpRight, ArrowDownRight, Compass, ShieldAlert, Clock, Zap } from 'lucide-react';

interface TopPairCardProps {
  topPair: PairIntelligence | null;
  onSelectPair: (symbol: string) => void;
}

export const TopPairCard: React.FC<TopPairCardProps> = ({ topPair, onSelectPair }) => {
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
          <span className="text-[10px] text-neutral-500 font-mono">
            · Highest Macro Delta
          </span>
        </div>
        <button
          onClick={() => onSelectPair(topPair.pair.symbol)}
          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono underline underline-offset-2"
        >
          View Full Intelligence →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: Pair, Orientation, and Convergence */}
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
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                  BULLISH BIAS (Δ +{delta.toFixed(2)})
                </span>
              ) : isBearish ? (
                <span className="text-rose-400 flex items-center font-semibold">
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />
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

          {/* Convergence / Divergence Bar */}
          <div className="p-2.5 bg-neutral-950/80 border border-neutral-800 rounded text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-neutral-400" /> State:
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

        {/* Right Column: Sessions, Watch Window, Catalyst, Risk */}
        <div className="space-y-2.5 bg-neutral-950/50 p-3 rounded border border-neutral-800/80 text-xs">
          {/* Primary Session & Watch Window */}
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

          {/* Watch State & Risk */}
          <div className="pt-2 border-t border-neutral-900 flex items-center justify-between">
            <span className="text-[11px] font-mono text-neutral-400">Watch State:</span>
            <span className="font-mono text-[11px] font-semibold text-neutral-200">
              {topPair.watchWindow.watchState}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Risk State:
            </span>
            <span
              className={`font-mono text-[11px] font-bold ${
                topPair.watchWindow.riskState === 'HIGH'
                  ? 'text-rose-400'
                  : topPair.watchWindow.riskState === 'ELEVATED'
                  ? 'text-amber-400'
                  : 'text-neutral-300'
              }`}
            >
              {topPair.watchWindow.riskState}
            </span>
          </div>

          {/* Upcoming Catalyst */}
          <div className="pt-2 border-t border-neutral-900">
            <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 mb-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Upcoming Catalyst:
            </div>
            {topPair.watchWindow.upcomingCatalyst ? (
              <div className="text-[11px] text-neutral-300">
                <span className="font-bold text-neutral-100">
                  {topPair.watchWindow.upcomingCatalyst.currency} {topPair.watchWindow.upcomingCatalyst.name}
                </span>
                <span className="text-neutral-500 block font-mono text-[10px] mt-0.5">
                  Scheduled: {new Date(topPair.watchWindow.upcomingCatalyst.scheduledTime).toUTCString()}
                </span>
              </div>
            ) : (
              <span className="text-neutral-500 italic text-[11px]">
                No imminent high-impact catalyst in current window.
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
