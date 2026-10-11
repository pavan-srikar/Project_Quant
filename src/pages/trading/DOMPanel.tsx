import { useMemo } from "react";
import { formatNumber, cn } from "../../lib/utils.ts";

export function DOMPanel({
  symbol,
  tick,
}: {
  symbol: string;
  tick?: { bid: number; ask: number };
}) {
  const levels = useMemo(() => {
    if (!tick) return [];
    const mid = (tick.bid + tick.ask) / 2;
    const step = tick.ask - tick.bid || 0.0001;
    const result = [];

    for (let i = 10; i >= 1; i--) {
      result.push({
        price: mid + step * i,
        bidSize: 0,
        askSize: Math.floor(Math.random() * 50 + 5),
        type: "ask" as const,
      });
    }
    result.push({
      price: tick.ask,
      bidSize: 0,
      askSize: Math.floor(Math.random() * 100 + 20),
      type: "ask" as const,
    });
    result.push({
      price: tick.bid,
      bidSize: Math.floor(Math.random() * 100 + 20),
      askSize: 0,
      type: "bid" as const,
    });
    for (let i = 1; i <= 10; i++) {
      result.push({
        price: mid - step * i,
        bidSize: Math.floor(Math.random() * 50 + 5),
        askSize: 0,
        type: "bid" as const,
      });
    }
    return result;
    // tick is captured via tick?.bid and tick?.ask; including tick.bid/tick.ask is sufficient
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick?.bid, tick?.ask]);

  const maxSize = Math.max(...levels.map((l) => Math.max(l.bidSize, l.askSize)), 1);

  return (
    <div className="flex flex-col h-full bg-[#131722]">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[#2a2e39] bg-[#1e222d]">
        <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
          Depth of Market
        </span>
        <span className="font-bold text-sm text-neutral-100">{symbol}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#1e222d] border-b border-[#2a2e39] z-10">
            <tr>
              <th className="text-right w-[30%] py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Bid Size
              </th>
              <th className="text-center w-[40%] py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Price
              </th>
              <th className="text-left w-[30%] py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Ask Size
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e222d]">
            {levels.map((l, i) => (
              <tr key={i} className="relative hover:bg-[#1e222d]/60 transition-colors">
                <td className="text-right py-1.5 px-3 relative font-mono text-xs">
                  {l.bidSize > 0 && (
                    <>
                      <div
                        className="absolute inset-y-0 right-0 bg-[#0ecb81]/15"
                        style={{ width: `${(l.bidSize / maxSize) * 100}%` }}
                      />
                      <span className="relative text-[#0ecb81] font-semibold">{l.bidSize}</span>
                    </>
                  )}
                </td>
                <td
                  className={cn(
                    "text-center font-mono font-medium py-1.5 px-3",
                    l.type === "ask" ? "text-[#f6465d]" : "text-[#0ecb81]",
                  )}
                >
                  {formatNumber(l.price, 5)}
                </td>
                <td className="text-left py-1.5 px-3 relative font-mono text-xs">
                  {l.askSize > 0 && (
                    <>
                      <div
                        className="absolute inset-y-0 left-0 bg-[#f6465d]/15"
                        style={{ width: `${(l.askSize / maxSize) * 100}%` }}
                      />
                      <span className="relative text-[#f6465d] font-semibold">{l.askSize}</span>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
