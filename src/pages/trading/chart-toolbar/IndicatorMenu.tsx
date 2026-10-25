import { useState, useMemo, useEffect } from "react";
import { BarChart3, Search, X, Code2, Trash2 } from "lucide-react";
import { INDICATOR_REGISTRY, type IndicatorType } from "../../../lib/indicators.ts";
import {
  getCustomPineIndicators,
  deleteCustomPineIndicator,
  CUSTOM_PINE_UPDATED_EVENT,
  type CustomPineIndicator,
} from "../../../lib/pinescript";
import { PineScriptImportModal } from "./PineScriptImportModal.tsx";
import { cn } from "../../../lib/utils.ts";

export interface IndicatorMenuProps {
  activeIndicators: IndicatorType[];
  onToggleIndicator: (type: IndicatorType) => void;
  showIndicatorMenu: boolean;
  onToggleIndicatorMenu: () => void;
}

type CategoryFilter = "all" | "overlay" | "below" | "custom";

export function IndicatorMenu({
  activeIndicators,
  onToggleIndicator,
  showIndicatorMenu,
  onToggleIndicatorMenu,
}: IndicatorMenuProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [showImportModal, setShowImportModal] = useState(false);
  const [customScripts, setCustomScripts] = useState<CustomPineIndicator[]>(() =>
    getCustomPineIndicators(),
  );

  useEffect(() => {
    const handleUpdate = () => setCustomScripts(getCustomPineIndicators());
    window.addEventListener(CUSTOM_PINE_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(CUSTOM_PINE_UPDATED_EVENT, handleUpdate);
  }, []);

  // Filtered built-in and custom indicators
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    // Built-in indicators
    const builtIns = INDICATOR_REGISTRY.map((ind) => ({
      id: ind.type,
      label: ind.label,
      pane: ind.pane,
      color: ind.color,
      isCustom: false,
    }));

    // Custom Pine Script indicators
    const customs = customScripts.map((cs) => ({
      id: cs.id as IndicatorType,
      label: cs.name,
      pane: cs.overlay ? ("overlay" as const) : ("below" as const),
      color: cs.color,
      isCustom: true,
    }));

    const all = [...builtIns, ...customs];

    return all.filter((item) => {
      // Category filter
      if (category === "overlay" && item.pane !== "overlay") return false;
      if (category === "below" && item.pane !== "below") return false;
      if (category === "custom" && !item.isCustom) return false;

      // Search query
      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.pane.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, category, customScripts]);

  const handleDeleteCustom = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteCustomPineIndicator(id);
    if (activeIndicators.includes(id as IndicatorType)) {
      onToggleIndicator(id as IndicatorType);
    }
  };

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
          <div className="absolute top-full left-0 z-50 mt-1 w-80 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl p-2.5 backdrop-blur-md flex flex-col text-xs">
            {/* Header: Title & Pine Script Import Trigger */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2a2e39]">
              <span className="font-semibold text-white text-[13px]">Indicators</span>
              <button
                onClick={() => {
                  onToggleIndicatorMenu();
                  setShowImportModal(true);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#2962ff]/15 hover:bg-[#2962ff]/25 text-[#2962ff] font-medium text-[11px] transition-colors"
              >
                <Code2 className="h-3.5 w-3.5" />
                Import Pine Script
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search indicators..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-[#131722] border border-[#2a2e39] text-white text-xs placeholder:text-neutral-500 focus:outline-none focus:border-[#2962ff] transition-colors"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 mb-2 overflow-x-auto no-scrollbar pb-0.5">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "overlay", label: "Overlay" },
                  { id: "below", label: "Oscillators" },
                  { id: "custom", label: `Pine (${customScripts.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCategory(tab.id)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap",
                    category === tab.id
                      ? "bg-[#2962ff] text-white"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Fixed-length Scrollable List */}
            <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1 no-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="py-6 text-center text-neutral-400 text-[11px]">
                  No indicators found matching &quot;{searchQuery}&quot;
                </div>
              ) : (
                filteredItems.map((ind) => {
                  const isActive = activeIndicators.includes(ind.id);
                  return (
                    <div
                      key={ind.id}
                      onClick={() => onToggleIndicator(ind.id)}
                      className={cn(
                        "group w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer text-left transition-colors",
                        isActive
                          ? "bg-[#2962ff]/20 text-[#2962ff] font-semibold"
                          : "hover:bg-[#2a2e39] text-neutral-200 hover:text-white",
                      )}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: ind.color }}
                      />
                      <span className="flex-1 truncate">{ind.label}</span>
                      {ind.isCustom && (
                        <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400">
                          PINE
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-400 capitalize shrink-0">
                        {ind.pane}
                      </span>
                      {ind.isCustom && (
                        <button
                          onClick={(e) => handleDeleteCustom(e, ind.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-all shrink-0 ml-0.5"
                          title="Delete custom script"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Pine Script Importer Dialog */}
      <PineScriptImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onIndicatorImported={(type) => {
          if (!activeIndicators.includes(type)) {
            onToggleIndicator(type);
          }
        }}
      />
    </div>
  );
}
