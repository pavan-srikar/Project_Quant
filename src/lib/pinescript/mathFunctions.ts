import type { CandleData } from "../indicators/types";

export function seriesSMA(src: number[], len: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  let sum = 0;
  for (let i = 0; i < src.length; i++) {
    const val = src[i] ?? 0;
    sum += val;
    if (i >= len) sum -= src[i - len] ?? 0;
    if (i >= len - 1) res[i] = sum / len;
  }
  return res;
}

export function seriesEMA(src: number[], len: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  if (src.length < len) return res;
  const k = 2 / (len + 1);
  let sum = 0;
  for (let i = 0; i < len; i++) sum += src[i] ?? 0;
  let prev = sum / len;
  res[len - 1] = prev;
  for (let i = len; i < src.length; i++) {
    const val = src[i] ?? 0;
    prev = val * k + prev * (1 - k);
    res[i] = prev;
  }
  return res;
}

export function seriesRSI(src: number[], len: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  if (src.length <= len) return res;
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= len; i++) {
    const curr = src[i] ?? 0;
    const prev = src[i - 1] ?? 0;
    const diff = curr - prev;
    if (diff > 0) avgGain += diff;
    else avgLoss += -diff;
  }
  avgGain /= len;
  avgLoss /= len;
  res[len] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = len + 1; i < src.length; i++) {
    const curr = src[i] ?? 0;
    const prev = src[i - 1] ?? 0;
    const diff = curr - prev;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (len - 1) + gain) / len;
    avgLoss = (avgLoss * (len - 1) + loss) / len;
    res[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return res;
}

export function seriesATR(candles: CandleData[], len: number): number[] {
  const res: number[] = new Array(candles.length).fill(NaN);
  if (candles.length < len || !candles[0]) return res;
  const trs: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    if (!c || !prev) continue;
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - prev.close), Math.abs(c.low - prev.close)));
  }
  let sum = 0;
  for (let i = 0; i < len; i++) sum += trs[i] ?? 0;
  let prevVal = sum / len;
  res[len - 1] = prevVal;
  for (let i = len; i < candles.length; i++) {
    const tr = trs[i] ?? 0;
    prevVal = (prevVal * (len - 1) + tr) / len;
    res[i] = prevVal;
  }
  return res;
}

export function seriesHighest(src: number[], len: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  for (let i = 0; i < src.length; i++) {
    if (i < len - 1) continue;
    let max = -Infinity;
    for (let j = 0; j < len; j++) {
      const v = src[i - j];
      if (v !== undefined && v > max) max = v;
    }
    res[i] = max;
  }
  return res;
}

export function seriesLowest(src: number[], len: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  for (let i = 0; i < src.length; i++) {
    if (i < len - 1) continue;
    let min = Infinity;
    for (let j = 0; j < len; j++) {
      const v = src[i - j];
      if (v !== undefined && v < min) min = v;
    }
    res[i] = min;
  }
  return res;
}

export function seriesMACD(
  src: number[],
  fastLen: number = 12,
  slowLen: number = 26,
  sigLen: number = 9,
): { macd: number[]; signal: number[]; hist: number[] } {
  const fastEMA = seriesEMA(src, fastLen);
  const slowEMA = seriesEMA(src, slowLen);
  const n = src.length;
  const macdLine = new Array<number>(n).fill(NaN);

  for (let i = 0; i < n; i++) {
    const f = fastEMA[i];
    const s = slowEMA[i];
    if (f !== undefined && s !== undefined && !isNaN(f) && !isNaN(s)) {
      macdLine[i] = f - s;
    }
  }

  // Filter valid macd numbers for signal line calculation
  const signalLine = seriesEMA(macdLine.map((v) => (isNaN(v) ? 0 : v)), sigLen);
  const hist = new Array<number>(n).fill(NaN);

  for (let i = 0; i < n; i++) {
    const m = macdLine[i];
    const s = signalLine[i];
    if (m !== undefined && s !== undefined && !isNaN(m) && !isNaN(s)) {
      hist[i] = m - s;
    }
  }

  return { macd: macdLine, signal: signalLine, hist };
}

export function seriesStdev(src: number[], len: number): number[] {
  const sma = seriesSMA(src, len);
  const res: number[] = new Array(src.length).fill(NaN);
  for (let i = len - 1; i < src.length; i++) {
    const mean = sma[i];
    if (mean === undefined || isNaN(mean)) continue;
    let sumSq = 0;
    for (let j = 0; j < len; j++) {
      const diff = (src[i - j] ?? 0) - mean;
      sumSq += diff * diff;
    }
    res[i] = Math.sqrt(sumSq / len);
  }
  return res;
}

