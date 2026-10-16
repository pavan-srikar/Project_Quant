import type {
  DrawingLine,
  DrawingLineStyle,
} from "../constants.ts";

export interface DrawingToolbarProps {
  drawing: DrawingLine;
  onUpdate: (d: DrawingLine) => void;
  onClone: () => void;
  onRemove: () => void;
  onOpenSettings: () => void;
}

export interface DrawingSettingsProps {
  drawing: DrawingLine;
  /** Current chart timeframe — stamped as createdTf when scoping visibility. */
  currentTf: string;
  onUpdate: (d: DrawingLine) => void;
  onRemove: () => void;
  onClose: () => void;
}

export interface DrawingContextMenuProps {
  drawing: DrawingLine;
  x: number;
  y: number;
  onClose: () => void;
  onSettings: () => void;
  onDuplicate: () => void;
  onReorder: (dir: "front" | "back") => void;
  onToggleLock: () => void;
  onToggleAlert: () => void;
  onRemove: () => void;
}

export const LINE_STYLES: Array<{ style: DrawingLineStyle; dash: string }> = [
  { style: "solid", dash: "" },
  { style: "dashed", dash: "6 4" },
  { style: "dotted", dash: "2 3" },
];

export const FONT_SIZES = [8, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

export const FILLABLE = new Set(["rectangle", "ellipse", "triangle", "channel"]);
