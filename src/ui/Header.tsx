import React from 'react';
import { Settings2 } from 'lucide-react';

interface HeaderProps {
  dataStatus: string;
  onOpenSources: () => void;
  onOpenThresholds: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dataStatus,
  onOpenSources,
  onOpenThresholds
}) => {
  const isConnected = dataStatus === 'CONNECTED';

  return (
    <header className="sticky top-0 z-30 w-full bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-wider text-neutral-100 uppercase">
              VELQOARATH
            </span>
            <span className="text-[10px] tracking-wide text-neutral-500 hidden sm:inline">
              · Global Market Intelligence
            </span>
          </div>
          <span className="text-[10px] text-neutral-600 font-mono tracking-tight">
            Terminal v1.0 · Built by Boogie
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSources}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-colors border ${
              isConnected
                ? 'bg-neutral-900/90 border-emerald-500/30 text-emerald-400 hover:border-emerald-500/60'
                : 'bg-neutral-900/90 border-rose-500/40 text-rose-400 hover:border-rose-500/60'
            }`}
            title="Inspect Data Sources and Connection Status"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] tracking-tight">
              {isConnected ? 'LIVE FEED' : 'DISCONNECTED'}
            </span>
          </button>

          <button
            onClick={onOpenThresholds}
            className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-colors"
            title="Configure Strength Thresholds"
            aria-label="Configure Thresholds"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
