import type { QueryClient } from "@tanstack/react-query";

// ── Coalescing invalidation ───────────────────────────────────────
// Module-level debounce map: collapses rapid-fire WS events (e.g. 5 fills
// in 100ms) into a single REST refetch per key, eliminating race conditions.
const _invalidateTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function coalesceInvalidation(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  delayMs = 150,
) {
  const key = JSON.stringify(queryKey);
  const existing = _invalidateTimers.get(key);
  if (existing) clearTimeout(existing);
  _invalidateTimers.set(
    key,
    setTimeout(() => {
      _invalidateTimers.delete(key);
      queryClient.invalidateQueries({ queryKey: queryKey as unknown[] });
    }, delayMs),
  );
}
