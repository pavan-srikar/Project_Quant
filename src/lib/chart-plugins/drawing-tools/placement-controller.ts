import type { DrawingLine, DrawingTool } from "../../../pages/trading/constants";
import { dist, type Pt } from "./geometry";
import type { DataPoint } from "./types";
import type { TakeoverEvt } from "./touch";
import type { DrawingsPrimitive } from "./drawings-primitive";

// Releasing the pointer farther than this from the first anchor commits the
// drawing in one press-drag-release gesture (otherwise we wait for a second
// click), mirroring TradingView's dual placement modes.
export const DRAG_COMMIT_THRESHOLD_PX = 10;

export interface PlacingState {
  p1: DataPoint;
  startX: number;
  startY: number;
}

export class PlacementController {
  private placing: PlacingState | null = null;
  // The measure tool is a throwaway gesture: its result lingers as a preview
  // (never committed/persisted) until the next pointer-down or Escape.
  private measureResult: DrawingLine | null = null;

  constructor(
    private readonly primitive: DrawingsPrimitive,
    private readonly makeNewDrawing: (tool: DrawingTool, p1: DataPoint, p2: DataPoint) => DrawingLine,
    private readonly getPointFor: (pos: Pt, shiftKey: boolean, angleAnchor: Pt | null) => DataPoint | null,
    private readonly getPlacementAnchorPx: () => Pt | null,
    private readonly onDrawingCommitted: (d: DrawingLine) => void,
    private readonly onMeasureFinished: () => void,
  ) {}

  get isPlacing(): boolean {
    return this.placing !== null;
  }

  get placingP1(): DataPoint | null {
    return this.placing?.p1 ?? null;
  }

  clearMeasure(): void {
    if (!this.measureResult) return;
    this.measureResult = null;
    this.primitive.setPreview(null);
  }

  cancel(): void {
    this.placing = null;
    this.primitive.setPreview(null);
  }

  start(tool: DrawingTool, pos: Pt, e: TakeoverEvt): void {
    const pt = this.getPointFor(pos, e.shiftKey, this.getPlacementAnchorPx());
    if (!pt) return;
    // Take the event over so the chart doesn't pan while drawing.
    e.preventDefault();
    e.stopPropagation();

    if (tool === "horizontal" || tool === "vertical" || tool === "text") {
      this.commitDrawing(this.makeNewDrawing(tool, pt, pt));
      return;
    }
    if (this.placing) {
      this.commitPlacement(tool, this.placing.p1, pt);
      return;
    }
    this.placing = { p1: pt, startX: pos.x, startY: pos.y };
    this.primitive.setPreview(this.makeNewDrawing(tool, pt, pt));
  }

  move(tool: DrawingTool, pos: Pt, shiftKey: boolean): void {
    if (!this.placing) return;
    const pt = this.getPointFor(pos, shiftKey, this.getPlacementAnchorPx());
    if (!pt) return;
    this.primitive.setPreview(this.makeNewDrawing(tool, this.placing.p1, pt));
  }

  maybeCommit(tool: DrawingTool, pos: Pt | null, shiftKey: boolean): void {
    if (!this.placing) return;
    const placing = this.placing;
    if (!pos || dist(pos, { x: placing.startX, y: placing.startY }) < DRAG_COMMIT_THRESHOLD_PX) {
      return;
    }
    const pt = this.getPointFor(pos, shiftKey, this.getPlacementAnchorPx());
    if (pt) this.commitPlacement(tool, placing.p1, pt);
  }

  private commitPlacement(tool: DrawingTool, p1: DataPoint, p2: DataPoint): void {
    if (tool === "measure") {
      this.finishMeasure(p1, p2);
      return;
    }
    this.commitDrawing(this.makeNewDrawing(tool, p1, p2));
  }

  private finishMeasure(p1: DataPoint, p2: DataPoint): void {
    this.placing = null;
    this.measureResult = {
      id: "measure",
      type: "trendline",
      color: "#b2b5be",
      lineStyle: "dashed",
      price: p1.price,
      time: p1.time,
      price2: p2.price,
      time2: p2.time,
    };
    this.primitive.setPreview(this.measureResult);
    this.onMeasureFinished();
  }

  private commitDrawing(d: DrawingLine): void {
    this.placing = null;
    this.primitive.setPreview(null);
    this.onDrawingCommitted(d);
  }
}
