import type { DrawingLine } from "../../constants.ts";
import { SettingsRow } from "./SettingControls.tsx";
import { ColorPicker } from "../../../../components/color-picker/ColorPicker";

export function NumRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <SettingsRow label={label}>
      <input
        type="number"
        step="any"
        value={value != null && Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const v = Number.parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        className="bg-secondary text-xs rounded px-1.5 py-1 border border-border w-28 text-right"
      />
    </SettingsRow>
  );
}

// Precise numeric coordinate entry (TradingView "Coordinates" tab).
export function CoordinateInputs({
  drawing,
  patch,
}: {
  drawing: DrawingLine;
  patch: (p: Partial<DrawingLine>) => void;
}) {
  const isPos = drawing.type === "position";
  return (
    <>
      <NumRow
        label={isPos ? "Entry" : "Price"}
        value={drawing.price}
        onChange={(price) => patch({ price })}
      />
      {drawing.price2 != null && !isPos && (
        <NumRow label="Price 2" value={drawing.price2} onChange={(price2) => patch({ price2 })} />
      )}
      {isPos && (
        <NumRow
          label="Stop"
          value={drawing.stopPrice}
          onChange={(stopPrice) => patch({ stopPrice })}
        />
      )}
      {isPos && (
        <NumRow
          label="Target"
          value={drawing.targetPrice}
          onChange={(targetPrice) => patch({ targetPrice })}
        />
      )}
      {isPos && (
        <NumRow
          label="Risk %"
          value={drawing.riskPct ?? 1}
          onChange={(riskPct) => patch({ riskPct })}
        />
      )}
    </>
  );
}

export function VolumeProfileSettings({
  drawing,
  patch,
}: {
  drawing: DrawingLine;
  patch: (p: Partial<DrawingLine>) => void;
}) {
  return (
    <>
      <SettingsRow label="Value Area %">
        <input
          type="number"
          min={10}
          max={100}
          value={drawing.vaPct ?? 70}
          onChange={(e) => patch({ vaPct: Number(e.target.value) })}
          className="w-16 bg-secondary text-xs rounded px-1.5 py-1 border border-border"
        />
      </SettingsRow>
      <SettingsRow label="Row Size">
        <input
          type="number"
          min={10}
          max={1000}
          step={25}
          value={drawing.numRows ?? 500}
          onChange={(e) => patch({ numRows: Number(e.target.value) })}
          className="w-16 bg-secondary text-xs rounded px-1.5 py-1 border border-border"
        />
      </SettingsRow>
      <SettingsRow label="Up Volume">
        <ColorPicker
          compact
          align="right"
          value={drawing.upColor ?? "#5b84c4"}
          onChange={(upColor) => patch({ upColor })}
        />
      </SettingsRow>
      <SettingsRow label="Down Volume">
        <ColorPicker
          compact
          align="right"
          value={drawing.downColor ?? "#7e60a8"}
          onChange={(downColor) => patch({ downColor })}
        />
      </SettingsRow>
      <SettingsRow label="POC Color">
        <ColorPicker
          compact
          align="right"
          value={drawing.pocColor ?? "#ea3943"}
          onChange={(pocColor) => patch({ pocColor })}
        />
      </SettingsRow>
    </>
  );
}
