import type { DrawingLine } from "../../constants.ts";
import { SettingsRow } from "./SettingControls.tsx";

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
        <input
          type="color"
          value={drawing.upColor ?? "#5b84c4"}
          onChange={(e) => patch({ upColor: e.target.value })}
          className="h-6 w-10 cursor-pointer bg-transparent border-0 p-0"
        />
      </SettingsRow>
      <SettingsRow label="Down Volume">
        <input
          type="color"
          value={drawing.downColor ?? "#7e60a8"}
          onChange={(e) => patch({ downColor: e.target.value })}
          className="h-6 w-10 cursor-pointer bg-transparent border-0 p-0"
        />
      </SettingsRow>
      <SettingsRow label="POC Color">
        <input
          type="color"
          value={drawing.pocColor ?? "#ea3943"}
          onChange={(e) => patch({ pocColor: e.target.value })}
          className="h-6 w-10 cursor-pointer bg-transparent border-0 p-0"
        />
      </SettingsRow>
    </>
  );
}
