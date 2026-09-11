"use client";

import { useEffect } from "react";
import { DiagnosticsScreen } from "@/components/diagnostics-screen";
import { HomeScreen } from "@/components/home-screen";
import { HowScreen } from "@/components/how-screen";
import { JournalScreen } from "@/components/journal-screen";
import { NinaMark } from "@/components/nina-mark";
import { PlayScreen } from "@/components/play-screen";
import { SettingsScreen } from "@/components/settings-screen";
import { SetupScreen } from "@/components/setup-screen";
import { SplashScreen } from "@/components/splash-screen";
import { BRAND } from "@/lib/brand";
import { ninaComposing } from "@/lib/game/nina";
import { unlockAudio } from "@/lib/audio";
import { useGame } from "@/store/game-store";

export function App() {
  const { view, hydrate, hydrated, composing, settings } = useGame();

  useEffect(() => {
    hydrate();
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const persist = () => useGame.getState().persistRun();
    const vis = () => {
      if (document.visibilityState === "hidden") persist();
      else unlockAudio();
    };
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", persist);
    return () => {
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pagehide", persist);
    };
  }, [hydrate]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion);
  }, [settings.reduceMotion]);

  if (!hydrated) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-bg text-fg">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent">{BRAND.name}</p>
        <p className="font-display text-2xl tracking-tight">{BRAND.title}</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-bg text-fg">
      {view === "splash" && <SplashScreen />}
      {view === "home" && <HomeScreen />}
      {view === "setup" && <SetupScreen />}
      {view === "play" && <PlayScreen />}
      {view === "settings" && <SettingsScreen />}
      {view === "diagnostics" && <DiagnosticsScreen />}
      {view === "how" && <HowScreen />}
      {view === "journal" && <JournalScreen />}
      {composing && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-bg/80">
          <NinaMark named size="lg" />
          <p className="font-display text-xl text-muted">{ninaComposing()}</p>
        </div>
      )}
    </main>
  );
}
