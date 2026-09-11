import { create } from "zustand";
import { sfx, setMuted, unlockAudio } from "@/lib/audio";
import { BRAND } from "@/lib/brand";
import { dailyDifficulty, dailySize, generatePuzzle } from "@/lib/game/generate";
import { ninaCheck, ninaCombo, ninaHint, ninaLose, ninaStart, ninaWin } from "@/lib/game/nina";
import type { Difficulty, Mode, PlayKind, Puzzle } from "@/lib/game/types";
import {
  SAVE_VERSION,
  bestKey,
  defaultProfile,
  defaultSettings,
  defaultStats,
  emptySave,
  exportSave,
  importSave,
  loadSave,
  runSlot,
  writeSave,
  type ContinuePtr,
  type JournalEntry,
  type Profile,
  type RunState,
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

export type View = "splash" | "home" | "setup" | "play" | "settings" | "diagnostics" | "how" | "journal";

export interface Session extends RunState {
  conflicts: boolean[][] | null;
  pulse: { cells: string[]; combo: boolean } | null;
}

interface GameState {
  hydrated: boolean;
  view: View;
  howReturn: View;
  settings: Settings;
  stats: Stats;
  profile: Profile;
  journal: JournalEntry[];
  runs: Record<string, RunState>;
  continuePtr: ContinuePtr | null;
  session: Session | null;
  setupMode: Mode | null;
  composing: boolean;
  paused: boolean;
  notesMode: boolean;
  flashWin: boolean;
  hydrate: () => void;
  persist: () => void;
  persistRun: () => void;
  setView: (v: View) => void;
  openHow: (from?: View) => void;
  patchSettings: (p: Partial<Settings>) => void;
  dismissSplash: () => void;
  openSetup: (mode: Mode, kind?: PlayKind) => void;
  resume: (slot?: string) => void;
  start: (opts: {
    mode: Mode;
    kind: PlayKind;
    size?: number;
    difficulty?: Difficulty;
    forceNew?: boolean;
  }) => void;
  pause: () => void;
  unpause: () => void;
  quitHome: () => void;
  restartBoard: () => void;
  tick: (dt: number) => void;
  selectCell: (r: number, c: number) => void;
  enterDigit: (d: number | null) => void;
  toggleNote: (d: number) => void;
  setNotesMode: (on: boolean) => void;
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
  markHowSeen: (mode: Mode) => void;
  resetProgress: () => void;
  exportJson: () => string;
  importJson: (json: string) => void;
  clearPulse: () => void;
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

function toRun(s: Session): RunState {
  return {
    slot: s.slot,
    puzzle: s.puzzle,
    mode: s.mode,
    kind: s.kind,
    difficulty: s.difficulty,
    date: s.date,
    startedAt: s.startedAt,
    elapsedMs: s.elapsedMs,
    running: s.running,
    hints: s.hints,
    nina: s.nina,
    won: s.won,
    lost: s.lost,
    values: s.values,
    selected: s.selected,
    history: s.history.slice(-40),
    future: s.future.slice(0, 20),
    line: s.line,
    notes: s.notes,
  };
}

function fromRun(run: RunState): Session {
  return { ...run, notes: run.notes ?? {}, conflicts: null, pulse: null };
}

function buzz(on: boolean) {
  if (!on || typeof navigator === "undefined" || !navigator.vibrate) return;
  navigator.vibrate(8);
}

function pulseFor(puzzle: Puzzle, prev: (number | null)[][], next: (number | null)[][], r: number, c: number) {
  const cells: string[] = [];
  let units = 0;
  if (puzzle.kind === "cross") {
    const rowDone =
      puzzle.cells[r]!.every((cell, cc) => cell.type !== "digit" || next[r]![cc] !== null) &&
      puzzle.cells[r]!.some((cell, cc) => cell.type === "digit" && prev[r]![cc] === null);
    const colDone =
      puzzle.cells.every((row, rr) => row[c]!.type !== "digit" || next[rr]![c] !== null) &&
      puzzle.cells.some((row, rr) => row[c]!.type === "digit" && prev[rr]![c] === null);
    if (rowDone) {
      units += 1;
      puzzle.cells[r]!.forEach((cell, cc) => {
        if (cell.type === "digit") cells.push(`${r},${cc}`);
      });
    }
    if (colDone) {
      units += 1;
      puzzle.cells.forEach((row, rr) => {
        if (row[c]!.type === "digit") cells.push(`${rr},${c}`);
      });
    }
  } else if (puzzle.kind === "cages") {
    const cage = puzzle.cages.find((g) => g.cells.some(([a, b]) => a === r && b === c));
    if (cage) {
      const nowFull = cage.cells.every(([a, b]) => next[a]![b] !== null);
      const wasFull = cage.cells.every(([a, b]) => prev[a]![b] !== null);
      const ok = nowFull && cage.cells.every(([a, b]) => next[a]![b] === puzzle.solution[a]![b]);
      if (nowFull && !wasFull && ok) {
        units = 1;
        for (const [a, b] of cage.cells) cells.push(`${a},${b}`);
      }
    }
  } else if (puzzle.kind === "line2d") {
    const rowDone = next[r]!.every((v) => v !== null) && prev[r]!.some((v) => v === null);
    if (rowDone) {
      units = 1;
      for (let cc = 0; cc < next[r]!.length; cc++) cells.push(`${r},${cc}`);
    }
  }
  if (!cells.length) return null;
  return { cells: [...new Set(cells)], combo: units >= 2 };
}

export const useGame = create<GameState>((set, get) => ({
  hydrated: false,
  view: "splash",
  howReturn: "home",
  settings: defaultSettings,
  stats: defaultStats,
  profile: defaultProfile,
  journal: [],
  runs: {},
  continuePtr: null,
  session: null,
  setupMode: null,
  composing: false,
  paused: false,
  notesMode: false,
  flashWin: false,

  hydrate() {
    const save = loadSave();
    set({
      settings: save.settings,
      stats: save.stats,
      profile: save.profile,
      journal: save.journal,
      runs: save.runs,
      continuePtr: save.continue,
      hydrated: true,
      view: "splash",
    });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light", save.settings.theme === "light");
      document.documentElement.classList.toggle("dark", save.settings.theme !== "light");
      document.documentElement.classList.toggle("reduce-motion", save.settings.reduceMotion);
    }
    setMuted(!save.settings.sound);
  },

  persist() {
    const { settings, stats, profile, journal, runs, continuePtr, session } = get();
    const nextRuns = { ...runs };
    if (session && !session.won && !session.lost) nextRuns[session.slot] = toRun(session);
    writeSave({
      version: SAVE_VERSION,
      profile,
      settings,
      stats,
      journal,
      continue: continuePtr,
      runs: nextRuns,
    });
  },

  persistRun() {
    const s = get().session;
    const runs = { ...get().runs };
    let ptr = get().continuePtr;
    if (!s) {
      get().persist();
      return;
    }
    if (s.won || s.lost) {
      delete runs[s.slot];
      if (ptr?.slot === s.slot) ptr = nextContinue(runs);
    } else {
      runs[s.slot] = toRun(s);
      ptr = { slot: s.slot, at: Date.now() };
    }
    set({ runs, continuePtr: ptr });
    get().persist();
  },

  setView(v) {
    set({ view: v, paused: false });
  },

  openHow(from) {
    set({ howReturn: from ?? get().view, view: "how", paused: true });
    const s = get().session;
    if (s && !s.won && !s.lost) {
      set({ session: { ...s, running: false } });
      get().persistRun();
    }
  },

  patchSettings(p) {
    const settings = { ...get().settings, ...p };
    set({ settings });
    if (p.theme) {
      document.documentElement.classList.toggle("light", settings.theme === "light");
      document.documentElement.classList.toggle("dark", settings.theme !== "light");
    }
    if (p.sound !== undefined) setMuted(!p.sound);
    if (p.reduceMotion !== undefined) {
      document.documentElement.classList.toggle("reduce-motion", settings.reduceMotion);
    }
    get().persist();
  },

  dismissSplash() {
    const profile = { ...get().profile, firstLaunchDone: true };
    set({ profile, view: "home" });
    get().persist();
  },

  openSetup(mode, kind) {
    const settings = {
      ...get().settings,
      lastMode: mode,
      lastKind: kind ?? get().settings.lastKind,
    };
    set({ setupMode: mode, view: "setup", settings });
    get().persist();
  },

  resume(slot) {
    const id = slot ?? get().continuePtr?.slot;
    if (!id) return;
    const run = get().runs[id];
    if (!run || run.won || run.lost) return;
    unlockAudio();
    set({
      session: fromRun({ ...run, running: true }),
      view: "play",
      paused: false,
      notesMode: false,
      flashWin: false,
      continuePtr: { slot: id, at: Date.now() },
    });
    get().persist();
  },

  start({ mode, kind, size, difficulty, forceNew }) {
    unlockAudio();
    const settings = get().settings;
    const diff = difficulty ?? (kind === "daily" ? dailyDifficulty() : settings.lastDifficulty);
    const sz = size ?? (kind === "daily" ? dailySize(mode) : settings.lastSize[mode]);
    const date = todayUtc();
    const slot = runSlot({ mode, kind, date, size: sz, difficulty: diff });
    const existing = get().runs[slot];
    if (existing && !existing.won && !existing.lost && !forceNew) {
      get().resume(slot);
      return;
    }
    set({ composing: true, flashWin: false, paused: false, notesMode: false });
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
        slot,
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
        pulse: null,
        values,
        selected: firstEmpty(values, puzzle),
        history: [],
        future: [],
        line:
          puzzle.kind === "line"
            ? { guesses: [], current: "", marks: [], revealed: false }
            : null,
        notes: {},
      };
      const stats = { ...get().stats, started: get().stats.started + 1 };
      set({
        session,
        composing: false,
        view: "play",
        stats,
        settings: {
          ...settings,
          lastMode: mode,
          lastKind: kind,
          lastDifficulty: diff,
          lastSize: { ...settings.lastSize, [mode]: sz },
        },
      });
      get().persistRun();
    }, 40);
  },

  pause() {
    const s = get().session;
    if (!s || s.won || s.lost) return;
    set({ paused: true, session: { ...s, running: false } });
    get().persistRun();
  },

  unpause() {
    const s = get().session;
    if (!s || s.won || s.lost) return;
    set({ paused: false, session: { ...s, running: true }, view: "play" });
  },

  quitHome() {
    get().persistRun();
    set({ view: "home", session: null, paused: false, flashWin: false, notesMode: false });
  },

  restartBoard() {
    const s = get().session;
    if (!s) return;
    const values = initValues(s.puzzle);
    set({
      paused: false,
      notesMode: false,
      session: {
        ...s,
        values,
        history: [],
        future: [],
        conflicts: null,
        pulse: null,
        notes: {},
        hints: 0,
        elapsedMs: 0,
        won: false,
        lost: false,
        running: true,
        selected: firstEmpty(values, s.puzzle),
        line:
          s.puzzle.kind === "line"
            ? { guesses: [], current: "", marks: [], revealed: false }
            : s.line,
        nina: ninaStart(s.mode, s.kind === "daily"),
      },
    });
    get().persistRun();
  },

  tick(dt) {
    const s = get().session;
    if (!s || !s.running || s.won || s.lost || get().paused) return;
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
    if (get().notesMode && d !== null) {
      get().toggleNote(d);
      return;
    }
    const { r, c } = s.selected;
    if (s.puzzle.kind === "cross") {
      const cell = s.puzzle.cells[r]![c]!;
      if (cell.type !== "digit" || cell.given) return;
    }
    const next = cloneGrid(s.values);
    next[r]![c] = d;
    if (s.puzzle.kind === "line2d") {
      if (c === 2 && r < 2) next[r + 1]![0] = d;
      if (c === 0 && r > 0) next[r - 1]![2] = d;
    }
    const notes = { ...s.notes };
    delete notes[`${r},${c}`];
    if (get().settings.sound) sfx.place();
    buzz(get().settings.haptics);
    const history = [...s.history, cloneGrid(s.values)].slice(-80);
    let won = false;
    if (s.puzzle.kind === "cross") won = isCrossWin(s.puzzle, next);
    if (s.puzzle.kind === "cages") won = isCagesWin(s.puzzle, next);
    if (s.puzzle.kind === "line2d") won = isLine2dWin(s.puzzle, next);
    const pulse = d !== null ? pulseFor(s.puzzle, s.values, next, r, c) : null;
    if (pulse && get().settings.sound) sfx.tap();
    set({
      session: {
        ...s,
        values: next,
        notes,
        history,
        future: [],
        conflicts: null,
        pulse,
        won,
        running: !won,
        nina: won
          ? ninaWin({ hints: s.hints, seconds: s.elapsedMs / 1000, daily: s.kind === "daily" })
          : pulse?.combo
            ? ninaCombo()
            : s.nina,
      },
      flashWin: won,
    });
    if (won) {
      if (get().settings.sound) sfx.win();
      get().recordWin();
    } else {
      get().persistRun();
    }
  },

  toggleNote(d) {
    const s = get().session;
    if (!s || !s.selected || s.won) return;
    const key = `${s.selected.r},${s.selected.c}`;
    const cur = s.notes[key] ?? [];
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort();
    const notes = { ...s.notes };
    if (next.length) notes[key] = next;
    else delete notes[key];
    set({ session: { ...s, notes } });
    get().persistRun();
  },

  setNotesMode(on) {
    set({ notesMode: on });
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
        pulse: null,
      },
    });
    get().persistRun();
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
    get().persistRun();
  },

  clearBoard() {
    const s = get().session;
    if (!s || s.won) return;
    const values = initValues(s.puzzle);
    set({
      session: {
        ...s,
        values,
        notes: {},
        history: [...s.history, cloneGrid(s.values)].slice(-80),
        future: [],
        conflicts: null,
        selected: firstEmpty(values, s.puzzle),
      },
    });
    get().persistRun();
  },

  hint() {
    const s = get().session;
    if (!s || s.won || s.lost) return;
    let hit: { r: number; c: number; digit: number } | null = null;
    if (s.puzzle.kind === "cross") hit = hintCross(s.puzzle, s.values);
    else if (s.puzzle.kind === "cages") hit = hintCages(s.puzzle, s.values);
    else if (s.puzzle.kind === "line2d") hit = hintLine2d(s.puzzle, s.values);
    else if (s.puzzle.kind === "line" && s.line) {
      const eq = s.puzzle.equation;
      const cur = s.line.current;
      let current2 = cur;
      if (eq.startsWith(cur) && cur.length < eq.length) current2 = cur + eq[cur.length];
      else {
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
      get().persistRun();
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
    } else get().persistRun();
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
    get().persistRun();
  },

  lineBackspace() {
    const s = get().session;
    if (!s || !s.line || s.won || s.lost) return;
    set({
      session: { ...s, line: { ...s.line, current: s.line.current.slice(0, -1) } },
    });
    get().persistRun();
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
    else get().persistRun();
  },

  shareText() {
    const s = get().session;
    if (!s) return BRAND.title;
    const size =
      s.puzzle.kind === "cross" || s.puzzle.kind === "cages" ? `${s.puzzle.size}×${s.puzzle.size} ` : "";
    const head = `${BRAND.title} · ${label(s.mode)} ${size}${s.difficulty}`;
    const time = formatClock(s.elapsedMs);
    if (s.puzzle.kind === "line" && s.line) {
      const rows = s.line.marks
        .map((m) => m.map((x) => (x === "correct" ? "■" : x === "present" ? "□" : "·")).join(""))
        .join("\n");
      return `${BRAND.title} Line · ${s.line.guesses.length}/${s.puzzle.maxGuesses}${s.hints ? "  hint" : ""}\n${rows}`;
    }
    return `${head}\n${s.kind === "daily" ? s.date : "practice"}  ${s.won ? "✓" : "–"}  ${time}${s.hints ? `  ${s.hints} hint` : ""}`;
  },

  recordWin() {
    const s = get().session;
    if (!s) return;
    const stats: Stats = {
      ...get().stats,
      daily: { ...get().stats.daily },
      best: { ...get().stats.best },
      badges: { ...get().stats.badges },
      finished: get().stats.finished + 1,
    };
    const size = s.puzzle.kind === "cross" || s.puzzle.kind === "cages" ? s.puzzle.size : 0;
    const bk = bestKey(s.mode, size, s.difficulty);
    const prevBest = stats.best[bk];
    if (prevBest == null || s.elapsedMs < prevBest) stats.best[bk] = s.elapsedMs;
    const badges = { ...(stats.badges[s.mode] ?? {}) };
    badges[s.difficulty] = true;
    stats.badges[s.mode] = badges;
    if (s.kind === "daily") {
      const day = stats.daily[s.date] ?? {};
      stats.daily[s.date] = {
        ...day,
        [s.mode]: { solved: true, timeMs: s.elapsedMs, hints: s.hints, guesses: s.line?.guesses.length },
      };
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
    const entry: JournalEntry = {
      id: `${s.slot}|${s.startedAt}`,
      at: Date.now(),
      mode: s.mode,
      kind: s.kind,
      difficulty: s.difficulty,
      size: size || undefined,
      timeMs: s.elapsedMs,
      hints: s.hints,
    };
    const journal = [entry, ...get().journal].slice(0, 20);
    const runs = { ...get().runs };
    delete runs[s.slot];
    set({
      stats,
      journal,
      runs,
      continuePtr: nextContinue(runs),
    });
    get().persist();
  },

  markHowSeen(mode) {
    const profile = { ...get().profile, seenHow: { ...get().profile.seenHow, [mode]: true } };
    set({ profile });
    get().persist();
  },

  resetProgress() {
    const keep = get().settings;
    const fresh = emptySave();
    fresh.settings = { ...keep };
    fresh.profile = { ...defaultProfile, firstLaunchDone: true, displayName: BRAND.name };
    writeSave(fresh);
    set({
      stats: fresh.stats,
      profile: fresh.profile,
      journal: [],
      runs: {},
      continuePtr: null,
      session: null,
      view: "home",
      paused: false,
    });
  },

  exportJson() {
    const { settings, stats, profile, journal, runs, continuePtr } = get();
    return exportSave({
      version: SAVE_VERSION,
      profile,
      settings,
      stats,
      journal,
      continue: continuePtr,
      runs,
    });
  },

  importJson(json) {
    const save = importSave(json);
    writeSave(save);
    set({
      settings: save.settings,
      stats: save.stats,
      profile: save.profile,
      journal: save.journal,
      runs: save.runs,
      continuePtr: save.continue,
      session: null,
      view: "home",
    });
    document.documentElement.classList.toggle("light", save.settings.theme === "light");
    document.documentElement.classList.toggle("dark", save.settings.theme !== "light");
    setMuted(!save.settings.sound);
  },

  clearPulse() {
    const s = get().session;
    if (!s || !s.pulse) return;
    set({ session: { ...s, pulse: null } });
  },
}));

function nextContinue(runs: Record<string, RunState>): ContinuePtr | null {
  const open = Object.values(runs).filter((r) => !r.won && !r.lost);
  if (!open.length) return null;
  open.sort((a, b) => b.startedAt - a.startedAt);
  return { slot: open[0]!.slot, at: Date.now() };
}

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

export function nextDifficulty(d: Difficulty): Difficulty | null {
  if (d === "easy") return "medium";
  if (d === "medium") return "hard";
  return null;
}
