import type { IChartApi } from "lightweight-charts";
import type { DrawingTool } from "../../../pages/trading/constants";
import type { Pt } from "./geometry";
import { hitTest } from "./hit-test";
import { type LongPressTracker, evtFromTouch } from "./touch";
import type { DrawingCallbacks, ResolvedEntry } from "./types";
import type { PlacementController } from "./placement-controller";
import type { DragSession } from "./drag-session";
import type { SelectionManager } from "./selection-manager";

export interface PointerManagerParams {
  container: HTMLElement;
  chart: IChartApi;
  placement: PlacementController;
  selection: SelectionManager;
  dragSession: DragSession;
  longPress: LongPressTracker;
  getTool: () => DrawingTool;
  resolveAll: () => ResolvedEntry[];
  cb: DrawingCallbacks;
}

export class PointerManager {
  constructor(private readonly params: PointerManagerParams) {
    this.bind();
  }

  posFromClient(clientX: number, clientY: number): Pt | null {
    const { container, chart } = this.params;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const timeScale = chart.timeScale();
    const paneWidth = timeScale.width();
    const paneHeight = rect.height - timeScale.height();
    if (paneWidth <= 0 || x < 0 || y < 0 || x > paneWidth || y > paneHeight) return null;
    return { x, y };
  }

  eventPos(e: MouseEvent): Pt | null {
    return this.posFromClient(e.clientX, e.clientY);
  }

  private bind(): void {
    const c = this.params.container;
    c.addEventListener("mousedown", this.handleMouseDown, true);
    c.addEventListener("dblclick", this.handleDblClick);
    c.addEventListener("contextmenu", this.handleContextMenu);
    c.addEventListener("touchstart", this.handleTouchStart, {
      capture: true,
      passive: false,
    });
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mouseup", this.handleMouseUp);
    window.addEventListener("touchmove", this.handleTouchMove, { passive: false });
    window.addEventListener("touchend", this.handleTouchEnd);
    window.addEventListener("touchcancel", this.handleTouchEnd);
  }

  destroy(): void {
    const c = this.params.container;
    c.removeEventListener("mousedown", this.handleMouseDown, true);
    c.removeEventListener("dblclick", this.handleDblClick);
    c.removeEventListener("contextmenu", this.handleContextMenu);
    c.removeEventListener("touchstart", this.handleTouchStart, true);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mouseup", this.handleMouseUp);
    window.removeEventListener("touchmove", this.handleTouchMove);
    window.removeEventListener("touchend", this.handleTouchEnd);
    window.removeEventListener("touchcancel", this.handleTouchEnd);
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    const pos = this.eventPos(e);
    if (!pos) return;
    this.params.placement.clearMeasure();
    const tool = this.params.getTool();
    if (tool !== "none") {
      this.params.placement.start(tool, pos, e);
      return;
    }
    this.params.selection.start(pos, e, false);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    const pos = this.eventPos(e);
    if (this.params.dragSession.isDragging) {
      if (pos) this.params.dragSession.move(pos, e.shiftKey);
      return;
    }
    if (!pos) {
      this.params.selection.hoverHit(null);
      return;
    }
    const tool = this.params.getTool();
    if (this.params.placement.isPlacing) {
      this.params.placement.move(tool, pos, e.shiftKey);
      return;
    }
    if (tool === "none") {
      this.params.selection.hoverHit(hitTest(this.params.resolveAll(), pos));
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (this.params.dragSession.isDragging) {
      this.params.dragSession.end();
      return;
    }
    if (this.params.placement.isPlacing) {
      this.params.placement.maybeCommit(this.params.getTool(), this.eventPos(e), e.shiftKey);
    }
  };

  private handleDblClick = (e: MouseEvent): void => {
    if (this.params.getTool() !== "none") return;
    const pos = this.eventPos(e);
    if (!pos) return;
    const hit = hitTest(this.params.resolveAll(), pos);
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    this.params.selection.select([hit.id]);
    this.params.cb.onRequestSettings?.(hit.id);
  };

  private handleContextMenu = (e: MouseEvent): void => {
    const pos = this.eventPos(e);
    if (!pos) return;
    const hit = hitTest(this.params.resolveAll(), pos);
    if (!hit) return;
    e.preventDefault();
    e.stopPropagation();
    if (!this.params.selection.isSelected(hit.id)) {
      this.params.selection.select([hit.id]);
    }
    this.params.cb.onContextMenu?.(hit.id, e.clientX, e.clientY);
  };

  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0]!;
    const pos = this.posFromClient(t.clientX, t.clientY);
    if (!pos) return;
    const tool = this.params.getTool();
    if (tool !== "none") {
      this.params.placement.start(tool, pos, evtFromTouch(e));
      return;
    }
    const hit = this.params.selection.start(pos, evtFromTouch(e), true);
    if (hit) {
      this.params.longPress.start(hit.id, pos, (id) => {
        this.params.dragSession.cancel();
        this.params.selection.applyCursor(null);
        this.params.cb.onRequestSettings?.(id);
      });
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0]!;
    const pos = this.posFromClient(t.clientX, t.clientY);
    this.params.longPress.cancelIfMoved(pos);
    if (this.params.dragSession.isDragging) {
      e.preventDefault();
      if (pos) this.params.dragSession.move(pos, false);
      return;
    }
    if (this.params.placement.isPlacing && pos) {
      this.params.placement.move(this.params.getTool(), pos, false);
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    this.params.longPress.clear();
    if (this.params.dragSession.isDragging) {
      this.params.dragSession.end();
      return;
    }
    if (!this.params.placement.isPlacing) return;
    const t = e.changedTouches[0];
    this.params.placement.maybeCommit(
      this.params.getTool(),
      t ? this.posFromClient(t.clientX, t.clientY) : null,
      false,
    );
  };
}
