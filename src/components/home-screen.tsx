import { Calendar, Equal, Grid3x3, Hash, Settings, Spline } from "lucide-react";
import { NinaMark } from "@/components/nina-mark";
import { Button } from "@/components/ui/button";
import { modeDeck, modeTitle, ninaGreeting, ninaHomeLine } from "@/lib/game/nina";
import type { Difficulty, Mode } from "@/lib/game/types";
import { useGame } from "@/store/game-store";
import { formatDatePretty, todayUtc } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MODES: Mode[] = ["cross", "cages", "line", "line2d"];

export function HomeScreen() {
  const { stats, settings, start, setView, patchSettings } = useGame();
  const date = todayUtc();
  const day = stats.daily[date] ?? {};

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent">Nina</p>
          <h1 className="font-display text-[2.35rem] leading-none tracking-[-0.03em] text-fg">GRIDLINE</h1>
        </div>
        <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => setView("settings")}>
          <Settings className="size-5" />
        </Button>
      </header>

      <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-xl)] border border-border bg-surface p-4">
        <NinaMark />
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-subtle">The setter</p>
          <p className="nina-line mt-1 text-[15px] leading-snug text-fg">{ninaGreeting(stats.streak)}</p>
          <p className="mt-1 text-sm text-muted">{ninaHomeLine()}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm text-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-raised px-3 py-1 tabular-nums text-fg">
          <Calendar className="size-3.5 text-accent" />
          {stats.streak} day streak
        </span>
        <span className="text-subtle">best {stats.bestStreak}</span>
      </div>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl tracking-tight">Daily</h2>
          <p className="text-xs text-subtle">{formatDatePretty(date)}</p>
        </div>
        <p className="mt-1 text-sm text-muted">Same boards for everyone. Medium. UTC day. Nina’s.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["cross", "cages", "line"] as Mode[]).map((mode) => {
            const done = day[mode]?.solved;
            return (
              <button
                key={mode}
                onClick={() => start({ mode, kind: "daily" })}
                className={cn(
                  "flex min-h-[5.5rem] flex-col items-start justify-between rounded-[var(--radius-lg)] border p-3 text-left transition-colors",
                  done
                    ? "border-accent/40 bg-raised"
                    : "border-border bg-surface hover:border-border-strong",
                )}
              >
                <span className="flex w-full items-center justify-between">
                  <ModeIcon mode={mode} />
                  {done ? (
                    <span className="text-[11px] font-medium uppercase tracking-wider text-accent">Filed</span>
                  ) : (
                    <span className="text-[11px] uppercase tracking-wider text-subtle">Open</span>
                  )}
                </span>
                <span>
                  <span className="block font-display text-lg leading-none">{modeTitle(mode)}</span>
                  {done && day[mode]?.timeMs != null && (
                    <span className="mt-1 block text-xs tabular-nums text-muted">
                      {fmt(day[mode]!.timeMs)}
                      {day[mode]!.hints ? " · hinted" : ""}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
          <button
            onClick={() => start({ mode: "line2d", kind: "daily" })}
            className={cn(
              "flex min-h-[5.5rem] flex-col items-start justify-between rounded-[var(--radius-lg)] border p-3 text-left",
              day.line2d?.solved ? "border-accent/40 bg-raised" : "border-border bg-surface hover:border-border-strong",
            )}
          >
            <span className="flex w-full items-center justify-between">
              <ModeIcon mode="line2d" />
              <span className="text-[11px] uppercase tracking-wider text-subtle">
                {day.line2d?.solved ? "Filed" : "Extra"}
              </span>
            </span>
            <span className="font-display text-lg leading-none">Stack</span>
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl tracking-tight">Practice</h2>
        <p className="mt-1 text-sm text-muted">Infinite boards. Nina keeps the receipts.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => patchSettings({ lastDifficulty: d })}
              className={cn(
                "h-9 rounded-full border px-3 text-sm capitalize",
                settings.lastDifficulty === d
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border bg-surface text-muted",
              )}
            >
              {d}
            </button>
          ))}
        </div>
        <SizeRow mode="cross" sizes={[5, 7]} />
        <SizeRow mode="cages" sizes={[4, 5, 6]} />

        <div className="mt-3 grid gap-2">
          {MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => start({ mode, kind: "practice" })}
              className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface p-3 text-left hover:border-border-strong"
            >
              <span className="flex size-11 items-center justify-center rounded-[var(--radius-md)] bg-raised text-accent">
                <ModeIcon mode={mode} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg leading-none">{modeTitle(mode)}</span>
                <span className="mt-1 block text-sm text-muted">{modeDeck(mode)}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={() => setView("how")}
        className="mt-8 self-start text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
      >
        How to play
      </button>
    </div>
  );
}

function SizeRow({ mode, sizes }: { mode: "cross" | "cages"; sizes: number[] }) {
  const { settings, patchSettings } = useGame();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-subtle">
        {mode === "cross" ? "Cross" : "Cages"}
      </span>
      {sizes.map((n) => (
        <button
          key={n}
          onClick={() =>
            patchSettings({
              lastSize: { ...settings.lastSize, [mode]: n },
            })
          }
          className={cn(
            "h-9 min-w-11 rounded-full border px-3 text-sm tabular-nums",
            settings.lastSize[mode] === n
              ? "border-accent bg-accent text-accent-fg"
              : "border-border bg-surface text-muted",
          )}
        >
          {n}×{n}
        </button>
      ))}
    </div>
  );
}

function ModeIcon({ mode }: { mode: Mode }) {
  const cls = "size-5";
  if (mode === "cross") return <Grid3x3 className={cls} />;
  if (mode === "cages") return <Hash className={cls} />;
  if (mode === "line") return <Equal className={cls} />;
  return <Spline className={cls} />;
}

function fmt(ms: number) {
  const t = Math.floor(ms / 1000);
  return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;
}
