import type {
  ISeriesPrimitivePaneRenderer,
  ISeriesPrimitivePaneView,
  Logical,
  SeriesAttachedParameter,
  SeriesPrimitivePaneViewZOrder,
  Time,
} from "lightweight-charts";
import type { Candle } from "../../../services/schemas.ts";
import { PluginBase } from "../plugin-base.ts";
import { generateHeatmapGrid, generateLiquidationBands } from "./heatmap-generator.ts";
import { renderHeatmapField, updateHeatmapTexture } from "./heatmap-renderer.ts";
import type {
  HeatmapGridData,
  HeatmapSettings,
  HoveredHeatmapPoint,
  LiquidationBand,
} from "./heatmap-types.ts";

class HeatmapPaneRenderer implements ISeriesPrimitivePaneRenderer {
  private _gridData: HeatmapGridData;
  private _texture: HTMLCanvasElement;
  private _dest = { x: 0, y: 0, width: 0, height: 0 };
  private _settings: HeatmapSettings;

  constructor(
    gridData: HeatmapGridData,
    texture: HTMLCanvasElement,
    dest: { x: number; y: number; width: number; height: number },
    settings: HeatmapSettings,
  ) {
    this._gridData = gridData;
    this._texture = texture;
    this._dest = { ...dest };
    this._settings = settings;
  }

  update(
    gridData: HeatmapGridData,
    texture: HTMLCanvasElement,
    dest: { x: number; y: number; width: number; height: number },
    settings: HeatmapSettings,
  ): void {
    this._gridData = gridData;
    this._texture = texture;
    this._dest.x = dest.x;
    this._dest.y = dest.y;
    this._dest.width = dest.width;
    this._dest.height = dest.height;
    this._settings = settings;
  }

  draw(target: any): void {
    target.useMediaCoordinateSpace((scope: any) => {
      renderHeatmapField(
        scope.context,
        this._gridData,
        this._texture,
        this._dest,
        scope.mediaSize.width,
        scope.mediaSize.height,
        this._settings,
        null,
      );
    });
  }
}

class HeatmapPaneView implements ISeriesPrimitivePaneView {
  private readonly _source: HeatmapPrimitive;
  private _dest = { x: 0, y: 0, width: 0, height: 0 };
  private _renderer: HeatmapPaneRenderer | null = null;

  constructor(source: HeatmapPrimitive) {
    this._source = source;
  }

  update(): void {
    const gridData = this._source.getGridData();
    if (!this._source.enabled || !gridData || gridData.colCount === 0) return;

    const chart = this._source.chart;
    const series = this._source.series;
    const timeScale = chart.timeScale();
    const N = gridData.colCount;

    // Continuous X coordinates: never returns null or flips to 0
    const lr = timeScale.getVisibleLogicalRange();
    const barSpacing = timeScale.options().barSpacing ?? 6;
    const refIdx = lr ? Math.round((lr.from + lr.to) / 2) : 0;
    const refX = (timeScale.logicalToCoordinate(refIdx as Logical) as number | null) ?? (timeScale.width() / 2);
    const x0 = refX + (0 - refIdx) * barSpacing;
    const destX = x0 - barSpacing / 2;
    const destWidth = Math.max(10, N * barSpacing);

    // Continuous Y price coordinates: anchored to visible screen bounds
    const chartHeight = chart.paneSize?.().height || 500;
    const pTop = series.coordinateToPrice(0 as any) as number | null;
    const pBottom = series.coordinateToPrice(chartHeight as any) as number | null;

    let destY = 0;
    let destHeight = chartHeight;
    if (pTop !== null && pBottom !== null && pTop > pBottom) {
      const priceSpan = pTop - pBottom;
      destY = ((pTop - gridData.maxPrice) / priceSpan) * chartHeight;
      destHeight = Math.max(10, ((gridData.maxPrice - gridData.minPrice) / priceSpan) * chartHeight);
    } else {
      const rawYTop = series.priceToCoordinate(gridData.maxPrice);
      const rawYBottom = series.priceToCoordinate(gridData.minPrice);
      if (rawYTop !== null && rawYBottom !== null) {
        destY = rawYTop as number;
        destHeight = Math.max(10, (rawYBottom as number) - (rawYTop as number));
      }
    }

    this._dest = { x: destX, y: destY, width: destWidth, height: destHeight };

    if (this._renderer) {
      this._renderer.update(
        gridData,
        this._source.getTextureCanvas(),
        this._dest,
        this._source.settings,
      );
    }
  }

  renderer(): ISeriesPrimitivePaneRenderer | null {
    if (!this._source.enabled) return null;
    const gridData = this._source.getGridData();
    if (!gridData || gridData.colCount === 0) return null;

    if (!this._renderer) {
      this._renderer = new HeatmapPaneRenderer(
        gridData,
        this._source.getTextureCanvas(),
        this._dest,
        this._source.settings,
      );
    }
    return this._renderer;
  }

