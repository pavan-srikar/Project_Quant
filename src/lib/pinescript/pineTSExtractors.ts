import type { PineBox, PineLine, PineLabel, PinePolyline, PineTable, PineTableCell } from "./types.ts";

export function extractPineDrawings(ctx: any): {
  boxes: PineBox[];
  lines: PineLine[];
  labels: PineLabel[];
  polylines: PinePolyline[];
} {
  const rawBoxes = [
    ...(ctx.plots.__boxes__?.data?.[0]?.value || []),
    ...(ctx.plots.__boxes_overlay__?.data?.[0]?.value || []),
  ];
  const boxes: PineBox[] = (Array.isArray(rawBoxes) ? rawBoxes : [])
    .filter((b: any) => !b._deleted && !isNaN(b.top) && !isNaN(b.bottom) && !isNaN(b.left) && !isNaN(b.right) && Number(b.left) !== Number(b.right))
    .map((b: any, idx: number) => {
      const bg = typeof b.bgcolor === "string" && b.bgcolor && !["na", "#00000000", "transparent"].includes(b.bgcolor) ? b.bgcolor : undefined;
      const customBorder = typeof b.border_color === "string" && b.border_color && !["na", "#00000000"].includes(b.border_color) && isNaN(Number(b.border_color)) && b.border_color.toLowerCase() !== "#2962ff";
      return {
        id: `bx_${b.id ?? idx}`,
        left: Number(b.left),
        top: Number(b.top),
        right: Number(b.right),
        bottom: Number(b.bottom),
        bgColor: bg,
        borderColor: customBorder ? b.border_color : undefined,
        borderWidth: customBorder ? (Number(b.border_width) || 1) : 0,
        forceOverlay: Boolean(b.force_overlay),
      };
    })
    .filter((b) => b.bgColor || (b.borderColor && b.borderWidth));

  const rawLines = [
    ...(ctx.plots.__lines__?.data?.[0]?.value || []),
    ...(ctx.plots.__lines_overlay__?.data?.[0]?.value || []),
  ];
  const lines: PineLine[] = (Array.isArray(rawLines) ? rawLines : [])
    .filter((l: any) => !l._deleted && l.color && !["na", "#00000000", "transparent"].includes(l.color) && !isNaN(l.x1) && !isNaN(l.y1) && !isNaN(l.x2) && !isNaN(l.y2))
    .map((l: any, idx: number) => ({
      id: `ln_${l.id ?? idx}`,
      x1: Number(l.x1),
      y1: Number(l.y1),
      x2: Number(l.x2),
      y2: Number(l.y2),
      color: l.color,
      width: Number(l.width) || 1,
      style: String(l.style).includes("dashed") ? "dashed" : String(l.style).includes("dotted") ? "dotted" : "solid",
      forceOverlay: Boolean(l.force_overlay),
    }));

  const rawLabels = [
    ...(ctx.plots.__labels__?.data?.[0]?.value || []),
    ...(ctx.plots.__labels_overlay__?.data?.[0]?.value || []),
  ];
  const labels: PineLabel[] = (Array.isArray(rawLabels) ? rawLabels : [])
    .filter((l: any) => !l._deleted && l.text !== undefined && String(l.text).trim() !== "" && !isNaN(l.x) && !isNaN(l.y))
    .map((l: any, idx: number) => {
      const hasBg = typeof l.color === "string" && l.color && !["na", "#00000000", "transparent"].includes(l.color) && !l.color.endsWith("00");
      const txtCol = typeof l.textcolor === "string" && l.textcolor && !["na", "#00000000"].includes(l.textcolor)
        ? l.textcolor : hasBg ? "#ffffff" : (typeof l.color === "string" && l.color && !l.color.endsWith("00") ? l.color : "#b2b5be");
      return {
        id: `lbl_${l.id ?? idx}`,
        x: Number(l.x),
        y: Number(l.y),
        text: String(l.text || ""),
        color: txtCol,
        bgColor: hasBg ? l.color : undefined,
        style: l.style === "style_label_down" ? "down" : l.style === "style_label_up" ? "up" : "center",
        size: l.size || "normal",
        forceOverlay: Boolean(l.force_overlay),
      };
    });

  const rawPolys = ctx.plots.__polylines__?.data?.[0]?.value || [];
  const polylines: PinePolyline[] = (Array.isArray(rawPolys) ? rawPolys : [])
    .filter((poly: any) => !poly._deleted && Array.isArray(poly.points))
    .map((poly: any, idx: number) => ({
      id: `poly_${poly.id ?? idx}`,
      points: poly.points.map((pt: any) => ({ index: Number(pt.x ?? pt.index ?? 0), price: Number(pt.y ?? pt.price ?? 0) })),
      lineColor: typeof poly.line_color === "string" ? poly.line_color : undefined,
      fillColor: typeof poly.fill_color === "string" ? poly.fill_color : undefined,
      lineWidth: Number(poly.line_width) || 1.5,
    }));

  return { boxes, lines, labels, polylines };
}

export function extractPineTables(ctx: any): PineTable[] {
  const rawTables = ctx.plots?.__tables__?.data?.[0]?.value || [];
  return (Array.isArray(rawTables) ? rawTables : [])
    .filter((t: any) => !t._deleted && Array.isArray(t.cells) && t.cells.length > 0)
    .map((t: any, idx: number) => {
      const rows = Number(t.rows) || t.cells.length;
      const columns = Number(t.columns) || (t.cells[0]?.length ?? 0);
      const parsedCells: PineTableCell[][] = [];

      for (let r = 0; r < t.cells.length; r++) {
        const rowArr = t.cells[r] || [];
        const rowCells: PineTableCell[] = [];
        for (let c = 0; c < rowArr.length; c++) {
          const cell = rowArr[c] || {};
          const isMerged = Boolean(cell._merged);
          let colSpan = 1, rowSpan = 1;
          if (Array.isArray(t.merges)) {
            const m = t.merges.find((mg: any) => mg.startCol === c && mg.startRow === r);
            if (m) {
              colSpan = (m.endCol - m.startCol) + 1;
              rowSpan = (m.endRow - m.startRow) + 1;
            }
          }
          rowCells.push({
            text: String(cell.text ?? ""),
            textColor: cell.text_color || "#d1d4dc",
            bgColor: cell.bgcolor || undefined,
            halign: cell.text_halign || "left",
            valign: cell.text_valign || "center",
            size: cell.text_size || "small",
            tooltip: cell.tooltip || undefined,
            merged: isMerged,
            colSpan,
            rowSpan,
          });
        }
        parsedCells.push(rowCells);
      }

      return {
        id: `tbl_${t.id ?? idx}`,
        position: t.position || "top_right",
        columns,
        rows,
        bgColor: t.bgcolor || "#1e293bD9",
        frameColor: t.frame_color || undefined,
        frameWidth: Number(t.frame_width) || 1,
        borderColor: t.border_color || undefined,
        borderWidth: Number(t.border_width) || 1,
        cells: parsedCells,
        forceOverlay: Boolean(t.force_overlay),
      };
    });
}
