import React from "react";
import {
  Bell,
  Copy,
  Lock,
  LockOpen,
  Settings2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorPicker } from "../../../components/color-picker/ColorPicker";
import {
  DRAWING_WIDTHS,
  type DrawingLine,
  type DrawingLineStyle,
} from "../constants.ts";
import { LINE_STYLES, type DrawingToolbarProps } from "./types";

function Divider() {
  return <div className="h-4 border-l border-border mx-0.5" />;
}

function IconButton({
  title,
  active,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "p-1 rounded hover:bg-secondary",
        active ? "text-primary bg-primary/15" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function WidthButtons({ current, onPick }: { current: number; onPick: (w: number) => void }) {
  return (
    <div className="flex items-center gap-0.5">
      {DRAWING_WIDTHS.map((w) => (
        <button
          key={w}
          type="button"
          title={`${w}px`}
          onClick={() => onPick(w)}
          className={cn(
            "px-1.5 py-1.5 rounded hover:bg-secondary",
            current === w ? "bg-primary/15 text-primary" : "text-muted-foreground",
          )}
        >
          <span className="block w-4 rounded-full bg-current" style={{ height: w }} />
        </button>
      ))}
    </div>
  );
}

export function LineStyleButtons({
  current,
  onPick,
}: {
  current: DrawingLineStyle;
  onPick: (s: DrawingLineStyle) => void;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {LINE_STYLES.map(({ style, dash }) => (
        <button
          key={style}
          type="button"
          title={style}
          onClick={() => onPick(style)}
          className={cn(
            "px-1 py-1.5 rounded hover:bg-secondary",
            current === style ? "bg-primary/15 text-primary" : "text-muted-foreground",
          )}
        >
          <svg width="20" height="4" viewBox="0 0 20 4" aria-hidden="true">
            <line
              x1="1"
              y1="2"
              x2="19"
              y2="2"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={dash || undefined}
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

export function DrawingFloatingToolbar({
  drawing,
  onUpdate,
  onClone,
  onRemove,
  onOpenSettings,
}: DrawingToolbarProps) {
  const patch = (p: Partial<DrawingLine>) => onUpdate({ ...drawing, ...p });
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1 rounded-lg bg-card border border-border shadow-xl">
      <ColorPicker compact value={drawing.color} onChange={(color) => patch({ color })} />
      <Divider />
      <WidthButtons current={drawing.width ?? 2} onPick={(width) => patch({ width })} />
      <Divider />
      <LineStyleButtons
        current={drawing.lineStyle ?? "solid"}
        onPick={(lineStyle) => patch({ lineStyle })}
      />
      <Divider />
      <IconButton
        title={drawing.locked ? "Unlock" : "Lock"}
        active={drawing.locked}
        onClick={() => patch({ locked: !drawing.locked })}
      >
        {drawing.locked ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
      </IconButton>
      {(drawing.type === "horizontal" || drawing.type === "trendline") && (
        <IconButton
          title={drawing.alertEnabled ? "Remove price alert" : "Add price alert"}
          active={drawing.alertEnabled}
          onClick={() => patch({ alertEnabled: !drawing.alertEnabled })}
        >
          <Bell className="h-3.5 w-3.5" />
        </IconButton>
      )}
      <IconButton title="Clone" onClick={onClone}>
        <Copy className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton title="Settings" onClick={onOpenSettings}>
        <Settings2 className="h-3.5 w-3.5" />
      </IconButton>
      <IconButton title="Delete (Del)" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
    </div>
  );
}
