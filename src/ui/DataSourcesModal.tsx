import React from 'react';
import { Database, Power, Activity, ExternalLink, X } from 'lucide-react';
import { DataSource, ProviderStatus } from '../types';

interface DataSourcesModalProps {
  dataSources: DataSource[];
  dataStatus: string;
  marketProviderStatus?: ProviderStatus;
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
  const macroSources = dataSources.filter((s) => s.id !== 'src-twelvedata');
  const health = marketProviderStatus?.health ?? 'NOT_CONFIGURED';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col text-neutral-200">
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

        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Integrity Principle */}
          <div className="p-3 bg-neutral-900 border border-neutral-800 rounded font-sans leading-relaxed text-neutral-300">
            <span className="font-bold text-neutral-100 block mb-1">
              VELQOARATH Data Integrity Principle:
            </span>
            VELQOARATH never fabricates CPI, GDP, employment, central bank decisions, or FX market quotes. When real feeds are offline or unconfigured, the engine explicitly displays <span className="font-mono text-rose-400">DATA SOURCE NOT CONNECTED</span> or <span className="font-mono text-amber-400">DATA UNAVAILABLE</span> rather than generating placeholder numbers. Every observation retains full provenance.
          </div>

          {/* Macro Connection Toggle */}
          <div className="flex items-center justify-between p-3 bg-neutral-900/50 border border-neutral-800 rounded font-mono">
            <div>
              <span className="text-[11px] text-neutral-400 block uppercase">
                Macro Feed Connection State
              </span>
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

          {/* FX Provider Status */}
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
                  health === 'CONNECTED'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                    : health === 'DEGRADED'
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                    : health === 'ERROR'
                    ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                }`}
              >
                {health}
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-500">Active Provider:</span>
                <span className="text-emerald-400 font-bold">
                  {marketProviderStatus?.activeProvider ?? marketProviderStatus?.providerName ?? 'Biquote'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Primary Feed:</span>
                <span className="text-neutral-200">Biquote (Public REST & SignalR Tick Hub)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Secondary Fallback:</span>
                <span className="text-neutral-400">
                  Twelve Data ({marketProviderStatus?.fallbackAvailable ? 'Available' : 'Not Configured'})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Pairs Observed:</span>
                <span>
                  {marketProviderStatus?.availablePairsCount ?? 0} / {marketProviderStatus?.requiredPairsCount ?? 15} liquid pairs
                  {marketProviderStatus?.stalePairs && marketProviderStatus.stalePairs.length > 0 && (
                    <span className="text-amber-400 ml-1">
                      ({marketProviderStatus.stalePairs.length} stale)
                    </span>
                  )}
                </span>
              </div>
              {marketProviderStatus?.oldestQuoteAge !== null && marketProviderStatus?.oldestQuoteAge !== undefined && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Oldest Quote Age:</span>
                  <span className={marketProviderStatus.oldestQuoteAge <= 30 ? 'text-emerald-400' : 'text-amber-400'}>
                    {marketProviderStatus.oldestQuoteAge}s
                  </span>
                </div>
              )}
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
              Architecture: <code className="text-neutral-400 font-mono">MarketDataProvider</code> abstraction maps vendor payloads into internal <code className="text-neutral-400 font-mono">MarketQuote</code> bars. Zero client-side API exposure.
            </p>
          </div>

          {/* Statistical Agencies */}
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider block">
              Configured Primary Statistical Agencies ({macroSources.length})
            </span>
            {macroSources.map((source) => (
              <div
                key={source.id}
                className="p-3 bg-neutral-900/40 border border-neutral-800 rounded hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-200">{source.name}</span>
                      <span className="text-[10px] font-mono text-neutral-500">({source.institution})</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {source.coverage.map((c, i) => (
                        <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[11px]">
                    <span className={`block font-semibold ${source.status === 'CONNECTED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {source.status === 'CONNECTED' ? 'CONNECTED' : 'DISCONNECTED'}
                    </span>
                    <span className="text-[10px] text-neutral-500">{source.reliabilityGrade}</span>
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[10px] text-neutral-500 font-mono">
                  <span>Last Sync: {source.lastSyncAt ? new Date(source.lastSyncAt).toLocaleString() : 'N/A'}</span>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    Agency Portal <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
