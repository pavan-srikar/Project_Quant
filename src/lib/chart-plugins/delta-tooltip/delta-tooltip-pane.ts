// @ts-nocheck
import { CanvasRenderingTarget2D } from "fancy-canvas";
import {
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
  SeriesPrimitivePaneViewZOrder,
} from "lightweight-charts";
import {
  styles,
  calculateDrawingPositions,
  type CalculatedDrawingPositions,
} from "./tooltip-layout";

export * from "./tooltip-layout";

export interface DeltaSingleTooltipData {
  x: number;
  lineContent: string[];
}

export interface DeltaTooltipData {
  deltaTopLine: string;
  deltaBottomLine: string;
  deltaBackgroundColor: string;
  deltaTextColor: string;

  topSpacing: number;

  tooltips: DeltaSingleTooltipData[];
}

const defaultOptions: DeltaTooltipData = {
  deltaTopLine: "",
  deltaBottomLine: "",
  deltaBackgroundColor: "#ffffff",
  deltaTextColor: "#",
  topSpacing: 20,
  tooltips: [],
};

export class DeltaTooltipPaneRenderer implements ISeriesPrimitivePaneRenderer {
  _data: DeltaTooltipData;

  constructor(data: DeltaTooltipData) {
    this._data = data;
  }

  draw(target: CanvasRenderingTarget2D) {
    if (this._data.tooltips.length < 1) return;
    target.useMediaCoordinateSpace((scope) => {
      const ctx = scope.context;
      const drawingPositions = calculateDrawingPositions(this._data, ctx, scope.mediaSize);
      this._drawMainTooltip(ctx, drawingPositions);
      this._drawDeltaArea(ctx, drawingPositions);
      this._drawTooltipsText(ctx, drawingPositions);
      this._drawDeltaText(ctx, drawingPositions);
    });
  }

  _drawMainTooltip(ctx: CanvasRenderingContext2D, positions: CalculatedDrawingPositions) {
    ctx.save();
    ctx.fillStyle = styles.background;
    ctx.shadowBlur = styles.shadowBlur;
    ctx.shadowOffsetX = styles.shadowOffsetX;
    ctx.shadowOffsetY = styles.shadowOffsetY;
    ctx.shadowColor = styles.shadowColor;
    ctx.beginPath();
    ctx.roundRect(
      positions.mainX,
      positions.mainY,
      positions.mainWidth,
      positions.mainHeight,
      styles.borderRadius,
    );
    ctx.fill();
    ctx.restore();
  }

  _drawDeltaArea(ctx: CanvasRenderingContext2D, positions: CalculatedDrawingPositions) {
    ctx.save();
    ctx.fillStyle = this._data.deltaBackgroundColor;
    ctx.beginPath();
    const halfWidth = Math.round(positions.deltaWidth / 2);
    ctx.fillRect(
      positions.deltaCentreX - halfWidth,
      positions.mainY,
      positions.deltaWidth,
      positions.mainHeight,
    );
    ctx.restore();
  }

  _drawTooltipsText(ctx: CanvasRenderingContext2D, positions: CalculatedDrawingPositions) {
    ctx.save();
    this._data.tooltips.forEach((tooltip: DeltaSingleTooltipData, tooltipIndex: number) => {
      const x = tooltipIndex === 0 ? positions.leftTooltipCentreX : positions.rightTooltipCentreX;
      let y =
        positions.mainY +
        (tooltipIndex === 0 ? positions.leftTooltipTextY : positions.rightTooltipTextY);

      tooltip.lineContent.forEach((line: string, lineIndex: number) => {
        ctx.font = `${styles.tooltipLineFontWeights[lineIndex]} ${styles.tooltipLineFontSizes[lineIndex]}px ${styles.fontFamily}`;
        ctx.fillStyle = styles.tooltipLineColors[lineIndex];
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(line, x, y);
        y += styles.tooltipLineLineHeights[lineIndex];
      });
    });
    ctx.restore();
  }

  _drawDeltaText(ctx: CanvasRenderingContext2D, positions: CalculatedDrawingPositions) {
    ctx.save();
    const x = positions.deltaCentreX;
    let y = positions.mainY + positions.deltaTextY;

    const lines = [this._data.deltaTopLine, this._data.deltaBottomLine];

    lines.forEach((line: string, lineIndex: number) => {
      ctx.font = `${styles.deltaFontWeights[lineIndex]} ${styles.deltaFontSizes[lineIndex]}px ${styles.fontFamily}`;
      ctx.fillStyle = this._data.deltaTextColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(line, x, y);
      y += styles.deltaLineHeights[lineIndex];
    });
    ctx.restore();
  }
}

export class DeltaTooltipPaneView implements ISeriesPrimitivePaneView {
  _data: DeltaTooltipData;
  constructor(data: Partial<DeltaTooltipData>) {
    this._data = {
      ...defaultOptions,
      ...data,
    };
  }

  update(data: Partial<DeltaTooltipData>): void {
    this._data = {
      ...this._data,
      ...data,
    };
  }

  renderer(): ISeriesPrimitivePaneRenderer | null {
    return new DeltaTooltipPaneRenderer(this._data);
  }

  zOrder(): SeriesPrimitivePaneViewZOrder {
    return "top";
  }
}
