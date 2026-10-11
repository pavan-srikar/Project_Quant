import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_FAVORITE_DRAWING_TOOLS,
  loadFavoriteDrawingTools,
  saveFavoriteDrawingTools,
} from "../hooks/useFavoriteDrawingTools.ts";
import type { DrawingTool } from "../pages/trading/constants.ts";
import { DRAWING_TOOLS_LIST, getDrawingToolMeta } from "../pages/trading/drawingToolMeta.ts";

describe("Favorite Drawing Tools", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads default favorite tools when storage is empty", () => {
    const favorites = loadFavoriteDrawingTools();
    expect(favorites).toEqual(DEFAULT_FAVORITE_DRAWING_TOOLS);
    expect(favorites.length).toBeGreaterThan(0);
    expect(favorites).toContain("trendline");
    expect(favorites).toContain("horizontal");
  });

  it("saves and reloads custom favorite tools from storage", () => {
    const custom: DrawingTool[] = ["rectangle", "fibonacci", "channel"];
    saveFavoriteDrawingTools(custom);
    const loaded = loadFavoriteDrawingTools();
    expect(loaded).toEqual(custom);
  });

  it("filters out invalid items and 'none' from parsed storage", () => {
    localStorage.setItem(
      "project_quant:favorite-drawing-tools",
      JSON.stringify(["none", "trendline", 123, null, "rectangle"]),
    );
    const loaded = loadFavoriteDrawingTools();
    expect(loaded).toEqual(["trendline", "rectangle"]);
  });

  it("handles corrupted JSON storage gracefully", () => {
    localStorage.setItem("project_quant:favorite-drawing-tools", "{ invalid json");
    const loaded = loadFavoriteDrawingTools();
    expect(loaded).toEqual(DEFAULT_FAVORITE_DRAWING_TOOLS);
  });

  it("provides valid metadata and icons for all drawing tools in registry", () => {
    expect(DRAWING_TOOLS_LIST.length).toBe(17);
    for (const tool of DRAWING_TOOLS_LIST) {
      expect(tool.tool).toBeDefined();
      expect(tool.label.length).toBeGreaterThan(0);
      expect(tool.icon).toBeDefined();
      const meta = getDrawingToolMeta(tool.tool);
      expect(meta).toBeDefined();
      expect(meta?.label).toBe(tool.label);
    }
  });
});
