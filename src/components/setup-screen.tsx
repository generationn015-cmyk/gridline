import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { MiniBoard } from "@/components/mini-board";
import { Button } from "@/components/ui/button";
import { modeDeck, modeTitle } from "@/lib/game/nina";
import type { Difficulty, Mode, PlayKind } from "@/lib/game/types";
import { filledProgress, runSlot } from "@/lib/persist";
import { useGame } from "@/store/game-store";
import { cn, todayUtc } from "@/lib/utils";

export function SetupScreen() {
  const { setupMode, settings, runs, patchSettings, start, resume, setView } = useGame();
  const mode = setupMode ?? settings.lastMode;
  const [kind, setKind] = useState<PlayKind>(settings.lastKind);
  const [diff, setDiff] = useState<Difficulty>(settings.lastDifficulty);
  const [size, setSize] = useState(settings.lastSize[mode] || defaultSize(mode));
  const [confirmNew, setConfirmNew] = useState(false);

  const date = todayUtc();
  const slot = runSlot({ mode, kind, date, size, difficulty: kind === "daily" ? "medium" : diff });
  const existing = runs[slot];
  const live = existing && !existing.won && !existing.lost ? existing : null;

  const play = (forceNew = false) => {
    patchSettings({ lastKind: kind, lastDifficulty: diff, lastSize: { ...settings.lastSize, [mode]: size } });
    start({
      mode,
      kind,
      difficulty: kind === "daily" ? undefined : diff,
      size: mode === "cross" || mode === "cages" ? size : undefined,
      forceNew,
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10">
      <header className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => setView("home")}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="font-display text-2xl">{modeTitle(mode)}</h1>
      </header>

      <div className="mt-5 flex items-start gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-4">
        <MiniBoard mode={mode} />
        <p className="text-sm leading-relaxed text-muted">{modeDeck(mode)}</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-[var(--radius-lg)] border border-border bg-surface p-1">
        <KindBtn label="Daily" hint="Today's board" on={kind === "daily"} onClick={() => setKind("daily")} />
        <KindBtn label="Practice" hint="Endless" on={kind === "practice"} onClick={() => setKind("practice")} />
      </div>

      {kind === "practice" && (
        <div className="mt-5 space-y-4">
          <Chips
            label="Difficulty"
            value={diff}
            options={["easy", "medium", "hard"]}
            onChange={(d) => setDiff(d as Difficulty)}
          />
          {(mode === "cross" || mode === "cages") && (
            <Chips
              label="Size"
              value={String(size)}
              options={mode === "cross" ? ["5", "7"] : ["4", "5", "6"]}
              labels={mode === "cross" ? ["5×5", "7×7"] : ["4×4", "5×5", "6×6"]}
              onChange={(n) => setSize(Number(n))}
            />
          )}
        </div>
      )}

      {live && !confirmNew && (
        <p className="mt-5 text-sm text-muted">
          A board is in progress ({prog(live)}). Resume it, or start a new one.
        </p>
      )}

      {confirmNew && (
        <div className="mt-5 rounded-[var(--radius-md)] border border-border bg-raised p-3 text-sm text-muted">
          Replace the unfinished board? This cannot be undone.
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="danger" onClick={() => play(true)}>
              New board
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmNew(false)}>
              Keep it
            </Button>
          </div>
        </div>
      )}

      <div className="mt-auto space-y-2 pt-8">
        {live && !confirmNew ? (
          <>
            <Button className="h-14 w-full font-display text-lg" onClick={() => resume(live.slot)}>
              Resume
            </Button>
            <Button variant="secondary" className="h-12 w-full" onClick={() => setConfirmNew(true)}>
              New board
            </Button>
          </>
        ) : (
          !confirmNew && (
            <Button className="h-14 w-full font-display text-lg" onClick={() => play(false)}>
              Play
            </Button>
          )
        )}
      </div>
    </div>
  );
}

function defaultSize(mode: Mode) {
  if (mode === "cross") return 5;
  if (mode === "cages") return 5;
  return 0;
}

function prog(run: { puzzle: { kind: string }; values: (number | null)[][]; line: { guesses: string[] } | null }) {
  const p = filledProgress(run as Parameters<typeof filledProgress>[0]);
  return `${p.filled} of ${p.total}`;
}

function KindBtn({
  label,
  hint,
  on,
  onClick,
}: {
  label: string;
  hint: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "flex h-14 flex-col items-center justify-center rounded-[var(--radius-md)]",
        on ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
      )}
    >
      <span className="font-display text-lg leading-none">{label}</span>
      <span className={cn("mt-1 text-[11px]", on ? "text-accent-fg/80" : "text-subtle")}>{hint}</span>
    </button>
  );
}

function Chips({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: string[];
  onChange: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((o, i) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              "h-10 min-w-11 rounded-full border px-3 text-sm capitalize",
              value === o ? "border-accent bg-accent text-accent-fg" : "border-border bg-surface text-muted",
            )}
          >
            {labels?.[i] ?? o}
          </button>
        ))}
      </div>
    </div>
  );
}
