import React from 'react';
import { DataSourceStatus, DataSource } from '../types';
import { MarketProviderStatus } from '../marketData/types';
import { CheckCircle2, AlertTriangle, ShieldCheck, Database, Power, Activity } from 'lucide-react';

interface DataStatusBannerProps {
  dataStatus: DataSourceStatus;
  statusMessage: string;
  dataSources: DataSource[];
  marketProviderStatus?: MarketProviderStatus;
  onToggleConnection: () => void;
  onOpenSources: () => void;
}

export const DataStatusBanner: React.FC<DataStatusBannerProps> = ({
  dataStatus,
  statusMessage,
  dataSources,
  marketProviderStatus,
  onToggleConnection,
  onOpenSources
}) => {
  const isConnected = dataStatus === 'CONNECTED';
  const macroSources = dataSources.filter(s => s.id !== 'src-twelvedata');
  const connectedMacroCount = macroSources.filter(s => s.status === 'CONNECTED').length;

  const marketHealth = marketProviderStatus?.health ?? 'NOT_CONFIGURED';
  const isMarketConnected = marketHealth === 'CONNECTED';
  const isMarketConfigured = marketProviderStatus?.isConfigured ?? false;

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
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`font-mono text-[11px] font-bold tracking-wider uppercase ${
                  isConnected ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isConnected ? 'MACRO FEEDS ACTIVE' : 'MACRO FEEDS DISCONNECTED'}
              </span>
              <span className="text-neutral-500 text-[10px] font-mono">
                · {connectedMacroCount}/{macroSources.length} Primary Statistical Agencies
              </span>

              {/* Market Data Provider Status Badge */}
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                  isMarketConnected
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : marketHealth === 'DEGRADED'
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                    : marketHealth === 'ERROR'
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-400'
                }`}
              >
                <Activity className="w-3 h-3" />
                Twelve Data: {marketHealth === 'NOT_CONFIGURED' ? 'NOT CONFIGURED' : marketHealth}
                {marketProviderStatus && marketProviderStatus.quotesCount > 0 && ` (${marketProviderStatus.quotesCount} pairs)`}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
              {statusMessage}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={onOpenSources}
            className="px-2.5 py-1.5 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 font-mono text-[11px] border border-neutral-700/80 transition-colors flex items-center gap-1.5"
          >
            <Database className="w-3.5 h-3.5 text-neutral-400" />
            Inspect Sources
          </button>

          <button
            onClick={onToggleConnection}
            className={`px-2.5 py-1.5 rounded font-mono text-[11px] border transition-colors flex items-center gap-1.5 ${
              isConnected
                ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/50'
                : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
            }`}
            title="Toggle data feed connection state to test unavailable/connected states"
          >
            <Power className="w-3.5 h-3.5" />
            {isConnected ? 'Simulate Disconnect' : 'Connect Verified Feed'}
          </button>
        </div>
      </div>
    </div>
  );
};
