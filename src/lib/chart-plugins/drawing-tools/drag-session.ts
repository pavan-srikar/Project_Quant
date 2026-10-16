import type { ISeriesApi, SeriesType } from "lightweight-charts";
import type { DrawingLine } from "../../../pages/trading/constants";
import type { Pt } from "./geometry";
import type { DataPoint, DrawingCallbacks, Hit, ResolvedEntry } from "./types";
import type { DrawingsPrimitive } from "./drawings-primitive";
import {
  type DragState,
  computeDragUpdates,
  dragPoint,
  groupForSelection,
} from "./drag-controller";
import { getDragAnchorPx } from "./snapping";

export interface DragSessionParams {
  series: ISeriesApi<SeriesType>;
  toPoint: (p: Pt) => DataPoint | null;
  primitive: DrawingsPrimitive;
  cb: DrawingCallbacks;
  setCursor: (cursor: string | null) => void;
  pointFor: (pos: Pt, shiftKey: boolean, angleAnchor: Pt | null) => DataPoint | null;
  getDrawings: () => readonly DrawingLine[];
  setDrawings: (drawings: DrawingLine[]) => void;
}

export class DragSession {
  private drag: DragState | null = null;

  constructor(private readonly params: DragSessionParams) {}

  get isDragging(): boolean {
    return this.drag !== null;
  }

  get currentDrag(): DragState | null {
    return this.drag;
  }

  cancel(): void {
    this.drag = null;
    this.params.setCursor(null);
  }

  begin(
    hit: Hit,
    pos: Pt,
    entries: ResolvedEntry[],
    selectedIds: readonly string[],
    isTouch: boolean,
  ): void {
    const drawings = this.params.getDrawings();
    const origin = drawings.find((d) => d.id === hit.id);
    const originEntry = entries.find((en) => en.d.id === hit.id);
    // Locked drawings are selectable (so they can be unlocked) but never drag.
    if (!origin || !originEntry || origin.locked) return;
    const group =
      hit.region.kind === "body"
        ? groupForSelection(selectedIds, drawings, entries, hit.id)
        : [];
    this.drag = {
      hit,
      startX: pos.x,
      startY: pos.y,
      origin: { ...origin },
      originEntry,
      group,
      moved: false,
      isTouch,
    };
    this.params.setCursor("grabbing");
  }

  move(pos: Pt, shiftKey: boolean): void {
    if (!this.drag) return;
    const drag = this.drag;
    const updates = computeDragUpdates(
      drag,
      pos,
      this.params.series,
      this.params.toPoint,
      () => dragPoint(drag, this.params.pointFor(pos, shiftKey, getDragAnchorPx(drag))),
    );
    if (updates.length === 0) return;
    drag.moved = true;
    const byId = new Map(updates.map((u) => [u.id, u]));
    const nextDrawings = this.params.getDrawings().map((d) => byId.get(d.id) ?? d);
    this.params.setDrawings(nextDrawings);
    this.params.primitive.setDrawings(nextDrawings);
  }

  end(): void {
    if (!this.drag) return;
    const drag = this.drag;
    this.drag = null;
    this.params.setCursor(null);
    if (!drag.moved) return;
    const ids = [drag.hit.id, ...drag.group.map((g) => g.origin.id)];
    for (const id of ids) {
      const d = this.params.getDrawings().find((x) => x.id === id);
      if (d) this.params.cb.onUpdate({ ...d });
    }
  }
}
