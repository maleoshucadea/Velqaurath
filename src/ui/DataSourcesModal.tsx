import React from 'react';
import { DataSource, DataSourceStatus } from '../types';
import { X, ExternalLink, ShieldCheck, Database, Power, AlertTriangle } from 'lucide-react';

interface DataSourcesModalProps {
  dataSources: DataSource[];
  dataStatus: DataSourceStatus;
  isOpen: boolean;
  onClose: () => void;
  onToggleConnection: () => void;
}

export const DataSourcesModal: React.FC<DataSourcesModalProps> = ({
  dataSources,
  dataStatus,
  isOpen,
  onClose,
  onToggleConnection
}) => {
  if (!isOpen) return null;

  const isConnected = dataStatus === 'CONNECTED';

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
            VELQOARATH never fabricates CPI, GDP, employment, or central bank decisions. When feeds are offline, the engine explicitly displays <span className="font-mono text-rose-400">DATA SOURCE NOT CONNECTED</span> rather than generating placeholder numbers. Every observation retains full provenance back to its primary governmental or central bank publisher.
          </div>

          {/* Connection Control Bar */}
          <div className="flex items-center justify-between p-3 bg-neutral-900/50 border border-neutral-800 rounded font-mono">
            <div>
              <span className="text-[11px] text-neutral-400 block uppercase">Feed Connection State</span>
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
              {isConnected ? 'Disconnect Feed' : 'Connect Verified Feed'}
            </button>
          </div>

          {/* Sources List */}
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-neutral-400 uppercase tracking-wider block">
              Configured Primary Statistical Agencies ({dataSources.length})
            </span>

            {dataSources.map(src => (
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
                      {src.status}
                    </span>
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-neutral-400 hover:text-neutral-200 hover:underline inline-flex items-center gap-0.5 text-[10px] mt-1"
                    >
                      Agency Portal <ExternalLink className="w-2.5 h-2.5 inline" />
                    </a>
                  </div>
                </div>

                <div className="mt-2 pt-1.5 border-t border-neutral-800/60 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                  <span>Reliability: {src.reliabilityGrade}</span>
                  <span>Last Verified: {src.lastSyncAt ? new Date(src.lastSyncAt).toUTCString() : 'Never'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-neutral-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 text-xs font-mono"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
