import type { DrawingLine, DrawingTool } from "../../../pages/trading/constants";
import type { Pt } from "./geometry";
import { hitTest } from "./hit-test";
import { TOUCH_HIT_SCALE, type TakeoverEvt } from "./touch";
import type { DrawingCallbacks, Hit, ResolvedEntry } from "./types";
import type { DrawingsPrimitive } from "./drawings-primitive";
import { applyContainerCursor, getHitCursor } from "./cursor";

export interface SelectionManagerParams {
  container: HTMLElement;
  primitive: DrawingsPrimitive;
  cb: DrawingCallbacks;
  getTool: () => DrawingTool;
  resolveAll: () => ResolvedEntry[];
  onBeginDrag: (hit: Hit, pos: Pt, entries: ResolvedEntry[], isTouch: boolean) => void;
}

export class SelectionManager {
  private selectedIds: string[] = [];
  private hoveredId: string | null = null;

  constructor(private readonly params: SelectionManagerParams) {}

  get selected(): readonly string[] {
    return this.selectedIds;
  }

  get hovered(): string | null {
    return this.hoveredId;
  }

  hasSelection(): boolean {
    return this.selectedIds.length > 0;
  }

  isSelected(id: string): boolean {
    return this.selectedIds.includes(id);
  }

  select(ids: string[]): void {
    const same =
      ids.length === this.selectedIds.length && ids.every((id, i) => id === this.selectedIds[i]);
    if (same) return;
    this.selectedIds = [...ids];
    this.params.primitive.setSelected(ids);
    this.params.cb.onSelectionChange?.([...ids]);
  }

  clear(): void {
    this.select([]);
  }

  toggle(id: string): void {
    const next = this.selectedIds.includes(id)
      ? this.selectedIds.filter((x) => x !== id)
      : [...this.selectedIds, id];
    this.select(next);
  }

  prune(drawings: readonly DrawingLine[]): void {
    const pruned = this.selectedIds.filter((id) => drawings.some((d) => d.id === id));
    if (pruned.length !== this.selectedIds.length) {
      this.select(pruned);
    }
  }

  start(pos: Pt, e: TakeoverEvt, isTouch: boolean): Hit | null {
    const entries = this.params.resolveAll();
    const hit = hitTest(entries, pos, isTouch ? TOUCH_HIT_SCALE : 1);
    if (!hit) {
      if (!e.shiftKey) this.select([]);
      return null;
    }
    e.preventDefault();
    e.stopPropagation();
    if (e.shiftKey) {
      this.toggle(hit.id);
      return hit;
    }
    if (!this.selectedIds.includes(hit.id)) this.select([hit.id]);
    this.params.onBeginDrag(hit, pos, entries, isTouch);
    return hit;
  }

  hoverHit(hit: Hit | null): void {
    const id = hit?.id ?? null;
    if (id !== this.hoveredId) {
      this.hoveredId = id;
      this.params.primitive.setHovered(id);
    }
    const tool = this.params.getTool();
    this.applyCursor(hit ? getHitCursor(hit, tool) : null);
  }

  applyCursor(interactionCursor: string | null): void {
    applyContainerCursor(this.params.container, interactionCursor, this.params.getTool());
  }
}
