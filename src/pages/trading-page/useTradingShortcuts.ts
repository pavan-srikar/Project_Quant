import { useCallback, useEffect, useState } from "react";

export function useTradingShortcuts() {
  const [isSymbolSearchOpen, setIsSymbolSearchOpen] = useState(false);
  const [symbolSearchInitialQuery, setSymbolSearchInitialQuery] = useState("");
  const [symbolSearchMode, setSymbolSearchMode] = useState<"switch" | "add_to_watchlist">("switch");

  const openSymbolSearch = useCallback(
    (mode: "switch" | "add_to_watchlist" = "switch", initialQuery = "") => {
      setSymbolSearchMode(mode);
      setSymbolSearchInitialQuery(initialQuery);
      setIsSymbolSearchOpen(true);
    },
    [],
  );

  const closeSymbolSearch = useCallback(() => {
    setIsSymbolSearchOpen(false);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is focused inside an input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      // Ignore if modifier keys are held
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Type-to-Search: Alphanumeric key pressed outside text inputs
      if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
        e.preventDefault();
        setSymbolSearchMode("switch");
        setSymbolSearchInitialQuery(e.key);
        setIsSymbolSearchOpen(true);
      } else if (e.key === "/") {
        e.preventDefault();
        setSymbolSearchMode("switch");
        setSymbolSearchInitialQuery("");
        setIsSymbolSearchOpen(true);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, []);

  return {
    isSymbolSearchOpen,
    setIsSymbolSearchOpen,
    symbolSearchInitialQuery,
    setSymbolSearchInitialQuery,
    symbolSearchMode,
    setSymbolSearchMode,
    openSymbolSearch,
    closeSymbolSearch,
  };
}
