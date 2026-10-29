import type {
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
  Logical,
  SeriesAttachedParameter,
  SeriesPrimitivePaneViewZOrder,
  Time,
} from "lightweight-charts";
import { candleTimeSec } from "../../../pages/trading/chart/useChartDataPipeline.ts";
import type { Candle } from "../../../services/schemas.ts";
import { PluginBase } from "../plugin-base.ts";
import { generateFootprintBar } from "./footprint-generator.ts";
import {
  renderFootprintBars,
  type ResolvedFootprintBar,
} from "./footprint-renderer.ts";

class FootprintPaneRenderer implements ISeriesPrimitivePaneRenderer {
  private readonly _bars: ResolvedFootprintBar[];
  private readonly _barSpacing: number;

  constructor(bars: ResolvedFootprintBar[], barSpacing: number) {
    this._bars = bars;
    this._barSpacing = barSpacing;
  }

  draw(target: any): void {
    if (this._bars.length === 0) return;
    target.useMediaCoordinateSpace((scope: any) => {
      renderFootprintBars(scope, this._bars, this._barSpacing);
    });
  }
}

class FootprintPaneView implements ISeriesPrimitivePaneView {
  private readonly _source: FootprintPrimitive;
  private _resolvedBars: ResolvedFootprintBar[] = [];

  constructor(source: FootprintPrimitive) {
    this._source = source;
  }

  update(): void {
    if (!this._source.enabled) {
      this._resolvedBars = [];
      return;
    }

    const chart = this._source.chart;
    const series = this._source.series;
    const candles = this._source.getCandles();
    if (!candles || candles.length === 0) {
      this._resolvedBars = [];
      return;
    }

    const timeScale = chart.timeScale();
    const lr = timeScale.getVisibleLogicalRange();
    const chartWidth = timeScale.width();

    const startIdx = lr ? Math.max(0, Math.floor(lr.from) - 2) : 0;
    const endIdx = lr
      ? Math.min(candles.length - 1, Math.ceil(lr.to) + 2)
      : candles.length - 1;

    const resolved: ResolvedFootprintBar[] = [];

    for (let i = startIdx; i <= endIdx; i++) {
      const c = candles[i];
      if (!c) continue;

      const timeSec = candleTimeSec(c);
      const directX = !Number.isNaN(timeSec)
        ? timeScale.timeToCoordinate(timeSec as any)
        : null;
      const logicalX = timeScale.logicalToCoordinate(i as Logical);
      const x = directX !== null ? directX : logicalX;
      if (x === null) continue;

      if (chartWidth > 0 && (x < -150 || x > chartWidth + 150)) {
        continue;
      }

      const yOpen = series.priceToCoordinate(c.open);
      const yHigh = series.priceToCoordinate(c.high);
      const yLow = series.priceToCoordinate(c.low);
      const yClose = series.priceToCoordinate(c.close);
      if (yOpen === null || yHigh === null || yLow === null || yClose === null) {
        continue;
      }

      const bar = generateFootprintBar({
        ...c,
        time: Number.isNaN(timeSec) ? c.time : timeSec,
      });
      const resolvedLevels: ResolvedFootprintBar["levels"] = [];

      for (let j = 0; j < bar.levels.length; j++) {
        const lvl = bar.levels[j]!;
        const yLvl = series.priceToCoordinate(lvl.price);
        if (yLvl === null) continue;

        let height = 16;
        if (j < bar.levels.length - 1) {
          const nextLvl = bar.levels[j + 1]!;
          const yNext = series.priceToCoordinate(nextLvl.price);
          if (yNext !== null) {
            height = Math.max(6, Math.abs(yNext - yLvl));
          }
        } else if (resolvedLevels.length > 0) {
          height = resolvedLevels[resolvedLevels.length - 1]!.height;
        }

        resolvedLevels.push({ level: lvl, y: yLvl, height });
      }

      resolved.push({
        bar,
        x,
        yOpen,
        yHigh,
        yLow,
        yClose,
        levels: resolvedLevels,
      });
    }

    this._resolvedBars = resolved;
  }

  renderer(): ISeriesPrimitivePaneRenderer | null {
    if (!this._source.enabled) return null;
    this.update();
    if (this._resolvedBars.length === 0) return null;

    let barSpacing = 30;
    try {
      barSpacing = this._source.chart.timeScale().options().barSpacing ?? 30;
    } catch {
      /* ignore */
    }
    return new FootprintPaneRenderer(this._resolvedBars, barSpacing);
  }

  zOrder(): SeriesPrimitivePaneViewZOrder {
    return "top";
  }
}

export class FootprintPrimitive extends PluginBase {
  private _paneView: FootprintPaneView;
  private _getCandles: () => Candle[] = () => [];
  private _enabled = false;
  private _timeScaleListener?: () => void;

  constructor() {
    super();
    this._paneView = new FootprintPaneView(this);
  }

  public updateAllViews(): void {
    this._paneView.update();
  }

  public override attached(param: SeriesAttachedParameter<Time>): void {
    super.attached(param);
    this._timeScaleListener = () => {
      this.requestUpdate();
    };
    param.chart.timeScale().subscribeVisibleLogicalRangeChange(this._timeScaleListener);
  }

  public override detached(): void {
    if (this._timeScaleListener) {
      try {
        this.chart.timeScale().unsubscribeVisibleLogicalRangeChange(this._timeScaleListener);
      } catch {
        /* ignore */
      }
      this._timeScaleListener = undefined;
    }
    super.detached();
  }

  protected override dataUpdated(): void {
    this.requestUpdate();
  }

  public requestRedraw(): void {
    this.requestUpdate();
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  public setEnabled(val: boolean): void {
    if (this._enabled !== val) {
      this._enabled = val;
      this.requestUpdate();
    }
  }

  public setGetCandles(getter: () => Candle[]): void {
    this._getCandles = getter;
    this.requestUpdate();
  }

  public getCandles(): Candle[] {
    return this._getCandles();
  }

  public paneViews(): readonly ISeriesPrimitivePaneView[] {
    return [this._paneView];
  }
}
