import { ArrowUpDown, BarChart3, Bot, Layers, Maximize2 } from "lucide-react";
import { ToolButton } from "./ToolButton.tsx";

export interface RightPanelSelectorProps {
  rightPanel: string;
  onRightPanel: (p: "watchlist" | "order" | "dom" | "ai-trader") => void;
  showRightPanel: boolean;
  onToggleRightPanel: () => void;
  aiTraderEnabled?: boolean;
}

export function RightPanelSelector({
  rightPanel,
  onRightPanel,
  showRightPanel,
  onToggleRightPanel,
  aiTraderEnabled,
}: RightPanelSelectorProps) {
  return (
    <div className="hidden md:flex items-center gap-1">
      <ToolButton
        icon={BarChart3}
        tooltip="Watchlist"
        active={showRightPanel && rightPanel === "watchlist"}
        onClick={() => onRightPanel("watchlist")}
      />
      <ToolButton
        icon={ArrowUpDown}
        tooltip="Order Panel"
        active={showRightPanel && rightPanel === "order"}
        onClick={() => onRightPanel("order")}
      />
      <ToolButton
        icon={Layers}
        tooltip="Depth of Market"
        active={showRightPanel && rightPanel === "dom"}
        onClick={() => onRightPanel("dom")}
      />
      {aiTraderEnabled && (
        <ToolButton
          icon={Bot}
          tooltip="AI Trader"
          active={showRightPanel && rightPanel === "ai-trader"}
          onClick={() => onRightPanel("ai-trader")}
        />
      )}
      <div className="h-4 border-l border-[#2a2e39] mx-1" />
      <button
        onClick={onToggleRightPanel}
        className="p-1.5 rounded-lg hover:bg-[#1e222d] text-neutral-400 hover:text-neutral-200 transition-colors"
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
