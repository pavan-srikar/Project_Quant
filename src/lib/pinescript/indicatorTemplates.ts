import type { IndicatorType } from "../indicators/types";
import type { IndicatorSettings } from "../../hooks/useIndicatorSettings";
import { getCustomPineIndicators } from "./storage";

export function getIndicatorPineScript(
  type: IndicatorType,
  settings?: IndicatorSettings,
): string {
  if (type.startsWith("pine_")) {
    const custom = getCustomPineIndicators().find((c) => c.id === type);
    if (custom) return custom.code;
  }

  const p = settings?.period;
  const col = settings?.color;
  const lw = settings?.lineWidth ?? 2;

  switch (type) {
    case "SMA": {
      const len = p ?? 20;
      const color = col || "#2962ff";
      return `//@version=5\nindicator("Simple Moving Average", overlay=true)\n\nlength = input.int(${len}, "Length", minval=1)\nsrc = input(close, "Source")\n\nsmaVal = ta.sma(src, length)\nplot(smaVal, "SMA", color=${color}, linewidth=${lw})`;
    }
    case "EMA": {
      const len = p ?? 20;
      const color = col || "#2962ff";
      if (settings?.emaSlots && settings.emaSlots.some((s) => s.enabled)) {
        const lines: string[] = [
          `//@version=5`,
          `indicator("Multi-EMA", overlay=true)`,
          ``,
        ];
        settings.emaSlots.forEach((slot, i) => {
          if (slot.enabled) {
            lines.push(
              `len${i + 1} = input.int(${slot.period}, "EMA ${i + 1} Length")`,
              `plot(ta.ema(close, len${i + 1}), "EMA ${i + 1}", color=${slot.color}, linewidth=${lw})`,
            );
          }
        });
        return lines.join("\n");
      }
      return `//@version=5\nindicator("Exponential Moving Average", overlay=true)\n\nlength = input.int(${len}, "Length", minval=1)\nsrc = input(close, "Source")\n\nemaVal = ta.ema(src, length)\nplot(emaVal, "EMA", color=${color}, linewidth=${lw})`;
    }
    case "RSI": {
      const len = p ?? 14;
      const color = col || "#7e57c2";
      const ob = settings?.overbought ?? 70;
      const os = settings?.oversold ?? 30;
      return `//@version=5\nindicator("Relative Strength Index", overlay=false)\n\nlength = input.int(${len}, "Length", minval=1)\nsrc = input(close, "Source")\n\nrsiVal = ta.rsi(src, length)\nplot(rsiVal, "RSI", color=${color}, linewidth=${lw})\nhline(${ob}, "Overbought", color=#787b86)\nhline(${os}, "Oversold", color=#787b86)`;
    }
    case "MACD": {
      const fast = settings?.fast ?? 12;
      const slow = settings?.slow ?? 26;
      const signal = settings?.signal ?? 9;
      const macdCol = col || "#2962ff";
      const sigCol = settings?.signalColor || "#ff9800";
      return `//@version=5\nindicator("Moving Average Convergence Divergence", overlay=false)\n\nfastLen = input.int(${fast}, "Fast Length")\nslowLen = input.int(${slow}, "Slow Length")\nsigLen = input.int(${signal}, "Signal Length")\n\n[macdLine, signalLine, hist] = ta.macd(close, fastLen, slowLen, sigLen)\nplot(macdLine, "MACD", color=${macdCol}, linewidth=${lw})\nplot(signalLine, "Signal", color=${sigCol}, linewidth=1)\nplot(hist, "Histogram", color=#26a69a, linewidth=1)`;
    }
    case "BOLL": {
      const len = p ?? 20;
      const mult = settings?.stdDev ?? 2.0;
      const basisCol = col || "#ff9800";
      const upperCol = settings?.upperColor || "#2962ff";
      const lowerCol = settings?.lowerColor || "#2962ff";
      return `//@version=5\nindicator("Bollinger Bands", overlay=true)\n\nlength = input.int(${len}, "Length")\nmult = input.float(${mult}, "StdDev")\nsrc = input(close, "Source")\n\nbasis = ta.sma(src, length)\ndev = mult * ta.stdev(src, length)\nupper = basis + dev\nlower = basis - dev\n\nplot(basis, "Basis", color=${basisCol})\nplot(upper, "Upper", color=${upperCol})\nplot(lower, "Lower", color=${lowerCol})`;
    }
    case "ATR": {
      const len = p ?? 14;
      const color = col || "#ab47bc";
      return `//@version=5\nindicator("Average True Range", overlay=false)\n\nlength = input.int(${len}, "Length")\natrVal = ta.atr(length)\nplot(atrVal, "ATR", color=${color}, linewidth=${lw})`;
    }
    case "STOCH": {
      const k = settings?.kPeriod ?? 14;
      const d = settings?.dPeriod ?? 3;
      const color = col || "#2962ff";
      return `//@version=5\nindicator("Stochastic", overlay=false)\n\nkPeriod = input.int(${k}, "%K Length")\ndPeriod = input.int(${d}, "%D Smoothing")\n\nlowestLow = ta.lowest(low, kPeriod)\nhighestHigh = ta.highest(high, kPeriod)\nkVal = 100 * (close - lowestLow) / (highestHigh - lowestLow)\ndVal = ta.sma(kVal, dPeriod)\n\nplot(kVal, "%K", color=${color})\nplot(dVal, "%D", color=#ff9800)\nhline(80, "Overbought", color=#787b86)\nhline(20, "Oversold", color=#787b86)`;
    }
    case "CCI": {
      const len = p ?? 20;
      const color = col || "#2962ff";
      return `//@version=5\nindicator("Commodity Channel Index", overlay=false)\n\nlength = input.int(${len}, "Length")\ntypical = (high + low + close) / 3\ncciVal = (typical - ta.sma(typical, length)) / (0.015 * ta.stdev(typical, length))\nplot(cciVal, "CCI", color=${color}, linewidth=${lw})\nhline(100, "Overbought", color=#787b86)\nhline(-100, "Oversold", color=#787b86)`;
    }
    case "WR": {
      const len = p ?? 14;
      const color = col || "#2962ff";
      return `//@version=5\nindicator("Williams %R", overlay=false)\n\nlength = input.int(${len}, "Length")\nhighestHigh = ta.highest(high, length)\nlowestLow = ta.lowest(low, length)\nwrVal = -100 * (highestHigh - close) / (highestHigh - lowestLow)\nplot(wrVal, "%R", color=${color}, linewidth=${lw})\nhline(-20, "Upper", color=#787b86)\nhline(-80, "Lower", color=#787b86)`;
    }
    case "VOL": {
      return `//@version=5\nindicator("Volume", overlay=false)\nplot(volume, "Volume", color=${col || "#2962ff"}, linewidth=${lw})`;
    }
    case "VWAP": {
      return `//@version=5\nindicator("Volume Weighted Average Price", overlay=true)\nplot(hlc3, "VWAP", color=${col || "#ff9800"}, linewidth=${lw})`;
    }
    default: {
      return `//@version=5\nindicator("${type}", overlay=true)\nplot(close, "${type}", color=${col || "#2962ff"}, linewidth=${lw})`;
    }
  }
}
