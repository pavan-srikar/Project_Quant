import {
  type BinanceSearchResult,
  CRYPTO_NAMES,
  symbolToBinancePair,
} from "./symbolMapping.ts";
import {
  _savedPrices,
  _savedChanges,
  _priceMap,
  _changeMap,
  saveKnownPrice,
  LAST_PRICES_KEY,
  LAST_CHANGES_KEY,
} from "./priceStorage.ts";

export type TickerListener = (tickers: BinanceSearchResult[]) => void;
const _tickerListeners: TickerListener[] = [];

export function onTickersUpdated(cb: TickerListener): () => void {
  _tickerListeners.push(cb);
  if (_cachedTickers.length > 0 && _cachedTickers[0]?.price && _cachedTickers[0].price > 0) {
    cb(_cachedTickers);
  }
  return () => {
    const idx = _tickerListeners.indexOf(cb);
    if (idx !== -1) _tickerListeners.splice(idx, 1);
  };
}

let _cachedTickers: BinanceSearchResult[] = Object.entries(CRYPTO_NAMES).map(([base, name]) => {
  const symbol = `${base}USD`;
  const saved = _savedPrices[symbol] ?? 0;
  const savedChange = _savedChanges[symbol] ?? _savedChanges[`${base}USDT`] ?? 0;
  return {
    symbol,
    binancePair: `${base}USDT`,
    baseAsset: base,
    displayName: name,
    price: saved,
    change24h: savedChange,
    volume24h: 1000000,
    tickSize: base === "DOGE" ? 0.0001 : base === "SHIB" || base === "PEPE" ? 0.00000001 : 0.01,
  };
});
let _lastFetchTime = 0;

export function getCachedTickers(): BinanceSearchResult[] {
  return _cachedTickers;
}

export async function fetchSinglePrice(symbol: string): Promise<number> {
  const existing = _priceMap.get(symbol);
  if (existing && existing > 0) return existing;
  const pair = symbolToBinancePair(symbol);
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
    if (!res.ok) return 0;
    const data = (await res.json()) as { symbol: string; price: string };
    const price = parseFloat(data.price) || 0;
    if (price > 0) {
      saveKnownPrice(symbol, price);
      return price;
    }
  } catch {
    /* safe */
  }
  return 0;
}

export async function getBinanceTickers(): Promise<BinanceSearchResult[]> {
  const now = Date.now();
  // Cache for 30 seconds
  if (
    _cachedTickers.length > 0 &&
    now - _lastFetchTime < 30_000 &&
    _cachedTickers[0]?.price &&
    _cachedTickers[0].price > 0
  ) {
    return _cachedTickers;
  }

  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    const data = (await res.json()) as Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
      quoteVolume: string;
    }>;

    // Filter USDT spot trading pairs
    const usdtPairs = data
      .filter((item) => item.symbol.endsWith("USDT") && !item.symbol.includes("UP") && !item.symbol.includes("DOWN"))
      .map((item) => {
        const baseAsset = item.symbol.replace("USDT", "");
        const price = parseFloat(item.lastPrice) || 0;
        const change24h = parseFloat(item.priceChangePercent) || 0;
        const volume24h = parseFloat(item.quoteVolume) || 0;

        let tickSize = 0.01;
        if (price < 0.001) tickSize = 0.00000001;
        else if (price < 0.1) tickSize = 0.0001;
        else if (price < 10) tickSize = 0.001;

        return {
          symbol: `${baseAsset}USD`,
          binancePair: item.symbol,
          baseAsset,
          displayName: CRYPTO_NAMES[baseAsset] ?? baseAsset,
          price,
          change24h,
          volume24h,
          tickSize,
        };
      })
      .sort((a, b) => b.volume24h - a.volume24h);

    if (usdtPairs.length > 0) {
      _cachedTickers = usdtPairs;
      _lastFetchTime = now;
      for (const item of usdtPairs) {
        if (item.price > 0) {
          _priceMap.set(item.symbol, item.price);
        }
        _changeMap.set(item.symbol, item.change24h);
        _changeMap.set(item.binancePair, item.change24h);
        _changeMap.set(item.baseAsset, item.change24h);
      }
      try {
        const obj = Object.fromEntries(_priceMap);
        localStorage.setItem(LAST_PRICES_KEY, JSON.stringify(obj));
        const changeObj = Object.fromEntries(_changeMap);
        localStorage.setItem(LAST_CHANGES_KEY, JSON.stringify(changeObj));
      } catch {
        /* ignore */
      }

      // Notify all feed listeners immediately
      for (const listener of _tickerListeners) {
        try {
          listener(usdtPairs);
        } catch {
          /* safe */
        }
      }

      return _cachedTickers;
    }
  } catch (err) {
    console.warn("Could not fetch 24hr tickers from Binance, falling back:", err);
  }

  // Fallback default list
  if (_cachedTickers.length === 0) {
    _cachedTickers = Object.entries(CRYPTO_NAMES).map(([base, name]) => {
      const symbol = `${base}USD`;
      const saved = _priceMap.get(symbol) ?? 0;
      return {
        symbol,
        binancePair: `${base}USDT`,
        baseAsset: base,
        displayName: name,
        price: saved,
        change24h: 0,
        volume24h: 1000000,
        tickSize: 0.01,
      };
    });
  }

  return _cachedTickers;
}

// Eagerly prefetch in background so live prices and full list of pairs are ready immediately
void getBinanceTickers();
