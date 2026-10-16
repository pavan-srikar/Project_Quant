import type { ISeriesApi, SeriesType } from "lightweight-charts";
import type { DrawingLine } from "../../../pages/trading/constants";
import type { Pt } from "./geometry";
import { isTextInputTarget } from "./touch";
import { handleHistoryShortcut, handleToolShortcut } from "./shortcuts";
import type { DataPoint, DrawingCallbacks, ResolvedEntry } from "./types";
import type { DrawingsPrimitive } from "./drawings-primitive";
import {
  computeNudgeUpdates,
  handleArrowNudge,
  handleClipboardShortcut,
  pasteClipboardDrawings,
} from "./clipboard-nudge";

export interface KeyboardManagerParams {
  cb: DrawingCallbacks;
  getDrawings: () => readonly DrawingLine[];
  setDrawings: (drawings: DrawingLine[]) => void;
  getSelectedIds: () => readonly string[];
  select: (ids: string[]) => void;
  removeSelected: () => void;
  onEscape: () => void;
  isDragging: () => boolean;
  getIntervalSec: () => number;
  primitive: DrawingsPrimitive;
  series: ISeriesApi<SeriesType>;
  toPoint: (p: Pt) => DataPoint | null;
  resolveAll: () => ResolvedEntry[];
}

export class KeyboardManager {
  private clipboard: DrawingLine[] = [];

  constructor(private readonly params: KeyboardManagerParams) {}

  handleKeyDown = (e: KeyboardEvent): void => {
    if (isTextInputTarget(e.target)) return;
    if (handleHistoryShortcut(e, this.params.cb.onUndo, this.params.cb.onRedo)) return;
    if (handleToolShortcut(e, this.params.cb.onSelectTool)) return;
    if (
      handleClipboardShortcut(e, this.copySelected, this.pasteClipboard) ||
      handleArrowNudge(e, this.params.getSelectedIds().length > 0, this.nudgeSelected)
    ) {
      return;
    }
    if (e.key === "Escape") {
      this.params.onEscape();
      return;
    }
    if (
      (e.key === "Delete" || e.key === "Backspace") &&
      this.params.getSelectedIds().length > 0 &&
      !this.params.isDragging()
    ) {
      e.preventDefault();
      this.params.removeSelected();
    }
  };

  copySelected = (): void => {
    const selected = this.params.getSelectedIds();
    this.clipboard = this.params
      .getDrawings()
      .filter((d) => selected.includes(d.id))
      .map((d) => ({ ...d }));
  };

  pasteClipboard = (): void => {
    const created = pasteClipboardDrawings(this.clipboard, this.params.getIntervalSec());
    if (created.length === 0) return;
    const nextDrawings = [...this.params.getDrawings(), ...created];
    this.params.setDrawings(nextDrawings);
    this.params.primitive.setDrawings(nextDrawings);
    for (const d of created) this.params.cb.onAdd({ ...d });
    this.params.select(created.map((c) => c.id));
  };

  nudgeSelected = (dx: number, dy: number): void => {
    const updates = computeNudgeUpdates(
      this.params.getSelectedIds(),
      this.params.getDrawings(),
      this.params.resolveAll(),
      this.params.series,
      this.params.toPoint,
      dx,
      dy,
    );
    if (updates.length === 0) return;
    const byId = new Map(updates.map((u) => [u.id, u]));
    const nextDrawings = this.params.getDrawings().map((d) => byId.get(d.id) ?? d);
    this.params.setDrawings(nextDrawings);
    this.params.primitive.setDrawings(nextDrawings);
    for (const u of updates) this.params.cb.onUpdate({ ...u });
  };
}
