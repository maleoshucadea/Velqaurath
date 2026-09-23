import React, { useState } from 'react';
import { PairIntelligence } from '../types';
import { ArrowUpRight, ArrowDownRight, Minus, Compass, Clock, ChevronRight, Search } from 'lucide-react';

interface PairsListProps {
  pairIntelligences: PairIntelligence[];
  onSelectPair: (symbol: string) => void;
}

export const PairsList: React.FC<PairsListProps> = ({ pairIntelligences, onSelectPair }) => {
  const [filter, setFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH' | 'CONVERGENCE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = pairIntelligences.filter(p => {
    if (searchQuery.trim()) {
      const q = searchQuery.toUpperCase();
      if (!p.pair.symbol.includes(q) && !p.baseCurrency.code.includes(q) && !p.quoteCurrency.code.includes(q)) {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200 uppercase tracking-wide">
            Currency Pairs Intelligence
          </h2>
          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Base vs Quote orientation · Macro convergence & divergence
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded transition-colors ${filter === 'ALL' ? 'bg-neutral-800 text-neutral-100 font-bold border border-neutral-700' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            ALL ({pairIntelligences.length})
          </button>
          <button
            onClick={() => setFilter('BULLISH')}
            className={`px-2.5 py-1 rounded transition-colors ${filter === 'BULLISH' ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/60' : 'text-neutral-500 hover:text-emerald-400'}`}
          >
            BULLISH BASE
          </button>
          <button
            onClick={() => setFilter('BEARISH')}
            className={`px-2.5 py-1 rounded transition-colors ${filter === 'BEARISH' ? 'bg-rose-950/60 text-rose-300 font-bold border border-rose-800/60' : 'text-neutral-500 hover:text-rose-400'}`}
          >
            BEARISH BASE
          </button>
          <button
            onClick={() => setFilter('CONVERGENCE')}
            className={`px-2.5 py-1 rounded transition-colors ${filter === 'CONVERGENCE' ? 'bg-sky-950/60 text-sky-300 font-bold border border-sky-800/60' : 'text-neutral-500 hover:text-sky-400'}`}
          >
            CONVERGENCE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(pi => {
          const delta = pi.relativeStrengthDelta ?? 0;
          const isBull = pi.orientationDirection === 'BULLISH_BASE';
          const isBear = pi.orientationDirection === 'BEARISH_BASE';

          return (
            <div
              key={pi.pair.id}
              onClick={() => onSelectPair(pi.pair.symbol)}
              className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-lg hover:border-neutral-700 hover:bg-neutral-900/90 cursor-pointer transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold font-mono text-neutral-100 group-hover:text-emerald-300">
                      {pi.pair.symbol}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-500">
                      ({pi.baseCurrency.code} / {pi.quoteCurrency.code})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400 block mt-0.5">
                    {pi.sessionRelevance.primarySession}
                  </span>
                </div>

                <div className="text-right font-mono">
                  {isBull ? (
                    <span className="text-emerald-400 font-bold text-xs flex items-center justify-end">
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> +{delta.toFixed(2)}
                    </span>
                  ) : isBear ? (
                    <span className="text-rose-400 font-bold text-xs flex items-center justify-end">
                      <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" /> {delta.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-neutral-400 font-bold text-xs flex items-center justify-end">
                      <Minus className="w-3.5 h-3.5 mr-0.5" /> {delta.toFixed(2)}
                    </span>
                  )}
                  <span className="text-[10px] uppercase text-neutral-500 tracking-wider block mt-0.5">
                    {pi.orientationDirection}
                  </span>
                </div>
              </div>

              <p className="text-xs text-neutral-300 font-sans line-clamp-2 mb-3 leading-relaxed">
                {pi.thesis}
              </p>

              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <Compass className="w-3 h-3 text-neutral-500" />
                  <span
                    className={`font-semibold ${
                      pi.convergenceDivergence === 'CONVERGENCE'
                        ? 'text-emerald-400'
                        : pi.convergenceDivergence === 'DIVERGENCE'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {pi.convergenceDivergence}
                  </span>
                </div>

                <span className="text-neutral-400 group-hover:text-neutral-200 flex items-center">
                  Intelligence Details <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
