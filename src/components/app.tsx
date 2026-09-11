"use client";

import { useEffect } from "react";
import { DiagnosticsScreen } from "@/components/diagnostics-screen";
import { HomeScreen } from "@/components/home-screen";
import { HowScreen } from "@/components/how-screen";
import { NinaMark } from "@/components/nina-mark";
import { PlayScreen } from "@/components/play-screen";
import { SettingsScreen } from "@/components/settings-screen";
import { unlockAudio } from "@/lib/audio";
import { useGame } from "@/store/game-store";

export function App() {
  const { view, hydrate, hydrated, composing, settings } = useGame();

  useEffect(() => {
    hydrate();
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    const vis = () => {
      if (document.visibilityState === "visible") unlockAudio();
    };
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, [hydrate]);

  useEffect(() => {
    if (settings.reduceMotion) document.documentElement.classList.add("reduce-motion");
  }, [settings.reduceMotion]);

  if (!hydrated) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-bg text-fg">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-accent">Nina</p>
        <p className="font-display text-2xl tracking-tight">GRIDLINE</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-bg text-fg">
      {view === "home" && <HomeScreen />}
      {view === "play" && <PlayScreen />}
      {view === "settings" && <SettingsScreen />}
      {view === "diagnostics" && <DiagnosticsScreen />}
      {view === "how" && <HowScreen />}
      {composing && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-bg/80">
          <NinaMark named size="lg" />
          <p className="font-display text-xl text-muted">composing…</p>
        </div>
      )}
    </main>
  );
}
