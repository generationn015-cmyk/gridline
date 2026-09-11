import { cn } from "@/lib/utils";
import type { CrossPuzzle } from "@/lib/game/types";

export function CrossBoard({
  puzzle,
  values,
  selected,
  conflicts,
  onSelect,
}: {
  puzzle: CrossPuzzle;
  values: (number | null)[][];
  selected: { r: number; c: number } | null;
  conflicts: boolean[][] | null;
  onSelect: (r: number, c: number) => void;
}) {
  const size = puzzle.size;
  return (
    <div
      className="mx-auto grid w-full max-w-[min(100%,28rem)] gap-px rounded-[var(--radius-md)] border border-border-strong bg-border-strong p-px"
      style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      role="grid"
      aria-label="Math crossword"
    >
      {puzzle.cells.map((row, r) =>
        row.map((cell, c) => {
          if (cell.type === "black") {
            return (
              <div
                key={`${r}-${c}`}
                className="aspect-square bg-black-square"
                aria-hidden
              />
            );
          }
          if (cell.type === "op" || cell.type === "eq") {
            return (
              <div
                key={`${r}-${c}`}
                className="flex aspect-square items-center justify-center bg-raised font-display text-lg text-muted sm:text-xl"
                aria-hidden
              >
                {cell.type === "eq" ? "=" : cell.op}
              </div>
            );
          }
          const given = !!cell.given;
          const val = values[r]![c];
          const isSel = selected?.r === r && selected?.c === c;
          const bad = conflicts?.[r]?.[c];
          return (
            <button
              key={`${r}-${c}`}
              role="gridcell"
              aria-label={
                given
                  ? `Given ${val}`
                  : `Row ${r + 1} column ${c + 1}${val !== null ? `, ${val}` : ", empty"}`
              }
              aria-selected={isSel}
              disabled={given}
              onClick={() => onSelect(r, c)}
              className={cn(
                "grid-cell relative aspect-square bg-cell font-display text-xl sm:text-2xl",
                given && "text-given",
                !given && "text-fg",
                isSel && "bg-cell-on z-[1] shadow-[inset_0_0_0_2px_var(--color-accent)]",
                bad && "text-danger",
              )}
            >
              {val ?? ""}
            </button>
          );
        }),
      )}
    </div>
  );
}
