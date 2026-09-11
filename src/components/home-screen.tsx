import { BookOpen, Settings } from "lucide-react";
import { MiniBoard } from "@/components/mini-board";
import { NinaMark } from "@/components/nina-mark";
import { BRAND, COPY } from "@/lib/brand";
import { dailySize } from "@/lib/game/generate";
import { modeDeck, modeTitle, ninaGreeting } from "@/lib/game/nina";
import type { Mode } from "@/lib/game/types";
import { filledProgress, runSlot, type RunState } from "@/lib/persist";
import { useGame } from "@/store/game-store";
import { cn, formatDatePretty, formatTime, todayUtc } from "@/lib/utils";

const GAMES: Mode[] = ["cross", "cages", "line", "line2d"];
const DAILY: Mode[] = ["cross", "cages", "line"];

export function HomeScreen() {
  const { stats, continuePtr, runs, resume, openSetup, start, setView } = useGame();
  const date = todayUtc();
  const day = stats.daily[date] ?? {};
  const run = continuePtr ? runs[continuePtr.slot] : undefined;
  const live = run && !run.won && !run.lost ? run : null;
  const dailyTimes = DAILY.map((m) => day[m]?.timeMs).filter((n): n is number => n != null);
  const bestDaily = dailyTimes.length ? Math.min(...dailyTimes) : null;

  const playDaily = (m: Mode, done: boolean) => {
    if (done) {
      openSetup(m, "practice");
      return;
    }
    const slot = runSlot({ mode: m, kind: "daily", date, size: dailySize(m), difficulty: "medium" });
    const existing = runs[slot];
    if (existing && !existing.won && !existing.lost) resume(slot);
    else start({ mode: m, kind: "daily" });
  };

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <span className="pointer-events-none absolute right-4 top-[max(1rem,env(safe-area-inset-top))] font-display text-lg text-accent/80">
        {BRAND.monogram}
      </span>
      <header className="flex items-center justify-between pr-8">
        <div className="flex items-center gap-2.5">
          <NinaMark size="sm" />
          <h1 className="font-display text-[2.15rem] leading-none tracking-tight">{BRAND.title}</h1>
        </div>
        <button
          type="button"
          aria-label="Settings"
          onClick={() => setView("settings")}
          className="flex size-11 items-center justify-center rounded-[var(--radius-md)] text-muted hover:bg-raised hover:text-fg"
        >
          <Settings className="size-5" />
        </button>
      </header>

      <p className="nina-line mt-3 text-sm text-muted">{ninaGreeting(stats.streak)}</p>

      {live && (
        <button
          type="button"
          onClick={() => resume(live.slot)}
          className="mt-5 flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-accent/40 bg-raised p-4 text-left"
        >
          <MiniBoard mode={live.mode} />
          <span className="min-w-0 flex-1">
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-accent">{COPY.continue}</span>
            <span className="mt-1 block font-display text-xl leading-none">{modeTitle(live.mode)}</span>
            <span className="mt-1 block text-sm text-muted">
              {live.kind === "daily" ? "Daily" : "Practice"} · {live.difficulty}
              {live.puzzle.kind === "cross" || live.puzzle.kind === "cages"
                ? ` · ${live.puzzle.size}×${live.puzzle.size}`
                : ""}
              {" · "}
              {prog(live)}
            </span>
            <span className="mt-0.5 block text-xs tabular-nums text-subtle">{formatTime(live.elapsedMs)}</span>
          </span>
        </button>
      )}

      <section className="mt-7">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">{COPY.daily}</h2>
        <p className="mt-1 text-xs text-muted">{formatDatePretty(date)}</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {DAILY.map((m) => {
            const done = !!day[m]?.solved;
            return (
              <button
                key={m}
                type="button"
                onClick={() => playDaily(m, done)}
                className={cn(
                  "flex min-h-[4.75rem] flex-col items-start justify-between rounded-[var(--radius-md)] border p-2.5 text-left",
                  done ? "border-accent/40 bg-raised" : "border-border bg-surface",
                )}
              >
                <span className="flex w-full items-center justify-between">
                  <span className="font-display text-base leading-none">{modeTitle(m)}</span>
                  <span className={cn("text-[10px] uppercase tracking-wider", done ? "text-accent" : "text-subtle")}>
                    {done ? "Done" : "Open"}
                  </span>
                </span>
                {done && day[m]?.timeMs != null && (
                  <span className="text-xs tabular-nums text-muted">{formatTime(day[m]!.timeMs)}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">Games</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {GAMES.map((m) => {
            const badge = stats.badges[m];
            return (
              <button
                key={m}
                type="button"
                onClick={() => openSetup(m)}
                className="game-tile flex min-h-[8.25rem] flex-col rounded-[var(--radius-lg)] border border-border bg-surface p-3 text-left hover:border-border-strong"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-xl leading-none">{modeTitle(m)}</span>
                  {badge?.easy && (
                    <span className="text-[10px] uppercase tracking-wider text-accent">
                      {badge.hard ? "Hard" : "Warm"}
                    </span>
                  )}
                </span>
                <span className="mt-3 flex flex-1 items-center justify-center" aria-hidden>
                  <MiniBoard mode={m} />
                </span>
                <span className="mt-2 text-xs text-muted">{modeDeck(m)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        <Stat k="Streak" v={String(stats.streak)} />
        <Stat k="Solved" v={String(stats.finished)} />
        <Stat k="Daily best" v={bestDaily != null ? formatTime(bestDaily) : "—"} />
      </div>

      <button
        type="button"
        onClick={() => setView("journal")}
        className="mt-5 inline-flex items-center gap-2 self-start text-sm text-muted hover:text-fg"
      >
        <BookOpen className="size-4" />
        Journal
      </button>
    </div>
  );
}

function prog(run: RunState) {
  const p = filledProgress(run);
  if (run.puzzle.kind === "line") return `${p.filled}/${p.total}`;
  return `${p.filled} of ${p.total}`;
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border bg-surface px-2 py-2">
      <p className="text-[10px] uppercase tracking-wider text-subtle">{k}</p>
      <p className="font-display text-lg tabular-nums">{v}</p>
    </div>
  );
}
