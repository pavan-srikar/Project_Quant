import { cn } from "@/lib/utils";
import type { DrawingLine } from "../../constants.ts";
import { ColorPicker } from "../../../../components/color-picker/ColorPicker";
import { FONT_SIZES } from "../types";

export function TextFormatBar({
  drawing,
  patch,
}: {
  drawing: DrawingLine;
  patch: (p: Partial<DrawingLine>) => void;
}) {
  const toggle =
    "h-7 w-7 rounded border border-border flex items-center justify-center text-sm hover:bg-secondary";
  const on = "bg-primary/20 text-primary border-primary/40";
  return (
    <div className="flex items-center gap-1.5">
      <ColorPicker
        compact
        value={drawing.color}
        onChange={(color) => patch({ color })}
      />
      <select
        value={drawing.fontSize ?? 14}
        onChange={(e) => patch({ fontSize: Number.parseInt(e.target.value, 10) })}
        className="h-7 rounded border border-border bg-secondary px-1.5 text-xs"
        title="Font size"
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <button
        type="button"
        title="Bold"
        onClick={() => patch({ bold: !drawing.bold })}
        className={cn(toggle, "font-bold", drawing.bold && on)}
      >
        B
      </button>
      <button
        type="button"
        title="Italic"
        onClick={() => patch({ italic: !drawing.italic })}
        className={cn(toggle, "italic font-serif", drawing.italic && on)}
      >
        I
      </button>
    </div>
  );
}

export function TextToggleRow({
  label,
  enabled,
  color,
  fallback,
  onToggle,
  onColor,
}: {
  label: string;
  enabled: boolean;
  color: string;
  fallback: string;
  onToggle: (v: boolean) => void;
  onColor: (c: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex flex-1 items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        {label}
      </label>
      <ColorPicker
        compact
        align="right"
        value={color || fallback}
        onChange={onColor}
      />
    </div>
  );
}

// TradingView-style text editor: large multi-line input plus rich styling.
export function TextSettings({
  drawing,
  patch,
}: {
  drawing: DrawingLine;
  patch: (p: Partial<DrawingLine>) => void;
}) {
  return (
    <div className="space-y-2.5">
      <TextFormatBar drawing={drawing} patch={patch} />
      <textarea
        value={drawing.text ?? ""}
        onChange={(e) => patch({ text: e.target.value })}
        placeholder="Text"
        rows={5}
        style={{
          fontWeight: drawing.bold ? 700 : 400,
          fontStyle: drawing.italic ? "italic" : "normal",
        }}
        className="min-h-[120px] w-full resize-y rounded-md border border-border bg-secondary px-2.5 py-2 text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/40"
      />
      <TextToggleRow
        label="Background"
        enabled={Boolean(drawing.textBg)}
        color={drawing.textBgColor ?? ""}
        fallback="#1e222d"
        onToggle={(textBg) => patch({ textBg })}
        onColor={(textBgColor) => patch({ textBgColor, textBg: true })}
      />
      <TextToggleRow
        label="Border"
        enabled={Boolean(drawing.textBorder)}
        color={drawing.textBorderColor ?? ""}
        fallback={drawing.color}
        onToggle={(textBorder) => patch({ textBorder })}
        onColor={(textBorderColor) => patch({ textBorderColor, textBorder: true })}
      />
    </div>
  );
}
