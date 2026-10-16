import React from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrderQuantityInputProps {
  quantity: string;
  setQuantity: React.Dispatch<React.SetStateAction<string>>;
}

const QUICK_QTY = [0.01, 0.05, 0.1, 0.5, 1.0];

export function OrderQuantityInput({ quantity, setQuantity }: OrderQuantityInputProps) {
  return (
    <div>
      <label className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">
        Volume (lots)
      </label>
      <div className="flex items-center gap-1.5 mt-1">
        <button
          onClick={() =>
            setQuantity((v) => String(Math.max(0.01, parseFloat(v) - 0.01).toFixed(2)))
          }
          className="px-2.5 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-neutral-200 transition-colors"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="flex-1 text-center text-sm font-mono font-medium rounded-lg bg-[#131722] border border-[#2a2e39] text-neutral-100 py-1.5 outline-none focus:border-[#2962ff] transition-colors"
          step="0.01"
          min="0.01"
        />
        <button
          onClick={() => setQuantity((v) => String((parseFloat(v) + 0.01).toFixed(2)))}
          className="px-2.5 py-1.5 rounded-lg bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-neutral-200 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex gap-1.5 mt-1.5">
        {QUICK_QTY.map((q) => (
          <button
            key={q}
            onClick={() => setQuantity(String(q))}
            className={cn(
              "flex-1 text-[11px] font-mono py-1 rounded-md border transition-colors",
              parseFloat(quantity) === q
                ? "bg-[#2962ff] text-white border-[#2962ff] font-semibold"
                : "bg-[#1e222d] border-[#2a2e39] text-neutral-400 hover:text-neutral-200 hover:bg-[#2a2e39]",
            )}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
