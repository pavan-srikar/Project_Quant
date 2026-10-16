import { type ChartPreferences, updateChartPreferences } from "../../../../hooks/useChartPreferences.ts";
import { SectionTitle, ToggleRow } from "../form-controls";

export function AppearanceTab({ prefs }: { prefs: ChartPreferences }) {
  const set = updateChartPreferences;
  return (
    <div>
      <SectionTitle>Candles</SectionTitle>
      <ToggleRow label="Wicks" checked={prefs.showWicks} onChange={(v) => set({ showWicks: v })} />
      <ToggleRow
        label="Candle borders"
        checked={prefs.showCandleBorders}
        onChange={(v) => set({ showCandleBorders: v })}
      />
      <SectionTitle>Chart elements</SectionTitle>
      <ToggleRow
        label="Volume"
        hint="Histogram at the bottom of the chart"
        checked={prefs.showVolume}
        onChange={(v) => set({ showVolume: v })}
      />
      <ToggleRow
        label="Grid lines"
        checked={prefs.showGrid}
        onChange={(v) => set({ showGrid: v })}
      />
      <ToggleRow
        label="Symbol watermark"
        checked={prefs.showWatermark}
        onChange={(v) => set({ showWatermark: v })}
      />
      <ToggleRow
        label="Candle countdown"
        hint="Time remaining until the bar closes"
        checked={prefs.showCountdown}
        onChange={(v) => set({ showCountdown: v })}
      />
      <ToggleRow
        label="OHLC legend"
        checked={prefs.showOhlcLegend}
        onChange={(v) => set({ showOhlcLegend: v })}
      />
    </div>
  );
}
