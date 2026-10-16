import type {
  ISeriesApi,
  SeriesMarker,
  Time,
} from "lightweight-charts";
import { useEffect } from "react";
import type { Timeframe } from "../constants.ts";
import { buildReplayMarker } from "./chartOverlays.ts";
import type { ReplayTradeEvent } from "./types.ts";

export function useReplayMarkers(
  candleSeriesRef: React.RefObject<ISeriesApi<"Candlestick"> | null>,
  replayTradeEvents: ReplayTradeEvent[] | undefined,
  timeframe: Timeframe,
) {
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;
    if (!replayTradeEvents || replayTradeEvents.length === 0) {
      series.setMarkers([]);
      return;
    }
    const markers: SeriesMarker<Time>[] = [];
    for (const ev of replayTradeEvents) {
      const marker = buildReplayMarker(ev, timeframe);
      if (marker) markers.push(marker);
    }
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    series.setMarkers(markers);
    return () => {
      series.setMarkers([]);
    };
  }, [replayTradeEvents, timeframe, candleSeriesRef]);
}
