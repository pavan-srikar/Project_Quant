import {
  Activity,
  AlignCenter,
  CalendarDays,
  Clock,
  Crosshair,
  Info,
  type LucideIcon,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "../../../lib/utils.ts";

const CHART_PLUGIN_ITEMS = [
  { id: "crosshair", icon: Crosshair, label: "Crosshair Highlight" },
  { id: "session", icon: Clock, label: "Session Highlighting" },
  { id: "session-breaks", icon: CalendarDays, label: "Session Breaks" },
  { id: "bands", icon: AlignCenter, label: "Bands Indicator" },
  { id: "tooltip", icon: Info, label: "OHLCV Tooltip" },
  { id: "delta-tooltip", icon: Activity, label: "Delta Tooltip" },
] satisfies Array<{ id: string; icon: LucideIcon; label: string }>;

export interface PluginsDropdownProps {
  activePlugins: string[];
  onTogglePlugin: (id: string) => void;
}

export function PluginsDropdown({
  activePlugins,
  onTogglePlugin,
}: PluginsDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const isActive = activePlugins.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Chart Plugins"
        className={cn(
          "flex items-center gap-1 px-1.5 py-1 rounded",
          isActive ? "bg-[#2962ff]/15 text-[#2962ff]" : "hover:bg-[#1e222d] text-neutral-400 hover:text-neutral-200",
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {isActive && (
          <span className="bg-[#2962ff] text-white rounded-full px-1.5 text-[9px] font-bold">
            {activePlugins.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl py-1.5 min-w-[200px]">
          {CHART_PLUGIN_ITEMS.map(({ id, icon: Icon, label }) => {
            const isOn = activePlugins.includes(id);
            return (
              <button
                key={id}
                onClick={() => onTogglePlugin(id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium hover:bg-[#2a2e39] text-left text-neutral-200 transition-colors",
                  isOn && "bg-[#2a2e39] text-white",
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">{label}</span>
                {isOn && <span className="text-[10px] text-[#2962ff] font-bold">ON</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
