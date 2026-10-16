import { ChevronDown, Search, X } from "lucide-react";
import { useState } from "react";
import { cn } from "../../../lib/utils.ts";
import type { ToolbarSymbolItem } from "./types.ts";

export interface SymbolPickerProps {
  selectedSymbol: string;
  symbols: ToolbarSymbolItem[];
  onSymbolChange: (s: string) => void;
  onOpenSymbolSearch?: () => void;
}

export function SymbolPicker({
  selectedSymbol,
  symbols,
  onSymbolChange,
  onOpenSymbolSearch,
}: SymbolPickerProps) {
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState("");

  const filteredSymbols = symbols.filter(
    (s) =>
      s.name.toLowerCase().includes(symbolFilter.toLowerCase()) ||
      (s.category || "").toLowerCase().includes(symbolFilter.toLowerCase()),
  );

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => {
          if (onOpenSymbolSearch) {
            onOpenSymbolSearch();
          } else {
            setShowSymbolSearch((v) => !v);
          }
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[#1e222d] font-bold text-sm tracking-tight text-neutral-100 transition-colors"
      >
        {selectedSymbol}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {showSymbolSearch && (
        <>
          {/* Mobile: full-screen modal (avoids parent overflow clipping) */}
          <div
            className="md:hidden fixed inset-0 z-[100] bg-black/60"
            onClick={() => setShowSymbolSearch(false)}
          >
            <div
              className="fixed inset-x-0 top-0 bg-[#131722] border-b border-[#2a2e39] shadow-2xl flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 p-3 border-b border-[#2a2e39] bg-[#1e222d]">
                <Search className="h-4 w-4 text-neutral-400 shrink-0" />
                <input
                  autoFocus
                  placeholder="Search symbols..."
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  className="flex-1 bg-transparent text-base outline-none text-neutral-100"
                />
                <button
                  onClick={() => {
                    setShowSymbolSearch(false);
                    setSymbolFilter("");
                  }}
                  className="p-1.5 rounded-md hover:bg-[#2a2e39] text-neutral-400"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-[#1e222d]">
                {filteredSymbols.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-neutral-400">
                    No symbols match &ldquo;{symbolFilter}&rdquo;
                  </div>
                ) : (
                  filteredSymbols.map((s) => (
                    <button
                      key={s.id || s.name}
                      onClick={() => {
                        onSymbolChange(s.name);
                        setShowSymbolSearch(false);
                        setSymbolFilter("");
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 text-base hover:bg-[#1e222d] border-b border-[#2a2e39]/40 active:bg-[#1e222d]",
                        s.name === selectedSymbol && "bg-[#2a2e39]/50 border-l-2 border-[#2962ff]",
                      )}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-semibold text-neutral-100">{s.name}</span>
                        {s.displayName && s.displayName !== s.name && (
                          <span className="text-xs text-neutral-400">{s.displayName}</span>
                        )}
                      </div>
                      <span className="text-neutral-400 text-xs uppercase tracking-wide">
                        {s.category || s.assetClass}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Desktop: absolute dropdown */}
          <div className="hidden md:block absolute top-full left-0 z-50 mt-1 w-64 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden">
            <input
              autoFocus
              placeholder="Search symbols..."
              value={symbolFilter}
              onChange={(e) => setSymbolFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border-b border-[#2a2e39] bg-[#131722] text-neutral-100 placeholder:text-neutral-500 outline-none"
            />
            <div className="max-h-60 overflow-y-auto divide-y divide-[#131722]">
              {filteredSymbols.map((s) => (
                <button
                  key={s.id || s.name}
                  onClick={() => {
                    onSymbolChange(s.name);
                    setShowSymbolSearch(false);
                    setSymbolFilter("");
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-[#2a2e39] text-left transition-colors",
                    s.name === selectedSymbol && "bg-[#2a2e39] border-l-2 border-[#2962ff]",
                  )}
                >
                  <span className="font-semibold text-neutral-100">{s.name}</span>
                  <span className="text-neutral-400 text-xs">{s.category}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
