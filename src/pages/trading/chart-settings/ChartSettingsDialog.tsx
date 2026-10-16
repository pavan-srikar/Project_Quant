import { GripVertical, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { updateChartPreferences } from "../../../hooks/useChartPreferences.ts";
import { useDragOffset } from "../../../hooks/useDragOffset.ts";
import { cn } from "@/lib/utils";
import {
  type ChartSettingsDialogProps,
  type TabId,
  TABS,
  RESET_BY_TAB,
} from "./types";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { ColorsTab } from "./tabs/ColorsTab";
import { TradingTab } from "./tabs/TradingTab";
import { EventsTab } from "./tabs/EventsTab";

function TabBody({
  tab,
  props,
}: {
  tab: TabId;
  props: Pick<
    ChartSettingsDialogProps,
    "prefs" | "isDark" | "activePlugins" | "onTogglePlugin"
  > & { onClose: () => void };
}) {
  if (tab === "appearance") return <AppearanceTab prefs={props.prefs} />;
  if (tab === "colors") return <ColorsTab prefs={props.prefs} isDark={props.isDark} />;
  if (tab === "trading") return <TradingTab prefs={props.prefs} />;
  return (
    <EventsTab
      activePlugins={props.activePlugins}
      onTogglePlugin={props.onTogglePlugin}
    />
  );
}

export function ChartSettingsDialog(props: ChartSettingsDialogProps) {
  const { open, onClose } = props;
  const [tab, setTab] = useState<TabId>("appearance");
  const drag = useDragOffset();
  if (!open) return null;

  const close = () => {
    drag.reset();
    onClose();
  };
  const resetPayload = RESET_BY_TAB[tab];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="flex h-[460px] w-[580px] max-w-[94vw] flex-col overflow-hidden rounded-xl border border-[#2a2e39] bg-[#131722] shadow-2xl"
        style={drag.style}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle header */}
        <div
          onPointerDown={drag.onPointerDown}
          className="flex cursor-grab select-none items-center justify-between border-b border-[#2a2e39] bg-[#1e222d] px-4 py-3 active:cursor-grabbing"
        >
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-white">Chart Settings</h2>
          </div>
          <button
            onClick={close}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-[#2a2e39] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1">
          <div className="w-38 shrink-0 border-r border-[#2a2e39] bg-[#1e222d]/40 p-2.5 space-y-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors",
                  tab === t.id
                    ? "bg-[#2962ff]/15 text-[#2962ff] font-semibold"
                    : "text-neutral-400 hover:bg-[#2a2e39]/60 hover:text-white",
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3.5 bg-[#131722]">
            <TabBody tab={tab} props={{ ...props, onClose: close }} />
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[#2a2e39] bg-[#1e222d] px-4 py-2.5">
          {resetPayload ? (
            <button
              onClick={() => updateChartPreferences(resetPayload)}
              className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to defaults
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={close}
            className="rounded-lg bg-[#2962ff] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2962ff]/80 transition-colors shadow"
          >
            Ok
          </button>
        </div>
      </div>
    </div>
  );
}
