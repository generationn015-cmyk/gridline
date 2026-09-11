import type { Mode } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function MiniBoard({ mode }: { mode: Mode }) {
  if (mode === "cross") {
    const cells = "d.o.d#.#.#d.o.d#.#.#d.=.d";
    return (
      <span className="mini-board grid grid-cols-5 gap-px">
        {cells.split("").map((ch, i) => (
          <span
            key={i}
            className={cn(
              "mini-cell",
              ch === "#" ? "mini-black" : ch === "o" || ch === "=" ? "mini-op" : "mini-digit",
            )}
          />
        ))}
      </span>
    );
  }
  if (mode === "cages") {
    return (
      <span className="mini-board grid grid-cols-4 gap-px overflow-hidden rounded-sm border border-border-strong">
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "mini-cell mini-digit",
              [0, 1, 4].includes(i) && "mini-cage-a",
              [2, 3, 7].includes(i) && "mini-cage-b",
              [5, 6, 9, 10].includes(i) && "mini-cage-c",
            )}
          />
        ))}
      </span>
    );
  }
  if (mode === "line") {
    const marks = "ccpwnaaa";
    return (
      <span className="mini-board flex gap-0.5">
        {marks.split("").map((m, i) => (
          <span
            key={i}
            className={cn(
              "mini-cell mini-line",
              m === "c" && "mini-correct",
              m === "p" && "mini-present",
              m === "w" && "mini-absent",
            )}
          />
        ))}
      </span>
    );
  }
  return (
    <span className="mini-board flex flex-col gap-0.5">
      {[0, 1, 2].map((r) => (
        <span key={r} className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, c) => (
            <span
              key={c}
              className={cn("mini-cell mini-digit min-w-0 flex-1", (c === 1 || c === 3) && "mini-op")}
            />
          ))}
        </span>
      ))}
    </span>
  );
}
