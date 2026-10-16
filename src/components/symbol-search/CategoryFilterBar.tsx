import { Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchCategory } from "./types";

export interface CategoryFilterBarProps {
  category: SearchCategory;
  onSelectCategory: (cat: SearchCategory) => void;
}

export function CategoryFilterBar({ category, onSelectCategory }: CategoryFilterBarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-[#2a2e39] bg-[#131722] text-xs font-semibold">
      <button
        onClick={() => onSelectCategory("all")}
        className={cn(
          "px-3 py-1 rounded-md transition-colors",
          category === "all"
            ? "bg-[#2962ff] text-white"
            : "text-neutral-400 hover:text-neutral-200 hover:bg-[#1e222d]",
        )}
      >
        All
      </button>
      <button
        onClick={() => onSelectCategory("crypto")}
        className={cn(
          "px-3 py-1 rounded-md transition-colors flex items-center gap-1",
          category === "crypto"
            ? "bg-[#2962ff] text-white"
            : "text-neutral-400 hover:text-neutral-200 hover:bg-[#1e222d]",
        )}
      >
        <Sparkles className="h-3 w-3" />
        Crypto
      </button>
      <button
        onClick={() => onSelectCategory("watchlist")}
        className={cn(
          "px-3 py-1 rounded-md transition-colors flex items-center gap-1",
          category === "watchlist"
            ? "bg-[#2962ff] text-white"
            : "text-neutral-400 hover:text-neutral-200 hover:bg-[#1e222d]",
        )}
      >
        <Star className="h-3 w-3" />
        Watchlist
      </button>
    </div>
  );
}
