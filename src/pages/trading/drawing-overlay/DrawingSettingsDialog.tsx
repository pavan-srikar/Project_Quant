import { GripVertical, Trash2, X } from "lucide-react";
import { useDragOffset } from "../../../hooks/useDragOffset.ts";
import { cn } from "@/lib/utils";
import { ColorPicker } from "../../../components/color-picker/ColorPicker";
import type { DrawingLine } from "../constants.ts";
import { FILLABLE, type DrawingSettingsProps } from "./types";
import {
  LineStyleButtons,
  WidthButtons,
} from "./DrawingFloatingToolbar";
import {
  ArrowheadToggles,
  CoordinateInputs,
  ExtendToggles,
  FibLevelsRow,
  FillControls,
  SettingsRow,
  StyleTools,
  VolumeProfileSettings,
  WidthValueBox,
} from "./settings/SettingControls";
import { TextSettings } from "./settings/TextSettings";

// Line/shape style controls (everything except text drawings).
export function LineStyleSection({
  drawing,
  patch,
}: {
  drawing: DrawingLine;
  patch: (p: Partial<DrawingLine>) => void;
}) {
  return (
    <>
      {drawing.type === "position" ? (
        <>
          <SettingsRow label="Target (Blue)">
            <ColorPicker
              compact
              align="right"
              value={drawing.targetColor ?? "#3179f5"}
              onChange={(targetColor) => patch({ targetColor })}
            />
          </SettingsRow>
          <SettingsRow label="Stop (Red)">
            <ColorPicker
              compact
              align="right"
              value={drawing.stopColor ?? "#ec407a"}
              onChange={(stopColor) => patch({ stopColor })}
            />
          </SettingsRow>
          <SettingsRow label="Middle Line">
            <ColorPicker
              compact
              align="right"
              value={drawing.entryLineColor ?? "#787b86"}
              onChange={(entryLineColor) => patch({ entryLineColor })}
            />
          </SettingsRow>
        </>
      ) : (
        <SettingsRow label="Color">
          <ColorPicker
            compact
            align="right"
            value={drawing.color}
            onChange={(color) => patch({ color })}
          />
        </SettingsRow>
      )}
      <SettingsRow label="Width">
        {drawing.type === "rectangle" ? (
          <WidthValueBox
            value={drawing.width ?? 0}
            onChange={(width) => patch({ width })}
          />
        ) : (
          <WidthButtons current={drawing.width ?? 2} onPick={(width) => patch({ width })} />
        )}
      </SettingsRow>
      <SettingsRow label="Style">
        <LineStyleButtons
          current={drawing.lineStyle ?? "solid"}
          onPick={(lineStyle) => patch({ lineStyle })}
        />
      </SettingsRow>
      {drawing.type === "trendline" && <ExtendToggles drawing={drawing} patch={patch} />}
      {(drawing.type === "trendline" || drawing.type === "arrow") && (
        <ArrowheadToggles drawing={drawing} patch={patch} />
      )}
      {FILLABLE.has(drawing.type) && <FillControls drawing={drawing} patch={patch} />}
      {(drawing.type === "fibonacci" || drawing.type === "fibextension") && (
        <FibLevelsRow drawing={drawing} patch={patch} />
      )}
      {drawing.type === "fixed-range-volume-profile" && (
        <VolumeProfileSettings drawing={drawing} patch={patch} />
      )}
    </>
  );
}

export function DrawingSettingsDialog({
  drawing,
  currentTf,
  onUpdate,
  onRemove,
  onClose,
}: DrawingSettingsProps) {
  const patch = (p: Partial<DrawingLine>) => onUpdate({ ...drawing, ...p });
  const drag = useDragOffset();
  const isText = drawing.type === "text";
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
      <div
        className={cn(
          "rounded-lg bg-card border border-border shadow-2xl p-3 space-y-3",
          isText ? "w-80" : "w-64",
        )}
        style={drag.style}
      >
        <div
          onPointerDown={drag.onPointerDown}
          className="flex cursor-grab select-none items-center justify-between active:cursor-grabbing"
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold capitalize">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60" />
            {drawing.type} settings
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {isText ? (
          <TextSettings drawing={drawing} patch={patch} />
        ) : (
          <LineStyleSection drawing={drawing} patch={patch} />
        )}

        <div className="pt-1 border-t border-border/60" />
        <CoordinateInputs drawing={drawing} patch={patch} />

        <SettingsRow label="Visibility">
          <select
            value={drawing.visibility === "tf" ? "tf" : "all"}
            onChange={(e) =>
              patch(
                e.target.value === "tf"
                  ? { visibility: "tf", createdTf: drawing.createdTf ?? currentTf }
                  : { visibility: "all" },
              )
            }
            className="bg-secondary text-xs rounded px-1.5 py-1 border border-border"
          >
            <option value="all">All timeframes</option>
            <option value="tf">Only {drawing.createdTf ?? currentTf}</option>
          </select>
        </SettingsRow>

        <StyleTools drawing={drawing} patch={patch} />

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[#f6465d] hover:bg-[#f6465d]/10"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded text-xs bg-primary text-primary-foreground hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
