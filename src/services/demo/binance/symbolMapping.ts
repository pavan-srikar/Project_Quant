import type { Symbol as TradingSymbol } from "../../schemas.ts";

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
export const CRYPTO_NAMES: Record<string, string> = {
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

export function symbolToBinancePair(symbol: string): string {
  const clean = symbol.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  if (clean.endsWith("USDT")) return clean;
  if (clean.endsWith("USD")) return `${clean}T`;
  return `${clean}USDT`;
}

export function binancePairToSymbol(binancePair: string): string {
  return binancePair.replace("USDT", "USD");
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
