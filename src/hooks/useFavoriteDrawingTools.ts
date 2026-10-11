import { useCallback, useEffect, useState } from "react";
import type { DrawingTool } from "../pages/trading/constants.ts";

export const DEFAULT_FAVORITE_DRAWING_TOOLS: DrawingTool[] = [
  "trendline",
  "horizontal",
  "fibonacci",
  "rectangle",
  "long-position",
  "short-position",
  "measure",
];

const STORAGE_KEY = "project_quant:favorite-drawing-tools";
const LEGACY_STORAGE_KEY = "opencharts:favorite-drawing-tools";
const EVENT_NAME = "project_quant:favorite-drawing-tools-updated";

export function loadFavoriteDrawingTools(): DrawingTool[] {
  if (typeof window === "undefined") return DEFAULT_FAVORITE_DRAWING_TOOLS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(
          (t): t is DrawingTool => typeof t === "string" && t !== "none",
        );
      }
    }
  } catch {
    // ignore parse errors and fallback
  }
  return DEFAULT_FAVORITE_DRAWING_TOOLS;
}

export function saveFavoriteDrawingTools(tools: DrawingTool[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: tools }));
  } catch {
    // ignore storage errors
  }
}

// Global in-memory cache and subscriber bus for instant multi-component reactivity
type Listener = (favorites: DrawingTool[]) => void;
const listeners = new Set<Listener>();
let currentFavorites: DrawingTool[] = loadFavoriteDrawingTools();

function broadcast(next: DrawingTool[]): void {
  currentFavorites = next;
  saveFavoriteDrawingTools(next);
  for (const listener of listeners) {
    listener(next);
  }
}

export function useFavoriteDrawingTools() {
  const [favorites, setFavoritesState] = useState<DrawingTool[]>(() => currentFavorites);

  useEffect(() => {
    const listener: Listener = (updated) => {
      setFavoritesState([...updated]);
    };
    listeners.add(listener);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const updated = loadFavoriteDrawingTools();
        currentFavorites = updated;
        setFavoritesState([...updated]);
      }
    };
    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<DrawingTool[]>).detail;
      if (Array.isArray(detail)) {
        currentFavorites = detail;
        setFavoritesState([...detail]);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(EVENT_NAME, handleCustom);

    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(EVENT_NAME, handleCustom);
    };
  }, []);

  const isFavorite = useCallback(
    (tool: DrawingTool) => favorites.includes(tool),
    [favorites],
  );

  const toggleFavorite = useCallback((tool: DrawingTool) => {
    const exists = currentFavorites.includes(tool);
    const next = exists
      ? currentFavorites.filter((t) => t !== tool)
      : [...currentFavorites, tool];
    broadcast(next);
  }, []);

  const removeFavorite = useCallback((tool: DrawingTool) => {
    const next = currentFavorites.filter((t) => t !== tool);
    broadcast(next);
  }, []);

  const reorderFavorites = useCallback((newOrder: DrawingTool[]) => {
    broadcast(newOrder);
  }, []);

  const moveFavorite = useCallback((fromIndex: number, toIndex: number) => {
    if (
      fromIndex < 0 ||
      fromIndex >= currentFavorites.length ||
      toIndex < 0 ||
      toIndex >= currentFavorites.length
    ) {
      return;
    }
    const next = [...currentFavorites];
    const [item] = next.splice(fromIndex, 1);
    if (item !== undefined) {
      next.splice(toIndex, 0, item);
    }
    broadcast(next);
  }, []);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    removeFavorite,
    reorderFavorites,
    moveFavorite,
  };
}
