import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type TouchEvent as ReactTouchEvent } from "react";
import { getChartPreferencesFromStorage } from "../../hooks/useChartPreferences.ts";
import { INDICATOR_REGISTRY } from "../../lib/indicators.ts";
import type { BottomPanelTab } from "../trading/BottomPanel.tsx";

export function useTradingLayoutResize() {
  const [bottomTab, setBottomTab] = useState<BottomPanelTab>("indicators");
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(() => {
    const saved = localStorage.getItem("bottomPanelCollapsed");
    if (saved !== null) return saved === "true";
    const initialIndicators = getChartPreferencesFromStorage().activeIndicators ?? [];
    const hasBelow = initialIndicators.some((t) => {
      const cfg = INDICATOR_REGISTRY.find((r) => r.type === t);
      return cfg && cfg.pane === "below";
    });
    return !hasBelow; // default minimized only if no below indicator is present
  });

  const handleToggleBottomCollapse = useCallback(() => {
    setIsBottomCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("bottomPanelCollapsed", String(next));
      return next;
    });
  }, []);

  const handleBottomTabChange = useCallback(
    (newTab: BottomPanelTab) => {
      if (newTab === bottomTab) {
        setIsBottomCollapsed((prev) => {
          const next = !prev;
          localStorage.setItem("bottomPanelCollapsed", String(next));
          return next;
        });
      } else {
        setBottomTab(newTab);
        if (isBottomCollapsed) {
          setIsBottomCollapsed(false);
          localStorage.setItem("bottomPanelCollapsed", "false");
        }
      }
    },
    [bottomTab, isBottomCollapsed],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 50);
    return () => clearTimeout(timer);
  }, [isBottomCollapsed]);

  // Vertical resize: chart vs bottom panel
  const [bottomPanelHeight, setBottomPanelHeight] = useState(() => {
    const saved = localStorage.getItem("bottomPanelHeight");
    return saved ? parseInt(saved, 10) : 220;
  });
  const resizingRef = useRef(false);
  const resizeStartY = useRef(0);
  const resizeStartH = useRef(0);

  const handleResizeStart = useCallback(
    (e: ReactMouseEvent | ReactTouchEvent) => {
      e.preventDefault();
      resizingRef.current = true;
      const clientY = "touches" in e ? e.touches[0]!.clientY : e.clientY;
      resizeStartY.current = clientY;
      resizeStartH.current = bottomPanelHeight;

      const onMove = (ev: MouseEvent | TouchEvent) => {
        if (!resizingRef.current) return;
        const y = "touches" in ev ? ev.touches[0]!.clientY : (ev as MouseEvent).clientY;
        const delta = resizeStartY.current - y;
        const newH = Math.max(100, Math.min(600, resizeStartH.current + delta));
        setBottomPanelHeight(newH);
      };
      const onUp = () => {
        resizingRef.current = false;
        setBottomPanelHeight((h) => {
          localStorage.setItem("bottomPanelHeight", String(h));
          return h;
        });
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp);
    },
    [bottomPanelHeight],
  );

  // Horizontal resize: Chart/Bottom vs Right Panel
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    try {
      const saved = localStorage.getItem("rightPanelWidth");
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 250 && val <= 800) {
          return val;
        }
      }
    } catch {}
    return 320;
  });
  const [isResizingRight, setIsResizingRight] = useState(false);
  const rightResizingRef = useRef(false);
  const rightResizeStartX = useRef(0);
  const rightResizeStartW = useRef(0);

  const handleRightResizeStart = useCallback(
    (e: ReactMouseEvent | ReactTouchEvent) => {
      e.preventDefault();
      rightResizingRef.current = true;
      setIsResizingRight(true);

      const clientX = "touches" in e ? e.touches[0]!.clientX : e.clientX;
      rightResizeStartX.current = clientX;
      rightResizeStartW.current = rightPanelWidth;

      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";

      const onMove = (ev: MouseEvent | TouchEvent) => {
        if (!rightResizingRef.current) return;
        const x = "touches" in ev ? ev.touches[0]!.clientX : (ev as MouseEvent).clientX;
        const delta = rightResizeStartX.current - x;
        const maxW = Math.min(750, Math.max(300, window.innerWidth - 350));
        const newW = Math.max(260, Math.min(maxW, rightResizeStartW.current + delta));
        setRightPanelWidth(newW);
      };

      const onUp = () => {
        rightResizingRef.current = false;
        setIsResizingRight(false);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";

        setRightPanelWidth((w) => {
          try {
            localStorage.setItem("rightPanelWidth", String(w));
          } catch {}
          return w;
        });

        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp);
    },
    [rightPanelWidth],
  );

  return {
    bottomTab,
    setBottomTab,
    isBottomCollapsed,
    setIsBottomCollapsed,
    handleToggleBottomCollapse,
    handleBottomTabChange,
    bottomPanelHeight,
    handleResizeStart,
    rightPanelWidth,
    isResizingRight,
    handleRightResizeStart,
  };
}
