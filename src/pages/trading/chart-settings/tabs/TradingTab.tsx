import { type ChartPreferences, updateChartPreferences } from "../../../../hooks/useChartPreferences.ts";
import { SectionTitle, ToggleRow } from "../form-controls";

export function TradingTab({ prefs }: { prefs: ChartPreferences }) {
  const set = updateChartPreferences;
  return (
    <div>
      <SectionTitle>Price lines</SectionTitle>
      <ToggleRow
        label="Bid line"
        checked={prefs.showBidLine}
        onChange={(v) => set({ showBidLine: v })}
      />
      <ToggleRow
        label="Ask line"
        checked={prefs.showAskLine}
        onChange={(v) => set({ showAskLine: v })}
      />
      <SectionTitle>Positions &amp; orders</SectionTitle>
      <ToggleRow
        label="Show positions and orders on chart"
        hint="Entry, TP and SL lines with drag-to-edit"
        checked={prefs.overlayPositionsOnChart}
        onChange={(v) => set({ overlayPositionsOnChart: v })}
      />
    </div>
  );
}
