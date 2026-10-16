# Historical Replay Subsystem (`src/pages/trading/useReplay*.ts`)

This document details the architecture, state coordination, and execution mechanics of the bar-by-bar historical market replay feature.

---

## 1. Subsystem Overview

The replay subsystem allows traders to practice paper trading against past market conditions as if the market were unfolding in real time:
- **Timeline Scrubber**: Users select a past start date and time.
- **Slicing**: Historical candle history is sliced up to the selected timestamp cursor.
- **Variable Playback Speeds**: $1\times$, $2\times$, $5\times$, $10\times$, $60\times$ speeds driven by an interval timer.
- **Virtual Order Execution**: Limit and stop orders are matched against simulated replay ticks.

---

## 2. Component & Hook Architecture

```
src/pages/trading/
├── ReplayHUD.tsx          # Floating status bar showing current replay date and play/pause
├── ReplayScrubber.tsx     # Timeline progress bar allowing jump-to-date seeking
├── useReplayPlayback.ts   # Timer interval hook advancing replayCursorTimestamp
├── useReplayChartData.ts  # Slices candle array up to the active replay timestamp
└── useReplayMarkers.ts    # Renders entry/exit execution arrows for replay trades
```

---

## 3. Replay State (`useTradingStore`)

Replay state is stored in `src/services/stores/useTradingStore.ts`:
- `isReplaying: boolean` — Whether replay mode is currently active.
- `replayCursorTimestamp: number | null` — Unix timestamp (in seconds) of the currently visible bar.
- `replaySpeed: number` — Playback multiplier ($1\times, 5\times, 10\times$).
- `replayVersion: number` — Monotonic counter incremented on scrubber seek to trigger chart reload.

---

## 4. Playback Loop (`useReplayPlayback.ts`)

1. While `isPlaying && isReplaying`:
   - A timer runs at `1000 / replaySpeed` intervals.
   - Advances `replayCursorTimestamp` by the timeframe interval (e.g., $+900\text{s}$ for a 15m chart).
2. `useReplayChartData.ts` computes:
   ```ts
   const slicedCandles = allCandles.filter(c => c.time <= replayCursorTimestamp);
   ```
3. Sliced candles feed into `ChartPanel.tsx`, rendering candles sequentially as if received live.
