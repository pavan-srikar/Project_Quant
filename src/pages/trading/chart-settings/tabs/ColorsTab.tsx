import { type ChartPreferences, updateChartPreferences } from "../../../../hooks/useChartPreferences.ts";
import { CHART_COLORS, type ChartColors } from "../../constants.ts";
import { ColorPairRow, ColorRow, SectionTitle } from "../form-controls";

export function ElementColorRows({ prefs, theme }: { prefs: ChartPreferences; theme: ChartColors }) {
  const set = updateChartPreferences;
  return (
    <>
      <SectionTitle>Chart elements</SectionTitle>
      <ColorRow
        label="Background"
        value={prefs.colorBackground}
        fallback={theme.background}
        onChange={(v) => set({ colorBackground: v })}
      />
      <ColorRow
        label="Grid"
        value={prefs.colorGrid}
        fallback={theme.grid}
        onChange={(v) => set({ colorGrid: v })}
      />
      <ColorRow
        label="Scales text"
        value={prefs.colorScaleText}
        fallback={theme.text}
        onChange={(v) => set({ colorScaleText: v })}
      />
      <ColorRow
        label="Crosshair"
        value={prefs.colorCrosshair}
        fallback={theme.crosshair}
        onChange={(v) => set({ colorCrosshair: v })}
      />
    </>
  );
}

export function LineColorRows({ prefs, theme }: { prefs: ChartPreferences; theme: ChartColors }) {
  const set = updateChartPreferences;
  return (
    <>
      <SectionTitle>Price &amp; order lines</SectionTitle>
      <ColorRow
        label="Bid line"
        value={prefs.colorBidLine}
        fallback={theme.bidLine}
        onChange={(v) => set({ colorBidLine: v })}
      />
      <ColorRow
        label="Ask line"
        value={prefs.colorAskLine}
        fallback={theme.askLine}
        onChange={(v) => set({ colorAskLine: v })}
      />
      <ColorPairRow
        label="Open positions"
        a={{
          value: prefs.colorPositionLong,
          fallback: theme.positionLong,
          onChange: (v) => set({ colorPositionLong: v }),
        }}
        b={{
          value: prefs.colorPositionShort,
          fallback: theme.positionShort,
          onChange: (v) => set({ colorPositionShort: v }),
        }}
      />
      <ColorRow
        label="Pending orders"
        value={prefs.colorOrderLine}
        fallback={theme.orderLine}
        onChange={(v) => set({ colorOrderLine: v })}
      />
      <ColorRow
        label="Take profit"
        value={prefs.colorTpLine}
        fallback={theme.tpLine}
        onChange={(v) => set({ colorTpLine: v })}
      />
      <ColorRow
        label="Stop loss"
        value={prefs.colorSlLine}
        fallback={theme.slLine}
        onChange={(v) => set({ colorSlLine: v })}
      />
    </>
  );
}

export function ColorsTab({ prefs, isDark }: { prefs: ChartPreferences; isDark: boolean }) {
  const theme = isDark ? CHART_COLORS.dark : CHART_COLORS.light;
  const set = updateChartPreferences;
  return (
    <div>
      <ElementColorRows prefs={prefs} theme={theme} />
      <LineColorRows prefs={prefs} theme={theme} />
      <SectionTitle>Candles</SectionTitle>
      <ColorPairRow
        label="Candle body, border &amp; wick"
        a={{
          value: prefs.candleUpColor,
          fallback: theme.up,
          onChange: (v) => set({ candleUpColor: v }),
        }}
        b={{
          value: prefs.candleDownColor,
          fallback: theme.down,
          onChange: (v) => set({ candleDownColor: v }),
        }}
      />
    </div>
  );
}
