import React from 'react';
import { CurrencyState, RelativeStrengthConfig } from '../types';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

interface MarketStateSummaryProps {
  allCurrencies: CurrencyState[];
  strongCurrencies: CurrencyState[];
  neutralCurrencies: CurrencyState[];
  weakCurrencies: CurrencyState[];
  thresholds: RelativeStrengthConfig;
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
  const isMarketDataUnavailable =
    allCurrencies.length > 0 && allCurrencies.every(c => c.marketState === 'DATA_UNAVAILABLE');

  return (
    <section className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200 tracking-wide uppercase">
            Current Market State
          </h2>
          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Framework: Strong ≥ {thresholds.strongThreshold >= 0 ? '+' : ''}{thresholds.strongThreshold.toFixed(2)} · Weak ≤ {thresholds.weakThreshold.toFixed(2)}
          </p>
        </div>
      </div>

      {isMarketDataUnavailable ? (
        <div className="p-5 bg-neutral-950/80 border border-neutral-800/90 rounded text-center">
          <div className="inline-flex items-center justify-center p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-2">
            <Info className="w-4 h-4" />
          </div>
          <h3 className="font-mono text-xs font-bold text-neutral-200 uppercase tracking-wider">
            MARKET DATA UNAVAILABLE / NOT CONFIGURED
          </h3>
          <p className="text-[11px] text-neutral-400 max-w-md mx-auto mt-1 leading-relaxed">
            Market strength calculations require real FX quotes from Twelve Data. Set <code className="text-neutral-300 font-mono bg-neutral-800 px-1 py-0.5 rounded">TWELVE_DATA_API_KEY</code> on the server to activate live market strength. Macroeconomic fundamental conditions and central bank stances remain active below.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* STRONGEST CURRENCIES */}
        <div className="p-3 bg-neutral-950/70 border border-neutral-800/90 rounded flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Strongest
              </span>
              <span className="text-[11px] font-mono text-neutral-500">
                {strongCurrencies.length} currencies
              </span>
            </div>

            {strongCurrencies.length === 0 ? (
              <p className="text-xs text-neutral-500 italic py-2">
                No currency currently exceeds +{thresholds.strongThreshold.toFixed(2)}
              </p>
            ) : (
              <div className="space-y-2">
                {strongCurrencies.map(c => {
                  const strength = c.marketStrength ?? 0;
                  return (
                    <button
                      key={c.currency.code}
                      onClick={() => onSelectCurrency(c.currency.code)}
                      className="w-full text-left p-2 rounded bg-neutral-900/80 border border-neutral-800 hover:border-emerald-500/40 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-neutral-100 group-hover:text-emerald-300">
                          {c.currency.code}
                        </span>
                        <span className="font-mono text-xs text-emerald-400 font-semibold tabular-nums">
                          +{strength.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
                        {c.centralBank.institution} · {c.centralBank.stance}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-[10px] text-neutral-500 font-mono mt-3 pt-2 border-t border-neutral-900">
            Yield impulse + hawkish policy alignment
          </p>
        </div>

        {/* NEUTRAL CURRENCIES */}
        <div className="p-3 bg-neutral-950/70 border border-neutral-800/90 rounded flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Minus className="w-3.5 h-3.5 text-neutral-400" /> Neutral
              </span>
              <span className="text-[11px] font-mono text-neutral-500">
                {neutralCurrencies.length} currencies
              </span>
            </div>

            {neutralCurrencies.length === 0 ? (
              <p className="text-xs text-neutral-500 italic py-2">
                All currencies shifted outside neutral bounds
              </p>
            ) : (
              <div className="space-y-2">
                {neutralCurrencies.map(c => {
                  const strength = c.marketStrength ?? 0;
                  return (
                    <button
                      key={c.currency.code}
                      onClick={() => onSelectCurrency(c.currency.code)}
                      className="w-full text-left p-2 rounded bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-neutral-100 group-hover:text-neutral-300">
                          {c.currency.code}
                        </span>
                        <span className="font-mono text-xs text-neutral-300 tabular-nums">
                          {strength >= 0 ? '+' : ''}{strength.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
                        {c.centralBank.institution} · {c.centralBank.stance}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-[10px] text-neutral-500 font-mono mt-3 pt-2 border-t border-neutral-900">
            Bounded range; opposing macro forces
          </p>
        </div>

        {/* WEAKEST CURRENCIES */}
        <div className="p-3 bg-neutral-950/70 border border-neutral-800/90 rounded flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5" /> Weakest
              </span>
              <span className="text-[11px] font-mono text-neutral-500">
                {weakCurrencies.length} currencies
              </span>
            </div>

            {weakCurrencies.length === 0 ? (
              <p className="text-xs text-neutral-500 italic py-2">
                No currency currently below {thresholds.weakThreshold.toFixed(2)}
              </p>
            ) : (
              <div className="space-y-2">
                {weakCurrencies.map(c => {
                  const strength = c.marketStrength ?? 0;
                  return (
                    <button
                      key={c.currency.code}
                      onClick={() => onSelectCurrency(c.currency.code)}
                      className="w-full text-left p-2 rounded bg-neutral-900/80 border border-neutral-800 hover:border-rose-500/40 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-neutral-100 group-hover:text-rose-300">
                          {c.currency.code}
                        </span>
                        <span className="font-mono text-xs text-rose-400 font-semibold tabular-nums">
                          {strength.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1 line-clamp-1">
                        {c.centralBank.institution} · {c.centralBank.stance}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <p className="text-[10px] text-neutral-500 font-mono mt-3 pt-2 border-t border-neutral-900">
            Monetary easing or disinflationary drag
          </p>
        </div>
      </div>
      )}
    </section>
  );
};
