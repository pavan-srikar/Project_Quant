import { useEffect, useRef, useState } from "react";
import type { ChartType } from "../../../hooks/useChartPreferences.ts";

export interface ChartTypeOption {
  type: ChartType;
  label: string;
  description: string;
  icon: string;
}

export const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
  {
    type: "candles",
    label: "Candles",
    description: "Standard Japanese Candlesticks",
    icon: "🕯️",
  },
  {
    type: "footprint",
    label: "Footprint",
    description: "Bid × Ask volume clusters at price levels",
    icon: "🪜",
  },
];

export interface ChartTypeSelectorProps {
  chartType: ChartType;
  onChangeChartType: (type: ChartType) => void;
}

export function ChartTypeSelector({
  chartType = "candles",
  onChangeChartType,
}: ChartTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption: ChartTypeOption =
    CHART_TYPE_OPTIONS.find((opt) => opt.type === chartType) ?? CHART_TYPE_OPTIONS[0]!;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={`Chart Type: ${activeOption.label}`}
        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors border ${
          isOpen
            ? "bg-[#2a2e39] text-white border-[#3b4150]"
            : "text-neutral-300 hover:text-white hover:bg-[#202430] border-transparent"
        }`}
      >
        <span className="text-sm leading-none">{activeOption.icon}</span>
        <span className="hidden sm:inline font-semibold">{activeOption.label}</span>
        <svg
          className={`w-3 h-3 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 rounded-md bg-[#1e222d] border border-[#2a2e39] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase border-b border-[#2a2e39]">
            Chart Visualization
          </div>
          <div className="py-1">
            {CHART_TYPE_OPTIONS.map((opt) => {
              const isSelected = opt.type === chartType;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => {
                    onChangeChartType(opt.type);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-[#2962ff]/15 text-[#2962ff] font-semibold"
                      : "text-neutral-300 hover:bg-[#2a2e39] hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{opt.icon}</span>
                    <div className="flex flex-col">
                      <span>{opt.label}</span>
                      <span className="text-[10px] text-neutral-400 font-normal leading-tight">
                        {opt.description}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-[#2962ff] text-sm leading-none font-bold">✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
