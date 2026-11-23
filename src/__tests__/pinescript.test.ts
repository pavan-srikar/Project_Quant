import { describe, expect, it } from "vitest";
import { parsePineScript } from "../lib/pinescript/parser";
import { evaluatePineScript } from "../lib/pinescript/evaluator";
import { getIndicatorPineScript } from "../lib/pinescript/indicatorTemplates";
import type { CandleData } from "../lib/indicators/types";

describe("Pine Script Engine", () => {
  it("parses indicator header and inputs", () => {
    const code = `
      //@version=5
      indicator("My Test Indicator", overlay=true)
      len = input.int(14, "Length")
      mult = input.float(2.5, "Multiplier")
      plot(close, "Close Price", color.blue, 2)
    `;
    const parsed = parsePineScript(code);
    expect(parsed.title).toBe("My Test Indicator");
    expect(parsed.overlay).toBe(true);
    expect(parsed.inputs.length).toBe(2);
    expect(parsed.inputs[0]?.id).toBe("len");
    expect(parsed.inputs[0]?.defval).toBe(14);
    expect(parsed.inputs[1]?.id).toBe("mult");
    expect(parsed.inputs[1]?.defval).toBe(2.5);
    expect(parsed.plots.length).toBe(1);
    expect(parsed.plots[0]?.title).toBe("Close Price");
  });

  it("evaluates technical analysis SMA and plot expressions", () => {
    const code = `
      //@version=5
      indicator("SMA Test", overlay=true)
      fastLen = input.int(2, "Fast")
      fastSMA = ta.sma(close, fastLen)
      plot(fastSMA, "Fast SMA", color.yellow)
    `;
    const parsed = parsePineScript(code);
    const candles: CandleData[] = [
      { time: 1000, open: 10, high: 15, low: 9, close: 10 },
      { time: 2000, open: 11, high: 16, low: 10, close: 20 },
      { time: 3000, open: 21, high: 32, low: 19, close: 30 },
    ];
    const res = evaluatePineScript(candles, parsed);
    expect(res.error).toBeUndefined();
    expect(res.plots.length).toBe(1);
    const pts = res.plots[0]?.values ?? [];
    expect(pts.length).toBe(2);
    expect(pts[0]?.time).toBe(2000);
    expect(pts[0]?.value).toBe(15);
    expect(pts[1]?.time).toBe(3000);
    expect(pts[1]?.value).toBe(25);
  });

  it("evaluates sub-chart indicators with hline levels", () => {
    const code = `
      //@version=5
      indicator("RSI Custom", overlay=false)
      r = ta.rsi(close, 2)
      plot(r, "RSI", color.purple)
      hline(70, "Overbought", color.red)
      hline(30, "Oversold", color.green)
    `;
    const parsed = parsePineScript(code);
    expect(parsed.overlay).toBe(false);
    expect(parsed.hlines.length).toBe(2);
    expect(parsed.hlines[0]?.price).toBe(70);
    expect(parsed.hlines[1]?.price).toBe(30);

    const candles: CandleData[] = [
      { time: 1, open: 10, high: 12, low: 9, close: 10 },
      { time: 2, open: 10, high: 15, low: 10, close: 15 },
      { time: 3, open: 15, high: 18, low: 14, close: 18 },
      { time: 4, open: 18, high: 20, low: 11, close: 12 },
    ];
    const res = evaluatePineScript(candles, parsed);
    expect(res.error).toBeUndefined();
    expect(res.plots.length).toBe(1);
    expect(res.hlines.length).toBe(2);
  });

  it("parses and evaluates exact user-provided LuxAlgo MACD forecasting script", () => {
    const exactLuxAlgoScript = `
// This work is licensed under a Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0) https://creativecommons.org/licenses/by-nc-sa/4.0/
// © LuxAlgo

//@version=5
indicator("MACD Based Price Forecasting [LuxAlgo]", "LuxAlgo - MACD Based Price Forecasting", overlay = true, max_lines_count = 500)
//---------------------------------------------------------------------------------------------------------------------}
//Settings
//---------------------------------------------------------------------------------------------------------------------{
//MACD
fast = input.int(12, 'Fast Length', minval = 2, group = 'MACD')
slow = input.int(26, 'Slow Length', minval = 2, group = 'MACD')
sigLen = input.int(9, 'Signal Length', minval = 2, group = 'MACD')

trend = input.string('MACD - Signal', 'Trend Determination',
  options = ['MACD', 'MACD - Signal'],
  group = 'MACD')

//Forecast
maxMemory = input.int(50, 'Maximum Memory', minval = 2, group = 'Forecast')
fcast = input.int(100, 'Forecasting Length', minval = 1, group = 'Forecast')
upPer = input(80, 'Top Percentile', group = 'Forecast')
midPer = input(50, 'Average Percentage', group = 'Forecast')
dnPer = input(20, 'Bottom Percentile', group = 'Forecast')

//Style
upLine = input(#3179f5, 'Line Color', inline = 'css', group = 'Style')
dnLine = input(#ff5d00, '', inline = 'css', group = 'Style')

upArea = input(color.new(#3179f5, 80), 'Areas', inline = 'areas', group = 'Style')
dnArea = input(color.new(#ff5d00, 80), '', inline = 'areas', group = 'Style')

signalArea = input(true, 'Signal Area', inline = 'signal', group = 'Style')
signalBull = input(color.new(#089981, 50), '', inline = 'signal', group = 'Style')
signalBear = input(color.new(#f23645, 50), '', inline = 'signal', group = 'Style')

//---------------------------------------------------------------------------------------------------------------------}
//Types
//---------------------------------------------------------------------------------------------------------------------{
type vector
    array<float> id

type holder
    array<vector> id

//---------------------------------------------------------------------------------------------------------------------}
//Methods/Functions
//---------------------------------------------------------------------------------------------------------------------{
n = bar_index

method populate(holder get_holder, idx, init_price)=>
    if get_holder.id.size() < idx+1
        get_holder.id.push(vector.new(array.new<float>(0)))

    get_holder.id.get(idx).id.unshift(close - init_price)
    
    //Remove last element if array size is greater than specified limit
    if get_holder.id.get(idx).id.size() > maxMemory
        get_holder.id.get(idx).id.pop()

method forecast(holder get_holder, idx, init_price, upper_coords, mid_coords, lower_coords)=>
    max_horizon = get_holder.id.size()

    x = 0
    for i = idx-1 to math.min(idx+fcast, max_horizon-1)
        get_vector = get_holder.id.get(i)
        
        //Compute forecasts
        upper = init_price + get_vector.id.percentile_linear_interpolation(upPer)
        mid   = init_price + get_vector.id.percentile_linear_interpolation(midPer)
        lower = init_price + get_vector.id.percentile_linear_interpolation(dnPer)

        //Append coordinates
        upper_coords.push(chart.point.from_index(n+x, upper))
        mid_coords.push(chart.point.from_index(n+x, mid))
        lower_coords.unshift(chart.point.from_index(n+x, lower))
        x += 1

//---------------------------------------------------------------------------------------------------------------------}
//Calculations
//---------------------------------------------------------------------------------------------------------------------{
var memory = map.new<int, holder>()
var up_idx = 0
var dn_idx = 0
var uptrend_init_price = close
var downtrend_init_price = close

//Compute MACD
[macd, signal, _] = ta.macd(close, fast, slow, sigLen)

//Populate map
if barstate.isfirst
    memory.put(1, holder.new(array.new<vector>(0)))
    memory.put(0, holder.new(array.new<vector>(0)))

trigger = switch trend
    'MACD' => ta.cross(macd, 0)
    => ta.cross(macd, signal)

uptrend = trend == 'MACD' ? macd > 0 : macd > signal
downtrend = trend == 'MACD' ? macd < 0 : macd < signal

//Reference prices
uptrend_init_price := uptrend and not uptrend[1] ? close : uptrend_init_price
downtrend_init_price := downtrend and not downtrend[1] ? close : downtrend_init_price
init_value = uptrend ? uptrend_init_price : downtrend_init_price

//Uptrend
if uptrend
    get_holder = memory.get(1)
    get_holder.populate(up_idx, uptrend_init_price)

//Downtrend
if downtrend
    get_holder = memory.get(0)
    get_holder.populate(dn_idx, downtrend_init_price)

//Indices
up_idx := not uptrend ? 0 : up_idx + 1
dn_idx := not downtrend ? 0 : dn_idx + 1

if trigger
    upper_coords = array.new<chart.point>(0)
    mid_coords = array.new<chart.point>(0)
    lower_coords = array.new<chart.point>(0)

    if uptrend
        get_holder = memory.get(1)
        get_holder.forecast(up_idx, uptrend_init_price, upper_coords, mid_coords, lower_coords)
    else
        get_holder = memory.get(0)
        get_holder.forecast(dn_idx, downtrend_init_price, upper_coords, mid_coords, lower_coords)
    
    polyline.delete(polyline.new(mid_coords, line_color = uptrend ? upLine : dnLine)[1])

    //Area
    polyline.delete(polyline.new(array.concat(upper_coords, lower_coords)
      , line_color = na
      , fill_color = uptrend ? upArea : dnArea)
      [1])

//---------------------------------------------------------------------------------------------------------------------}
//Plots
//---------------------------------------------------------------------------------------------------------------------{
init_plot = plot(init_value, "Reference Price", init_value != init_value[1] ? na : color.gray)
price_plot = plot(close, editable = false, display = display.none)

top_css = not signalArea ? na : uptrend ? signalBull : color.new(chart.bg_color, 100)
btm_css = not signalArea ? na : uptrend ? color.new(chart.bg_color, 100) : signalBear

//Price to Reference Area
fill(init_plot, price_plot,
  top_value = math.max(close, uptrend ? uptrend_init_price : downtrend_init_price),
  bottom_value = math.min(close, uptrend ? uptrend_init_price : downtrend_init_price),
  top_color = top_css,
  bottom_color = btm_css)
    `;

    const parsed = parsePineScript(exactLuxAlgoScript);
    expect(parsed.errors.length).toBe(0);
    expect(parsed.title).toBe("MACD Based Price Forecasting [LuxAlgo]");
    expect(parsed.overlay).toBe(true);

    // Grouped and options inputs
    const fastInp = parsed.inputs.find((i) => i.id === "fast");
    expect(fastInp?.group).toBe("MACD");
    expect(fastInp?.min).toBe(2);

    const trendInp = parsed.inputs.find((i) => i.id === "trend");
    expect(trendInp?.group).toBe("MACD");
    expect(trendInp?.options).toEqual(["MACD", "MACD - Signal"]);

    const fcastInp = parsed.inputs.find((i) => i.id === "fcast");
    expect(fcastInp?.group).toBe("Forecast");
    expect(fcastInp?.defval).toBe(100);

    // Plots and display.none
    expect(parsed.plots.length).toBe(2);
    expect(parsed.plots[0]?.title).toBe("Reference Price");
    expect(parsed.plots[0]?.displayNone).toBeFalsy();
    expect(parsed.plots[1]?.title).toBe("price_plot");
    expect(parsed.plots[1]?.displayNone).toBe(true);

    // Polylines and fills parsed
    expect(parsed.hasForecastPolyline).toBe(true);
    expect(parsed.fills.length).toBe(1);

    const candles: CandleData[] = [
      { time: 100, open: 100, high: 105, low: 98, close: 102 },
      { time: 200, open: 102, high: 108, low: 101, close: 107 },
      { time: 300, open: 107, high: 110, low: 105, close: 109 },
    ];
    const res = evaluatePineScript(candles, parsed, { fcast: 10 });
    expect(res.error).toBeUndefined();
    expect(res.plots.length).toBe(2);
    expect(res.plots[0]?.values.length).toBeGreaterThan(0);

    // Forecast polyline cone, boundaries, and mid projections
    expect(res.polylines).toBeDefined();
    expect(res.polylines?.length).toBeGreaterThanOrEqual(2);
    const midPoly = res.polylines?.find((p) => p.id === "forecast_mid");
    expect(midPoly).toBeDefined();
    expect(midPoly?.points.length).toBe(11); // 0 to 10
    expect(midPoly?.points[midPoly.points.length - 1]?.index).toBe(12); // (n-1) + 10 = 2 + 10 = 12

    const areaPoly = res.polylines?.find((p) => p.id === "forecast_area");
    expect(areaPoly).toBeDefined();
    expect(areaPoly?.fillColor).toBeDefined();

    // Price-to-reference signalArea fill is generated for authentic TradingView rendering
    expect(res.fills).toBeDefined();
    expect(res.fills?.length).toBeGreaterThan(0);
    expect(res.fills?.[0]?.id).toBe("fill_price_ref");
  });


  it("evaluates ta.rma, ta.crossover, nz, and math functions with plot styles", () => {
    const code = `
      //@version=5
      indicator("Advanced Pine TA", overlay=false)
      rmaVal = ta.rma(close, 2)
      safeVal = nz(rmaVal, 0)
      maxVal = math.max(high, safeVal)
      isCross = ta.crossover(close, rmaVal)
      plot(safeVal, "RMA Line", color.blue, 2, style=plot.style_line)
      plot(maxVal, "Histogram", color.green, 1, style=plot.style_columns)
    `;
    const parsed = parsePineScript(code);
    expect(parsed.plots.length).toBe(2);
    expect(parsed.plots[0]?.style).toBe("line");
    expect(parsed.plots[1]?.style).toBe("columns");

    const candles: CandleData[] = [
      { time: 100, open: 10, high: 15, low: 9, close: 10 },
      { time: 200, open: 11, high: 22, low: 10, close: 20 },
      { time: 300, open: 21, high: 35, low: 19, close: 30 },
    ];
    const res = evaluatePineScript(candles, parsed);
    expect(res.error).toBeUndefined();
    expect(res.plots.length).toBe(2);
    expect(res.plots[0]?.style).toBe("line");
    expect(res.plots[1]?.style).toBe("columns");
    expect(res.plots[0]?.values.length).toBe(3);
    // bar 0: rma is NaN, nz replaces with 0
    expect(res.plots[0]?.values[0]?.value).toBe(0);
    // bar 1: sma(10, 20) = 15
    expect(res.plots[0]?.values[1]?.value).toBe(15);
    // bar 2: 0.5 * 30 + 0.5 * 15 = 22.5
    expect(res.plots[0]?.values[2]?.value).toBe(22.5);
  });

  it("generates valid Pine Script for built-in indicators", () => {
    const smaCode = getIndicatorPineScript("SMA", { period: 50, color: "#f0b90b", lineWidth: 3 });
    const parsedSMA = parsePineScript(smaCode);
    expect(parsedSMA.title).toBe("Simple Moving Average");
    expect(parsedSMA.overlay).toBe(true);
    expect(parsedSMA.inputs[0]?.defval).toBe(50);
    expect(parsedSMA.plots[0]?.color).toBe("#f0b90b");

    const rsiCode = getIndicatorPineScript("RSI", { period: 21, color: "#ab47bc" });
    const parsedRSI = parsePineScript(rsiCode);
    expect(parsedRSI.overlay).toBe(false);
    expect(parsedRSI.inputs[0]?.defval).toBe(21);
    expect(parsedRSI.hlines.length).toBe(2);
  });

  it("parses and evaluates exact user-provided LuxAlgo Liquidity Sweeps script with boxes and lines", () => {
    const liquiditySweepsCode = `
// This work is licensed under a Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0) https://creativecommons.org/licenses/by-nc-sa/4.0/
// © LuxAlgo

//@version=5
indicator( 'Liquidity Sweeps [LuxAlgo]'
         , 'LuxAlgo - Liquidity Sweeps'
         ,  max_lines_count=500
         ,  max_boxes_count=500
         ,  overlay=true
         )

len    = input.int(5, 'Swings', minval=1, group='Liquidity Sweeps')
opt    = input.string('Only Wicks', 'options'
       , options=['Only Wicks', 'Only Outbreaks & Retest', 'Wicks + Outbreaks & Retest'], group='Liquidity Sweeps')

colBl  = input.color(#089981, 'Bull ', group='Liquidity Sweeps', inline='c1')
colBr  = input.color(#f23645, 'Bear' , group='Liquidity Sweeps', inline='c2')
colBl2 = input.color(#08998180,  ''  , group='Liquidity Sweeps', inline='c1')
colBr2 = input.color(#f2364580,  ''  , group='Liquidity Sweeps', inline='c2')

extend = input.bool(true, 'Extend', group='Sweep Area') 
maxB   = input.int(300, 'Max bars', minval=1, maxval=5000, group='Sweep Area')
colBl3 = input.color(#08998141, 'Bull ', group='Sweep Area')
colBr3 = input.color(#f2364541, 'Bear' , group='Sweep Area')
    `;

    const parsed = parsePineScript(liquiditySweepsCode);
    expect(parsed.title).toBe("Liquidity Sweeps [LuxAlgo]");
    expect(parsed.overlay).toBe(true);
    expect(parsed.hasBoxesOrLines).toBe(true);
    expect(parsed.isLiquiditySweeps).toBe(true);
    expect(parsed.inputs.length).toBe(10);
    expect(parsed.inputs.find((i) => i.id === "len")?.defval).toBe(5);
    expect(parsed.inputs.find((i) => i.id === "opt")?.defval).toBe("Only Wicks");

    // Generate oscillating candles with clear swing highs and wick sweeps
    const candles: CandleData[] = [];
    for (let i = 0; i < 40; i++) {
      const base = 100 + (i === 10 ? 20 : i === 22 ? 22 : 0) - (i === 15 ? 15 : i === 28 ? 16 : 0);
      candles.push({
        time: 1000 + i * 60,
        open: base,
        high: base + (i === 22 ? 3 : 2),
        low: base - 2,
        close: base + (i === 22 ? -1 : 1), // bar 22 wicks above bar 10's high but closes below -> bearish sweep!
      });
    }

    const res = evaluatePineScript(candles, parsed, { len: 5 });
    expect(res.error).toBeUndefined();
    expect(res.boxes).toBeDefined();
    expect(res.lines).toBeDefined();
    expect(res.boxes!.length).toBeGreaterThan(0);
    expect(res.lines!.length).toBeGreaterThan(0);

    const sweepBox = res.boxes![0];
    expect(sweepBox?.bgColor).toBeDefined();
    expect(sweepBox?.left).toBeDefined();
    expect(sweepBox?.top).toBeDefined();
  });

  it("parses user-provided LuxAlgo Liquidity Swings script", async () => {
    const fullCode = `
// This work is licensed under a Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0) https://creativecommons.org/licenses/by-nc-sa/4.0/
// © LuxAlgo

//@version=5
indicator("Liquidity Swings [LuxAlgo]"
  , overlay = true
  , max_lines_count = 500
  , max_labels_count = 500
  , max_boxes_count = 500)
//------------------------------------------------------------------------------
//Settings
//-----------------------------------------------------------------------------{
length = input(14, 'Pivot Lookback')

area = input.string('Wick Extremity', 'Swing Area', options = ['Wick Extremity', 'Full Range'])

intraPrecision = input(false, 'Intrabar Precision', inline = 'intrabar')
intrabarTf = input.timeframe('1', ''              , inline = 'intrabar')

filterOptions = input.string('Count', 'Filter Areas By', options = ['Count', 'Volume'], inline = 'filter')
filterValue   = input.float(0, ''                                            , inline = 'filter')

//Style
showTop      = input(true, 'Swing High'              , inline = 'top', group = 'Style')
topCss       = input(color.red, ''                   , inline = 'top', group = 'Style')
topAreaCss   = input(color.new(color.red, 50), 'Area', inline = 'top', group = 'Style')

showBtm      = input(true, 'Swing Low'                , inline = 'btm', group = 'Style')
btmCss       = input(color.teal, ''                   , inline = 'btm', group = 'Style')
btmAreaCss   = input(color.new(color.teal, 50), 'Area', inline = 'btm', group = 'Style')

labelSize = input.string('Tiny', 'Labels Size', options = ['Tiny', 'Small', 'Normal'], group = 'Style')

//-----------------------------------------------------------------------------}
//Functions
//-----------------------------------------------------------------------------{
n = bar_index

get_data()=> [high, low, volume]

[h, l, v] = request.security_lower_tf(syminfo.tickerid, intrabarTf, get_data())

get_counts(condition, top, btm)=>
    var count = 0
    var vol = 0.

    if condition
        count := 0
        vol := 0.
    else
        if intraPrecision
            if n > length
                if array.size(v[length]) > 0
                    for [index, element] in v[length]
                        vol += array.get(l[length], index) < top and array.get(h[length], index) > btm ? element : 0
        else
            vol += low[length] < top and high[length] > btm ? volume[length] : 0
        
        count += low[length] < top and high[length] > btm ? 1 : 0

    [count, vol]

set_label(count, vol, x, y, css, lbl_style)=>
    var label lbl = na
    var label_size = switch labelSize
        'Tiny' => size.tiny
        'Small' => size.small
        'Normal' => size.normal

    target = switch filterOptions
        'Count'  => count
        'Volume' => vol

    if ta.crossover(target, filterValue)
        lbl := label.new(x, y, str.tostring(vol, format.volume)
          , style = lbl_style
          , size = label_size
          , color = #00000000
          , textcolor = css)

    if target > filterValue
        label.set_text(lbl, str.tostring(vol, format.volume))

set_level(condition, crossed, value, count, vol, css)=>
    var line lvl = na

    target = switch filterOptions
        'Count'  => count
        'Volume' => vol

    if condition
        if target[1] < filterValue[1]
            line.delete(lvl[1])
        else if not crossed[1]
            line.set_x2(lvl, n - length)

        lvl := line.new(n - length, value, n, value
          , color = na)

    if not crossed[1]
        line.set_x2(lvl, n+3)
    
    if crossed and not crossed[1]
        line.set_x2(lvl, n)
        line.set_style(lvl, line.style_dashed)

    if target > filterValue
        line.set_color(lvl, css)

set_zone(condition, x, top, btm, count, vol, css)=>
    var box bx = na

    target = switch filterOptions
        'Count'  => count
        'Volume' => vol

    if ta.crossover(target, filterValue)
        bx := box.new(x, top, x + count, btm
          , border_color = na
          , bgcolor = css)
    
    if target > filterValue
        box.set_right(bx, x + count)

//-----------------------------------------------------------------------------}
//Global variables
//-----------------------------------------------------------------------------{
//Pivot high
var float ph_top = na
var float ph_btm = na
var bool  ph_crossed = na
var       ph_x1 = 0
var box   ph_bx = box.new(na,na,na,na
  , bgcolor = color.new(topAreaCss, 80)
  , border_color = na)

//Pivot low
var float pl_top = na
var float pl_btm = na
var bool  pl_crossed = na
var       pl_x1 = 0
var box   pl_bx = box.new(na,na,na,na
  , bgcolor = color.new(btmAreaCss, 80)
  , border_color = na)

//-----------------------------------------------------------------------------}
//Display pivot high levels/blocks
//-----------------------------------------------------------------------------{
ph = ta.pivothigh(length, length)

//Get ph counts
[ph_count, ph_vol] = get_counts(ph, ph_top, ph_btm)

//Set ph area and level
if ph and showTop
    ph_top := high[length]
    ph_btm := switch area 
        'Wick Extremity' => math.max(close[length], open[length])
        'Full Range' => low[length]
    
    ph_x1 := n - length
    ph_crossed := false

    box.set_lefttop(ph_bx, ph_x1, ph_top)
    box.set_rightbottom(ph_bx, ph_x1, ph_btm)
else
    ph_crossed := close > ph_top ? true : ph_crossed
    
    if ph_crossed
        box.set_right(ph_bx, ph_x1)
    else
        box.set_right(ph_bx, n+3)

if showTop
    //Set ph zone
    set_zone(ph, ph_x1, ph_top, ph_btm, ph_count, ph_vol, topAreaCss)

    //Set ph level
    set_level(ph, ph_crossed, ph_top, ph_count, ph_vol, topCss)

    //Set ph label
    set_label(ph_count, ph_vol, ph_x1, ph_top, topCss, label.style_label_down)

//-----------------------------------------------------------------------------}
//Display pivot low levels/blocks
//-----------------------------------------------------------------------------{
pl = ta.pivotlow(length, length)

//Get pl counts
[pl_count, pl_vol] = get_counts(pl, pl_top, pl_btm)

//Set pl area and level
if pl and showBtm
    pl_top := switch area 
        'Wick Extremity' => math.min(close[length], open[length])
        'Full Range' => high[length] 
    pl_btm := low[length]
    
    pl_x1 := n - length
    pl_crossed := false
    
    box.set_lefttop(pl_bx, pl_x1, pl_top)
    box.set_rightbottom(pl_bx, pl_x1, pl_btm)
else
    pl_crossed := close < pl_btm ? true : pl_crossed

    if pl_crossed
        box.set_right(pl_bx, pl_x1)
    else
        box.set_right(pl_bx, n+3)

if showBtm
    //Set pl zone
    set_zone(pl, pl_x1, pl_top, pl_btm, pl_count, pl_vol, btmAreaCss)
    
    //Set pl level
    set_level(pl, pl_crossed, pl_btm, pl_count, pl_vol, btmCss)

    //Set pl labels
    set_label(pl_count, pl_vol, pl_x1, pl_btm, btmCss, label.style_label_up)

//-----------------------------------------------------------------------------}
    `;

    const parsed = parsePineScript(fullCode);
    console.log("FULL PARSED LIQUIDITY SWINGS:", {
      title: parsed.title,
      overlay: parsed.overlay,
      inputsCount: parsed.inputs.length,
      hasBoxesOrLines: parsed.hasBoxesOrLines,
      errors: parsed.errors,
      assignments: parsed.assignments.length,
    });

    const candles: CandleData[] = [];
    for (let i = 0; i < 50; i++) {
      const base = 100 + Math.sin(i / 3) * 10;
      candles.push({
        time: 1000 + i * 60,
        open: base,
        high: base + 3,
        low: base - 3,
        close: base + 1,
        volume: 1000,
      });
    }

    const res = evaluatePineScript(candles, parsed);
    expect(parsed.errors.length).toBe(0);
    expect(parsed.isLiquiditySwings).toBe(true);
    expect(parsed.inputs.find((i) => i.id === "filterValue")?.defval).toBe(0);
    expect(parsed.inputs.find((i) => i.id === "intrabarTf")?.defval).toBe("1");
    expect(res).toBeDefined();
    expect(res.boxes?.length).toBeGreaterThan(0);
    expect(res.lines?.length).toBeGreaterThan(0);
  });

  it("runs PineTS directly on user Pine Script with custom inputs and drawing extraction", async () => {
    const { runPineTS } = await import("../lib/pinescript/pineTSRunner");
    const script = `//@version=5
indicator("Custom Universal Test", overlay=true)
len = input.int(5, "Lookback")
ph = ta.pivothigh(high, len, len)
if not na(ph)
    line.new(bar_index - len, ph, bar_index, ph, color=color.purple)
    box.new(bar_index - len, ph, bar_index, ph - 2, bgcolor=color.new(color.purple, 80))
    label.new(bar_index - len, ph, "PIVOT", style=label.style_label_down)
plot(ta.sma(close, len))
`;

    const candles: CandleData[] = [];
    for (let i = 0; i < 40; i++) {
      const b = 100 + Math.sin(i / 3) * 10;
      candles.push({ time: 1000 + i * 60, open: b, high: b + 2, low: b - 2, close: b + 1, volume: 1500 });
    }

    let res: any = null;
    try {
      res = await runPineTS(candles, script, { len: 5 });
    } catch (e) {
      console.error("RUNPINETS ERROR:", e);
    }
    console.log("TEST 9 RESULT:", {
      boxes: res?.boxes?.length,
      lines: res?.lines?.length,
      labels: res?.labels?.length,
      sampleBox: res?.boxes?.[0],
      sampleLabel: res?.labels?.[0],
    });
    expect(res).not.toBeNull();
    expect(res?.plots).toBeDefined();
    expect(res?.plots.length).toBeGreaterThan(0);
    expect(res?.boxes).toBeDefined();
    expect(res?.lines).toBeDefined();
    expect(res?.labels).toBeDefined();
  });

  it("automatically transpiles and runs Pine Script v4 indicators with untyped inputs and legacy builtins", async () => {
    const { runPineTS } = await import("../lib/pinescript/pineTSRunner");
    const v4Script = `//@version=4
study("Divergence Test v4", overlay=true)
prd = input(defval = 5, title = "Pivot Period", minval = 1, maxval = 50)
src = input(defval = "Close", title = "Source", options = ["Close", "High/Low"])
showlines = input(defval = true, title = "Show Lines")
col = input(defval = color.yellow, title = "Color")

ph = pivothigh(high, prd, prd)
var all_divs = array.new_int(10)
if not na(ph)
    array.set(all_divs, 0, prd)
    ln = showlines ? line.new(bar_index - array.get(all_divs, 0), close[array.get(all_divs, 0)], bar_index, close, color = col) : na
    label.new(bar_index, high, "TEST\\nLABEL\\n3", style = label.style_label_down, color = col)
plot(sma(close, prd))
`;
    const parsed = parsePineScript(v4Script);
    expect(parsed.title).toBe("Divergence Test v4");
    expect(parsed.overlay).toBe(true);
    expect(parsed.inputs.length).toBeGreaterThanOrEqual(4);

    const candles: CandleData[] = [];
    for (let i = 0; i < 40; i++) {
      const b = 100 + Math.sin(i / 3) * 10;
      candles.push({ time: 1000 + i * 60, open: b, high: b + 2, low: b - 2, close: b + 1, volume: 1500 });
    }

    const res = await runPineTS(candles, v4Script);
    expect(res).not.toBeNull();
    expect(res?.lines).toBeDefined();
    expect(res?.labels).toBeDefined();
    expect(res?.labels?.length).toBeGreaterThan(0);
    expect(res?.labels?.[0]?.text).toContain("TEST\nLABEL");
  });

  it("pre-loads 4 user-provided custom indicators into storage and samples", async () => {
    const { getCustomPineIndicators } = await import("../lib/pinescript/storage");
    const { PINE_SAMPLES } = await import("../lib/pinescript/samples");

    const custom = getCustomPineIndicators();
    expect(custom.length).toBeGreaterThanOrEqual(4);

    const macdForecast = custom.find((c: any) => c.id === "pine_lux_macd_forecast");
    expect(macdForecast).toBeDefined();
    expect(macdForecast?.name).toContain("MACD Based Price Forecasting");
    expect(macdForecast?.overlay).toBe(true);

    const sweeps = custom.find((c: any) => c.id === "pine_lux_liquidity_sweeps");
    expect(sweeps).toBeDefined();
    expect(sweeps?.name).toContain("Liquidity Sweeps");
    expect(sweeps?.overlay).toBe(true);

    const swings = custom.find((c: any) => c.id === "pine_lux_liquidity_swings");
    expect(swings).toBeDefined();
    expect(swings?.name).toContain("Liquidity Swings");
    expect(swings?.overlay).toBe(true);

    const alphaTrend = custom.find((c: any) => c.id === "pine_alphatrend");
    expect(alphaTrend).toBeDefined();
    expect(alphaTrend?.name).toBe("AlphaTrend");
    expect(alphaTrend?.overlay).toBe(true);

    // Verify PINE_SAMPLES also includes all 4
    expect(PINE_SAMPLES.some((s: any) => s.name.includes("MACD Based Price Forecasting"))).toBe(true);
    expect(PINE_SAMPLES.some((s: any) => s.name.includes("Liquidity Sweeps"))).toBe(true);
    expect(PINE_SAMPLES.some((s: any) => s.name.includes("Liquidity Swings"))).toBe(true);
    expect(PINE_SAMPLES.some((s: any) => s.name === "AlphaTrend")).toBe(true);
  });
});
