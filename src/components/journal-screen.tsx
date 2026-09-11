import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { modeTitle } from "@/lib/game/nina";
import { useGame } from "@/store/game-store";
import { formatTime } from "@/lib/utils";

export function JournalScreen() {
  const { journal, setView } = useGame();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-12">
      <header className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => setView("home")}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="font-display text-2xl">Journal</h1>
      </header>
      <p className="mt-2 text-sm text-muted">Last twenty finishes. Nina keeps the receipts.</p>
      {journal.length === 0 ? (
        <p className="mt-10 text-sm text-subtle">Nothing filed yet. Play a board.</p>
      ) : (
        <ul className="mt-6 divide-y divide-border">
          {journal.map((e) => (
            <li key={e.id} className="flex items-baseline justify-between gap-3 py-3">
              <span>
                <span className="font-display text-lg">{modeTitle(e.mode)}</span>
                <span className="ml-2 text-sm text-muted">
                  {e.kind === "daily" ? "Daily" : "Practice"} · {e.difficulty}
                  {e.size ? ` · ${e.size}×${e.size}` : ""}
                </span>
              </span>
              <span className="tabular-nums text-sm text-muted">
                {formatTime(e.timeMs)}
                {e.hints ? ` · ${e.hints}h` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
