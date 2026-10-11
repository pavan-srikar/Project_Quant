import type { Candle, Symbol as TradingSymbol } from "../schemas.ts";

export interface BinanceSearchResult {
  symbol: string; // e.g. "DOGEUSD"
  binancePair: string; // e.g. "DOGEUSDT"
  baseAsset: string; // e.g. "DOGE"
  displayName: string; // e.g. "Dogecoin"
  price: number;
  change24h: number;
  volume24h: number;
  tickSize: number;
}

// Popular crypto names map for friendly display
const CRYPTO_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  BNB: "BNB",
  XRP: "XRP",
  ADA: "Cardano",
  DOGE: "Dogecoin",
  AVAX: "Avalanche",
  LINK: "Chainlink",
  DOT: "Polkadot",
  MATIC: "Polygon",
  NEAR: "NEAR Protocol",
  SUI: "Sui",
  APT: "Aptos",
  PEPE: "Pepe",
  SHIB: "Shiba Inu",
  UNI: "Uniswap",
  LTC: "Litecoin",
  ATOM: "Cosmos",
  XLM: "Stellar",
  FIL: "Filecoin",
  INJ: "Injective",
  RENDER: "Render",
  FET: "Artificial Superintelligence Alliance",
  ICP: "Internet Computer",
  ARB: "Arbitrum",
  OP: "Optimism",
  TIA: "Celestia",
  SEI: "Sei",
  KAS: "Kaspa",
  STX: "Stacks",
  FTM: "Fantom",
  AAVE: "Aave",
  ALGO: "Algorand",
  RUNE: "THORChain",
  WIF: "dogwifhat",
  BONK: "Bonk",
  FLOKI: "Floki",
};

const LAST_PRICES_KEY = "oc_last_crypto_prices";
const LAST_CHANGES_KEY = "oc_last_crypto_changes";

const DEFAULT_CHANGES: Record<string, number> = {
  BTCUSD: -0.96,
  BTCUSDT: -0.96,
  ETHUSD: -2.03,
  ETHUSDT: -2.03,
  SOLUSD: -3.08,
  SOLUSDT: -3.08,
  BNBUSD: 0.75,
  BNBUSDT: 0.75,
  XRPUSD: -0.45,
  XRPUSDT: -0.45,
  ADAUSD: 1.62,
  ADAUSDT: 1.62,
  AVAXUSD: 3.42,
  AVAXUSDT: 3.42,
  DOGEUSD: 5.12,
  DOGEUSDT: 5.12,
};

