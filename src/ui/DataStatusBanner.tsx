import React from 'react';
import { ShieldCheck, TriangleAlert, Database, Zap } from 'lucide-react';
import { DataSource, ProviderStatus } from '../types';

interface DataStatusBannerProps {
  dataStatus: string;
  statusMessage: string;
  dataSources: DataSource[];
  marketProviderStatus?: ProviderStatus;
  onToggleConnection: () => void;
  onOpenSources: () => void;
}

export const DataStatusBanner: React.FC<DataStatusBannerProps> = ({
  dataStatus,
  statusMessage,
  dataSources,
  marketProviderStatus,
  onOpenSources
}) => {
  const isConnected = dataStatus === 'CONNECTED';
  const macroSources = dataSources.filter((s) => s.id !== 'src-twelvedata');
  const connectedMacroCount = macroSources.filter((s) => s.status === 'CONNECTED').length;
  const health = marketProviderStatus?.health ?? 'NOT_CONFIGURED';

  return (
    <div
      className={`border rounded-lg p-3.5 text-xs transition-colors ${
        isConnected
          ? 'bg-neutral-900/60 border-emerald-500/30 text-neutral-300'
          : 'bg-neutral-900/90 border-rose-500/50 text-neutral-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {isConnected ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <TriangleAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`font-mono font-bold tracking-wider uppercase text-xs ${
                  isConnected ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isConnected
                  ? 'LIVE DATA FEED CONNECTED · PRIMARY STATISTICAL AGENCIES'
                  : 'DATA SOURCE NOT CONNECTED · MARKET DATA SUSPENDED'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                {connectedMacroCount}/{macroSources.length} Macro Agencies
              </span>
              {marketProviderStatus && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    health === 'CONNECTED'
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                      : health === 'DEGRADED'
                      ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  FX: {marketProviderStatus.activeProvider || marketProviderStatus.providerName} ({health})
                </span>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
              {statusMessage}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenSources}
            className="px-3 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono border border-neutral-700 transition-colors flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-neutral-400" />
            Inspect Sources
          </button>
        </div>
      </div>
    </div>
  );
};
