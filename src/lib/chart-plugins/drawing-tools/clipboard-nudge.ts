import type { ISeriesApi, SeriesType } from "lightweight-charts";
import type { DrawingLine } from "../../../pages/trading/constants";
import type { Pt } from "./geometry";
import { shiftDrawing } from "./drag-controller";
import { getArrowNudgeDelta, offsetCopy } from "./shortcuts";
import type { DataPoint, ResolvedEntry } from "./types";

/** Ctrl/Cmd+C copy, +V paste, +D duplicate the current selection. */
export function handleClipboardShortcut(
  e: KeyboardEvent,
  onCopy: () => void,
  onPaste: () => void,
): boolean {
  if (!e.ctrlKey && !e.metaKey) return false;
  if (e.code === "KeyC") {
    onCopy();
    return true;
  }
  if (e.code === "KeyV") {
    e.preventDefault();
    onPaste();
    return true;
  }
  if (e.code === "KeyD") {
    e.preventDefault();
    onCopy();
    onPaste();
    return true;
  }
  return false;
}

/** Arrow keys nudge the selection 1px (10px with Shift). */
export function handleArrowNudge(
  e: KeyboardEvent,
  hasSelection: boolean,
  onNudge: (dx: number, dy: number) => void,
): boolean {
  const d = getArrowNudgeDelta(e);
  if (!d || !hasSelection) return false;
  e.preventDefault();
  onNudge(d[0], d[1]);
  return true;
}

export function pasteClipboardDrawings(
  clipboard: readonly DrawingLine[],
  intervalSec: number,
): DrawingLine[] {
  if (clipboard.length === 0) return [];
  const dt = intervalSec * 3; // paste a few bars to the right
  return clipboard.map((d) => offsetCopy(d, dt));
}

export function computeNudgeUpdates(
  selectedIds: readonly string[],
  drawings: readonly DrawingLine[],
  entries: readonly ResolvedEntry[],
  series: ISeriesApi<SeriesType>,
  toPoint: (p: Pt) => DataPoint | null,
  dx: number,
  dy: number,
): DrawingLine[] {
  const updates: DrawingLine[] = [];
  for (const id of selectedIds) {
    const origin = drawings.find((d) => d.id === id);
    const entry = entries.find((en) => en.d.id === id);
    if (!origin || !entry || origin.locked) continue;
    const u = shiftDrawing(series, toPoint, origin, entry, dx, dy);
    if (u) updates.push(u);
  }
  return updates;
}
