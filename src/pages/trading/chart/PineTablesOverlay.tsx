import type { PineTable, PineTableCell } from "../../../lib/pinescript/types.ts";

export interface PineTablesOverlayProps {
  tables: PineTable[];
}

function getPositionClass(pos?: string): string {
  switch (pos) {
    case "top_left":
      return "top-9 left-16";
    case "bottom_left":
      return "bottom-8 left-16";
    case "bottom_right":
      return "bottom-8 right-16";
    case "top_center":
      return "top-9 left-1/2 -translate-x-1/2";
    case "bottom_center":
      return "bottom-8 left-1/2 -translate-x-1/2";
    case "middle_left":
      return "top-1/2 left-16 -translate-y-1/2";
    case "middle_right":
      return "top-1/2 right-16 -translate-y-1/2";
    case "middle_center":
      return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
    case "top_right":
    default:
      return "top-9 right-16";
  }
}

function getFontSizeClass(size?: string): string {
  switch (size) {
    case "tiny":
      return "text-[10px] leading-tight";
    case "normal":
      return "text-[12px] leading-normal";
    case "large":
      return "text-[14px] leading-normal font-semibold";
    case "huge":
      return "text-[16px] leading-normal font-bold";
    case "small":
    default:
      return "text-[11px] leading-snug";
  }
}

export function PineTablesOverlay({ tables }: PineTablesOverlayProps) {
  if (!tables || tables.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {tables.map((tbl) => {
        const posClass = getPositionClass(tbl.position);
        const frameColor = tbl.frameColor || "rgba(209, 212, 220, 0.2)";
        const borderColor = tbl.borderColor || "rgba(209, 212, 220, 0.08)";
        const bgColor = tbl.bgColor || "rgba(30, 41, 59, 0.88)";

        return (
          <div
            key={tbl.id}
            className={`pointer-events-auto absolute ${posClass} select-none rounded-[4px] shadow-xl backdrop-blur-md transition-all`}
            style={{
              backgroundColor: bgColor,
              border: `${tbl.frameWidth || 1}px solid ${frameColor}`,
            }}
          >
            <table className="border-collapse text-left" style={{ borderSpacing: 0 }}>
              <tbody>
                {tbl.cells.map((row, rIdx) => (
                  <tr key={`r_${rIdx}`}>
                    {row.map((cell: PineTableCell, cIdx) => {
                      if (cell.merged) return null;
                      const sizeClass = getFontSizeClass(cell.size);
                      const textAlign = cell.halign === "right" ? "text-right" : cell.halign === "center" ? "text-center" : "text-left";
                      const vAlign = cell.valign === "top" ? "align-top" : cell.valign === "bottom" ? "align-bottom" : "align-middle";

                      return (
                        <td
                          key={`c_${rIdx}_${cIdx}`}
                          colSpan={cell.colSpan && cell.colSpan > 1 ? cell.colSpan : undefined}
                          rowSpan={cell.rowSpan && cell.rowSpan > 1 ? cell.rowSpan : undefined}
                          title={cell.tooltip}
                          className={`px-2.5 py-1 ${sizeClass} ${textAlign} ${vAlign} font-mono tracking-tight`}
                          style={{
                            color: cell.textColor || "#d1d4dc",
                            backgroundColor: cell.bgColor || "transparent",
                            border: `${tbl.borderWidth || 1}px solid ${borderColor}`,
                          }}
                        >
                          {cell.text}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
