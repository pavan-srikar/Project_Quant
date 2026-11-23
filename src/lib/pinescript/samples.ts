import {
  MACD_FORECAST_CODE,
  LIQUIDITY_SWEEPS_CODE,
  LIQUIDITY_SWINGS_CODE,
  ALPHA_TREND_CODE,
} from "./preloaded";

export interface PineSample {
  name: string;
  description: string;
  code: string;
}

export const PINE_SAMPLES: PineSample[] = [
  {
    name: "MACD Based Price Forecasting [LuxAlgo]",
    description: "Forecasts future price trajectories using MACD regime shifts and historical percentiles",
    code: MACD_FORECAST_CODE,
  },
  {
    name: "Liquidity Sweeps [LuxAlgo]",
    description: "Detects swing highs and lows and identifies liquidity sweeps and breakout retests",
    code: LIQUIDITY_SWEEPS_CODE,
  },
  {
    name: "Liquidity Swings [LuxAlgo]",
    description: "Institutional liquidity swing zones with order count, volume delta labels, and level lines",
    code: LIQUIDITY_SWINGS_CODE,
  },
  {
    name: "AlphaTrend",
    description: "ATR and MFI/RSI-based trend following overlay with trailing stops and BUY/SELL signals",
    code: ALPHA_TREND_CODE,
  },
  {
    name: "Dual SMA Crossover",
    description: "Trend-following overlay plotting fast (9) and slow (21) Simple Moving Averages",
    code: `//@version=5
indicator("Dual SMA Crossover", overlay=true)

fastLength = input.int(9, "Fast SMA Length")
slowLength = input.int(21, "Slow SMA Length")

fastSMA = ta.sma(close, fastLength)
slowSMA = ta.sma(slowLength)

plot(fastSMA, "Fast SMA", color.yellow, 2)
plot(slowSMA, "Slow SMA", color.blue, 2)`,
  },
  {
    name: "Custom RSI with Levels",
    description: "Sub-chart oscillator with custom length and overbought/oversold levels",
    code: `//@version=5
indicator("Custom RSI", overlay=false)

len = input.int(14, "RSI Length")
rsiVal = ta.rsi(close, len)

plot(rsiVal, "RSI", color.purple, 2)
hline(70, "Overbought", color.red)
hline(30, "Oversold", color.green)
hline(50, "Midline", color.gray)`,
  },
  {
    name: "ATR Trailing Bands",
    description: "Volatility envelope around close price based on Average True Range",
    code: `//@version=5
indicator("ATR Trailing Bands", overlay=true)

period = input.int(14, "ATR Period")
multiplier = input.float(2.0, "Multiplier")

atrVal = ta.atr(period)
upper = close + atrVal * multiplier
lower = close - atrVal * multiplier

plot(upper, "Upper Band", color.red, 1)
plot(lower, "Lower Band", color.green, 1)`,
  },
  {
    name: "MACD Momentum",
    description: "Classic MACD indicator with fast, slow, and signal line calculation",
    code: `//@version=5
indicator("MACD Momentum", overlay=false)

fast = input.int(12, "Fast EMA")
slow = input.int(26, "Slow EMA")

macdLine = ta.ema(close, fast) - ta.ema(close, slow)
signalLine = ta.ema(macdLine, 9)

plot(macdLine, "MACD", color.blue, 2)
plot(signalLine, "Signal", color.orange, 1)
hline(0, "Zero Line", color.gray)`,
  },
];
