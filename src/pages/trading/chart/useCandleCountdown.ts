import { useEffect, type Dispatch, type SetStateAction } from "react";
import { TF_INTERVAL_MS, type Timeframe } from "../constants.ts";
import { formatCountdown } from "../utils.ts";

export function useCandleCountdown(
  timeframe: Timeframe,
  setCountdown: Dispatch<SetStateAction<string>>,
) {
  useEffect(() => {
    const intervalMs = TF_INTERVAL_MS[timeframe];
    if (!intervalMs || intervalMs >= 86_400_000) {
      setCountdown("");
      return;
    }
    const tickHandler = () => {
      const now = Date.now();
      const currentBucketStart = Math.floor(now / intervalMs) * intervalMs;
      const nextBucketStart = currentBucketStart + intervalMs;
      const remainingSec = Math.max(0, (nextBucketStart - now) / 1000);
      setCountdown(formatCountdown(remainingSec));
    };
    tickHandler();
    const id = setInterval(tickHandler, 1000);
    return () => clearInterval(id);
  }, [timeframe, setCountdown]);
}
