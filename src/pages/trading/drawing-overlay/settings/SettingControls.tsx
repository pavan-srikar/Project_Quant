import { useState, type ReactNode } from "react";
import { FIB_EXT_LEVELS, FIB_LEVELS } from "../../../../lib/chart-plugins/drawing-tools/resolve.ts";
import type { DrawingLine } from "../../constants.ts";
import {
  type DrawingTemplate,
  getTemplates,
  saveTemplate,
  setTypeDefault,
} from "../../drawingStyles.ts";
import { ColorPicker } from "../../../../components/color-picker/ColorPicker";
import { applyAlphaToColor, parseColor } from "../../../../lib/colorUtils";

export function SettingsRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function ExtendToggles({
  drawing,
  patch,
}: {
  drawing: DrawingLine;
  patch: (p: Partial<DrawingLine>) => void;
}) {
  return (
    <SettingsRow label="Extend">
      <div className="flex items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={drawing.extendLeft ?? false}
            onChange={(e) => patch({ extendLeft: e.target.checked })}
          />
          Left
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={drawing.extendRight ?? false}
            onChange={(e) => patch({ extendRight: e.target.checked })}
          />
          Right
        </label>
      </div>
    </SettingsRow>
  );
}

export function FillControls({
  drawing,
  patch,
}: {
  drawing: DrawingLine;
  patch: (p: Partial<DrawingLine>) => void;
}) {
  const currentFill = drawing.fillColor ?? drawing.color;
  const currentAlpha = drawing.fillOpacity ?? 0.14;
  const colorWithAlpha = applyAlphaToColor(currentFill, currentAlpha);

  return (
    <SettingsRow label="Fill">
      <ColorPicker
        compact
        align="right"
        value={colorWithAlpha}
        onChange={(val) => {
          const parsed = parseColor(val);
          patch({
            fillColor: parsed.hex,
            fillOpacity: parsed.a,
          });
        }}
      />
    </SettingsRow>
  );
}

export function ArrowheadToggles({
  drawing,
  patch,
}: {
  drawing: DrawingLine;
  patch: (p: Partial<DrawingLine>) => void;
}) {
  return (
    <SettingsRow label="Arrows">
      <div className="flex items-center gap-3 text-xs">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={drawing.arrowStart ?? false}
            onChange={(e) => patch({ arrowStart: e.target.checked })}
          />
          Start
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={drawing.arrowEnd ?? false}
            onChange={(e) => patch({ arrowEnd: e.target.checked })}
          />
          End
        </label>
      </div>
    </SettingsRow>
  );
}

// Comma-separated custom fibonacci levels (commits on blur).
export function FibLevelsRow({
  drawing,
  patch,
}: {
  drawing: DrawingLine;
  patch: (p: Partial<DrawingLine>) => void;
}) {
  const defaults = drawing.type === "fibextension" ? FIB_EXT_LEVELS : FIB_LEVELS;
  const current = drawing.fibLevels ?? [...defaults];
  return (
    <SettingsRow label="Levels">
      <input
        type="text"
        defaultValue={current.join(", ")}
        onBlur={(e) => {
          const levels = e.target.value
            .split(",")
            .map((s) => Number.parseFloat(s.trim()))
            .filter((n) => Number.isFinite(n));
          if (levels.length > 0) patch({ fibLevels: levels });
        }}
        className="bg-secondary text-xs rounded px-1.5 py-1 border border-border w-36"
      />
    </SettingsRow>
  );
}

export {
  NumRow,
  CoordinateInputs,
  VolumeProfileSettings,
} from "./CoordinateSettings.tsx";

// Save the drawing's look as the per-type default (new drawings inherit it) or
// as a named template that can be re-applied to any drawing.
export function StyleTools({
  drawing,
  patch,
}: {
  drawing: DrawingLine;
  patch: (p: Partial<DrawingLine>) => void;
}) {
  const [templates, setTemplates] = useState<DrawingTemplate[]>(() => getTemplates());
  const btn = "px-2 py-1 rounded text-xs bg-secondary hover:bg-secondary/70";
  return (
    <div className="space-y-2 pt-1 border-t border-border/60">
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => setTypeDefault(drawing.type, drawing)}>
          Set as default
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => {
            const name = window.prompt("Template name")?.trim();
            if (name) {
              saveTemplate(name, drawing);
              setTemplates(getTemplates());
            }
          }}
        >
          Save template
        </button>
      </div>
      {templates.length > 0 && (
        <SettingsRow label="Template">
          <select
            value=""
            onChange={(e) => {
              const t = templates.find((x) => x.name === e.target.value);
              if (t) patch(t.style);
            }}
            className="bg-secondary text-xs rounded px-1.5 py-1 border border-border"
          >
            <option value="">Apply…</option>
            {templates.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </SettingsRow>
      )}
    </div>
  );
}
