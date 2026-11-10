import {
  CandlestickChart,
  Check,
  ChevronDown,
  Flame,
  Search,
  Settings,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { ChartType } from "../../../hooks/useChartPreferences.ts";
import { cn } from "../../../lib/utils.ts";
import { ChartTypeSettingsModal } from "./ChartTypeSettingsModal.tsx";
import { FootprintIcon } from "./ChartTypeSelector.tsx";
import type { ToolbarSymbolItem } from "./types.ts";

export interface ChartTypeOption {
  type: ChartType;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}

export const CHART_TYPE_OPTIONS: ChartTypeOption[] = [
  {
    type: "candles",
    label: "Candles",
    description: "Standard Japanese Candlesticks",
    icon: CandlestickChart,
  },
  {
    type: "footprint",
    label: "Footprint",
    description: "Bid × Ask volume clusters at price levels",
    icon: FootprintIcon,
  },
  {
    type: "heatmap",
    label: "Liquidation Heatmap",
    description: "Estimated leveraged liquidation pools",
    icon: Flame,
  },
];

export interface SymbolAndChartTypeCapsuleProps {
  selectedSymbol: string;
  symbols: ToolbarSymbolItem[];
  onSymbolChange: (s: string) => void;
  onOpenSymbolSearch?: () => void;
  chartType?: ChartType;
  onChangeChartType?: (type: ChartType) => void;
}

export function SymbolAndChartTypeCapsule({
  selectedSymbol,
  symbols,
  onSymbolChange,
  onOpenSymbolSearch,
  chartType = "candles",
  onChangeChartType,
}: SymbolAndChartTypeCapsuleProps) {
  const [isChartTypeOpen, setIsChartTypeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<ChartType>("heatmap");
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState("");

  const chartTypeRef = useRef<HTMLDivElement>(null);
  const symbolSearchRef = useRef<HTMLDivElement>(null);

  const activeOption: ChartTypeOption =
    CHART_TYPE_OPTIONS.find((opt) => opt.type === chartType) ?? CHART_TYPE_OPTIONS[0]!;
  const ActiveIcon = activeOption.icon;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (chartTypeRef.current && !chartTypeRef.current.contains(e.target as Node)) {
        setIsChartTypeOpen(false);
      }
      if (symbolSearchRef.current && !symbolSearchRef.current.contains(e.target as Node)) {
        setShowSymbolSearch(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsChartTypeOpen(false);
        setShowSymbolSearch(false);
      }
    }
    if (isChartTypeOpen || showSymbolSearch) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isChartTypeOpen, showSymbolSearch]);

  const filteredSymbols = symbols.filter(
    (s) =>
      s.name.toLowerCase().includes(symbolFilter.toLowerCase()) ||
      (s.category || "").toLowerCase().includes(symbolFilter.toLowerCase()),
  );

  return (
    <>
      <div className="flex items-center gap-1 shrink-0">
        {/* Unified Capsule (TradingView layout inspiration) */}
        <div className="flex items-center rounded-lg bg-[#1e222d] border border-[#2a2e39] p-0.5 hover:border-[#3b4150] transition-colors shadow-sm">
          {/* Symbol Trigger Button */}
          <div ref={symbolSearchRef} className="relative">
            <button
              type="button"
              onClick={() => {
                if (onOpenSymbolSearch) {
                  onOpenSymbolSearch();
                } else {
                  setShowSymbolSearch((v) => !v);
                }
              }}
              title="Search symbol (Alt+S)"
              className="flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-[#2a2e39] text-xs sm:text-sm font-bold tracking-tight text-neutral-100 hover:text-white transition-colors cursor-pointer select-none"
            >
              <span>{selectedSymbol}</span>
            </button>

            {/* Fallback Inline Search Dropdown (only when onOpenSymbolSearch is not provided) */}
            {showSymbolSearch && (
              <div className="absolute top-full left-0 z-50 mt-1.5 w-64 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2e39] bg-[#131722]">
                  <Search className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                  <input
                    autoFocus
                    placeholder="Search symbols..."
                    value={symbolFilter}
                    onChange={(e) => setSymbolFilter(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-neutral-100 placeholder:text-neutral-500 outline-none"
                  />
                  {symbolFilter && (
                    <button
                      type="button"
                      onClick={() => setSymbolFilter("")}
                      className="text-neutral-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-[#131722]">
                  {filteredSymbols.map((s) => (
                    <button
                      type="button"
                      key={s.id || s.name}
                      onClick={() => {
                        onSymbolChange(s.name);
                        setShowSymbolSearch(false);
                        setSymbolFilter("");
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#2a2e39] text-left transition-colors cursor-pointer",
                        s.name === selectedSymbol && "bg-[#2a2e39] border-l-2 border-[#2962ff]",
                      )}
                    >
                      <span className="font-semibold text-neutral-100">{s.name}</span>
                      <span className="text-neutral-400 text-[10px]">{s.category}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Thin Vertical Separator inside Capsule */}
          <div className="h-3.5 w-px bg-[#2a2e39] mx-0.5" />

          {/* Chart Type Icon Button */}
          <div ref={chartTypeRef} className="relative">
            <button
              type="button"
              onClick={() => setIsChartTypeOpen((prev) => !prev)}
              title={`Chart Type: ${activeOption.label}`}
              className={`flex items-center gap-1 px-1.5 py-1 rounded-md text-xs transition-colors cursor-pointer select-none ${
                isChartTypeOpen
                  ? "bg-[#2a2e39] text-white"
                  : "text-neutral-300 hover:text-white hover:bg-[#2a2e39]"
              }`}
            >
              <ActiveIcon className="w-3.5 h-3.5 text-neutral-300" />
              <ChevronDown
                className={`w-2.5 h-2.5 text-neutral-400 transition-transform ${isChartTypeOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Chart Visualization Dropdown (Clean, without individual gear icons) */}
            {isChartTypeOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-60 rounded-md bg-[#1e222d] border border-[#2a2e39] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase border-b border-[#2a2e39]">
                  Chart Visualization
                </div>
                <div className="py-1">
                  {CHART_TYPE_OPTIONS.map((opt) => {
                    const isSelected = opt.type === chartType;
                    const OptionIcon = opt.icon;
                    return (
                      <div
                        key={opt.type}
                        onClick={() => {
                          onChangeChartType?.(opt.type);
                          setIsChartTypeOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer group ${
                          isSelected
                            ? "bg-[#2962ff]/15 text-[#2962ff] font-semibold"
                            : "text-neutral-300 hover:bg-[#2a2e39] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <OptionIcon className="w-4 h-4 shrink-0 text-neutral-300 group-hover:text-white" />
                          <div className="flex flex-col">
                            <span>{opt.label}</span>
                            <span className="text-[10px] text-neutral-400 font-normal leading-tight">
                              {opt.description}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-[#2962ff] shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Settings Gear Button before Timeframe Selector */}
        <button
          type="button"
          onClick={() => {
            setSettingsTab(chartType === "candles" ? "heatmap" : chartType);
            setIsSettingsOpen(true);
          }}
          title="Configure Chart Visualization Settings"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1e222d] border border-transparent hover:border-[#2a2e39] transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Chart Type Settings Modal */}
      <ChartTypeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
      />
    </>
  );
}
