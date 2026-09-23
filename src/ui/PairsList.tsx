import React, { useState } from 'react';
import { ArrowLeftRight, TrendingUp, TrendingDown, Search, Clock } from 'lucide-react';
import { PairIntelligence } from '../types';

interface PairsListProps {
  pairIntelligences: PairIntelligence[];
  onSelectPair: (symbol: string) => void;
}

export const PairsList: React.FC<PairsListProps> = ({
  pairIntelligences,
  onSelectPair
}) => {
  const [filter, setFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'CONVERGENCE'>('ALL');
  const [search, setSearch] = useState('');

  const filtered = pairIntelligences.filter((p) => {
    if (search.trim()) {
      const term = search.toUpperCase();
      if (
        !p.pair.symbol.includes(term) &&
        !p.baseCurrency.code.includes(term) &&
        !p.quoteCurrency.code.includes(term)
      ) {
        return false;
      }
    }

    if (filter === 'BULLISH') return p.orientationDirection === 'BULLISH_BASE';
    if (filter === 'BEARISH') return p.orientationDirection === 'BEARISH_BASE';
    if (filter === 'CONVERGENCE') return p.convergenceDivergence === 'CONVERGENCE';
    return true;
  });

  return (
    <section className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800 rounded-lg p-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
          {(['ALL', 'BULLISH', 'BEARISH', 'CONVERGENCE'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1.5 rounded transition-colors ${
                filter === mode
                  ? 'bg-neutral-800 text-neutral-100 font-bold border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search pair or currency..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-neutral-700 w-full sm:w-48 font-mono"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((item) => {
          const delta = item.relativeStrengthDelta ?? 0;
          const isBullish = item.orientationDirection === 'BULLISH_BASE';
          const isBearish = item.orientationDirection === 'BEARISH_BASE';

          return (
            <div
              key={item.pair.symbol}
              onClick={() => onSelectPair(item.pair.symbol)}
              className="p-3.5 bg-neutral-900/40 border border-neutral-800 rounded-lg hover:border-neutral-700 cursor-pointer transition-all hover:bg-neutral-900/70"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base text-neutral-100">
                      {item.pair.symbol}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {item.baseCurrency.code}/{item.quoteCurrency.code}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Δ {delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}
                  </span>
                </div>

                <div className="text-right font-mono text-[10px]">
                  {isBullish ? (
                    <span className="text-emerald-400 font-semibold flex items-center justify-end">
                      <TrendingUp className="w-3 h-3 mr-0.5" /> BULLISH
                    </span>
                  ) : isBearish ? (
                    <span className="text-rose-400 font-semibold flex items-center justify-end">
                      <TrendingDown className="w-3 h-3 mr-0.5" /> BEARISH
                    </span>
                  ) : (
                    <span className="text-neutral-400">NEUTRAL</span>
                  )}
                  <span
                    className={`block mt-0.5 ${
                      item.convergenceDivergence === 'CONVERGENCE'
                        ? 'text-emerald-400'
                        : item.convergenceDivergence === 'DIVERGENCE'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {item.convergenceDivergence}
                  </span>
                </div>
              </div>

              <p className="text-neutral-300 text-xs line-clamp-2 mb-2.5 font-sans leading-relaxed">
                {item.orientationExplanation}
              </p>

              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  {item.sessionRelevance.primarySession}
                </span>
                <span>{item.watchWindow.watchState}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
