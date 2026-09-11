import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runDiagnosticsAsync, type DiagReport } from "@/lib/game/diagnostics";
import { useGame } from "@/store/game-store";
import { cn } from "@/lib/utils";

export function DiagnosticsScreen() {
  const { setView } = useGame();
  const [report, setReport] = useState<DiagReport | null>(null);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    setReport({ ranAt: new Date().toISOString(), cases: [], passed: 0, failed: 0 });
    void runDiagnosticsAsync(setReport, { samples: 20 }).then((r) => {
      setReport(r);
      setRunning(false);
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={() => setView("settings")}>
          <ChevronLeft className="size-5" />
        </Button>
        <h1 className="font-display text-2xl">Diagnostics</h1>
      </header>
      <p className="mt-3 text-sm text-muted">
        Generates 20 puzzles per Easy and Medium suite, then runs the solver. Nina does not like failures.
      </p>
      <Button className="mt-4 w-full" onClick={run} disabled={running}>
        {running ? "Composing…" : "Run suite"}
      </Button>
      {report && (
        <div className="mt-6 pb-10">
          <p className={cn("font-display text-xl", report.failed === 0 && report.cases.length ? "text-ok" : report.failed ? "text-danger" : "text-muted")}>
            {report.passed}/{report.passed + report.failed || "…"} passed
          </p>
          <ul className="mt-3 space-y-2">
            {report.cases.map((c) => (
              <li key={c.label} className="rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2">
                <p className="flex items-center justify-between text-sm">
                  <span>{c.label}</span>
                  <span className={c.passed ? "text-ok" : "text-danger"}>{c.passed ? "pass" : "fail"}</span>
                </p>
                <p className="text-xs text-subtle">
                  {c.ms}ms · {c.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
