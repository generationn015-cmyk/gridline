import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Check,
  ChevronLeft,
  Eraser,
  Lightbulb,
  Redo2,
  Share,
  Undo2,
} from "lucide-react";
import { CrossBoard } from "@/components/boards/cross-board";
import { CagesBoard } from "@/components/boards/cages-board";
import { LineBoard } from "@/components/boards/line-board";
import { StackBoard } from "@/components/boards/stack-board";
import { NinaMark } from "@/components/nina-mark";
import { NumberPad } from "@/components/number-pad";
import { Button } from "@/components/ui/button";
import { modeTitle } from "@/lib/game/nina";
import { formatTime } from "@/lib/utils";
import { useGame } from "@/store/game-store";

export function PlayScreen() {
  const session = useGame((s) => s.session);
  const settings = useGame((s) => s.settings);
  const backHome = useGame((s) => s.backHome);
  const selectCell = useGame((s) => s.selectCell);
  const enterDigit = useGame((s) => s.enterDigit);
  const moveSel = useGame((s) => s.moveSel);
  const undo = useGame((s) => s.undo);
  const redo = useGame((s) => s.redo);
  const clearBoard = useGame((s) => s.clearBoard);
  const hint = useGame((s) => s.hint);
  const check = useGame((s) => s.check);
  const lineType = useGame((s) => s.lineType);
  const lineSubmit = useGame((s) => s.lineSubmit);
  const lineBackspace = useGame((s) => s.lineBackspace);
  const tick = useGame((s) => s.tick);

  useEffect(() => {
    if (!session || session.won || session.lost) return;
    let last = performance.now();
    let acc = 0;
    let id = 0;
    const loop = (now: number) => {
      acc += Math.min(now - last, 100);
      last = now;
      if (acc >= 250) {
        tick(acc);
        acc = 0;
      }
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [session?.won, session?.lost, session?.running, tick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState().session;
      if (!s || s.won) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        if (s.puzzle.kind === "line") lineBackspace();
        else enterDigit(null);
        return;
      }
      if (e.key === "Enter" && s.puzzle.kind === "line") {
        e.preventDefault();
        lineSubmit();
        return;
      }
      if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const map: Record<string, [number, number]> = {
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
          ArrowLeft: [0, -1],
          ArrowRight: [0, 1],
        };
        const [dr, dc] = map[e.key]!;
        moveSel(dr, dc);
        return;
      }
      if (s.puzzle.kind === "line") {
        const ch = e.key;
        if (/^[0-9+\-*/=xX]$/.test(ch)) {
          e.preventDefault();
          lineType(ch === "x" || ch === "X" ? "*" : ch);
        }
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        const n = Number(e.key);
        if (s.puzzle.kind === "cages" && (n > s.puzzle.size || n === 0)) return;
        enterDigit(n);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enterDigit, lineBackspace, lineSubmit, lineType, moveSel, redo, undo]);

  if (!session) return null;
  const s = session;
  const padMax = s.puzzle.kind === "cages" ? s.puzzle.size : 9;
  const includeZero = s.puzzle.kind !== "cages";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={backHome}>
          <ChevronLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-subtle">
            {s.kind === "daily" ? "Daily" : "Practice"} · {s.difficulty}
            {s.puzzle.kind === "cross" && ` · ${s.puzzle.evalMode === "ltr" ? "left to right" : "order"}`}
          </p>
          <h1 className="font-display text-xl leading-none">{modeTitle(s.mode)}</h1>
        </div>
        <PlayTimer hide={settings.hideTimer} />
      </header>

      <div className="mt-3 flex items-start gap-2 px-1">
        <NinaMark size="sm" />
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">Nina</p>
          <p key={s.nina} className="nina-line text-sm leading-snug text-muted">
            {s.nina}
          </p>
        </div>
      </div>

      <div className="mt-4 flex-1">
        {s.puzzle.kind === "cross" && (
          <CrossBoard
            puzzle={s.puzzle}
            values={s.values}
            selected={s.selected}
            conflicts={s.conflicts}
            onSelect={selectCell}
          />
        )}
        {s.puzzle.kind === "cages" && (
          <CagesBoard
            puzzle={s.puzzle}
            values={s.values}
            selected={s.selected}
            conflicts={s.conflicts}
            onSelect={selectCell}
          />
        )}
        {s.puzzle.kind === "line" && s.line && (
          <LineBoard
            puzzle={s.puzzle}
            guesses={s.line.guesses}
            current={s.line.current}
            marks={s.line.marks}
            revealed={s.line.revealed}
          />
        )}
        {s.puzzle.kind === "line2d" && (
          <StackBoard
            puzzle={s.puzzle}
            values={s.values}
            selected={s.selected}
            conflicts={s.conflicts}
            onSelect={selectCell}
          />
        )}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1 text-xs uppercase tracking-wider text-subtle">
        <IconBtn label="Undo" onClick={undo}>
          <Undo2 className="size-4" />
        </IconBtn>
        <IconBtn label="Redo" onClick={redo}>
          <Redo2 className="size-4" />
        </IconBtn>
        <IconBtn label="Clear" onClick={clearBoard}>
          <Eraser className="size-4" />
        </IconBtn>
        <IconBtn label="Hint" onClick={hint}>
          <Lightbulb className="size-4" />
        </IconBtn>
        <IconBtn label="Check" onClick={check}>
          <Check className="size-4" />
        </IconBtn>
      </div>

      <div className="mt-3">
        {s.puzzle.kind === "line" ? (
          <div className="pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <NumberPad
              max={9}
              includeZero
              onDigit={(d) => lineType(String(d))}
              onDelete={lineBackspace}
              ops={["+", "-", "×", "÷", "="]}
              onOp={(op) => lineType(op)}
            />
            <Button className="mt-2 w-full" onClick={lineSubmit}>
              Enter
            </Button>
          </div>
        ) : (
          <NumberPad
            max={padMax}
            includeZero={includeZero}
            onDigit={(d) => enterDigit(d)}
            onDelete={() => enterDigit(null)}
          />
        )}
      </div>

      {(s.won || s.lost) && <ResultOverlay />}
    </div>
  );
}

