import { create } from "zustand";
import { sfx, setMuted, unlockAudio } from "@/lib/audio";
import { dailyDifficulty, dailySize, generatePuzzle } from "@/lib/game/generate";
import { ninaCheck, ninaHint, ninaLose, ninaStart, ninaWin } from "@/lib/game/nina";
import type { EvalMode } from "@/lib/game/math";
import type { Difficulty, Mode, PlayKind, Puzzle } from "@/lib/game/types";
import {
  defaultSettings,
  defaultStats,
  loadSave,
  writeSave,
  type DailyEntry,
  type Settings,
  type Stats,
} from "@/lib/persist";
import { todayUtc } from "@/lib/utils";
import {
  emptyCrossValues,
  hintCross,
  isCrossWin,
  crossConflicts,
} from "@/lib/game/cross";
import {
  emptyCagesValues,
  hintCages,
  isCagesWin,
  cagesConflicts,
} from "@/lib/game/cages";
import {
  emptyLine2dValues,
  hintLine2d,
  isLine2dWin,
  line2dConflicts,
  scoreLine,
  validEquation,
} from "@/lib/game/line";
import type { LineMark } from "@/lib/game/types";

export type View = "home" | "play" | "settings" | "diagnostics" | "how";

export interface LineState {
  guesses: string[];
  current: string;
  marks: LineMark[][];
  revealed: boolean;
}

interface Session {
  puzzle: Puzzle;
  mode: Mode;
  kind: PlayKind;
  difficulty: Difficulty;
  date: string;
  startedAt: number;
  elapsedMs: number;
  running: boolean;
  hints: number;
  nina: string;
  won: boolean;
  lost: boolean;
  conflicts: boolean[][] | null;
  // grid modes
  values: (number | null)[][];
  selected: { r: number; c: number } | null;
  history: (number | null)[][][];
  future: (number | null)[][][];
  // line
  line: LineState | null;
}

interface GameState {
  hydrated: boolean;
  view: View;
  settings: Settings;
  stats: Stats;
  session: Session | null;
  composing: boolean;
  flashWin: boolean;
  hydrate: () => void;
  persist: () => void;
  setView: (v: View) => void;
  patchSettings: (p: Partial<Settings>) => void;
  start: (opts: {
    mode: Mode;
    kind: PlayKind;
    size?: number;
    difficulty?: Difficulty;
  }) => void;
  backHome: () => void;
  tick: (dt: number) => void;
  selectCell: (r: number, c: number) => void;
  enterDigit: (d: number | null) => void;
  moveSel: (dr: number, dc: number) => void;
  undo: () => void;
  redo: () => void;
  clearBoard: () => void;
  hint: () => void;
  check: () => void;
  lineType: (ch: string) => void;
  lineSubmit: () => void;
  lineBackspace: () => void;
  shareText: () => string;
  recordWin: () => void;
}

function cloneGrid(g: (number | null)[][]): (number | null)[][] {
  return g.map((row) => row.slice());
}

function initValues(puzzle: Puzzle): (number | null)[][] {
  if (puzzle.kind === "cross") return emptyCrossValues(puzzle);
  if (puzzle.kind === "cages") return emptyCagesValues(puzzle);
  if (puzzle.kind === "line2d") return emptyLine2dValues(puzzle);
  return [];
}

function firstEmpty(values: (number | null)[][], puzzle: Puzzle): { r: number; c: number } | null {
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values[r]!.length; c++) {
      if (puzzle.kind === "cross") {
        const cell = puzzle.cells[r]![c]!;
        if (cell.type === "digit" && !cell.given && values[r]![c] === null) return { r, c };
      } else if (values[r]![c] === null) return { r, c };
    }
  }
  return values.length ? { r: 0, c: 0 } : null;
}

