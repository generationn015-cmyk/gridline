import type { Line2dPuzzle } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function StackBoard({
  puzzle,
  values,
  selected,
  conflicts,
  pulse,
  onSelect,
}: {
  puzzle: Line2dPuzzle;
  values: (number | null)[][];
  selected: { r: number; c: number } | null;
  conflicts: boolean[][] | null;
  pulse: string[];
  onSelect: (r: number, c: number) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[min(100%,22rem)] flex-col gap-3" role="grid" aria-label="Stacked equations">
      {puzzle.rows.map((row, r) => (
        <div key={r} className="grid grid-cols-5 items-center gap-1.5">
          <Digit
            r={r}
            c={0}
            value={values[r]![0]}
            selected={selected}
            conflict={!!conflicts?.[r]?.[0]}
            pulse={pulse.includes(`${r},0`)}
            onSelect={onSelect}
            linked={r > 0}
          />
          <div className="flex aspect-square items-center justify-center font-display text-2xl text-muted">
            {row.op}
          </div>
          <Digit
            r={r}
            c={1}
            value={values[r]![1]}
            selected={selected}
            conflict={!!conflicts?.[r]?.[1]}
            pulse={pulse.includes(`${r},1`)}
            onSelect={onSelect}
          />
          <div className="flex aspect-square items-center justify-center font-display text-2xl text-muted">=</div>
          <Digit
            r={r}
            c={2}
            value={values[r]![2]}
            selected={selected}
            conflict={!!conflicts?.[r]?.[2]}
            pulse={pulse.includes(`${r},2`)}
            onSelect={onSelect}
            linked={r < 2}
          />
        </div>
      ))}
      <p className="text-center text-xs text-subtle">The result of each line is the start of the next.</p>
    </div>
  );
}

function Digit({
  r,
  c,
  value,
  selected,
  conflict,
  pulse,
  onSelect,
  linked,
}: {
  r: number;
  c: number;
  value: number | null;
  selected: { r: number; c: number } | null;
  conflict: boolean;
  pulse: boolean;
  onSelect: (r: number, c: number) => void;
  linked?: boolean;
}) {
  const isSel = selected?.r === r && selected?.c === c;
  return (
    <button
      role="gridcell"
      aria-label={`Row ${r + 1} ${c === 0 ? "left" : c === 1 ? "right" : "result"}${value !== null ? `, ${value}` : ", empty"}`}
      aria-selected={isSel}
      onClick={() => onSelect(r, c)}
      className={cn(
        "grid-cell relative flex aspect-square items-center justify-center rounded-[var(--radius-sm)] border border-border bg-cell font-display text-2xl",
        isSel && "border-accent bg-cell-on shadow-[inset_0_0_0_1px_var(--color-accent)]",
        conflict && "text-danger",
        pulse && "cell-pulse",
        linked && "after:absolute after:inset-x-1/3 after:h-1 after:bg-accent/50",
        linked && c === 2 && "after:-bottom-2",
        linked && c === 0 && "after:-top-2",
      )}
    >
      {value ?? ""}
    </button>
  );
}
