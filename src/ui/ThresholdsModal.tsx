import React, { useState } from 'react';
import { RelativeStrengthConfig } from '../types';
import { X, Settings2, RotateCcw, Check } from 'lucide-react';

interface ThresholdsModalProps {
  currentThresholds: RelativeStrengthConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (strong: number, weak: number) => void;
}

export const ThresholdsModal: React.FC<ThresholdsModalProps> = ({
  currentThresholds,
  isOpen,
  onClose,
  onSave
}) => {
  if (!isOpen) return null;

  const [strongVal, setStrongVal] = useState<number>(currentThresholds.strongThreshold);
  const [weakVal, setWeakVal] = useState<number>(currentThresholds.weakThreshold);

  const handleResetDefaults = () => {
    setStrongVal(0.10);
    setWeakVal(-0.10);
  };

  const handleApply = () => {
    onSave(strongVal, weakVal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-lg max-w-md w-full p-5 text-neutral-200">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-neutral-400" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-100">
              Configure Relative Strength Thresholds
            </h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-100 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          <p className="text-neutral-400 font-sans leading-relaxed">
            The relative strength framework classifies currencies based on their aggregate market & fundamental basket score. Adjust the strong/weak boundaries below:
          </p>

          <div className="space-y-3 font-mono">
            <div>
              <label className="block text-[11px] text-emerald-400 font-semibold uppercase mb-1">
                Strong Boundary (Score ≥ +{strongVal.toFixed(2)})
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.05"
                  max="0.30"
                  step="0.01"
                  value={strongVal}
                  onChange={e => setStrongVal(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400"
                />
                <span className="w-12 text-right font-bold text-emerald-400 tabular-nums">
                  +{strongVal.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-rose-400 font-semibold uppercase mb-1">
                Weak Boundary (Score ≤ {weakVal.toFixed(2)})
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="-0.30"
                  max="-0.05"
                  step="0.01"
                  value={weakVal}
                  onChange={e => setWeakVal(parseFloat(e.target.value))}
                  className="w-full accent-rose-400"
                />
                <span className="w-12 text-right font-bold text-rose-400 tabular-nums">
                  {weakVal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded text-[11px] font-mono text-neutral-400">
              <span className="text-neutral-200 block font-semibold mb-1">Resulting State Bands:</span>
              <div>• STRONG: Score ≥ +{strongVal.toFixed(2)}</div>
              <div>• NEUTRAL: {weakVal.toFixed(2)} &lt; Score &lt; +{strongVal.toFixed(2)}</div>
              <div>• WEAK: Score ≤ {weakVal.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-neutral-800 font-mono text-xs">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1 text-neutral-400 hover:text-neutral-200"
          >
            <RotateCcw className="w-3 h-3" /> Reset Defaults (+0.10 / -0.10)
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-bold flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
