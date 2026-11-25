import React from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Circle,
  Equal,
  Layers,
  Layers3,
  type LucideIcon,
  type LucideProps,
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

export const VolumeProfileIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, size = 24, strokeWidth = 1.25, ...props }, ref) =>
    React.createElement(
      "svg",
      {
        ref,
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        width: size,
        height: size,
        fill: "none",
        stroke: "currentColor",
        strokeWidth,
        strokeLinejoin: "miter",
        strokeLinecap: "butt",
        className,
        ...props,
      },
      React.createElement("line", { x1: 3, y1: 2, x2: 3, y2: 17.5 }),
      React.createElement("circle", { cx: 3, cy: 19.5, r: 2 }),
      React.createElement("path", { d: "M3 4.5h5.5v3H3" }),
      React.createElement("path", { d: "M3 7.5h9v3H3" }),
      React.createElement("path", { d: "M3 10.5h4v3H3" }),
      React.createElement("circle", { cx: 21, cy: 4.5, r: 2 }),
      React.createElement("line", { x1: 21, y1: 6.5, x2: 21, y2: 21.5 }),
    ),
);
VolumeProfileIcon.displayName = "VolumeProfileIcon";

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
    icon: VolumeProfileIcon as LucideIcon,
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
