import { BarChart3 } from "lucide-react";
import { INDICATOR_REGISTRY, type IndicatorType } from "../../../lib/indicators.ts";
import { cn } from "../../../lib/utils.ts";

export interface IndicatorMenuProps {
  activeIndicators: IndicatorType[];
  onToggleIndicator: (type: IndicatorType) => void;
  showIndicatorMenu: boolean;
  onToggleIndicatorMenu: () => void;
}

export function IndicatorMenu({
  activeIndicators,
  onToggleIndicator,
  showIndicatorMenu,
  onToggleIndicatorMenu,
}: IndicatorMenuProps) {
  return (
    <div className="relative hidden md:block">
      <button
        onClick={onToggleIndicatorMenu}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
          activeIndicators.length > 0
            ? "bg-[#2962ff]/15 text-[#2962ff]"
            : "hover:bg-[#1e222d] text-neutral-400 hover:text-neutral-200",
        )}
      >
        <BarChart3 className="h-3.5 w-3.5" />
        Indicators
        {activeIndicators.length > 0 && (
          <span className="bg-[#2962ff] text-white rounded-full px-1.5 text-[9px] font-bold">
            {activeIndicators.length}
          </span>
        )}
      </button>

      {showIndicatorMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={onToggleIndicatorMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              onToggleIndicatorMenu();
            }}
          />
          <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl p-2 space-y-0.5 backdrop-blur-md">
            {INDICATOR_REGISTRY.map((ind) => (
              <button
                key={ind.type}
                onClick={() => onToggleIndicator(ind.type)}
                className={cn(
                  "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-[#2a2e39] text-left text-neutral-200 transition-colors",
                  activeIndicators.includes(ind.type)
                    ? "bg-[#2962ff]/20 text-[#2962ff] font-semibold"
                    : "hover:text-white",
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: ind.color }}
                />
                <span className="flex-1">{ind.label}</span>
                <span className="text-[10px] text-neutral-400 capitalize">{ind.pane}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
