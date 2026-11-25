import { CandlestickChart, Flame, Settings, X } from "lucide-react";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import {
  updateChartPreferences,
  useChartPreferences,
  type ChartType,
} from "../../../hooks/useChartPreferences.ts";
import { FootprintIcon } from "./ChartTypeSelector.tsx";
import { HeatmapSettingsTab } from "./HeatmapSettingsTab.tsx";

export interface ChartTypeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: ChartType;
}

const TABS: Array<{
  type: ChartType;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { type: "heatmap", label: "Liquidation Heatmap", icon: Flame },
  { type: "footprint", label: "Footprint", icon: FootprintIcon },
  { type: "candles", label: "Candles", icon: CandlestickChart },
];

export function ChartTypeSettingsModal({
  isOpen,
  onClose,
  initialTab = "heatmap",
}: ChartTypeSettingsModalProps) {
  const prefs = useChartPreferences();
  const [activeTab, setActiveTab] = useState<ChartType>(initialTab);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-100">
      <div className="w-full max-w-md rounded-lg bg-[#1e222d] border border-[#2a2e39] shadow-2xl overflow-hidden flex flex-col text-neutral-200 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e39] bg-[#181b24]">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#2962ff]" />
            <span className="font-semibold text-sm text-white">Chart Visualization Settings</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-[#2a2e39] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2a2e39] bg-[#141720]">
          {TABS.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.type}
                type="button"
                onClick={() => setActiveTab(tab.type)}
                className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-1.5 font-medium transition-colors border-b-2 ${
                  activeTab === tab.type
                    ? "border-[#2962ff] text-white bg-[#1e222d]"
                    : "border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-[#1a1d27]"
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {activeTab === "heatmap" && <HeatmapSettingsTab />}

          {activeTab === "footprint" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-neutral-300">
                  <label className="font-medium">Diagonal Imbalance Ratio</label>
                  <span className="text-neutral-400 font-mono">
                    {prefs.footprintImbalanceRatio.toFixed(1)}x
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[2.0, 2.5, 3.0, 4.0].map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => updateChartPreferences({ footprintImbalanceRatio: ratio })}
                      className={`py-1.5 rounded border text-center transition-colors ${
                        prefs.footprintImbalanceRatio === ratio
                          ? "bg-[#2962ff]/20 border-[#2962ff] text-white font-semibold"
                          : "bg-[#181b24] border-[#2a2e39] text-neutral-400 hover:text-white"
                      }`}
                    >
                      {ratio.toFixed(1)}x
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-neutral-400 block">
                  Highlights aggressive buy/sell diagonal volume clusters.
                </span>
              </div>

              <div className="pt-2 border-t border-[#2a2e39]">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={prefs.footprintShowSummary}
                    onChange={(e) =>
                      updateChartPreferences({ footprintShowSummary: e.target.checked })
                    }
                    className="rounded accent-[#2962ff]"
                  />
                  <span>Show Delta & Total Volume Cards below bars</span>
                </label>
              </div>
            </div>
          )}

          {activeTab === "candles" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={prefs.showWicks}
                    onChange={(e) => updateChartPreferences({ showWicks: e.target.checked })}
                    className="rounded accent-[#2962ff]"
                  />
                  <span>Show Candlestick Wicks</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-neutral-300">
                  <input
                    type="checkbox"
                    checked={prefs.showCandleBorders}
                    onChange={(e) => updateChartPreferences({ showCandleBorders: e.target.checked })}
                    className="rounded accent-[#2962ff]"
                  />
                  <span>Show Candlestick Borders</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2a2e39]">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Up Candle</label>
                  <input
                    type="color"
                    value={prefs.candleUpColor || "#d1d4dc"}
                    onChange={(e) => updateChartPreferences({ candleUpColor: e.target.value })}
                    className="w-full h-8 bg-transparent cursor-pointer rounded border border-[#2a2e39]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">Down Candle</label>
                  <input
                    type="color"
                    value={prefs.candleDownColor || "#5d606b"}
                    onChange={(e) => updateChartPreferences({ candleDownColor: e.target.value })}
                    className="w-full h-8 bg-transparent cursor-pointer rounded border border-[#2a2e39]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#181b24] border-t border-[#2a2e39] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2962ff] hover:bg-[#1e4bd8] text-white rounded font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
