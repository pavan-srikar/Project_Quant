// @ts-nocheck
import type { Size } from "fancy-canvas";
import type { DeltaTooltipData } from "./delta-tooltip-pane";

export const styles = {
  background: "#ffffff",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, Ubuntu, sans-serif",
  borderRadius: 5,
  shadowColor: "rgba(0, 0, 0, 0.2)",
  shadowBlur: 4,
  shadowOffsetX: 0,
  shadowOffsetY: 2,

  itemBlockPadding: 5,
  itemInlinePadding: 10,

  tooltipLineFontWeights: [590, 400, 400] as number[],
  tooltipLineFontSizes: [14, 12, 12] as number[],
  tooltipLineLineHeights: [18, 16, 16] as number[],
  tooltipLineColors: ["#131722", "#787B86", "#787B86"],

  deltaFontWeights: [590, 400] as number[],
  deltaFontSizes: [14, 12] as number[],
  deltaLineHeights: [18, 16] as number[],
} as const;

export function determineSectionWidth(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  fontSizes: number[],
  fontWeights: number[],
) {
  let maxTextWidth = 0;
  ctx.save();
  lines.forEach((line, index) => {
    ctx.font = `${fontWeights[index]} ${fontSizes[index]}px ${styles.fontFamily}`;
    const measurement = ctx.measureText(line);
    if (measurement.width > maxTextWidth) maxTextWidth = measurement.width;
  });
  ctx.restore();
  return maxTextWidth + styles.itemInlinePadding * 2;
}

export function determineSectionHeight(lines: string[], lineHeights: number[]) {
  let height = styles.itemBlockPadding * 1.5;
  lines.forEach((_line, index) => {
    height += lineHeights[index];
  });
  return height;
}

export interface CalculatedVerticalDrawingPositions {
  mainY: number;
  mainHeight: number;
  leftTooltipTextY: number;
  rightTooltipTextY: number;
  deltaTextY: number;
}

export interface CalculatedHorizontalDrawingPositions {
  mainX: number;
  mainWidth: number;
  leftTooltipCentreX: number;
  rightTooltipCentreX: number;
  deltaCentreX: number;
  deltaWidth: number;
}

export type CalculatedDrawingPositions = CalculatedVerticalDrawingPositions &
  CalculatedHorizontalDrawingPositions;

export function calculateVerticalDrawingPositions(
  data: DeltaTooltipData,
): CalculatedVerticalDrawingPositions {
  const mainY = data.topSpacing;

  const leftTooltipHeight =
    data.tooltips.length < 1
      ? 0
      : determineSectionHeight(data.tooltips[0].lineContent, styles.tooltipLineLineHeights);
  const rightTooltipHeight =
    data.tooltips.length < 2
      ? 0
      : determineSectionHeight(data.tooltips[1].lineContent, styles.tooltipLineLineHeights);
  const deltaHeight = determineSectionHeight(
    [data.deltaTopLine, data.deltaBottomLine].filter(Boolean),
    styles.deltaLineHeights,
  );

  const mainHeight = Math.max(leftTooltipHeight, rightTooltipHeight, deltaHeight);
  const leftTooltipTextY = Math.round(
    styles.itemBlockPadding + (mainHeight - leftTooltipHeight) / 2,
  );
  const rightTooltipTextY = Math.round(
    styles.itemBlockPadding + (mainHeight - rightTooltipHeight) / 2,
  );
  const deltaTextY = Math.round(styles.itemBlockPadding + (mainHeight - deltaHeight) / 2);

  return {
    mainY,
    mainHeight,
    leftTooltipTextY,
    rightTooltipTextY,
    deltaTextY,
  };
}

export function calculateInitialTooltipPosition(
  data: DeltaTooltipData,
  index: number,
  ctx: CanvasRenderingContext2D,
  mediaSize: Size,
) {
  const lines = data.tooltips[index].lineContent;
  const tooltipWidth = determineSectionWidth(
    ctx,
    lines,
    styles.tooltipLineFontSizes,
    styles.tooltipLineFontWeights,
  );
  const halfWidth = tooltipWidth / 2;
  const idealX = Math.min(
    Math.max(0, data.tooltips[index].x - halfWidth),
    mediaSize.width - tooltipWidth,
  );
  const leftSpace = idealX;
  const rightSpace = mediaSize.width - tooltipWidth - leftSpace;
  return {
    x: idealX,
    leftSpace,
    rightSpace,
    width: tooltipWidth,
  };
}

export function calculateDrawingHorizontalPositions(
  data: DeltaTooltipData,
  ctx: CanvasRenderingContext2D,
  mediaSize: Size,
): CalculatedHorizontalDrawingPositions {
  const leftPosition = calculateInitialTooltipPosition(data, 0, ctx, mediaSize);
  if (data.tooltips.length < 2) {
    return {
      mainX: Math.round(leftPosition.x),
      mainWidth: Math.round(leftPosition.width),
      leftTooltipCentreX: Math.round(leftPosition.x + leftPosition.width / 2),
      rightTooltipCentreX: 0,
      deltaCentreX: 0,
      deltaWidth: 0,
    };
  }
  const rightPosition = calculateInitialTooltipPosition(data, 1, ctx, mediaSize);
  const minDeltaWidth =
    data.tooltips.length < 2
      ? 0
      : determineSectionWidth(
          ctx,
          [data.deltaTopLine, data.deltaBottomLine].filter(Boolean),
          styles.deltaFontSizes,
          styles.deltaFontWeights,
        );

  const overlapWidth = minDeltaWidth + leftPosition.x + leftPosition.width - rightPosition.x;
  // if positive then we need to adjust positions
  if (overlapWidth > 0) {
    const halfOverlap = overlapWidth / 2;
    if (leftPosition.leftSpace >= halfOverlap && rightPosition.rightSpace >= halfOverlap) {
      leftPosition.x -= halfOverlap;
      rightPosition.x += halfOverlap;
    } else {
      const leftSmaller = leftPosition.leftSpace < rightPosition.rightSpace;
      if (leftSmaller) {
        const remainingOverlap = overlapWidth - leftPosition.leftSpace;
        leftPosition.x -= leftPosition.leftSpace;
        rightPosition.x += remainingOverlap;
      } else {
        const remainingOverlap = overlapWidth - rightPosition.rightSpace;
        leftPosition.x = Math.max(0, leftPosition.x - remainingOverlap);
        rightPosition.x += rightPosition.rightSpace;
      }
    }
  }

  const deltaWidth = Math.round(rightPosition.x - leftPosition.x - leftPosition.width);
  const deltaCentreX = Math.round(rightPosition.x - deltaWidth / 2);
  return {
    mainX: Math.round(leftPosition.x),
    mainWidth: Math.round(leftPosition.width + deltaWidth + rightPosition.width),
    leftTooltipCentreX: Math.round(leftPosition.x + leftPosition.width / 2),
    rightTooltipCentreX: Math.round(rightPosition.x + rightPosition.width / 2),
    deltaCentreX,
    deltaWidth,
  };
}

export function calculateDrawingPositions(
  data: DeltaTooltipData,
  ctx: CanvasRenderingContext2D,
  mediaSize: Size,
): CalculatedDrawingPositions {
  return {
    ...calculateVerticalDrawingPositions(data),
    ...calculateDrawingHorizontalPositions(data, ctx, mediaSize),
  };
}
