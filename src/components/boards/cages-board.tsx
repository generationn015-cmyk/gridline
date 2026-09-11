import { cageBorder, cageLabel } from "@/lib/game/cages";
import type { CagesPuzzle } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function CagesBoard({
  puzzle,
  values,
  selected,
  conflicts,
  notes,
  pulse,
  onSelect,
}: {
  puzzle: CagesPuzzle;
  values: (number | null)[][];
  selected: { r: number; c: number } | null;
  conflicts: boolean[][] | null;
  notes: Record<string, number[]>;
  pulse: string[];
  onSelect: (r: number, c: number) => void;
}) {
  const n = puzzle.size;
  const labelAt = new Map<string, string>();
  for (const cage of puzzle.cages) {
    const cells = [...cage.cells].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const [r, c] = cells[0]!;
    labelAt.set(`${r},${c}`, cageLabel(cage));
  }
  const activeCage = selected
    ? puzzle.cages.find((g) => g.cells.some(([a, b]) => a === selected.r && b === selected.c))
    : null;
  const inCage = new Set((activeCage?.cells ?? []).map(([a, b]) => `${a},${b}`));

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
          const key = `${r},${c}`;
          const marks = notes[key] ?? [];
          const pulsed = pulse.includes(key);
          const lit = inCage.has(key);
          return (
            <button
              key={key}
              role="gridcell"
              aria-label={`Row ${r + 1} column ${c + 1}${lab ? `, cage ${lab}` : ""}${val !== null ? `, ${val}` : ", empty"}`}
              aria-selected={isSel}
              onClick={() => onSelect(r, c)}
              className={cn(
                "relative aspect-square bg-cell font-display text-xl sm:text-2xl text-fg",
                lit && "cage-lit",
                isSel && "bg-cell-on",
                bad && "text-danger",
                pulsed && "cell-pulse",
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
              <span className="grid-cell">
                {val ?? (marks.length ? <Notes marks={marks} max={n} /> : "")}
              </span>
            </button>
          );
        }),
      )}
    </div>
  );
}

function Notes({ marks, max }: { marks: number[]; max: number }) {
  return (
    <span className="cell-notes" aria-hidden>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <span key={n} className={marks.includes(n) ? "on" : undefined}>
          {marks.includes(n) ? n : ""}
        </span>
      ))}
    </span>
  );
}
