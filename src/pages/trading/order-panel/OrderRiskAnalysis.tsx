import { AlertTriangle } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import type { SymbolInfo } from "./types";

export interface OrderRiskAnalysisProps {
  symbolInfo?: SymbolInfo;
  tick?: { bid: number; ask: number; timestamp: number };
  side: "BUY" | "SELL";
  quantity: string;
  stopLoss: string;
  takeProfit: string;
  accountBalance?: number;
}

export function OrderRiskAnalysis({
  symbolInfo,
  tick,
  side,
  quantity,
  stopLoss,
  takeProfit,
  accountBalance,
}: OrderRiskAnalysisProps) {
  const slVal = parseFloat(stopLoss);
  const tpVal = parseFloat(takeProfit);
  const qtyVal = parseFloat(quantity) || 0;
  const contractSize = symbolInfo?.contractSize || 100000;
  const currentPrice = tick ? (side === "BUY" ? tick.ask : tick.bid) : null;

  const showRisk = Boolean(currentPrice && slVal && qtyVal > 0);

  const slDistance = currentPrice && slVal ? Math.abs(currentPrice - slVal) : 0;
  const riskDollar = slDistance * qtyVal * contractSize;
  const balance = accountBalance || 0;
  const riskPct = balance > 0 ? (riskDollar / balance) * 100 : 0;
  const tpDollar =
    tpVal && currentPrice ? Math.abs(tpVal - currentPrice) * qtyVal * contractSize : null;
  const rrRatio = tpDollar && riskDollar > 0 ? tpDollar / riskDollar : null;

  const riskColor =
    riskPct > 5 ? "text-[#f6465d]" : riskPct > 2 ? "text-amber-400" : "text-[#0ecb81]";

  return (
    <>
      {/* Risk-per-trade display */}
      {showRisk && (
        <div className="bg-[#1e222d] rounded-xl p-3 text-xs space-y-1.5 border border-[#2a2e39]">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className={cn("h-3.5 w-3.5", riskColor)} />
            <span className="font-bold text-[10px] uppercase tracking-wider text-neutral-300">
              Risk Analysis
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Risk Amount</span>
            <span className={cn("font-mono font-semibold", riskColor)}>
              {formatCurrency(riskDollar)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Risk % of Balance</span>
            <span className={cn("font-mono font-semibold", riskColor)}>
              {riskPct.toFixed(2)}%
            </span>
          </div>
          {tpDollar != null && (
            <div className="flex justify-between">
              <span className="text-neutral-400">Reward</span>
              <span className="font-mono font-semibold text-[#0ecb81]">{formatCurrency(tpDollar)}</span>
            </div>
          )}
          {rrRatio != null && (
            <div className="flex justify-between">
              <span className="text-neutral-400">R:R Ratio</span>
              <span
                className={cn(
                  "font-mono font-semibold",
                  rrRatio >= 2 ? "text-[#0ecb81]" : rrRatio >= 1 ? "text-neutral-100" : "text-[#f6465d]",
                )}
              >
                1:{rrRatio.toFixed(2)}
              </span>
            </div>
          )}
          {riskPct > 5 && (
            <div className="text-[#f6465d] text-[10px] flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3" />
              High risk — exceeds 5% of balance
            </div>
          )}
        </div>
      )}

      {/* Margin info */}
      {symbolInfo && tick && (
        <div className="bg-[#1e222d] rounded-xl p-3 text-xs space-y-1.5 border border-[#2a2e39]">
          <div className="flex justify-between">
            <span className="text-neutral-400">Contract Size</span>
            <span className="font-mono text-neutral-200">{symbolInfo.contractSize?.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Margin Required</span>
            <span className="font-mono text-neutral-200">
              {formatCurrency(
                (parseFloat(quantity) || 0) *
                  (symbolInfo.contractSize ?? 0) *
                  (side === "BUY" ? tick.ask : tick.bid) *
                  ((symbolInfo.marginPercent ?? 0) / 100),
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Commission</span>
            <span className="font-mono text-neutral-200">
              {formatCurrency((symbolInfo.commission ?? 0) * (parseFloat(quantity) || 0))}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
