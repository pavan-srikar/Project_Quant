import {
  Bell,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Lock,
  LockOpen,
  type LucideIcon,
  Settings2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DrawingContextMenuProps } from "./types";

function MenuItem({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-secondary text-left",
        danger ? "text-[#f6465d]" : "text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function DrawingContextMenu({
  drawing,
  x,
  y,
  onClose,
  onSettings,
  onDuplicate,
  onReorder,
  onToggleLock,
  onToggleAlert,
  onRemove,
}: DrawingContextMenuProps) {
  const canAlert = drawing.type === "horizontal" || drawing.type === "trendline";
  const act = (fn: () => void) => () => {
    fn();
    onClose();
  };
  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        className="fixed inset-0 z-40 cursor-default"
        onClick={onClose}
      />
      <div
        className="fixed z-40 w-44 rounded-md bg-card border border-border shadow-2xl py-1"
        style={{ left: x, top: y }}
      >
        <MenuItem icon={Settings2} label="Settings" onClick={act(onSettings)} />
        <MenuItem icon={Copy} label="Duplicate" onClick={act(onDuplicate)} />
        <MenuItem
          icon={ChevronsUp}
          label="Bring to front"
          onClick={act(() => onReorder("front"))}
        />
        <MenuItem icon={ChevronsDown} label="Send to back" onClick={act(() => onReorder("back"))} />
        <MenuItem
          icon={drawing.locked ? LockOpen : Lock}
          label={drawing.locked ? "Unlock" : "Lock"}
          onClick={act(onToggleLock)}
        />
        {canAlert && (
          <MenuItem
            icon={Bell}
            label={drawing.alertEnabled ? "Remove alert" : "Add alert"}
            onClick={act(onToggleAlert)}
          />
        )}
        <div className="my-1 border-t border-border/60" />
        <MenuItem icon={Trash2} label="Delete" danger onClick={act(onRemove)} />
      </div>
    </>
  );
}
