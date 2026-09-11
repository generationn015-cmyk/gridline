import { cageBorder, cageLabel } from "@/lib/game/cages";
import type { CagesPuzzle } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function CagesBoard({
  puzzle,
  values,
  selected,
  conflicts,
  onSelect,
}: {
  puzzle: CagesPuzzle;
  values: (number | null)[][];
  selected: { r: number; c: number } | null;
  conflicts: boolean[][] | null;
  onSelect: (r: number, c: number) => void;
}) {
  const n = puzzle.size;
  const labelAt = new Map<string, string>();
  for (const cage of puzzle.cages) {
    const cells = [...cage.cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const [r, c] = cells[0]!;
    labelAt.set(`${r},${c}`, cageLabel(cage));
  }

  return (
    <div
      className="mx-auto grid w-full max-w-[min(100%,28rem)] bg-fg"
      style={{
        gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
        gap: 0,
        padding: 2,
      }}
      role="grid"
      aria-label="Cages grid"
    >
      {Array.from({ length: n }, (_, r) =>
        Array.from({ length: n }, (_, c) => {
          const edge = cageBorder(puzzle, r, c);
          const isSel = selected?.r === r && selected?.c === c;
          const val = values[r]![c];
          const bad = conflicts?.[r]?.[c];
          const lab = labelAt.get(`${r},${c}`);
          return (
            <button
              key={`${r}-${c}`}
              role="gridcell"
              aria-label={`Row ${r + 1} column ${c + 1}${lab ? `, cage ${lab}` : ""}${val !== null ? `, ${val}` : ", empty"}`}
              aria-selected={isSel}
              onClick={() => onSelect(r, c)}
              className={cn(
                "relative aspect-square bg-cell font-display text-xl sm:text-2xl text-fg",
                isSel && "bg-cell-on",
                bad && "text-danger",
              )}
              style={{
                boxShadow: [
                  edge.t ? "inset 0 2px 0 0 var(--color-fg)" : "inset 0 1px 0 0 var(--color-border)",
                  edge.r ? "inset -2px 0 0 0 var(--color-fg)" : "inset -1px 0 0 0 var(--color-border)",
                  edge.b ? "inset 0 -2px 0 0 var(--color-fg)" : "inset 0 -1px 0 0 var(--color-border)",
                  edge.l ? "inset 2px 0 0 0 var(--color-fg)" : "inset 1px 0 0 0 var(--color-border)",
                  isSel ? "inset 0 0 0 2px var(--color-accent)" : "",
                ]
                  .filter(Boolean)
                  .join(", "),
              }}
            >
              {lab && (
                <span className="absolute left-0.5 top-0.5 font-sans text-[9px] font-medium leading-none text-muted sm:text-[10px]">
                  {lab}
                </span>
              )}
              <span className="grid-cell">{val ?? ""}</span>
            </button>
          );
        }),
      )}
    </div>
  );
}
