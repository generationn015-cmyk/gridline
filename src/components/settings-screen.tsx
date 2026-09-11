import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { useGame } from "@/store/game-store";
import { cn } from "@/lib/utils";

export function SettingsScreen() {
  const { settings, patchSettings, setView, openHow, exportJson, importJson, resetProgress } = useGame();
  const fileRef = useRef<HTMLInputElement>(null);
  const [resetStep, setResetStep] = useState(0);
  const [importErr, setImportErr] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nina-save.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      importJson(text);
      setImportErr(null);
    } catch {
      setImportErr("That file isn't a NINA save.");
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => setView("home")}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="font-display text-2xl">Settings</h1>
      </header>

      <div className="mt-6 space-y-6">
        <Row label="Theme" hint="Near-black or paper">
          <Seg
            value={settings.theme}
            options={[
              { id: "dark", label: "Dark" },
              { id: "light", label: "Light" },
            ]}
            onChange={(theme) => patchSettings({ theme: theme as "dark" | "light" })}
          />
        </Row>
        <Row label="Cross evaluation" hint="Applies to the next Cross puzzle">
          <Seg
            value={settings.evalMode}
            options={[
              { id: "ltr", label: "Left to right" },
              { id: "pemdas", label: "Order of ops" },
            ]}
            onChange={(evalMode) => patchSettings({ evalMode: evalMode as "ltr" | "pemdas" })}
          />
        </Row>
        <Toggle label="Sound" on={settings.sound} onChange={(sound) => patchSettings({ sound })} />
        <Toggle
          label="Haptics"
          on={settings.haptics}
          onChange={(haptics) => patchSettings({ haptics })}
        />
        <Toggle
          label="Reduce motion"
          on={settings.reduceMotion}
          onChange={(reduceMotion) => patchSettings({ reduceMotion })}
        />
        <Toggle
          label="Hide timer"
          on={settings.hideTimer}
          onChange={(hideTimer) => patchSettings({ hideTimer })}
        />
      </div>

      <div className="mt-10 space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">Save</p>
        <Button variant="secondary" className="w-full" onClick={download}>
          Export progress
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()}>
          Import progress
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        {importErr && <p className="text-sm text-danger">{importErr}</p>}
      </div>

      <div className="mt-8 space-y-2">
        {resetStep === 0 && (
          <button
            type="button"
            className="text-sm text-subtle underline-offset-4 hover:text-danger hover:underline"
            onClick={() => setResetStep(1)}
          >
            Reset progress
          </button>
        )}
        {resetStep === 1 && (
          <div className="rounded-[var(--radius-md)] border border-border bg-raised p-3 text-sm text-muted">
            Erase journal, streak, and unfinished boards? Settings stay.
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="danger" onClick={() => setResetStep(2)}>
                Yes, reset
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResetStep(0)}>
                Keep it
              </Button>
            </div>
          </div>
        )}
        {resetStep === 2 && (
          <div className="rounded-[var(--radius-md)] border border-danger/40 bg-raised p-3 text-sm text-muted">
            Last chance. This cannot be undone.
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  resetProgress();
                  setResetStep(0);
                }}
              >
                Erase everything
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setResetStep(0)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        className="mt-8 self-start text-sm text-subtle underline-offset-4 hover:text-muted hover:underline"
        onClick={() => openHow("settings")}
      >
        How to play
      </button>
      <button
        type="button"
        className="mt-3 self-start text-sm text-subtle underline-offset-4 hover:text-muted hover:underline"
        onClick={() => setView("diagnostics")}
      >
        Diagnostics
      </button>
      <p className="mt-8 pb-10 text-xs leading-relaxed text-subtle">
        {BRAND.title} is set by {BRAND.name}. Boards are generated on your device. Daily puzzles use a date
        seed so every player gets the same Cross, Cages, and Line. Progress stays in this browser.
      </p>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-subtle">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Seg({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex rounded-[var(--radius-md)] border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-10 flex-1 rounded-[var(--radius-sm)] text-sm",
            value === o.id ? "bg-accent text-accent-fg" : "text-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-border bg-surface px-3 py-3"
      aria-pressed={on}
    >
      <span className="text-sm">{label}</span>
      <span className={cn("relative h-6 w-10 rounded-full transition-colors", on ? "bg-accent" : "bg-raised")}>
        <span
          className={cn(
            "absolute top-0.5 size-5 rounded-full bg-fg transition-transform",
            on ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}
