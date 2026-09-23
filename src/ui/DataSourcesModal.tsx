import React from 'react';
import { DataSource, DataSourceStatus } from '../types';
import { MarketProviderStatus } from '../marketData/types';
import { X, ExternalLink, ShieldCheck, Database, Power, AlertTriangle, Activity, Key, Server, Cpu } from 'lucide-react';

interface DataSourcesModalProps {
  dataSources: DataSource[];
  dataStatus: DataSourceStatus;
  marketProviderStatus?: MarketProviderStatus;
  isOpen: boolean;
  onClose: () => void;
  onToggleConnection: () => void;
}

export const DataSourcesModal: React.FC<DataSourcesModalProps> = ({
  dataSources,
  dataStatus,
  marketProviderStatus,
  isOpen,
  onClose,
  onToggleConnection
}) => {
  if (!isOpen) return null;

  const isConnected = dataStatus === 'CONNECTED';
  const macroSources = dataSources.filter(s => s.id !== 'src-twelvedata');
  const marketHealth = marketProviderStatus?.health ?? 'NOT_CONFIGURED';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col text-neutral-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-100">
              Primary Data Sources & Provenance
            </h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Core Principle Notice */}
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded font-sans leading-relaxed text-neutral-300">
            <span className="font-bold text-neutral-100 block mb-1">
              VELQOARATH Data Integrity Principle:
            </span>
            VELQOARATH never fabricates CPI, GDP, employment, central bank decisions, or FX market quotes. When real feeds are offline or unconfigured, the engine explicitly displays <span className="font-mono text-rose-400">DATA SOURCE NOT CONNECTED</span> or <span className="font-mono text-amber-400">DATA UNAVAILABLE</span> rather than generating placeholder numbers. Every observation retains full provenance.
          </div>

          {/* Connection Control Bar */}
          <div className="flex items-center justify-between p-3 bg-neutral-900/50 border border-neutral-800 rounded font-mono">
            <div>
              <span className="text-[11px] text-neutral-400 block uppercase">Macro Feed Connection State</span>
              <span className={`font-bold ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isConnected ? 'LIVE FEED CONNECTED (OFFICIAL DATA)' : 'DISCONNECTED (DATA UNAVAILABLE)'}
              </span>
            </div>
            <button
              onClick={onToggleConnection}
              className={`px-3 py-1.5 rounded font-bold border transition-colors flex items-center gap-1.5 ${
                isConnected
                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-300 hover:bg-rose-900/50'
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/50'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {isConnected ? 'Disconnect Macro Feed' : 'Connect Verified Macro Feed'}
            </button>
          </div>

          {/* Market Data Provider Card */}
          <div className="p-3 bg-neutral-900/70 border border-neutral-800 rounded">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800 mb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-neutral-200">
                  Live FX Market Data Provider
                </span>
              </div>
              <span
                className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                  marketHealth === 'CONNECTED'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : marketHealth === 'DEGRADED'
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                    : marketHealth === 'ERROR'
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                }`}
              >
                {marketHealth}
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-500">Provider:</span>
                <span className="text-neutral-200">Twelve Data (Forex REST API)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Server Key:</span>
                <span className={marketProviderStatus?.isConfigured ? 'text-emerald-400' : 'text-amber-400'}>
                  {marketProviderStatus?.isConfigured ? 'Configured (Server-Side Env)' : 'Missing (TWELVE_DATA_API_KEY not set)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Pairs Observed:</span>
                <span>
                  {marketProviderStatus?.availablePairsCount ?? 0} / {marketProviderStatus?.requiredPairsCount ?? 15} liquid pairs
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Provider Message:</span>
                <span className="text-neutral-400 text-right max-w-xs line-clamp-1">
                  {marketProviderStatus?.message ?? 'Awaiting initialization.'}
                </span>
              </div>
              {marketProviderStatus?.lastFetchedAt && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Last Fetched:</span>
                  <span>{new Date(marketProviderStatus.lastFetchedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            <p className="mt-2.5 pt-2 border-t border-neutral-800/80 text-[10px] text-neutral-500 leading-relaxed font-sans">
              Architecture: <code className="text-neutral-400 font-mono">MarketDataProvider</code> abstraction maps vendor payloads into internal <code className="text-neutral-400 font-mono">NormalizedMarketQuote</code> D1 bars. Zero client-side API exposure.
            </p>
          </div>

          {/* Primary Statistical Agencies List */}
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider block">
              Configured Primary Statistical Agencies ({macroSources.length})
            </span>

            {macroSources.map(src => (
              <div
                key={src.id}
                className="p-3 bg-neutral-900/40 border border-neutral-800 rounded hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-200">{src.name}</span>
                      <span className="text-[10px] font-mono text-neutral-500">
                        ({src.institution})
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {src.coverage.map((cov, i) => (
                        <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          {cov}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono text-[11px]">
                    <span className={`block font-semibold ${src.status === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {src.status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {src.reliabilityGrade}
                    </span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                  <span>Last Sync: {src.lastSyncAt ? new Date(src.lastSyncAt).toLocaleString() : 'N/A'}</span>
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-400 hover:text-emerald-400 flex items-center gap-1"
                  >
                    Publisher Portal <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-neutral-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-mono text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
