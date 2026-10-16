import { useState, useEffect } from "react";
import {
  getBinanceTickers,
  getCachedTickers,
  onTickersUpdated,
} from "../../../services/demo/binance.ts";

export function useTickerChanges() {
  const [tickerChanges, setTickerChanges] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    const cached = getCachedTickers();
    for (const t of cached) {
      initial[t.symbol] = t.change24h;
      initial[t.binancePair] = t.change24h;
      initial[t.baseAsset] = t.change24h;
    }
    return initial;
  });

  useEffect(() => {
    getBinanceTickers().then((res) => {
      const map: Record<string, number> = {};
      for (const t of res) {
        map[t.symbol] = t.change24h;
        map[t.binancePair] = t.change24h;
        map[t.baseAsset] = t.change24h;
      }
      setTickerChanges((prev) => ({ ...prev, ...map }));
    });

    const unsub = onTickersUpdated((res) => {
      const map: Record<string, number> = {};
      for (const t of res) {
        map[t.symbol] = t.change24h;
        map[t.binancePair] = t.change24h;
        map[t.baseAsset] = t.change24h;
      }
      setTickerChanges((prev) => ({ ...prev, ...map }));
    });

    const interval = setInterval(() => {
      getBinanceTickers().then((res) => {
        const map: Record<string, number> = {};
        for (const t of res) {
          map[t.symbol] = t.change24h;
          map[t.binancePair] = t.change24h;
          map[t.baseAsset] = t.change24h;
        }
        setTickerChanges((prev) => ({ ...prev, ...map }));
      });
    }, 15000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  return tickerChanges;
}
