import type { IChartApi, ISeriesApi } from "lightweight-charts";
import {
  type MouseEvent as ReactMouseEvent,
  useCallback,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import type { DrawingToolsManager } from "../../../lib/chart-plugins/drawing-tools/manager.ts";
import { updateChartPreferences, type ChartPreferences } from "../../../hooks/useChartPreferences.ts";
import { toast } from "../../../services/toast.ts";
import { TF_INTERVAL_MS, type DrawingLine } from "../constants.ts";

export interface ChartContextMenuActionsParams {
  chartRef: RefObject<IChartApi | null>;
  candleSeriesRef: RefObject<ISeriesApi<"Candlestick"> | null>;
  drawingMenuOpenedRef: RefObject<boolean>;
  setChartMenu: Dispatch<SetStateAction<{ x: number; y: number; price: number | null } | null>>;
  pipDigits: number;
  timeframe: string;
  selectedSymbol: string;
  onAddDrawing: (d: DrawingLine) => void;
  drawings: DrawingLine[];
  onUpdateDrawing?: (d: DrawingLine) => void;
  selectedDrawing: DrawingLine | null;
  drawingManagerRef: RefObject<DrawingToolsManager | null>;
  chartPrefs?: Pick<ChartPreferences, "autoScale">;
}

export function useChartContextMenuActions({
  chartRef,
  candleSeriesRef,
  drawingMenuOpenedRef,
  setChartMenu,
  pipDigits,
  timeframe,
  selectedSymbol,
  onAddDrawing,
  drawings,
  onUpdateDrawing,
  selectedDrawing,
  drawingManagerRef,
  chartPrefs,
}: ChartContextMenuActionsParams) {
  const handleChartContextMenu = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (drawingMenuOpenedRef.current) {
        drawingMenuOpenedRef.current = false;
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const raw = candleSeriesRef.current?.coordinateToPrice(e.clientY - rect.top);
      const price = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
      setChartMenu({ x: e.clientX, y: e.clientY, price });
    },
    [candleSeriesRef, drawingMenuOpenedRef, setChartMenu],
  );

  const handleToggleAutoScale = useCallback(() => {
    const next = !(chartPrefs?.autoScale ?? false);
    updateChartPreferences({ autoScale: next });
    chartRef.current?.priceScale("right").applyOptions({ autoScale: next });
  }, [chartPrefs?.autoScale, chartRef]);

  const handleResetView = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.timeScale().resetTimeScale();
    chart.priceScale("right").applyOptions({ autoScale: true });
    if (!chartPrefs?.autoScale) {
      requestAnimationFrame(() => {
        try {
          chart.priceScale("right").applyOptions({ autoScale: false });
        } catch {}
      });
    }
    chart.timeScale().scrollToRealTime();
  }, [chartRef, chartPrefs?.autoScale]);

  const handleCopyPrice = useCallback(
    (price: number) => {
      const text = price.toFixed(pipDigits);
      void navigator.clipboard
        ?.writeText(text)
        .then(() => toast.success("Copied", text))
        .catch(() => toast.error("Copy failed", "Clipboard unavailable"));
    },
    [pipDigits],
  );

  const handleAddAlert = useCallback(
    (price: number) => {
      const rounded = parseFloat(price.toFixed(pipDigits));
      onAddDrawing({
        id: crypto.randomUUID(),
        type: "horizontal",
        price: rounded,
        color: "#f0b90b",
        alertEnabled: true,
        createdTf: timeframe,
      });
      toast.info("Alert set", `${selectedSymbol} at ${rounded}`);
    },
    [onAddDrawing, pipDigits, timeframe, selectedSymbol],
  );

  const handleCloneDrawing = useCallback(() => {
    const d = selectedDrawing;
    if (!d) return;
    const offsetSec = (((TF_INTERVAL_MS as Record<string, number>)[timeframe] ?? 60_000) / 1000) * 5;
    onAddDrawing({
      ...d,
      id: crypto.randomUUID(),
      time: d.time != null ? d.time + offsetSec : undefined,
      time2: d.time2 != null ? d.time2 + offsetSec : undefined,
    });
  }, [selectedDrawing, timeframe, onAddDrawing]);

  const handleReorderDrawing = useCallback(
    (d: DrawingLine, dir: "front" | "back") => {
      const zs = drawings.map((x) => x.zIndex ?? 0);
      const zIndex = dir === "front" ? Math.max(...zs, 0) + 1 : Math.min(...zs, 0) - 1;
      onUpdateDrawing?.({ ...d, zIndex });
    },
    [drawings, onUpdateDrawing],
  );

  const handleObjectTreeSelect = useCallback((d: DrawingLine) => {
    drawingManagerRef.current?.setSelection([d.id]);
  }, [drawingManagerRef]);

  return {
    handleChartContextMenu,
    handleResetView,
    handleToggleAutoScale,
    handleCopyPrice,
    handleAddAlert,
    handleCloneDrawing,
    handleReorderDrawing,
    handleObjectTreeSelect,
  };
}
