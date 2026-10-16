import { Volume2, VolumeX, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OrderPanelHeaderProps {
  symbol: string;
  soundMuted?: boolean;
  onToggleMute?: () => void;
  oneClick?: boolean;
  onToggleOneClick?: () => void;
}

export function OrderPanelHeader({
  symbol,
  soundMuted,
  onToggleMute,
  oneClick,
  onToggleOneClick,
}: OrderPanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#2a2e39] bg-[#1e222d]">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
          Order
        </span>
        <span className="font-bold text-sm text-neutral-100">{symbol}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleMute}
          className={cn(
            "flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-medium border transition-colors",
            !soundMuted
              ? "bg-[#2962ff]/15 text-[#2962ff] border-[#2962ff]/30"
              : "text-neutral-400 border-[#2a2e39] hover:bg-[#2a2e39]",
          )}
          title={soundMuted ? "Unmute trade sounds" : "Mute trade sounds"}
        >
          {soundMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
        </button>
        <button
          onClick={onToggleOneClick}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold border transition-colors",
            oneClick
              ? "bg-[#0ecb81]/15 text-[#0ecb81] border-[#0ecb81]/30"
              : "text-neutral-400 border-[#2a2e39] hover:bg-[#2a2e39]",
          )}
          title="One-click trading: skip confirmation for market orders"
        >
          <Zap className="h-3 w-3" />
          1-Click
        </button>
      </div>
    </div>
  );
}
