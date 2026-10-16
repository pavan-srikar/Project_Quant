import type { LucideIcon } from "lucide-react";
import { cn } from "../../../lib/utils.ts";

export interface ToolButtonProps {
  icon: LucideIcon;
  tooltip: string;
  active: boolean;
  onClick: () => void;
}

export function ToolButton({
  icon: Icon,
  tooltip,
  active,
  onClick,
}: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={cn(
        "p-1.5 rounded-lg transition-colors",
        active ? "bg-[#2962ff]/20 text-[#2962ff]" : "hover:bg-[#1e222d] text-neutral-400 hover:text-neutral-200",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
