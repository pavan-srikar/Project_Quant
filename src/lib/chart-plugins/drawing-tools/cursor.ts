import type { Hit } from "./types";

export function getHitCursor(hit: Hit | null, activeTool: string): string {
  if (!hit) {
    return activeTool !== "none" ? "crosshair" : "";
  }
  if (hit.region.kind === "point") {
    const { timeKey, priceKey } = hit.region;
    if (timeKey && priceKey) return "nwse-resize";
    if (timeKey) return "ew-resize";
    if (priceKey) return "ns-resize";
    return "pointer";
  }
  return "grab";
}

export function applyContainerCursor(
  container: HTMLElement,
  interactionCursor: string | null,
  activeTool: string,
): void {
  if (interactionCursor) {
    container.style.cursor = interactionCursor;
    return;
  }
  container.style.cursor = activeTool !== "none" ? "crosshair" : "";
}