export function seriesLag(src: number[], shift: number = 1): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  for (let i = shift; i < src.length; i++) {
    res[i] = src[i - shift] ?? NaN;
  }
  return res;
}

export function seriesCross(a: number[], b: number[]): boolean[] {
  const n = Math.min(a.length, b.length);
  const res: boolean[] = new Array(n).fill(false);
  for (let i = 1; i < n; i++) {
    const currA = a[i] ?? NaN;
    const prevA = a[i - 1] ?? NaN;
    const currB = b[i] ?? NaN;
    const prevB = b[i - 1] ?? NaN;
    if (isNaN(currA) || isNaN(prevA) || isNaN(currB) || isNaN(prevB)) continue;
    const crossUp = prevA <= prevB && currA > currB;
    const crossDown = prevA >= prevB && currA < currB;
    res[i] = crossUp || crossDown;
  }
  return res;
}

export function seriesRMA(src: number[], len: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  if (src.length < len || len <= 0) return res;
  const alpha = 1 / len;
  let sum = 0;
  for (let i = 0; i < len; i++) sum += src[i] ?? 0;
  let prev = sum / len;
  res[len - 1] = prev;
  for (let i = len; i < src.length; i++) {
    const val = src[i] ?? 0;
    prev = alpha * val + (1 - alpha) * prev;
    res[i] = prev;
  }
  return res;
}

export function seriesCrossover(a: number[], b: number[]): boolean[] {
  const n = Math.min(a.length, b.length);
  const res: boolean[] = new Array(n).fill(false);
  for (let i = 1; i < n; i++) {
    const currA = a[i] ?? NaN;
    const prevA = a[i - 1] ?? NaN;
    const currB = b[i] ?? NaN;
    const prevB = b[i - 1] ?? NaN;
    if (isNaN(currA) || isNaN(prevA) || isNaN(currB) || isNaN(prevB)) continue;
    res[i] = prevA <= prevB && currA > currB;
  }
  return res;
}

export function seriesCrossunder(a: number[], b: number[]): boolean[] {
  const n = Math.min(a.length, b.length);
  const res: boolean[] = new Array(n).fill(false);
  for (let i = 1; i < n; i++) {
    const currA = a[i] ?? NaN;
    const prevA = a[i - 1] ?? NaN;
    const currB = b[i] ?? NaN;
    const prevB = b[i - 1] ?? NaN;
    if (isNaN(currA) || isNaN(prevA) || isNaN(currB) || isNaN(prevB)) continue;
    res[i] = prevA >= prevB && currA < currB;
  }
  return res;
}

export function seriesPivotHigh(src: number[], leftLen: number, rightLen: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  for (let i = leftLen + rightLen; i < src.length; i++) {
    const pIdx = i - rightLen;
    const pVal = src[pIdx];
    if (pVal === undefined || isNaN(pVal)) continue;
    let isPiv = true;
    for (let j = 1; j <= leftLen; j++) {
      const v = src[pIdx - j];
      if (v !== undefined && !isNaN(v) && v >= pVal) {
        isPiv = false;
        break;
      }
    }
    if (isPiv) {
      for (let j = 1; j <= rightLen; j++) {
        const v = src[pIdx + j];
        if (v !== undefined && !isNaN(v) && v > pVal) {
          isPiv = false;
          break;
        }
      }
    }
    if (isPiv) res[i] = pVal;
  }
  return res;
}

export function seriesPivotLow(src: number[], leftLen: number, rightLen: number): number[] {
  const res: number[] = new Array(src.length).fill(NaN);
  for (let i = leftLen + rightLen; i < src.length; i++) {
    const pIdx = i - rightLen;
    const pVal = src[pIdx];
    if (pVal === undefined || isNaN(pVal)) continue;
    let isPiv = true;
    for (let j = 1; j <= leftLen; j++) {
      const v = src[pIdx - j];
      if (v !== undefined && !isNaN(v) && v <= pVal) {
        isPiv = false;
        break;
      }
    }
    if (isPiv) {
      for (let j = 1; j <= rightLen; j++) {
        const v = src[pIdx + j];
        if (v !== undefined && !isNaN(v) && v < pVal) {
          isPiv = false;
          break;
        }
      }
    }
    if (isPiv) res[i] = pVal;
  }
  return res;
}
