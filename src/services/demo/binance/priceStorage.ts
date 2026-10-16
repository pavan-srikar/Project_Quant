export const LAST_PRICES_KEY = "oc_last_crypto_prices";
export const LAST_CHANGES_KEY = "oc_last_crypto_changes";

export const DEFAULT_CHANGES: Record<string, number> = {
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

export function loadSavedPrices(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LAST_PRICES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function loadSavedChanges(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LAST_CHANGES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export const _savedPrices = loadSavedPrices();
export const _priceMap = new Map<string, number>(Object.entries(_savedPrices));

export const _savedChanges = { ...DEFAULT_CHANGES, ...loadSavedChanges() };
export const _changeMap = new Map<string, number>(Object.entries(_savedChanges));

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