export const useGame = create<GameState>((set, get) => ({
  hydrated: false,
  view: "home",
  settings: defaultSettings,
  stats: defaultStats,
  session: null,
  composing: false,
  flashWin: false,

  hydrate() {
    const save = loadSave();
    set({ settings: save.settings, stats: save.stats, hydrated: true });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", save.settings.theme === "light");
      document.documentElement.classList.toggle("dark", save.settings.theme !== "light");
    }
    setMuted(!save.settings.sound);
  },

  persist() {
    const { settings, stats } = get();
    writeSave({ version: 1, settings, stats });
  },

  setView(v) {
    set({ view: v });
  },

  patchSettings(p) {
    const settings = { ...get().settings, ...p };
    set({ settings });
    if (p.theme) {
      document.documentElement.classList.toggle("light", settings.theme === "light");
      document.documentElement.classList.toggle("dark", settings.theme !== "light");
    }
    if (p.sound !== undefined) setMuted(!p.sound);
    get().persist();
  },

  start({ mode, kind, size, difficulty }) {
    unlockAudio();
    const settings = get().settings;
    const diff = difficulty ?? (kind === "daily" ? dailyDifficulty() : settings.lastDifficulty);
    const sz = size ?? (kind === "daily" ? dailySize(mode) : settings.lastSize[mode]);
    const date = todayUtc();
    set({ composing: true, flashWin: false });
    window.setTimeout(() => {
      const puzzle = generatePuzzle({
        mode,
        kind,
        date,
        size: sz,
        difficulty: diff,
        evalMode: settings.evalMode,
        entropy: Date.now(),
      });
      const values = initValues(puzzle);
      const session: Session = {
        puzzle,
        mode,
        kind,
        difficulty: diff,
        date,
        startedAt: Date.now(),
        elapsedMs: 0,
        running: true,
        hints: 0,
        nina: ninaStart(mode, kind === "daily"),
        won: false,
        lost: false,
        conflicts: null,
        values,
        selected: firstEmpty(values, puzzle),
        history: [],
        future: [],
        line:
          puzzle.kind === "line"
            ? { guesses: [], current: "", marks: [], revealed: false }
            : null,
      };
      set({
        session,
        composing: false,
        view: "play",
        settings: {
          ...settings,
          lastMode: mode,
          lastKind: kind,
          lastDifficulty: diff,
          lastSize: { ...settings.lastSize, [mode]: sz },
        },
      });
      get().persist();
    }, 40);
  },

  backHome() {
    set({ view: "home", session: null, flashWin: false });
  },

  tick(dt) {
    const s = get().session;
    if (!s || !s.running || s.won || s.lost) return;
    set({ session: { ...s, elapsedMs: s.elapsedMs + dt } });
  },

  selectCell(r, c) {
    const s = get().session;
    if (!s || s.won) return;
    if (s.puzzle.kind === "cross") {
      const cell = s.puzzle.cells[r]?.[c];
      if (!cell || cell.type !== "digit" || cell.given) return;
    }
    set({ session: { ...s, selected: { r, c }, conflicts: null } });
  },

  enterDigit(d) {
    const s = get().session;
    if (!s || s.won || s.lost || !s.selected) return;
    const { r, c } = s.selected;
    if (s.puzzle.kind === "cross") {
      const cell = s.puzzle.cells[r]![c]!;
      if (cell.type !== "digit" || cell.given) return;
    }
    const next = cloneGrid(s.values);
    next[r]![c] = d;
    // Stack: keep shared chain digits in sync
    if (s.puzzle.kind === "line2d") {
      if (c === 2 && r < 2) next[r + 1]![0] = d;
      if (c === 0 && r > 0) next[r - 1]![2] = d;
    }
    if (get().settings.sound) sfx.place();
    const history = [...s.history, cloneGrid(s.values)].slice(-80);
    let won = false;
    if (s.puzzle.kind === "cross") won = isCrossWin(s.puzzle, next);
    if (s.puzzle.kind === "cages") won = isCagesWin(s.puzzle, next);
    if (s.puzzle.kind === "line2d") won = isLine2dWin(s.puzzle, next);
    set({
      session: {
        ...s,
        values: next,
        history,
        future: [],
        conflicts: null,
        won,
        running: !won,
        nina: won ? ninaWin({ hints: s.hints, seconds: s.elapsedMs / 1000, daily: s.kind === "daily" }) : s.nina,
      },
      flashWin: won,
    });
    if (won) {
      if (get().settings.sound) sfx.win();
      get().recordWin();
    }
  },

  moveSel(dr, dc) {
    const s = get().session;
    if (!s || !s.selected) return;
    const rows = s.values.length;
    const cols = s.values[0]?.length ?? 0;
    if (!rows) return;
    let r = s.selected.r;
    let c = s.selected.c;
    for (let i = 0; i < rows * cols; i++) {
      r = (r + dr + rows) % rows;
      c = (c + dc + cols) % cols;
      if (s.puzzle.kind === "cross") {
        const cell = s.puzzle.cells[r]![c]!;
        if (cell.type === "digit" && !cell.given) {
          set({ session: { ...s, selected: { r, c } } });
          return;
        }
      } else {
        set({ session: { ...s, selected: { r, c } } });
        return;
      }
    }
  },

  undo() {
    const s = get().session;
    if (!s || s.won || s.history.length === 0) return;
    const prev = s.history[s.history.length - 1]!;
    set({
      session: {
        ...s,
        values: prev,
        history: s.history.slice(0, -1),
        future: [cloneGrid(s.values), ...s.future].slice(0, 80),
        conflicts: null,
      },
    });
  },

  redo() {
    const s = get().session;
    if (!s || s.won || s.future.length === 0) return;
    const nxt = s.future[0]!;
    set({
      session: {
        ...s,
        values: nxt,
        future: s.future.slice(1),
        history: [...s.history, cloneGrid(s.values)].slice(-80),
        conflicts: null,
      },
    });
  },

  clearBoard() {
    const s = get().session;
    if (!s || s.won) return;
    const values = initValues(s.puzzle);
    set({
      session: {
        ...s,
        values,
        history: [...s.history, cloneGrid(s.values)].slice(-80),
        future: [],
        conflicts: null,
        selected: firstEmpty(values, s.puzzle),
      },
    });
  },

  hint() {
    const s = get().session;
    if (!s || s.won || s.lost) return;
    let hit: { r: number; c: number; digit: number } | null = null;
    if (s.puzzle.kind === "cross") hit = hintCross(s.puzzle, s.values);
    else if (s.puzzle.kind === "cages") hit = hintCages(s.puzzle, s.values);
    else if (s.puzzle.kind === "line2d") hit = hintLine2d(s.puzzle, s.values);
    else if (s.puzzle.kind === "line" && s.line) {
      // Reveal one missing glyph in the current guess slot if empty, else skip.
      const eq = s.puzzle.equation;
      const cur = s.line.current;
      let idx = cur.length;
      if (idx >= eq.length) idx = [...eq].findIndex((ch, i) => cur[i] !== ch);
      if (idx < 0) return;
      const next = (cur + eq[idx]).slice(0, eq.length);
      // Actually fill the next correct character at the current length if typing, else skip
      const filled = cur.padEnd(idx, " ").split("");
      filled[idx] = eq[idx]!;
      const current = filled.join("").replace(/ /g, "").length === idx + 1
        ? cur + eq[idx]
        : eq.slice(0, idx + 1);
      void current;
      // Simpler: append the correct next char if current is a prefix, else don't
      let current2 = cur;
      if (eq.startsWith(cur) && cur.length < eq.length) current2 = cur + eq[cur.length];
      else {
        // place first mismatch
        const chars = cur.split("");
        const i = chars.findIndex((ch, j) => ch !== eq[j]);
        if (i >= 0) chars[i] = eq[i]!;
        current2 = chars.join("");
      }
      if (get().settings.sound) sfx.hint();
      set({
        session: {
          ...s,
          hints: s.hints + 1,
          nina: ninaHint(s.hints + 1),
          line: { ...s.line, current: current2.slice(0, eq.length) },
        },
      });
      return;
    }
    if (!hit) return;
    const next = cloneGrid(s.values);
    next[hit.r]![hit.c] = hit.digit;
    if (s.puzzle.kind === "line2d") {
      if (hit.c === 2 && hit.r < 2) next[hit.r + 1]![0] = hit.digit;
      if (hit.c === 0 && hit.r > 0) next[hit.r - 1]![2] = hit.digit;
    }
    if (get().settings.sound) sfx.hint();
    let won = false;
    if (s.puzzle.kind === "cross") won = isCrossWin(s.puzzle, next);
    if (s.puzzle.kind === "cages") won = isCagesWin(s.puzzle, next);
    if (s.puzzle.kind === "line2d") won = isLine2dWin(s.puzzle, next);
    set({
      session: {
        ...s,
        values: next,
        selected: { r: hit.r, c: hit.c },
        hints: s.hints + 1,
        nina: won
          ? ninaWin({ hints: s.hints + 1, seconds: s.elapsedMs / 1000, daily: s.kind === "daily" })
          : ninaHint(s.hints + 1),
        history: [...s.history, cloneGrid(s.values)].slice(-80),
        future: [],
        won,
        running: !won,
        conflicts: null,
      },
      flashWin: won,
    });
    if (won) {
      if (get().settings.sound) sfx.win();
      get().recordWin();
    }
  },

  check() {
    const s = get().session;
    if (!s || s.won) return;
    let conflicts: boolean[][] | null = null;
    let has = false;
    if (s.puzzle.kind === "cross") {
      conflicts = crossConflicts(s.puzzle, s.values);
      has = conflicts.some((row) => row.some(Boolean));
    } else if (s.puzzle.kind === "cages") {
      conflicts = cagesConflicts(s.puzzle, s.values);
      has = conflicts.some((row) => row.some(Boolean));
    } else if (s.puzzle.kind === "line2d") {
      conflicts = line2dConflicts(s.puzzle, s.values);
      has = conflicts.some((row) => row.some(Boolean));
    } else if (s.puzzle.kind === "line") {
      get().lineSubmit();
      return;
    }
    const complete = s.values.every((row, r) =>
      row.every((v, c) => {
        if (s.puzzle.kind === "cross") {
          return s.puzzle.cells[r]![c]!.type !== "digit" || v !== null;
        }
        return v !== null;
      }),
    );
    if (get().settings.sound) {
      if (has) sfx.error();
      else sfx.tap();
    }
    set({ session: { ...s, conflicts, nina: ninaCheck(has, complete) } });
  },

  lineType(ch) {
    const s = get().session;
    if (!s || !s.line || s.won || s.lost || s.puzzle.kind !== "line") return;
    if (s.line.current.length >= s.puzzle.length) return;
    const map: Record<string, string> = { "×": "*", "÷": "/", "*": "*", "/": "/" };
    const glyph = map[ch] ?? ch;
    if (!/^[0-9+\-*/=]$/.test(glyph)) return;
    if (get().settings.sound) sfx.tap();
    set({
      session: { ...s, line: { ...s.line, current: s.line.current + glyph } },
    });
  },

  lineBackspace() {
    const s = get().session;
    if (!s || !s.line || s.won || s.lost) return;
    set({
      session: { ...s, line: { ...s.line, current: s.line.current.slice(0, -1) } },
    });
  },

  lineSubmit() {
    const s = get().session;
    if (!s || !s.line || s.won || s.lost || s.puzzle.kind !== "line") return;
    const guess = s.line.current;
    if (guess.length !== s.puzzle.length) {
      set({ session: { ...s, nina: "Eight glyphs. Fill the row." } });
      return;
    }
    if (!validEquation(guess)) {
      if (get().settings.sound) sfx.error();
      set({ session: { ...s, nina: "That doesn't evaluate. I don't take near-misses." } });
      return;
    }
    const marks = scoreLine(guess, s.puzzle.equation);
    const guesses = [...s.line.guesses, guess];
    const allMarks = [...s.line.marks, marks];
    const won = guess === s.puzzle.equation;
    const lost = !won && guesses.length >= s.puzzle.maxGuesses;
    if (get().settings.sound) {
      if (won) sfx.win();
      else if (lost) sfx.lose();
      else sfx.place();
    }
    set({
      session: {
        ...s,
        won,
        lost,
        running: !won && !lost,
        nina: won
          ? ninaWin({ hints: s.hints, seconds: s.elapsedMs / 1000, daily: s.kind === "daily" })
          : lost
            ? ninaLose(displayEq(s.puzzle.equation))
            : s.nina,
        line: { guesses, current: "", marks: allMarks, revealed: lost },
      },
      flashWin: won,
    });
    if (won) get().recordWin();
  },

  shareText() {
    const s = get().session;
    const { stats } = get();
    if (!s) return "GRIDLINE";
    const date = s.kind === "daily" ? s.date : "practice";
    const time = formatClock(s.elapsedMs);
    if (s.puzzle.kind === "line" && s.line) {
      const rows = s.line.marks
        .map((m) => m.map((x) => (x === "correct" ? "■" : x === "present" ? "□" : "·")).join(""))
        .join("\n");
      return `GRIDLINE  ${date}\nLine  ${s.line.guesses.length}/${s.puzzle.maxGuesses}${s.hints ? "  hint" : ""}\n${rows}\n— Nina`;
    }
    return `GRIDLINE  ${date}\n${label(s.mode)}  ${s.won ? "✓" : "–"}  ${time}${s.hints ? `  ${s.hints} hint` : ""}\n— Nina`;
  },

  recordWin() {
    const s = get().session;
    if (!s) return;
    const stats: Stats = { ...get().stats, daily: { ...get().stats.daily } };
    if (s.kind === "daily") {
      const day = stats.daily[s.date] ?? {};
      const entry: DailyEntry = {
        solved: true,
        timeMs: s.elapsedMs,
        hints: s.hints,
        guesses: s.line?.guesses.length,
      };
      stats.daily[s.date] = { ...day, [s.mode]: entry };
      const modes: Mode[] = ["cross", "cages", "line"];
      const all = modes.every((m) => stats.daily[s.date]?.[m]?.solved);
      if (all) {
        const prev = stats.lastDailyDate;
        const yest = yesterday(s.date);
        if (prev === s.date) {
          /* already counted */
        } else if (prev === yest) stats.streak += 1;
        else stats.streak = 1;
        stats.bestStreak = Math.max(stats.bestStreak, stats.streak);
        stats.lastDailyDate = s.date;
      }
    } else {
      stats.practiceWins += 1;
    }
    set({ stats });
    get().persist();
  },
}));

function label(mode: Mode) {
  return mode === "line2d" ? "Stack" : mode[0]!.toUpperCase() + mode.slice(1);
}

function displayEq(eq: string) {
  return eq.replaceAll("*", "×").replaceAll("/", "÷");
}

function formatClock(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;
}

function yesterday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}