  zOrder(): SeriesPrimitivePaneViewZOrder {
    return "bottom";
  }
}

export class HeatmapPrimitive extends PluginBase {
  private _paneView = new HeatmapPaneView(this);
  private _getCandles: () => Candle[] = () => [];
  private _cachedGrid: HeatmapGridData | null = null;
  private _textureCanvas: HTMLCanvasElement;
  private _lastCandleCount = 0;
  private _lastCandleTime = 0;
  private _enabled = false;
  private _settings: HeatmapSettings = {
    brightness: 2.0,
    bandHeight: 8,
    minOpacity: 0.35,
    colorMap: "viridis",
    sensitivity: "medium",
  };

  constructor() {
    super();
    this._textureCanvas = typeof document !== "undefined" ? document.createElement("canvas") : ({} as any);
  }

  public updateAllViews(): void {
    this._paneView.update();
  }

  private _recomputeTimer: any = null;
  private _lastRecomputeTime = 0;
  private _timeScaleListener?: () => void;

  public override attached(param: SeriesAttachedParameter<Time>): void {
    super.attached(param);
    this._timeScaleListener = () => {
      this._paneView.update();
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
    if (this._recomputeTimer !== null) {
      clearTimeout(this._recomputeTimer);
      this._recomputeTimer = null;
    }
    super.detached();
  }

  protected override dataUpdated(): void {
    if (!this._enabled) return;
    const now = Date.now();
    if (now - this._lastRecomputeTime > 1200) {
      this._lastRecomputeTime = now;
      this._recompute(true);
      this.requestUpdate();
    } else if (this._recomputeTimer === null) {
      this._recomputeTimer = setTimeout(() => {
        this._recomputeTimer = null;
        this._lastRecomputeTime = Date.now();
        if (this._enabled) {
          this._recompute(true);
          this.requestUpdate();
        }
      }, 1200);
    }
  }

  public requestRedraw(): void { this._recompute(true); this.requestUpdate(); }
  public get enabled(): boolean { return this._enabled; }
  public setEnabled(val: boolean): void {
    if (this._enabled !== val) {
      this._enabled = val;
      if (val) this._recompute(true);
      this.requestUpdate();
    }
  }

  public setSettings(settings: Partial<HeatmapSettings>): void {
    const p = this._settings;
    this._settings = { ...this._settings, ...settings };
    const gridDirty = (settings.sensitivity && settings.sensitivity !== p.sensitivity) ||
      (settings.thresholdRatio !== undefined && settings.thresholdRatio !== p.thresholdRatio) ||
      (settings.ceilingRatio !== undefined && settings.ceilingRatio !== p.ceilingRatio);
    const textureDirty = gridDirty || (settings.colorMap && settings.colorMap !== p.colorMap) ||
      (settings.brightness !== undefined && settings.brightness !== p.brightness) ||
      (settings.minOpacity !== undefined && settings.minOpacity !== p.minOpacity);

    if (gridDirty) {
      this._recompute(true);
    } else if (textureDirty && this._cachedGrid) {
      updateHeatmapTexture(this._textureCanvas, this._cachedGrid, this._settings);
    }
    this.requestUpdate();
  }

  public get settings(): HeatmapSettings { return this._settings; }
  public setGetCandles(getter: () => Candle[]): void {
    this._getCandles = getter;
    this._recompute(true);
    this.requestUpdate();
  }
  public getCandles(): Candle[] { return this._getCandles(); }
  public getGridData(): HeatmapGridData | null {
    if (!this._cachedGrid) this._recompute();
    return this._cachedGrid;
  }
  public getTextureCanvas(): HTMLCanvasElement { return this._textureCanvas; }
  public getHoverPoint(): HoveredHeatmapPoint | null { return null; }
  public getBands(): LiquidationBand[] {
    const candles = this._getCandles();
    return generateLiquidationBands(candles, this._settings.sensitivity);
  }

  private _recompute(force = false): void {
    const candles = this._getCandles();
    if (!candles || candles.length === 0) {
      this._cachedGrid = null;
      this._lastCandleCount = 0;
      this._lastCandleTime = 0;
      return;
    }
    const lastTime = Number(candles[candles.length - 1]?.time ?? 0);
    if (!force && candles.length === this._lastCandleCount && lastTime === this._lastCandleTime) {
      return;
    }
    this._lastCandleCount = candles.length;
    const s = this._settings;
    this._cachedGrid = generateHeatmapGrid(candles, s.sensitivity, 160, s.thresholdRatio, s.ceilingRatio);
    updateHeatmapTexture(this._textureCanvas, this._cachedGrid, s);
  }

  public paneViews(): readonly ISeriesPrimitivePaneView[] {
    return [this._paneView];
  }
}
