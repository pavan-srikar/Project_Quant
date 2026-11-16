import { Minus, Plus } from "lucide-react";

export interface NumberStepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (val: number) => void;
}

export function NumberStepper({
  value,
  min,
  max,
  step = 1,
  onChange,
}: NumberStepperProps) {
  const handleDec = () => {
    const rawNext = value - step;
    const next = step < 1 ? parseFloat(rawNext.toFixed(4)) : rawNext;
    onChange(min !== undefined ? Math.max(min, next) : next);
  };

  const handleInc = () => {
    const rawNext = value + step;
    const next = step < 1 ? parseFloat(rawNext.toFixed(4)) : rawNext;
    onChange(max !== undefined ? Math.min(max, next) : next);
  };

  return (
    <div className="flex items-center rounded-lg bg-[#131722] border border-[#2a2e39] overflow-hidden focus-within:border-[#2962ff] shadow-sm">
      <button
        type="button"
        onClick={handleDec}
        disabled={min !== undefined && value <= min}
        className="px-2 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-25 disabled:pointer-events-none transition-colors"
        title="Decrease value"
      >
        <Minus className="w-3 h-3" />
      </button>
      <input
        type="number"
        value={isNaN(value) ? "" : value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed)) {
            let clamped = parsed;
            if (min !== undefined) clamped = Math.max(min, clamped);
            if (max !== undefined) clamped = Math.min(max, clamped);
            onChange(clamped);
          }
        }}
        className="w-16 px-1 py-1 bg-transparent text-white font-mono text-xs text-center focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={handleInc}
        disabled={max !== undefined && value >= max}
        className="px-2 py-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-25 disabled:pointer-events-none transition-colors"
        title="Increase value"
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  );
}
