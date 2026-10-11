import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChartHorizontal,
  Circle,
  Equal,
  Layers,
  Layers3,
  type LucideIcon,
  Minus,
  MoveUpRight,
  MoveVertical,
  Ruler,
  Spline,
  Square,
  TrendingUp,
  Triangle,
  Type,
} from "lucide-react";
import type { DrawingTool } from "./constants.ts";

export interface DrawingToolMeta {
  tool: DrawingTool;
  icon: LucideIcon;
  label: string;
  shortcut: string;
}

export const DRAWING_TOOLS_LIST: DrawingToolMeta[] = [
  { tool: "horizontal", icon: Minus, label: "Horizontal Line", shortcut: "Alt+H" },
  { tool: "trendline", icon: TrendingUp, label: "Trendline", shortcut: "Alt+T" },
  { tool: "fibonacci", icon: Layers, label: "Fibonacci", shortcut: "Alt+F" },
  { tool: "rectangle", icon: Square, label: "Rectangle", shortcut: "Alt+R" },
  { tool: "ray", icon: MoveUpRight, label: "Ray", shortcut: "" },
  { tool: "extended", icon: Spline, label: "Extended Line", shortcut: "" },
  { tool: "vertical", icon: MoveVertical, label: "Vertical Line", shortcut: "" },
  { tool: "channel", icon: Equal, label: "Parallel Channel", shortcut: "" },
  { tool: "fibextension", icon: Layers3, label: "Fib Extension", shortcut: "" },
  { tool: "ellipse", icon: Circle, label: "Ellipse", shortcut: "" },
  { tool: "arrow", icon: ArrowRight, label: "Arrow", shortcut: "" },
  { tool: "triangle", icon: Triangle, label: "Triangle", shortcut: "" },
  { tool: "text", icon: Type, label: "Text", shortcut: "" },
  { tool: "long-position", icon: ArrowUpRight, label: "Long Position", shortcut: "" },
  { tool: "short-position", icon: ArrowDownRight, label: "Short Position", shortcut: "" },
  {
    tool: "fixed-range-volume-profile",
    icon: BarChartHorizontal,
    label: "Fixed Range Volume Profile",
    shortcut: "",
  },
  { tool: "measure", icon: Ruler, label: "Measure", shortcut: "Alt+M" },
];

export const DRAWING_TOOLS_MAP: Record<DrawingTool, DrawingToolMeta | undefined> =
  DRAWING_TOOLS_LIST.reduce(
    (acc, meta) => {
      acc[meta.tool] = meta;
      return acc;
    },
    {} as Record<DrawingTool, DrawingToolMeta | undefined>,
  );

export function getDrawingToolMeta(tool: DrawingTool): DrawingToolMeta | undefined {
  return DRAWING_TOOLS_MAP[tool];
}
