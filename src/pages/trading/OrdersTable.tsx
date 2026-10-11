import { formatNumber, formatDate, cn } from "../../lib/utils.ts";

interface OrderRow {
  id: string;
  symbolName: string;
  side: "BUY" | "SELL" | string;
  type: string;
  quantity: number;
  price?: number | null;
  stopPrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  status: string;
  createdAt: string | Date;
}

export function OrdersTable({
  orders,
  onCancel,
  onModify,
  onSelectSymbol,
}: {
  orders: OrderRow[];
  onCancel: (id: string) => void;
  onModify?: (order: OrderRow) => void;
  onSelectSymbol?: (symbolName: string) => void;
}) {
  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-400 text-xs">
        No pending orders
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead className="sticky top-0 bg-[#1e222d] border-b border-[#2a2e39] z-10">
        <tr>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Symbol</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Side</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Type</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Qty</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Price</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">SL</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">TP</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Status</th>
          <th className="py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Time</th>
          <th className="py-2.5 px-3"></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#1e222d]">
        {orders.map((o) => (
          <tr
            key={o.id}
            className={cn(
              "hover:bg-[#1e222d]/60 transition-colors",
              onSelectSymbol ? "cursor-pointer" : undefined,
            )}
            onClick={() => onSelectSymbol?.(o.symbolName)}
            onKeyDown={(e) => {
              if (!onSelectSymbol) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectSymbol(o.symbolName);
              }
            }}
            tabIndex={onSelectSymbol ? 0 : undefined}
          >
            <td className="font-bold text-neutral-100 py-2 px-3">{o.symbolName}</td>
            <td className="py-2 px-3">
              <span
                className={cn(
                  "font-bold text-[10px] px-2 py-0.5 rounded",
                  o.side === "BUY"
                    ? "bg-[#0ecb81]/15 text-[#0ecb81] border border-[#0ecb81]/30"
                    : "bg-[#f6465d]/15 text-[#f6465d] border border-[#f6465d]/30",
                )}
              >
                {o.side}
              </span>
            </td>
            <td className="py-2 px-3">
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-[#2a2e39] text-neutral-300">
                {o.type}
              </span>
            </td>
            <td className="font-mono text-neutral-200 py-2 px-3">{o.quantity}</td>
            <td className="font-mono text-neutral-200 py-2 px-3">
              {o.price
                ? formatNumber(o.price, 5)
                : o.stopPrice
                  ? formatNumber(o.stopPrice, 5)
                  : "MKT"}
            </td>
            <td className="font-mono text-[#f6465d] py-2 px-3">
              {o.stopLoss ? formatNumber(o.stopLoss, 5) : "--"}
            </td>
            <td className="font-mono text-[#0ecb81] py-2 px-3">
              {o.takeProfit ? formatNumber(o.takeProfit, 5) : "--"}
            </td>
            <td className="py-2 px-3">
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-[#2a2e39] text-neutral-300">
                {o.status}
              </span>
            </td>
            <td className="text-neutral-400 font-mono text-[11px] py-2 px-3">{formatDate(o.createdAt)}</td>
            <td className="py-2 px-3">
              <div className="flex gap-1.5 justify-end">
                {onModify && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onModify(o);
                    }}
                    className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#2962ff]/15 text-[#2962ff] hover:bg-[#2962ff] hover:text-white border border-[#2962ff]/30 transition-colors"
                  >
                    Modify
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel(o.id);
                  }}
                  className="px-2 py-0.5 text-[10px] font-semibold rounded bg-[#f6465d]/15 text-[#f6465d] hover:bg-[#f6465d] hover:text-white border border-[#f6465d]/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
