import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import {} from "lucide-react";

// ── Trade Calculator (#57) ──────────────────────────────────

interface TradeCalcProps {
  tick?: { bid: number; ask: number };
  symbolInfo?: {
    digits?: number;
    pip?: number;
    contractSize?: number;
    [key: string]: unknown;
  } | null;
}

export function TradeCalculator({ tick: _tick, symbolInfo }: TradeCalcProps) {
  const [riskPercent, setRiskPercent] = useState("1");
  const [accountBalance, setAccountBalance] = useState("100000");
  const [slPips, setSlPips] = useState("20");

  const balance = parseFloat(accountBalance) || 0;
  const risk = parseFloat(riskPercent) || 0;
  const slDistance = parseFloat(slPips) || 0;
  const pipValue = (symbolInfo?.contractSize || 100000) * 0.0001;
  const riskAmount = balance * (risk / 100);
  const recommendedLots = slDistance > 0 ? riskAmount / (slDistance * pipValue) : 0;

  return (
    <div className="p-3.5 space-y-2.5 text-xs bg-[#131722] rounded-xl border border-[#2a2e39]">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        Position Size Calculator
      </h4>
      <div>
        <label className="text-[11px] font-medium text-neutral-400">Account Balance</label>
        <input
          type="number"
          value={accountBalance}
          onChange={(e) => setAccountBalance(e.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[#2a2e39] bg-[#1e222d] text-xs font-mono text-white focus:outline-none focus:border-[#2962ff] transition-colors"
        />
      </div>
      <div>
        <label className="text-[11px] font-medium text-neutral-400">Risk %</label>
        <input
          type="number"
          value={riskPercent}
          onChange={(e) => setRiskPercent(e.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[#2a2e39] bg-[#1e222d] text-xs font-mono text-white focus:outline-none focus:border-[#2962ff] transition-colors"
          step="0.5"
          min="0.1"
          max="10"
        />
      </div>
      <div>
        <label className="text-[11px] font-medium text-neutral-400">Stop Loss (pips)</label>
        <input
          type="number"
          value={slPips}
          onChange={(e) => setSlPips(e.target.value)}
          className="w-full mt-1 px-2.5 py-1.5 rounded-lg border border-[#2a2e39] bg-[#1e222d] text-xs font-mono text-white focus:outline-none focus:border-[#2962ff] transition-colors"
        />
      </div>
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg p-2.5 space-y-1.5 mt-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-neutral-400">Risk Amount</span>
          <span className="font-mono text-[#2962ff] font-semibold">{formatCurrency(riskAmount)}</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-neutral-400">Pip Value/Lot</span>
          <span className="font-mono text-neutral-200">{formatCurrency(pipValue)}</span>
        </div>
        <div className="flex justify-between items-center text-xs font-semibold pt-1 border-t border-[#2a2e39]/60">
          <span className="text-neutral-200">Recommended Size</span>
          <span className="font-mono text-[#0ecb81] font-bold text-sm">{recommendedLots.toFixed(2)} lots</span>
        </div>
      </div>
    </div>
  );
}

// ── Order Modify Dialog (#30) ───────────────────────────────
