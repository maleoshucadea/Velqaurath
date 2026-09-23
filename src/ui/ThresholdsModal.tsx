import React, { useState } from 'react';
import { RotateCcw, Check, X, Sliders } from 'lucide-react';
import { StrengthThresholds } from '../types';

interface ThresholdsModalProps {
  currentThresholds: StrengthThresholds;
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
  const [strong, setStrong] = useState(currentThresholds.strongThreshold);
  const [weak, setWeak] = useState(currentThresholds.weakThreshold);

  if (!isOpen) return null;

  const handleReset = () => {
    setStrong(0.1);
    setWeak(-0.1);
  };

  const handleApply = () => {
    onSave(strong, weak);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-950 border border-neutral-800 rounded-lg max-w-md w-full p-5 text-neutral-200">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-neutral-100">
              Configure Strength Thresholds
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-400 mb-4 leading-relaxed font-sans">
          Adjust the relative basket score boundaries used to classify currencies into Strong, Neutral, or Weak market states.
        </p>

        <div className="space-y-4 mb-6">
          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-neutral-300">Strong Threshold (≥):</span>
              <span className="text-emerald-400 font-bold">+{strong.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.50"
              step="0.01"
              value={strong}
              onChange={(e) => setStrong(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-neutral-800 rounded cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-mono mb-1.5">
              <span className="text-neutral-300">Weak Threshold (≤):</span>
              <span className="text-rose-400 font-bold">{weak.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-0.50"
              max="-0.05"
              step="0.01"
              value={weak}
              onChange={(e) => setWeak(parseFloat(e.target.value))}
              className="w-full accent-rose-500 bg-neutral-800 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-neutral-800/80 text-xs font-mono">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-neutral-400 hover:text-neutral-200"
          >
            <RotateCcw className="w-3 h-3" />
            Reset Defaults (+0.10 / -0.10)
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
              <Check className="w-3.5 h-3.5" />
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
