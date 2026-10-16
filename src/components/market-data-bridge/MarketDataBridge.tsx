import { useMarketDataWs } from "./useMarketDataWs.ts";
import { useAccountWs } from "./useAccountWs.ts";
import { usePositionWsCache } from "./usePositionWsCache.ts";
import { useOrderWsCache } from "./useOrderWsCache.ts";

/**
 * Global WebSocket subscriber. Owns all market-data / account / positions /
 * orders subscriptions for the app.
 *
 * Why: Subscriptions used to live inside Layout / MobileShell, both rendered
 * BELOW the global ErrorBoundary. When any subtree threw (e.g. a lazy chunk
 * failed to load), ErrorBoundary unmounted the route tree → useEffect cleanups
 * ran → unsub() removed the market-data handler → every subsequent tick was
 * silently dropped. Hosting the subscription here, ABOVE the ErrorBoundary,
 * means subtree errors no longer kill the live data stream.
 */
export function MarketDataBridge() {
  useMarketDataWs();
  useAccountWs();
  usePositionWsCache();
  useOrderWsCache();

  return null;
}
