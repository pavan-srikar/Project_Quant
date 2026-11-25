import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type IChartApi,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

export function useIndicatorChart(
  timeframe: string = "4h",
  _isDark: boolean = true,
  mainChart?: IChartApi | null,
  showTimeScale: boolean = true,
) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [chartEpoch, setChartEpoch] = useState(0);
  const isSubInteractingRef = useRef(false);
  const mainChartRef = useRef(mainChart);
  mainChartRef.current = mainChart;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 180;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#131722" },
        textColor: "#787b86",
        fontSize: 10,
        fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "#363a45",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#2a2e39",
        },
        horzLine: {
          color: "#363a45",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#2a2e39",
        },
      },
      rightPriceScale: {
        borderColor: "#2a2e39",
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: true,
        borderVisible: true,
        minimumWidth: 80,
      },
      timeScale: {
        visible: showTimeScale,
        borderColor: "#2a2e39",
        timeVisible: true,
        secondsVisible: timeframe === "1m",
        rightOffset: timeframe === "1m" ? 10 : 6,
        minBarSpacing: 0.5,
        fixLeftEdge: false,
        fixRightEdge: false,
        borderVisible: showTimeScale,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: { time: true, price: true },
      },
    });

    chartRef.current = chart;
    setChartEpoch((e) => e + 1);

    // Initial visible range alignment with mainChart if available
    const initialRange = mainChartRef.current?.timeScale().getVisibleLogicalRange();
    if (initialRange) {
      try {
        chart.timeScale().setVisibleLogicalRange(initialRange);
      } catch {}
    }

    // ResizeObserver for responsive layout
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && chartRef.current) {
          chartRef.current.applyOptions({ width: newW, height: newH });
        }
      }
    });
    ro.observe(container);

    const onStart = () => {
      isSubInteractingRef.current = true;
    };
    const onEnd = () => {
      isSubInteractingRef.current = false;
    };
    let wheelTimer: ReturnType<typeof setTimeout> | null = null;
    const onWheel = () => {
      isSubInteractingRef.current = true;
      if (wheelTimer) clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        isSubInteractingRef.current = false;
      }, 1500);
    };
    container.addEventListener("pointerdown", onStart, { passive: true });
    window.addEventListener("pointerup", onEnd, { passive: true });
    window.addEventListener("pointercancel", onEnd, { passive: true });
    container.addEventListener("wheel", onWheel, { passive: true });

    return () => {
      if (wheelTimer) clearTimeout(wheelTimer);
      container.removeEventListener("pointerdown", onStart);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
      container.removeEventListener("wheel", onWheel);
      ro.disconnect();
      try {
        chart.remove();
      } catch {}
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, _isDark]);

  useEffect(() => {
    chartRef.current?.applyOptions({
      timeScale: {
        visible: showTimeScale,
        borderVisible: showTimeScale,
      },
    });
  }, [showTimeScale]);

  return {
    chartContainerRef,
    chartRef,
    chartEpoch,
    isSubInteractingRef,
  };
}
