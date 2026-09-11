import { BRAND, COPY } from "@/lib/brand";
import { filledProgress, type RunState } from "@/lib/persist";
import { modeTitle } from "@/lib/game/nina";
import { Button } from "@/components/ui/button";
import { NinaMark } from "@/components/nina-mark";
import { useGame } from "@/store/game-store";

export function SplashScreen() {
  const { profile, continuePtr, runs, resume, dismissSplash } = useGame();
  const run = continuePtr ? runs[continuePtr.slot] : null;
  const live = run && !run.won && !run.lost ? run : null;
  const first = !profile.firstLaunchDone;

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center px-6 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
      <span className="absolute right-5 top-[max(1rem,env(safe-area-inset-top))] font-display text-lg text-accent">
        {BRAND.monogram}
      </span>
      <NinaMark size="lg" />
      <h1 className="mt-5 font-display text-5xl tracking-tight">{BRAND.title}</h1>
      <p className="nina-line mt-3 max-w-xs text-center text-sm text-muted">
        {first
          ? COPY.firstBoard
          : live
            ? `${COPY.welcomeBack} ${modeTitle(live.mode)} is waiting.`
            : COPY.welcomeBack}
      </p>
      <div className="mt-10 flex w-full max-w-sm flex-col gap-2">
        {live && (
          <Button className="h-14 w-full font-display text-lg" onClick={() => resume(live.slot)}>
            {COPY.continue}
            <span className="font-sans text-sm font-normal opacity-80">{label(live)}</span>
          </Button>
        )}
        <Button
          variant={live ? "secondary" : "primary"}
          className="h-14 w-full font-display text-lg"
          onClick={dismissSplash}
        >
          {COPY.start}
        </Button>
      </div>
    </div>
  );
}

function label(run: RunState) {
  const p = filledProgress(run);
  if (run.puzzle.kind === "line") return `${modeTitle(run.mode)} · ${p.filled}/${p.total}`;
  return `${modeTitle(run.mode)} · ${p.filled} of ${p.total}`;
}
