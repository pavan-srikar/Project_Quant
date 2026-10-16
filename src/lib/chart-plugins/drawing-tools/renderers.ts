import type { BitmapCoordinatesRenderingScope } from "fancy-canvas";
import type { DrawCtxInfo, ResolvedEntry } from "./types";
import { renderHorizontal, renderTrendline, renderVertical } from "./renderers/line-renderers";
import {
  renderArrow,
  renderChannel,
  renderEllipse,
  renderRectangle,
  renderTriangle,
} from "./renderers/shape-renderers";
import { renderPosition } from "./renderers/position-renderer";
import { renderFibonacci } from "./renderers/fibonacci-renderer";
import { renderVolumeProfile } from "./renderers/volume-profile-renderer";
import { renderText } from "./renderers/text-renderer";

export * from "./renderers/canvas-utils";
export * from "./renderers/line-renderers";
export * from "./renderers/shape-renderers";
export * from "./renderers/position-renderer";
export * from "./renderers/fibonacci-renderer";
export * from "./renderers/volume-profile-renderer";
export * from "./renderers/text-renderer";

export function renderEntry(
  scope: BitmapCoordinatesRenderingScope,
  e: ResolvedEntry,
  info: DrawCtxInfo,
): void {
  switch (e.d.type) {
    case "trendline":
      renderTrendline(scope, e);
      break;
    case "horizontal":
      renderHorizontal(scope, e);
      break;
    case "rectangle":
      renderRectangle(scope, e);
      break;
    case "fibonacci":
      renderFibonacci(scope, e);
      break;
    case "position":
      renderPosition(scope, e, info);
      break;
    case "vertical":
      renderVertical(scope, e);
      break;
    case "channel":
      renderChannel(scope, e);
      break;
    case "ellipse":
      renderEllipse(scope, e);
      break;
    case "arrow":
      renderArrow(scope, e);
      break;
    case "triangle":
      renderTriangle(scope, e);
      break;
    case "text":
      renderText(scope, e);
      break;
    case "fibextension":
      renderFibonacci(scope, e);
      break;
    case "fixed-range-volume-profile":
      renderVolumeProfile(scope, e);
      break;
    default:
      break;
  }
}
