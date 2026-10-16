import { useEffect, useRef } from "react";
import {
  detectCrossings,
  playAlertBeep,
} from "../../../lib/chart-plugins/drawing-tools/line-alerts.ts";
import { toast } from "../../../services/toast.ts";
import type { DrawingLine } from "../constants.ts";
import type { TickData } from "./types.ts";

export function useLineCrossAlerts(
  tick: TickData | undefined,
  drawingsRef: React.RefObject<DrawingLine[]>,
  selectedSymbol: string,
  pipDigits: number,
) {
  const alertMidRef = useRef<number | null>(null);
  const alertFiredRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (!tick) return;
    const mid = (tick.bid + tick.ask) / 2;
    const prev = alertMidRef.current;
    alertMidRef.current = mid;
    if (prev === null) return;
    const nowSec = Math.floor(tick.timestamp / 1000);
    const crossed = detectCrossings(
      drawingsRef.current,
      prev,
      mid,
      nowSec,
      alertFiredRef.current,
    );
    for (const d of crossed) {
      toast.info(
        "Price alert",
        d.alertMessage ??
          `${selectedSymbol} crossed your ${d.type} @ ${mid.toFixed(pipDigits)}`,
      );
      playAlertBeep();
    }
  }, [tick, selectedSymbol, pipDigits, drawingsRef]);
}