function PlayTimer({ hide }: { hide: boolean }) {
  const elapsedMs = useGame((s) => s.session?.elapsedMs ?? 0);
  if (hide) return <span className="w-10" />;
  return <p className="tabular-nums text-sm text-muted">{formatTime(elapsedMs)}</p>;
}

function IconBtn({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-12 min-w-12 flex-col items-center justify-center rounded-[var(--radius-sm)] text-muted hover:bg-raised hover:text-fg"
    >
      {children}
      <span className="mt-0.5 leading-none">{label}</span>
    </button>
  );
}

function ResultOverlay() {
  const session = useGame((s) => s.session)!;
  const start = useGame((s) => s.start);
  const backHome = useGame((s) => s.backHome);
  const shareText = useGame((s) => s.shareText);
  const copied = useRef(false);
  const [copiedOn, setCopiedOn] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText());
      copied.current = true;
      setCopiedOn(true);
    } catch {
      /* ignore */
    }
  };

  const s = session;
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-bg/70 p-4 sm:items-center">
      <div className="win-card w-full max-w-sm rounded-[var(--radius-xl)] border border-border bg-surface p-5 shadow-[var(--shadow-soft)]">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-accent">Nina</p>
        <h2 className="mt-1 font-display text-3xl tracking-tight">{s.won ? "Solved." : "Not this time."}</h2>
        <p className="mt-2 text-sm text-muted">{copiedOn ? "Copied. Send it to someone patient." : s.nina}</p>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat k="Time" v={formatTime(s.elapsedMs)} />
          <Stat k="Hints" v={String(s.hints)} />
          <Stat k="Kind" v={s.kind === "daily" ? "Daily" : "Practice"} />
        </dl>
        <div className="mt-5 flex flex-col gap-2">
          <Button onClick={copy} className="w-full">
            <Share className="size-4" /> Share time
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() =>
              start({
                mode: s.mode,
                kind: s.kind === "daily" ? "practice" : s.kind,
                difficulty: s.difficulty,
                size: s.puzzle.kind === "cross" || s.puzzle.kind === "cages" ? s.puzzle.size : undefined,
              })
            }
          >
            New puzzle
          </Button>
          <Button variant="ghost" className="w-full" onClick={backHome}>
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-raised px-2 py-2">
      <dt className="text-[10px] uppercase tracking-wider text-subtle">{k}</dt>
      <dd className="font-display text-lg tabular-nums">{v}</dd>
    </div>
  );
}