function loadSavedPrices(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LAST_PRICES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadSavedChanges(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LAST_CHANGES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const _savedPrices = loadSavedPrices();
const _priceMap = new Map<string, number>(Object.entries(_savedPrices));

const _savedChanges = { ...DEFAULT_CHANGES, ...loadSavedChanges() };
const _changeMap = new Map<string, number>(Object.entries(_savedChanges));

export function getKnownPrice(symbol: string): number | undefined {
  return _priceMap.get(symbol);
}

export function saveKnownPrice(symbol: string, price: number): void {
  if (!Number.isFinite(price) || price <= 0) return;
  _priceMap.set(symbol, price);
  try {
    const obj = Object.fromEntries(_priceMap);
    localStorage.setItem(LAST_PRICES_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export function getKnownChange24h(symbol: string): number | undefined {
  return _changeMap.get(symbol);
}

export function saveKnownChange24h(symbol: string, change24h: number): void {
  if (!Number.isFinite(change24h)) return;
  _changeMap.set(symbol, change24h);
  try {
    const obj = Object.fromEntries(_changeMap);
    localStorage.setItem(LAST_CHANGES_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
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

type TickerListener = (tickers: BinanceSearchResult[]) => void;
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

// Eagerly prefetch in background so live prices and full list of pairs are ready immediately
void getBinanceTickers();

export async function getBinanceTickers(): Promise<BinanceSearchResult[]> {
  const now = Date.now();
  // Cache for 30 seconds
  if (_cachedTickers.length > 0 && now - _lastFetchTime < 30_000 && _cachedTickers[0]?.price && _cachedTickers[0].price > 0) {
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

export function symbolToBinancePair(symbol: string): string {
  const clean = symbol.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (clean.endsWith("USDT")) return clean;
  if (clean.endsWith("USD")) return `${clean}T`;
  return `${clean}USDT`;
}

export function binancePairToSymbol(binancePair: string): string {
  return binancePair.replace("USDT", "USD");
}

export async function fetchBinanceKlines(
  binancePair: string,
  timeframe: string,
  limit = 1000,
  options?: { startTime?: number; endTime?: number },
): Promise<Candle[]> {
  const safeLimit = Math.min(Math.max(limit, 10), 1000);
  let url = `https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=${timeframe}&limit=${safeLimit}`;
  if (options?.startTime && options.startTime > 0) {
    url += `&startTime=${Math.floor(options.startTime)}`;
  }
  if (options?.endTime && options.endTime > 0) {
    url += `&endTime=${Math.floor(options.endTime)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Binance klines error (${binancePair} ${timeframe}): ${res.status}`);
  const rows = (await res.json()) as (number | string)[][];

  return rows.map((row) => ({
    time: Math.floor(Number(row[0]) / 1000),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }));
}

/**
 * Multi-batch historical fetcher: automatically fetches multiple 1,000-candle batches
 * from Binance backwards in time up to targetCount (or until reaching the dawn of market data).
 */
export async function fetchBinanceKlinesMulti(
  binancePair: string,
  timeframe: string,
  targetCount: number,
  beforeMs?: number,
): Promise<Candle[]> {
  const results: Candle[] = [];
  let currentEndTime = beforeMs;
  const maxBatches = Math.min(Math.ceil(targetCount / 1000), 10); // up to 10k bars

  for (let b = 0; b < maxBatches; b++) {
    const batchLimit = Math.min(1000, targetCount - results.length);
    if (batchLimit <= 0) break;

    try {
      const batch = await fetchBinanceKlines(
        binancePair,
        timeframe,
        batchLimit,
        currentEndTime ? { endTime: currentEndTime } : undefined,
      );
      if (batch.length === 0) break;

      // batch is sorted chronologically (oldest to newest). Prepend to our historical accumulator.
      results.unshift(...batch);
      const oldestTimeMs = batch[0]!.time * 1000;
      currentEndTime = oldestTimeMs - 1;

      if (batch.length < batchLimit) {
        // Reached the earliest historical bar available on Binance for this pair
        break;
      }
    } catch (err) {
      console.warn(`Binance multi-fetch batch ${b} failed:`, err);
      break;
    }
  }

  // Deduplicate and sort chronologically
  const seen = new Set<number>();
  const deduped: Candle[] = [];
  for (const c of results) {
    if (!seen.has(c.time)) {
      seen.add(c.time);
      deduped.push(c);
    }
  }
  deduped.sort((a, b) => a.time - b.time);
  return deduped;
}

/**
 * Fetches klines within a specific time range [fromMs, toMs] (for scroll-triggered historical backfill).
 */
export async function fetchBinanceKlinesRange(
  binancePair: string,
  timeframe: string,
  fromMs: number,
  toMs: number,
): Promise<Candle[]> {
  return fetchBinanceKlines(binancePair, timeframe, 1000, {
    startTime: fromMs > 0 ? fromMs : undefined,
    endTime: toMs > 0 ? toMs : undefined,
  });
}

export function createSymbolDefinition(
  name: string,
  displayName: string,
  tickSize = 0.01,
): TradingSymbol {
  return {
    id: name,
    name,
    displayName,
    category: "CRYPTO",
    contractSize: 1,
    tickSize,
    tickValue: tickSize,
    marginPercent: 1,
    maxLeverage: 100,
    commission: 0,
    swapLong: 0,
    swapShort: 0,
    tradingHoursStart: null,
    tradingHoursEnd: null,
    isActive: true,
  };
}
