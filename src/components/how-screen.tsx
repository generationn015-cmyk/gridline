import { ChevronLeft } from "lucide-react";
import { NinaMark } from "@/components/nina-mark";
import { Button } from "@/components/ui/button";
import { useGame } from "@/store/game-store";

export function HowScreen() {
  const { setView } = useGame();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-12">
      <header className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => setView("home")}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="font-display text-2xl">How to play</h1>
      </header>
      <article className="prose-like mt-6 space-y-6 text-[15px] leading-relaxed text-muted">
        <section className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
          <NinaMark />
          <div>
            <h2 className="font-display text-lg text-fg">Nina</h2>
            <p className="mt-1">
              Nina is the setter. She writes every Cross, Cages, Line, and Stack. A name and a voice — not a
              mascot. Daily boards are hers for the UTC day.
            </p>
          </div>
        </section>
        <section>
          <h2 className="font-display text-lg text-fg">Cross</h2>
          <p>
            A crossword of digits. Operators and equals are already placed. Fill empty cells so every across
            line and every down line is a true equation. Division is integer only. No leading zeros on
            multi-digit numbers (these boards use one digit per cell).
          </p>
          <p>
            Evaluation defaults to left-to-right, the way Nina files them. Switch to standard order of
            operations in Settings — it applies to the next board.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-fg">Cages</h2>
          <p>
            An n×n Latin square: digits 1–n, no repeat in a row or column. Bold cages show a target and an
            operation. The digits in a cage must make that target. One-cell cages are givens in all but name.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-fg">Line</h2>
          <p>
            A hidden eight-character equation. Guess it in six tries. Olive is the right glyph in the right
            place. A bar underneath means the glyph belongs somewhere else. Faded means it is absent. Color
            is never the only cue.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-fg">Stack</h2>
          <p>
            Three chained equations. The result of each line is the first digit of the next. Fill the digits.
            Nina already checked they work.
          </p>
        </section>
        <section>
          <h2 className="font-display text-lg text-fg">Daily</h2>
          <p>
            One shared puzzle per mode per UTC day, from a date seed. Streak counts when Cross, Cages, and
            Line are all filed. Hints are recorded. Practice is infinite.
          </p>
        </section>
      </article>
    </div>
  );
}
