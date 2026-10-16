import type { DrawingLine, DrawingTool } from "../../../pages/trading/constants";

// TradingView keyboard shortcuts (Alt+key, matched on physical key code).
export const TOOL_SHORTCUTS: Record<string, DrawingTool> = {
  KeyT: "trendline",
  KeyH: "horizontal",
  KeyF: "fibonacci",
  KeyR: "rectangle",
  KeyM: "measure",
};

/** Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redo. */
export function handleHistoryShortcut(
  e: KeyboardEvent,
  onUndo?: () => void,
  onRedo?: () => void,
): boolean {
  if (!e.ctrlKey && !e.metaKey) return false;
  if (e.code === "KeyZ") {
    e.preventDefault();
    if (e.shiftKey) onRedo?.();
    else onUndo?.();
    return true;
  }
  if (e.code === "KeyY") {
    e.preventDefault();
    onRedo?.();
    return true;
  }
  return false;
}

/** Alt+T/H/F/R arms the matching drawing tool. */
export function handleToolShortcut(
  e: KeyboardEvent,
  onSelectTool?: (tool: DrawingTool) => void,
): boolean {
  if (!e.altKey || e.ctrlKey || e.metaKey) return false;
  const tool = TOOL_SHORTCUTS[e.code];
  if (!tool) return false;
  e.preventDefault();
  onSelectTool?.(tool);
  return true;
}

export function offsetCopy(d: DrawingLine, dt: number): DrawingLine {
  return {
    ...d,
    id: crypto.randomUUID(),
    time: d.time != null ? d.time + dt : undefined,
    time2: d.time2 != null ? d.time2 + dt : undefined,
    time3: d.time3 != null ? d.time3 + dt : undefined,
  };
}

export function getArrowNudgeDelta(e: KeyboardEvent): [number, number] | null {
  const deltas: Record<string, [number, number]> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  const d = deltas[e.key];
  if (!d) return null;
  const step = e.shiftKey ? 10 : 1;
  return [d[0] * step, d[1] * step];
}
