import {
  CandlestickChart,
  Check,
  ChevronDown,
  Flame,
  Settings,
} from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useRef, useState } from "react";
import type { ChartType } from "../../../hooks/useChartPreferences.ts";
import { ChartTypeSettingsModal } from "./ChartTypeSettingsModal.tsx";

export function FootprintIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v3m0 14v3" />
      <rect x="4" y="5" width="7" height="4" rx="0.5" fill="currentColor" fillOpacity="0.2" />
      <rect x="13" y="5" width="5" height="4" rx="0.5" fill="currentColor" fillOpacity="0.3" />
      <rect x="3" y="10" width="8" height="4" rx="0.5" fill="currentColor" fillOpacity="0.4" />
      <rect x="13" y="10" width="8" height="4" rx="0.5" fill="currentColor" fillOpacity="0.5" />
      <rect x="5" y="15" width="6" height="4" rx="0.5" fill="currentColor" fillOpacity="0.2" />
      <rect x="13" y="15" width="6" height="4" rx="0.5" fill="currentColor" fillOpacity="0.3" />
      <line x1="12" y1="5" x2="12" y2="19" />
    </svg>
  );
}

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

export interface ChartTypeSelectorProps {
  chartType: ChartType;
  onChangeChartType: (type: ChartType) => void;
}

export function ChartTypeSelector({
  chartType = "candles",
  onChangeChartType,
}: ChartTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<ChartType>("heatmap");
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption: ChartTypeOption =
    CHART_TYPE_OPTIONS.find((opt) => opt.type === chartType) ?? CHART_TYPE_OPTIONS[0]!;
  const ActiveIcon = activeOption.icon;

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
    <>
      <div ref={containerRef} className="relative inline-flex items-center">
        {/* Main Chart Type Trigger Button */}
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
          <ActiveIcon className="w-3.5 h-3.5 text-neutral-300" />
          <span className="hidden sm:inline font-semibold">{activeOption.label}</span>
          <ChevronDown
            className={`w-3 h-3 text-neutral-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Quick Settings Gear Button in Top Toolbar */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setSettingsTab(chartType);
            setIsSettingsOpen(true);
          }}
          title={`Configure ${activeOption.label} Settings`}
          className="p-1 ml-0.5 rounded text-neutral-400 hover:text-white hover:bg-[#202430] transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-0 top-full mt-1 w-64 rounded-md bg-[#1e222d] border border-[#2a2e39] shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
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
                      onChangeChartType(opt.type);
                      setIsOpen(false);
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

      {/* Settings Modal */}
      <ChartTypeSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
      />
    </>
  );
}
