import { useState, useMemo, useEffect } from "react";
import { BarChart3, Search, X, Code2, Trash2, Check } from "lucide-react";
import { INDICATOR_REGISTRY, type IndicatorType } from "../../../lib/indicators.ts";
import {
  getCustomPineIndicators,
  deleteCustomPineIndicator,
  CUSTOM_PINE_UPDATED_EVENT,
  OPEN_PINESCRIPT_EDITOR_EVENT,
  type CustomPineIndicator,
} from "../../../lib/pinescript";
import { PineScriptEditorModal } from "./PineScriptEditorModal.tsx";
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
  const [editingIndicator, setEditingIndicator] = useState<IndicatorType | null>(null);
  const [customScripts, setCustomScripts] = useState<CustomPineIndicator[]>(() =>
    getCustomPineIndicators(),
  );

  useEffect(() => {
    const handleUpdate = () => setCustomScripts(getCustomPineIndicators());
    const handleOpenEditor = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setEditingIndicator(detail?.type || null);
      setShowImportModal(true);
    };
    window.addEventListener(CUSTOM_PINE_UPDATED_EVENT, handleUpdate);
    window.addEventListener(OPEN_PINESCRIPT_EDITOR_EVENT, handleOpenEditor);
    return () => {
      window.removeEventListener(CUSTOM_PINE_UPDATED_EVENT, handleUpdate);
      window.removeEventListener(OPEN_PINESCRIPT_EDITOR_EVENT, handleOpenEditor);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const builtIns = INDICATOR_REGISTRY.map((ind) => ({
      id: ind.type,
      label: ind.label,
      pane: ind.pane,
      color: ind.color,
      isCustom: false,
    }));
    const customs = customScripts.map((cs) => ({
      id: cs.id as IndicatorType,
      label: cs.name,
      pane: cs.overlay ? ("overlay" as const) : ("below" as const),
      color: cs.color,
      isCustom: true,
    }));
    const all = [...builtIns, ...customs];

    return all.filter((item) => {
      if (category === "overlay" && item.pane !== "overlay") return false;
      if (category === "below" && item.pane !== "below") return false;
      if (category === "custom" && !item.isCustom) return false;
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
          <div className="absolute top-full left-0 z-50 mt-1 w-[400px] bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl p-2.5 backdrop-blur-md flex flex-col text-xs">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2a2e39]">
              <span className="font-semibold text-white text-[13px]">Indicators</span>
              <button
                onClick={() => {
                  onToggleIndicatorMenu();
                  setEditingIndicator(null);
                  setShowImportModal(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#2962ff]/15 hover:bg-[#2962ff]/25 text-[#2962ff] font-medium text-[11px] transition-colors"
              >
                <Code2 className="h-3.5 w-3.5" />
                Import Pine Script
              </button>
            </div>

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

            <div className="flex items-center gap-1.5 mb-2 overflow-x-auto no-scrollbar pb-0.5">
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
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap shrink-0",
                    category === tab.id
                      ? "bg-[#2962ff] text-white font-semibold shadow-sm"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1 pr-1 no-scrollbar">
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
                        "group w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer text-left transition-colors border",
                        isActive
                          ? "bg-[#2962ff]/15 border-[#2962ff]/40 text-white font-medium"
                          : "border-transparent hover:bg-[#2a2e39] text-neutral-300 hover:text-white",
                      )}
                    >
                      <span className="w-4 h-4 shrink-0 flex items-center justify-center">
                        {isActive ? (
                          <Check className="h-3.5 w-3.5 text-[#2962ff] stroke-[2.5]" />
                        ) : (
                          <span
                            className="w-2 h-2 rounded-full opacity-60"
                            style={{ backgroundColor: ind.color }}
                          />
                        )}
                      </span>
                      <span className="flex-1 truncate" title={ind.label}>
                        {ind.label}
                      </span>
                      {ind.isCustom && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 shrink-0">
                          PINE
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-400 capitalize shrink-0">
                        {ind.pane}
                      </span>

                      {/* {/} Pine Script Edit Option */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingIndicator(ind.id);
                          setShowImportModal(true);
                        }}
                        className="opacity-0 group-hover:opacity-100 px-1 py-0.5 rounded hover:bg-[#2962ff]/20 text-neutral-400 hover:text-[#2962ff] font-mono text-[10px] transition-all shrink-0 ml-0.5 font-bold"
                        title="Edit Pine Script ({/})"
                      >
                        {"{/}"}
                      </button>

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

      <PineScriptEditorModal
        isOpen={showImportModal}
        onClose={() => {
          setShowImportModal(false);
          setEditingIndicator(null);
        }}
        indicatorType={editingIndicator}
        onIndicatorSaved={(savedType) => {
          if (!activeIndicators.includes(savedType)) {
            if (
              editingIndicator &&
              editingIndicator !== savedType &&
              activeIndicators.includes(editingIndicator)
            ) {
              onToggleIndicator(editingIndicator);
            }
            onToggleIndicator(savedType);
          }
        }}
      />
    </div>
  );
}
