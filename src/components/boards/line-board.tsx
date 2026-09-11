import { cn } from "@/lib/utils";
import type { LineMark, LinePuzzle } from "@/lib/game/types";

function glyph(ch: string) {
  if (ch === "*") return "×";
  if (ch === "/") return "÷";
  return ch;
}

export function LineBoard({
  puzzle,
  guesses,
  current,
  marks,
  revealed,
}: {
  puzzle: LinePuzzle;
  guesses: string[];
  current: string;
  marks: LineMark[][];
  revealed: boolean;
}) {
  const rows: Array<{ text: string; marks?: LineMark[]; ghost?: boolean }> = [];
  for (let i = 0; i < guesses.length; i++) {
    rows.push({ text: guesses[i]!, marks: marks[i] });
  }
  if (guesses.length < puzzle.maxGuesses) {
    rows.push({ text: current, ghost: true });
  }
  while (rows.length < puzzle.maxGuesses) rows.push({ text: "" });
  if (revealed) {
    rows.push({ text: puzzle.equation, marks: Array(puzzle.length).fill("correct") });
  }

  return (
    <div className="mx-auto flex w-full max-w-[min(100%,26rem)] flex-col gap-1.5" role="group" aria-label="Equation guesses">
      {rows.slice(0, puzzle.maxGuesses).map((row, i) => (
        <div key={i} className="grid grid-cols-8 gap-1">
          {Array.from({ length: puzzle.length }, (_, c) => {
            const ch = row.text[c] ?? "";
            const m = row.marks?.[c];
            return (
              <div
                key={c}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-[var(--radius-xs)] border font-display text-lg sm:text-xl",
                  !m && "border-border bg-cell text-fg",
                  m === "correct" && "border-accent bg-accent text-accent-fg",
                  m === "present" && "border-warn bg-cell-on text-fg",
                  m === "absent" && "border-border bg-raised text-subtle",
                  row.ghost && c === current.length && "shadow-[inset_0_0_0_2px_var(--color-accent)]",
                )}
                aria-label={
                  m
                    ? `${glyph(ch)}, ${m}`
                    : ch
                      ? glyph(ch)
                      : "empty"
                }
              >
                {glyph(ch)}
                {m === "present" && (
                  <span className="absolute bottom-1 h-0.5 w-3 bg-warn" aria-hidden />
                )}
                {m === "correct" && (
                  <span className="absolute top-1 right-1 size-1 rounded-full bg-accent-fg" aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
