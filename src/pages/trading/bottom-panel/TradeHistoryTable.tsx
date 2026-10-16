import { useState, useEffect, useRef } from "react";
import { useClosedPositions } from "../../../services/queries.ts";
import { useTradingStore } from "../../../services/store.tsx";
import type { ClosedPosition } from "../../../services/schemas.ts";
import { formatDate, formatNumber, cn } from "@/lib/utils";
import type { AccountOption } from "./types";

export function TradeHistoryTable({ accountId }: { accountId: string | null }) {
  const [page, setPage] = useState(1);
  const { data: closedData, isLoading } = useClosedPositions(accountId, page);
  const trades: ClosedPosition[] = closedData?.data || [];
  const totalPages = closedData?.totalPages || 1;
  const accounts = useTradingStore((s) => s.accounts as AccountOption[]);
  const activeAccount = accounts.find((account) => account.id === accountId);

  const prevAccRef = useRef(accountId);
  useEffect(() => {
    if (prevAccRef.current !== accountId) {
      setPage(1);
      prevAccRef.current = accountId;
    }
  }, [accountId]);

  if (!accountId)
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Select an account
      </div>
    );
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        Loading...
      </div>
    );
  if (trades.length === 0)
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
        No trade history yet
        {activeAccount ? ` for ${activeAccount.label || accountId?.slice(0, 8)}` : ""}
      </div>
    );

  return (
    <div className="flex flex-col h-full bg-[#131722]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[#1e222d] border-b border-[#2a2e39] z-10">
          <tr>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Closed</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Symbol</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Side</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Volume</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Entry</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Exit</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Commission</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Gross P&L</th>
            <th className="py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Net P&L</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e222d]">
          {trades.map((t) => {
            const comm = t.commission ?? 0;
            const gross = t.realizedPnl ?? 0;
            const net = gross - comm;
            return (
              <tr key={t.id} className="hover:bg-[#1e222d]/60 transition-colors">
                <td className="text-neutral-400 font-mono py-1.5 px-3">
                  {formatDate(t.closedAt || t.openedAt)}
                </td>
                <td className="font-bold text-neutral-100 py-1.5 px-3">{t.symbolName}</td>
                <td className="py-1.5 px-3">
                  <span
                    className={cn(
                      "font-semibold text-[10px] px-1.5 py-0.5 rounded",
                      t.side === "LONG"
                        ? "bg-[#0ecb81]/15 text-[#0ecb81] border border-[#0ecb81]/30"
                        : "bg-[#f6465d]/15 text-[#f6465d] border border-[#f6465d]/30",
                    )}
                  >
                    {t.side}
                  </span>
                </td>
                <td className="font-mono text-neutral-200 py-1.5 px-3">{t.quantity}</td>
                <td className="font-mono text-neutral-200 py-1.5 px-3">{t.entryPrice ? formatNumber(t.entryPrice, 5) : "--"}</td>
                <td className="font-mono text-neutral-200 py-1.5 px-3">{t.exitPrice ? formatNumber(t.exitPrice, 5) : "--"}</td>
                <td className="font-mono text-neutral-400 py-1.5 px-3">
                  {comm > 0 ? `-${comm.toFixed(2)}` : "0.00"}
                </td>
                <td
                  className={cn(
                    "font-mono py-1.5 px-3 font-medium",
                    gross >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
                  )}
                >
                  {`${gross >= 0 ? "+" : ""}${gross.toFixed(2)}`}
                </td>
                <td
                  className={cn(
                    "font-mono font-bold py-1.5 px-3",
                    net >= 0 ? "text-[#0ecb81]" : "text-[#f6465d]",
                  )}
                >
                  {`${net >= 0 ? "+" : ""}${net.toFixed(2)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-1 border-t border-border text-[10px]">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="px-1.5 py-0.5 rounded bg-secondary hover:bg-secondary/80 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
