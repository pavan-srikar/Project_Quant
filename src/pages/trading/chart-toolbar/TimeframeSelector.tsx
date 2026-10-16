import { cn } from "../../../lib/utils.ts";
import { TIMEFRAMES, type Timeframe } from "../constants.ts";

export interface TimeframeSelectorProps {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  isReplaying?: boolean;
}

export function TimeframeSelector({
  timeframe,
  onTimeframeChange,
  isReplaying = false,
}: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-0.5 ml-1 shrink-0">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onTimeframeChange(tf)}
          disabled={isReplaying}
          title={isReplaying ? "Timeframe is fixed to 1m during replay" : undefined}
          className={cn(
            "px-2 py-1 rounded-md text-xs font-semibold transition-colors",
            tf === timeframe
              ? "bg-[#2962ff] text-white shadow-sm"
              : "hover:bg-[#1e222d] text-neutral-400 hover:text-neutral-200",
            isReplaying && "opacity-40 cursor-default",
          )}
        >
          {tf}
        </button>
      ))}
    </div>
  );
}
