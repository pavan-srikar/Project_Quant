import { useState, useRef, useEffect } from "react";
import { Check, Edit2, Menu, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "../../../services/toast.ts";
import { useTradingStore } from "../../../services/store.tsx";
import { RibbonFlagIcon } from "./RibbonFlagIcon";
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
    <div className="relative shrink-0">
      <button
        ref={menuButtonRef}
        type="button"
        data-testid="watchlist-burger-btn"
        onClick={() => setShowMenu((prev) => !prev)}
        className={cn(
          "h-8 w-8 rounded-xl border transition-all flex items-center justify-center shrink-0 shadow-sm",
          showMenu
            ? "bg-[#2962ff] text-white border-[#2962ff] shadow-md shadow-[#2962ff]/25"
            : "text-neutral-300 hover:text-white bg-[#1e222d] border-[#2a2e39] hover:bg-[#252a38] hover:border-neutral-500",
        )}
        title="Configure Watchlists (Create, Rename, Delete)"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Burger Dropdown / Popover */}
      {showMenu && (
        <div
          ref={menuDropdownRef}
          className="absolute left-0 top-full mt-2 w-72 bg-[#131722] border border-[#2a2e39] rounded-xl shadow-2xl z-50 p-3 flex flex-col gap-2.5 backdrop-blur-md"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#2a2e39] pb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-neutral-100 uppercase tracking-wide">
                Watchlists
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#2a2e39] text-neutral-400 font-mono">
                {watchlists.length}
              </span>
            </div>
            <button
              onClick={() => {
                setShowMenu(false);
                setIsCreating(false);
                setEditingId(null);
              }}
              className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Create New Watchlist Button / Input */}
          {isCreating ? (
            <div className="flex items-center gap-1.5 bg-[#131722] p-1.5 rounded-lg border border-[#2962ff]">
              <input
                autoFocus
                placeholder="Watchlist name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateWatchlist();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                className="flex-1 text-xs bg-transparent text-neutral-100 outline-none px-1"
              />
              <button
                type="button"
                data-testid="save-new-watchlist-btn"
                onClick={handleCreateWatchlist}
                className="p-1 rounded bg-[#2962ff] text-white hover:bg-[#2962ff]/80 shrink-0"
                title="Save Watchlist"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39] shrink-0"
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              data-testid="create-watchlist-trigger"
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[#2962ff]/50 text-xs font-semibold text-[#2962ff] hover:bg-[#2962ff]/10 hover:border-[#2962ff] transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create New Watchlist</span>
            </button>
          )}

          {/* Watchlist Items list */}
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto no-scrollbar py-1">
            {watchlists.map((wl) => {
              const isSelected =
                activeTab === "watchlist" && wl.id === activeWatchlistId;
              const isEditing = editingId === wl.id;

              if (isEditing) {
                return (
                  <div
                    key={wl.id}
                    className="flex items-center gap-1.5 bg-[#131722] p-1.5 rounded-lg border border-[#2962ff]"
                  >
                    <input
                      autoFocus
                      value={renameText}
                      onChange={(e) => setRenameText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(wl.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full text-xs bg-transparent text-neutral-100 outline-none px-1"
                    />
                    <button
                      type="button"
                      data-testid="save-rename-watchlist-btn"
                      onClick={() => handleSaveRename(wl.id)}
                      className="p-1 rounded bg-[#2962ff] text-white hover:bg-[#2962ff]/80 shrink-0"
                      title="Confirm rename"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 rounded text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39] shrink-0"
                      title="Cancel"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={wl.id}
                  data-testid={`menu-watchlist-item-${wl.id}`}
                  className={cn(
                    "flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors group cursor-pointer",
                    isSelected
                      ? "bg-[#2962ff]/15 text-white border border-[#2962ff]/40"
                      : "hover:bg-[#2a2e39]/60 text-neutral-300",
                  )}
                  onClick={() => {
                    setActiveWatchlist(wl.id);
                    setActiveTab("watchlist");
                    setShowMenu(false);
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isSelected ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2962ff] shrink-0" />
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-neutral-600 shrink-0" />
                    )}
                    <span className="font-semibold truncate">{wl.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      ({wl.symbols.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      data-testid={`rename-watchlist-${wl.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(wl.id);
                        setRenameText(wl.name);
                      }}
                      className="p-1 rounded hover:bg-[#2a2e39] text-neutral-400 hover:text-neutral-100"
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
                        className="p-1 rounded hover:bg-[#2a2e39] text-neutral-400 hover:text-[#f6465d]"
                        title="Delete watchlist"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick info footer */}
          <div className="pt-2 border-t border-[#2a2e39] flex items-center justify-between text-[11px] text-neutral-400">
            <span className="flex items-center gap-1.5">
              <RibbonFlagIcon className="h-3 w-3 text-[#ff2604]" filled />
              <span>Flagged items</span>
            </span>
            <span className="font-bold text-neutral-300">{flaggedSymbols.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
