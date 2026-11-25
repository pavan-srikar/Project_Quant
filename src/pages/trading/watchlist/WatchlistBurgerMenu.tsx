import { useState, useRef, useEffect } from "react";
import { Edit2, Menu, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "../../../services/toast.ts";
import { useTradingStore } from "../../../services/store.tsx";
import { RibbonFlagIcon } from "./RibbonFlagIcon";
import { WatchlistNameEditor } from "./WatchlistNameEditor";
import type { ActiveTab } from "./types";

export interface WatchlistBurgerMenuProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export function WatchlistBurgerMenu({ activeTab, setActiveTab }: WatchlistBurgerMenuProps) {
  const watchlists = useTradingStore((s) => s.watchlists);
  const activeWatchlistId = useTradingStore((s) => s.activeWatchlistId);
  const flaggedSymbols = useTradingStore((s) => s.flaggedSymbols);
  const setActiveWatchlist = useTradingStore((s) => s.setActiveWatchlist);
  const createWatchlist = useTradingStore((s) => s.createWatchlist);
  const renameWatchlist = useTradingStore((s) => s.renameWatchlist);
  const deleteWatchlist = useTradingStore((s) => s.deleteWatchlist);

  const [showMenu, setShowMenu] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  // Close burger dropdown on outside click
  useEffect(() => {
    if (!showMenu) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        menuDropdownRef.current &&
        !menuDropdownRef.current.contains(e.target as Node) &&
        menuButtonRef.current &&
        !menuButtonRef.current.contains(e.target as Node)
      ) {
        setShowMenu(false);
        setIsCreating(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showMenu]);

  const handleCreateWatchlist = () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    const newId = createWatchlist(trimmed);
    setNewListName("");
    setIsCreating(false);
    setActiveWatchlist(newId);
    setActiveTab("watchlist");
    toast.success("Watchlist Created", `Created "${trimmed}"`);
  };

  const handleSaveRename = (id: string) => {
    const trimmed = renameText.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }
    renameWatchlist(id, trimmed);
    setEditingId(null);
    toast.success("Watchlist Renamed", `Renamed to "${trimmed}"`);
  };

  return (
    <>
      <button
        ref={menuButtonRef}
        type="button"
        data-testid="watchlist-burger-btn"
        onClick={() => setShowMenu((prev) => !prev)}
        className={cn(
          "h-8 w-8 rounded-xl border transition-all flex items-center justify-center shrink-0 shadow-sm",
          showMenu
            ? "bg-[#346dff] text-white border-[#5b8cff] shadow-md shadow-[#2962ff]/40 ring-2 ring-[#2962ff]/25"
            : "text-neutral-300 hover:text-white bg-[#1e222d] border-[#2a2e39] hover:bg-[#262b3a] hover:border-[#3b4254]",
        )}
        title="Configure Watchlists (Create, Rename, Delete)"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Burger Dropdown / Popover */}
      {showMenu && (
        <div
          ref={menuDropdownRef}
          className="absolute left-0 right-0 top-full mt-2 bg-[#222736] border border-[#3a4256] rounded-2xl shadow-[0_18px_42px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.08] z-50 p-3 flex flex-col gap-2.5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#31384c] pb-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-neutral-100 uppercase tracking-wider">
                Watchlists
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#2f364a] border border-[#3e4760] text-neutral-200 font-mono leading-none">
                {watchlists.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowMenu(false);
                setIsCreating(false);
                setEditingId(null);
              }}
              className="p-1 rounded-lg text-neutral-300 hover:text-white hover:bg-[#31384c] transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Watchlist Items list */}
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto no-scrollbar">
            {watchlists.map((wl) => {
              const isSelected =
                activeTab === "watchlist" && wl.id === activeWatchlistId;
              const isEditing = editingId === wl.id;

              if (isEditing) {
                return (
                  <WatchlistNameEditor
                    key={wl.id}
                    value={renameText}
                    saveTestId="save-rename-watchlist-btn"
                    saveTitle="Confirm rename"
                    onChange={setRenameText}
                    onSave={() => handleSaveRename(wl.id)}
                    onCancel={() => setEditingId(null)}
                  />
                );
              }

              return (
                <div
                  key={wl.id}
                  data-testid={`menu-watchlist-item-${wl.id}`}
                  className={cn(
                    "flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs transition-all group cursor-pointer border",
                    isSelected
                      ? "bg-[#2962ff]/22 text-white border-[#4c7eff]/65 shadow-sm"
                      : "bg-[#1b202d]/75 hover:bg-[#2c3245] text-neutral-200 border-[#2c3345] hover:border-[#3e4760]",
                  )}
                  onClick={() => {
                    setActiveWatchlist(wl.id);
                    setActiveTab("watchlist");
                    setShowMenu(false);
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={cn(
                        "w-1.5 h-1.5 rounded-full shrink-0",
                        isSelected ? "bg-[#5b8cff]" : "bg-neutral-500",
                      )}
                    />
                    <span className="font-semibold truncate">{wl.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-0.5 opacity-45 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        data-testid={`rename-watchlist-${wl.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(wl.id);
                          setRenameText(wl.name);
                        }}
                        className="p-1 rounded-md hover:bg-[#353d54] text-neutral-300 hover:text-white"
                        title="Rename watchlist"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>

                      {watchlists.length > 1 && (
                        <button
                          type="button"
                          data-testid={`delete-watchlist-${wl.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWatchlist(wl.id);
                            toast.success("Watchlist", `Deleted watchlist "${wl.name}"`);
                          }}
                          className="p-1 rounded-md hover:bg-[#353d54] text-neutral-300 hover:text-[#f6465d]"
                          title="Delete watchlist"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold leading-none",
                        isSelected
                          ? "bg-[#2962ff]/35 text-white"
                          : "bg-[#2a3042] text-neutral-300",
                      )}
                    >
                      {wl.symbols.length}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create New Watchlist Button / Input */}
          {isCreating ? (
            <WatchlistNameEditor
              value={newListName}
              placeholder="Watchlist name..."
              saveTestId="save-new-watchlist-btn"
              saveTitle="Save Watchlist"
              onChange={setNewListName}
              onSave={handleCreateWatchlist}
              onCancel={() => setIsCreating(false)}
            />
          ) : (
            <button
              type="button"
              data-testid="create-watchlist-trigger"
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-[#4c7eff]/60 bg-[#2962ff]/12 text-xs font-semibold text-[#6d9eff] hover:text-white hover:bg-[#2962ff]/22 hover:border-[#699bff] transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Watchlist</span>
            </button>
          )}

          {/* Quick info / Flagged filter footer */}
          <div className="pt-2 border-t border-[#31384c]">
            <button
              type="button"
              onClick={() => {
                setActiveTab("flagged");
                setShowMenu(false);
              }}
              className={cn(
                "w-full flex items-center justify-between text-[11px] rounded-lg px-2 py-1.5 transition-colors",
                activeTab === "flagged"
                  ? "text-white bg-[#2962ff]/20 border border-[#4c7eff]/50"
                  : "text-neutral-300 hover:text-white hover:bg-[#2c3245]/75",
              )}
            >
              <span className="flex items-center gap-1.5 font-medium">
                <RibbonFlagIcon className="h-3.5 w-3.5 text-[#ff2604]" filled />
                <span>Flagged items</span>
              </span>
              <span className="font-mono font-semibold text-[10px] px-1.5 py-0.5 rounded-md bg-[#2a3042] text-neutral-100 leading-none">
                {flaggedSymbols.length}
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
