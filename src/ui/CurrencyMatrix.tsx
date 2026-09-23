import React from 'react';
import { ChevronRight } from 'lucide-react';
import { CurrencyState } from '../types';

interface CurrencyMatrixProps {
  currencies: CurrencyState[];
  onSelectCurrency: (code: string) => void;
}

export const CurrencyMatrix: React.FC<CurrencyMatrixProps> = ({
  currencies,
  onSelectCurrency
}) => {
  return (
    <section className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-200 tracking-wide uppercase">
            Currency Matrix
          </h2>
          <p className="text-[11px] text-neutral-500 font-mono mt-0.5">
            Relative strength · Fundamental impulse · Central bank stance
          </p>
        </div>
        <span className="text-[11px] text-neutral-500 font-mono">8 Core Majors</span>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-800 text-[11px] font-mono text-neutral-500 uppercase">
              <th className="py-2 px-2 font-medium">Currency</th>
              <th className="py-2 px-2 font-medium">Market</th>
              <th className="py-2 px-2 font-medium">Fundamentals</th>
              <th className="py-2 px-2 font-medium">Policy</th>
              <th className="py-2 px-2 font-medium">Overall</th>
              <th className="py-2 px-2 font-medium text-right">State</th>
              <th className="py-2 px-1 w-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 font-mono">
            {currencies.map((c) => {
              const mScore = c.marketStrength;
              const fScore = c.fundamentalState.fundamentalScore;
              const cbStance = c.centralBank.stance;
              const overall = c.overallState;

              return (
                <tr
                  key={c.currency.code}
                  onClick={() => onSelectCurrency(c.currency.code)}
                  className="hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                >
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-neutral-100 group-hover:text-emerald-300">
                        {c.currency.code}
                      </span>
                      <span className="text-[11px] text-neutral-500 font-sans hidden sm:inline">
                        {c.currency.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 tabular-nums">
                    {mScore === null ? (
                      <span className="text-neutral-600">UNAVAILABLE</span>
                    ) : (
                      <span
                        className={`font-semibold ${
                          c.marketState === 'STRONG'
                            ? 'text-emerald-400'
                            : c.marketState === 'WEAK'
                            ? 'text-rose-400'
                            : 'text-neutral-300'
                        }`}
                      >
                        {mScore >= 0 ? '+' : ''}
                        {mScore.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2 tabular-nums">
                    {fScore === null ? (
                      <span className="text-neutral-600">UNAVAILABLE</span>
                    ) : (
                      <span
                        className={
                          fScore > 0.05
                            ? 'text-emerald-400'
                            : fScore < -0.05
                            ? 'text-rose-400'
                            : 'text-neutral-400'
                        }
                      >
                        {fScore >= 0 ? '+' : ''}
                        {fScore.toFixed(2)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`text-[11px] font-sans font-medium ${
                        cbStance === 'HAWKISH'
                          ? 'text-emerald-400'
                          : cbStance === 'DOVISH'
                          ? 'text-rose-400'
                          : 'text-neutral-300'
                      }`}
                    >
                      {cbStance}
                    </span>
                    <span className="text-neutral-500 text-[10px] ml-1">
                      (
                      {c.centralBank.currentPolicyRate === null
                        ? 'N/A'
                        : `${c.centralBank.currentPolicyRate}%`}
                      )
                    </span>
                  </td>
                  <td className="py-2.5 px-2">
                    <span
                      className={`text-[11px] font-sans font-medium ${
                        overall === 'STRONG'
                          ? 'text-emerald-400'
                          : overall === 'WEAK'
                          ? 'text-rose-400'
                          : overall === 'NEUTRAL'
                          ? 'text-neutral-300'
                          : 'text-neutral-600'
                      }`}
                    >
                      {overall}
                    </span>
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <span
                      className={`text-[10px] uppercase font-mono tracking-wider ${
                        c.marketState === 'STRONG'
                          ? 'text-emerald-400 font-bold'
                          : c.marketState === 'WEAK'
                          ? 'text-rose-400 font-bold'
                          : 'text-neutral-400'
                      }`}
                    >
                      {c.marketState}
                    </span>
                  </td>
                  <td className="py-2.5 px-1 text-neutral-600 group-hover:text-neutral-300">
                    <ChevronRight className="w-3.5 h-3.5" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
