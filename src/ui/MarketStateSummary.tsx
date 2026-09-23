import React from 'react';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { CurrencyState, StrengthThresholds } from '../types';

interface MarketStateSummaryProps {
  allCurrencies: CurrencyState[];
  strongCurrencies: CurrencyState[];
  neutralCurrencies: CurrencyState[];
  weakCurrencies: CurrencyState[];
  thresholds: StrengthThresholds;
  onSelectCurrency: (code: string) => void;
}

export const MarketStateSummary: React.FC<MarketStateSummaryProps> = ({
  allCurrencies,
  strongCurrencies,
  neutralCurrencies,
  weakCurrencies,
  thresholds,
  onSelectCurrency
}) => {
  const isDataUnavailable =
    allCurrencies.length > 0 &&
    allCurrencies.every((c) => c.marketState === 'DATA_UNAVAILABLE');

  return (
    <section className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200 tracking-wide uppercase">
            Current Market State
          </h2>
          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Framework: Strong ≥ {thresholds.strongThreshold >= 0 ? '+' : ''}
            {thresholds.strongThreshold.toFixed(2)} · Weak ≤ {thresholds.weakThreshold.toFixed(2)}
          </p>
        </div>
      </div>

      {isDataUnavailable ? (
        <div className="p-5 bg-neutral-950/80 border border-neutral-800/90 rounded text-center">
          <div className="inline-flex items-center justify-center p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
            <Info className="w-4 h-4" />
          </div>
          <h3 className="font-mono text-xs font-bold text-neutral-200 uppercase tracking-wider">
            MARKET DATA UNAVAILABLE / NOT CONFIGURED
          </h3>
          <p className="text-[11px] text-neutral-400 max-w-md mx-auto mt-1 leading-relaxed">
            Market strength calculations require real live FX quotes from active providers (Biquote primary, Twelve Data secondary fallback). Macroeconomic fundamental conditions and central bank stances remain active below.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Strong */}
          <div className="p-3 bg-neutral-950/70 border border-emerald-950/60 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" /> Strong
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                {strongCurrencies.length}
              </span>
            </div>
            {strongCurrencies.length === 0 ? (
              <p className="text-xs text-neutral-500 italic font-mono py-2">No currencies ≥ +{thresholds.strongThreshold.toFixed(2)}</p>
            ) : (
              <div className="space-y-1.5">
                {strongCurrencies.map((c) => (
                  <button
                    key={c.currency.code}
                    onClick={() => onSelectCurrency(c.currency.code)}
                    className="w-full flex items-center justify-between p-1.5 rounded hover:bg-neutral-900 border border-neutral-800/50 font-mono text-xs text-left transition-colors"
                  >
                    <span className="font-bold text-neutral-100">{c.currency.code}</span>
                    <span className="text-emerald-400 font-semibold tabular-nums">
                      {c.marketStrength !== null ? `+${c.marketStrength.toFixed(2)}` : 'N/A'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Neutral */}
          <div className="p-3 bg-neutral-950/70 border border-neutral-800/60 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold font-mono text-neutral-300 uppercase tracking-wider">
                <Minus className="w-3.5 h-3.5" /> Neutral
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                {neutralCurrencies.length}
              </span>
            </div>
            {neutralCurrencies.length === 0 ? (
              <p className="text-xs text-neutral-500 italic font-mono py-2">No neutral currencies</p>
            ) : (
              <div className="space-y-1.5">
                {neutralCurrencies.map((c) => (
                  <button
                    key={c.currency.code}
                    onClick={() => onSelectCurrency(c.currency.code)}
                    className="w-full flex items-center justify-between p-1.5 rounded hover:bg-neutral-900 border border-neutral-800/50 font-mono text-xs text-left transition-colors"
                  >
                    <span className="font-bold text-neutral-100">{c.currency.code}</span>
                    <span className="text-neutral-400 font-semibold tabular-nums">
                      {c.marketStrength !== null ? `${c.marketStrength >= 0 ? '+' : ''}${c.marketStrength.toFixed(2)}` : 'N/A'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Weak */}
          <div className="p-3 bg-neutral-950/70 border border-rose-950/60 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 text-xs font-bold font-mono text-rose-400 uppercase tracking-wider">
                <TrendingDown className="w-3.5 h-3.5" /> Weak
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50">
                {weakCurrencies.length}
              </span>
            </div>
            {weakCurrencies.length === 0 ? (
              <p className="text-xs text-neutral-500 italic font-mono py-2">No currencies ≤ {thresholds.weakThreshold.toFixed(2)}</p>
            ) : (
              <div className="space-y-1.5">
                {weakCurrencies.map((c) => (
                  <button
                    key={c.currency.code}
                    onClick={() => onSelectCurrency(c.currency.code)}
                    className="w-full flex items-center justify-between p-1.5 rounded hover:bg-neutral-900 border border-neutral-800/50 font-mono text-xs text-left transition-colors"
                  >
                    <span className="font-bold text-neutral-100">{c.currency.code}</span>
                    <span className="text-rose-400 font-semibold tabular-nums">
                      {c.marketStrength !== null ? c.marketStrength.toFixed(2) : 'N/A'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
