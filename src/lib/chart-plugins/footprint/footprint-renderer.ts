import type { FootprintBar, FootprintLevel } from "./footprint-types.ts";

export interface ResolvedFootprintBar {
  bar: FootprintBar;
  x: number;
  yOpen: number;
  yHigh: number;
  yLow: number;
  yClose: number;
  levels: {
    level: FootprintLevel;
    y: number;
    height: number;
  }[];
}

function formatCompactVol(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(2)} M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(2)} K`;
  return abs >= 10 ? Math.round(abs).toString() : abs.toFixed(1);
}

function formatDeltaValue(v: number): string {
  if (!Number.isFinite(v) || v === 0) return "0";
  const sign = v > 0 ? "+" : "-";
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)} M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(2)} K`;
  return `${sign}${abs.toFixed(1)}`;
}

export function renderFootprintBars(
  scope: any,
  bars: ResolvedFootprintBar[],
  barSpacing: number,
): void {
  const ctx: CanvasRenderingContext2D = scope.context;
  const colWidth = Math.max(4, Math.min(75, (barSpacing - 4) / 2));
  const showText = colWidth >= 18;

  ctx.save();

  for (const item of bars) {
    const { bar, x, yOpen, yClose, yHigh, yLow } = item;
    const isUpBar = bar.close >= bar.open;
    const barThemeColor = isUpBar ? "#089981" : "#f23645";

    // 1. Central Candlestick (TradingView Style)
    const bodyWidth = Math.max(6, Math.min(12, colWidth * 0.28));
    const bodyTop = Math.min(yOpen, yClose);
    const bodyH = Math.max(2, Math.abs(yClose - yOpen));

    // Wicks
    ctx.strokeStyle = barThemeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, bodyTop);
    ctx.moveTo(x, bodyTop + bodyH);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    // Central Candle Body
    ctx.fillStyle = barThemeColor;
    ctx.fillRect(x - bodyWidth / 2, bodyTop, bodyWidth, bodyH);

    // High & Low Dotted Ticks
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    const tickW = colWidth + bodyWidth / 2;
    ctx.moveTo(x - tickW, yHigh);
    ctx.lineTo(x + tickW, yHigh);
    ctx.moveTo(x - tickW, yLow);
    ctx.lineTo(x + tickW, yLow);
    ctx.stroke();
    ctx.setLineDash([]);

    // Find max level volume for bar normalization
    let maxLevelVol = 1;
    for (const lvl of item.levels) {
      if (lvl.level.totalVol > maxLevelVol) maxLevelVol = lvl.level.totalVol;
    }

    // 2. Bid × Ask Volume Columns Flanking the Candle Body
    const leftCellRight = x - bodyWidth / 2;
    const leftCellLeft = leftCellRight - colWidth;
    const rightCellLeft = x + bodyWidth / 2;

    for (const lvl of item.levels) {
      const { level, y, height } = lvl;
      const rowH = Math.max(10, height);
      const topY = y - rowH / 2;

      const sellWidth = (level.sellVol / maxLevelVol) * colWidth;
      const buyWidth = (level.buyVol / maxLevelVol) * colWidth;

      if (level.isPoc) {
        // High-contrast POC Solid Black Highlight Box wrapping entire row
        const pocX = leftCellLeft;
        const pocW = colWidth * 2 + bodyWidth;
        ctx.fillStyle = "#000000";
        ctx.fillRect(pocX, topY, pocW, rowH);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(pocX, topY, pocW, rowH);

        // Subtle POC Dotted Extension Lines
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(pocX - 8, y);
        ctx.lineTo(pocX, y);
        ctx.moveTo(pocX + pocW, y);
        ctx.lineTo(pocX + pocW + 8, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // POC Fills inside box
        if (sellWidth > 0) {
          ctx.fillStyle = "rgba(242, 54, 69, 0.55)";
          ctx.fillRect(leftCellRight - sellWidth, topY, sellWidth, rowH);
        }
        // Slice of candle body inside POC box
        ctx.fillStyle = barThemeColor;
        ctx.fillRect(x - bodyWidth / 2, topY, bodyWidth, rowH);
        if (buyWidth > 0) {
          ctx.fillStyle = "rgba(8, 153, 129, 0.55)";
          ctx.fillRect(rightCellLeft, topY, buyWidth, rowH);
        }

        // POC Text
        if (showText && rowH >= 9) {
          const fontSize = Math.max(8, Math.min(10.5, Math.round(rowH * 0.72)));
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(formatCompactVol(level.sellVol), leftCellLeft + colWidth / 2, y);
          ctx.fillText(formatCompactVol(level.buyVol), rightCellLeft + colWidth / 2, y);
        }
      } else {
        // Normal Left Cell (Sell / Bid)
        ctx.fillStyle = "rgba(18, 22, 31, 0.65)";
        ctx.fillRect(leftCellLeft, topY, colWidth, rowH);

        if (sellWidth > 0) {
          ctx.fillStyle = level.isSellImbalance
            ? "rgba(242, 54, 69, 0.9)"
            : "rgba(242, 54, 69, 0.55)";
          ctx.fillRect(leftCellRight - sellWidth, topY, sellWidth, rowH);
        }

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(leftCellLeft, topY, colWidth, rowH);

        // Normal Right Cell (Buy / Ask)
        ctx.fillStyle = "rgba(18, 22, 31, 0.65)";
        ctx.fillRect(rightCellLeft, topY, colWidth, rowH);

        if (buyWidth > 0) {
          ctx.fillStyle = level.isBuyImbalance
            ? "rgba(8, 153, 129, 0.9)"
            : "rgba(8, 153, 129, 0.55)";
          ctx.fillRect(rightCellLeft, topY, buyWidth, rowH);
        }

        ctx.strokeRect(rightCellLeft, topY, colWidth, rowH);

        // Numbers with Imbalance Highlights
        if (showText && rowH >= 9) {
          const fontSize = Math.max(8, Math.min(10.5, Math.round(rowH * 0.72)));
          ctx.font = `600 ${fontSize}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          ctx.fillStyle = level.isSellImbalance ? "#ff5252" : "#ffffff";
          ctx.fillText(formatCompactVol(level.sellVol), leftCellLeft + colWidth / 2, y);

          ctx.fillStyle = level.isBuyImbalance ? "#26a69a" : "#ffffff";
          ctx.fillText(formatCompactVol(level.buyVol), rightCellLeft + colWidth / 2, y);
        }
      }
    }

    // 3. Bottom Summary Readout (TradingView Style - non-overlapping, high contrast)
    if (showText) {
      // Find the absolute lowest pixel of candle wicks & cluster cells
      let maxBarY = yLow;
      for (const lvl of item.levels) {
        const rowH = Math.max(10, lvl.height);
        const btm = lvl.y + rowH / 2;
        if (btm > maxBarY) maxBarY = btm;
      }

      ctx.textBaseline = "middle";

      // Row 1: Total Sell & Total Buy Volumes (centered under their respective columns)
      const row1Y = maxBarY + 11;
      ctx.font = "bold 9.5px sans-serif";

      ctx.fillStyle = "#f23645";
      ctx.textAlign = "center";
      ctx.fillText(formatCompactVol(bar.totalSellVol), leftCellLeft + colWidth / 2, row1Y);

      ctx.fillStyle = "#089981";
      ctx.textAlign = "center";
      ctx.fillText(formatCompactVol(bar.totalBuyVol), rightCellLeft + colWidth / 2, row1Y);

      // Delta & Total Compact Readout Card (TradingView Style)
      const cardTop = row1Y + 9;
      const cardH = 28;
      const cardW = Math.max(56, Math.min(74, colWidth * 2));
      const cardX = x - cardW / 2;

      ctx.fillStyle = "rgba(18, 22, 34, 0.94)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cardX, cardTop, cardW, cardH, 4);
      ctx.fill();
      ctx.stroke();

      // Row A: Delta
      const deltaY = cardTop + 8;
      ctx.font = "9px sans-serif";
      ctx.fillStyle = "#848e9c";
      ctx.textAlign = "left";
      ctx.fillText("Delta", cardX + 6, deltaY);

      const deltaColor = bar.delta >= 0 ? "#089981" : "#f23645";
      ctx.font = "bold 9.5px sans-serif";
      ctx.fillStyle = deltaColor;
      ctx.textAlign = "right";
      ctx.fillText(formatDeltaValue(bar.delta), cardX + cardW - 6, deltaY);

      // Row B: Total
      const totalY = cardTop + 20;
      ctx.font = "9px sans-serif";
      ctx.fillStyle = "#848e9c";
      ctx.textAlign = "left";
      ctx.fillText("Total", cardX + 6, totalY);

      ctx.font = "bold 9.5px sans-serif";
      ctx.fillStyle = "#d1d4dc";
      ctx.textAlign = "right";
      ctx.fillText(formatCompactVol(bar.totalVolume), cardX + cardW - 6, totalY);
    }
  }

  ctx.restore();
}
