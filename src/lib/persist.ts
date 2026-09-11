import type { Difficulty, Mode, PlayKind, Puzzle } from "@/lib/game/types";
import type { EvalMode } from "@/lib/game/math";
import type { LineMark } from "@/lib/game/types";
import { BRAND } from "@/lib/brand";

export const SAVE_KEY = "nina.v2";
const LEGACY_KEY = "gridline.v1";
export const SAVE_VERSION = 2;

export interface DailyEntry {
  solved: boolean;
  timeMs: number;
  hints: number;
  guesses?: number;
}

export interface JournalEntry {
  id: string;
  at: number;
  mode: Mode;
  kind: PlayKind;
  difficulty: Difficulty;
  size?: number;
  timeMs: number;
  hints: number;
}

export interface Stats {
  streak: number;
  bestStreak: number;
  lastDailyDate: string | null;
  daily: Record<string, Partial<Record<Mode, DailyEntry>>>;
  practiceWins: number;
  started: number;
  finished: number;
  best: Record<string, number>;
  badges: Partial<Record<Mode, Partial<Record<Difficulty, boolean>>>>;
}

export interface Settings {
  theme: "dark" | "light";
  evalMode: EvalMode;
  sound: boolean;
  reduceMotion: boolean;
  hideTimer: boolean;
  haptics: boolean;
  lastMode: Mode;
  lastKind: PlayKind;
  lastDifficulty: Difficulty;
  lastSize: Record<Mode, number>;
}

export interface Profile {
  displayName: string;
  firstLaunchDone: boolean;
  seenHow: Partial<Record<Mode, boolean>>;
}

export interface LineState {
  guesses: string[];
  current: string;
  marks: LineMark[][];
  revealed: boolean;
}

export interface RunState {
  slot: string;
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
  values: (number | null)[][];
  selected: { r: number; c: number } | null;
  history: (number | null)[][][];
  future: (number | null)[][][];
  line: LineState | null;
  notes: Record<string, number[]>;
}

export interface ContinuePtr {
  slot: string;
  at: number;
}

export interface SaveBlob {
  version: number;
  profile: Profile;
  settings: Settings;
  stats: Stats;
  journal: JournalEntry[];
  continue: ContinuePtr | null;
  runs: Record<string, RunState>;
}

export const defaultSettings: Settings = {
  theme: "dark",
  evalMode: "ltr",
  sound: true,
  reduceMotion: false,
  hideTimer: false,
  haptics: false,
  lastMode: "cross",
  lastKind: "daily",
  lastDifficulty: "medium",
  lastSize: { cross: 5, cages: 5, line: 0, line2d: 0 },
};

export const defaultStats: Stats = {
  streak: 0,
  bestStreak: 0,
  lastDailyDate: null,
  daily: {},
  practiceWins: 0,
  started: 0,
  finished: 0,
  best: {},
  badges: {},
};

export const defaultProfile: Profile = {
  displayName: BRAND.name,
  firstLaunchDone: false,
  seenHow: {},
};

export function emptySave(): SaveBlob {
  return {
    version: SAVE_VERSION,
    profile: { ...defaultProfile },
    settings: { ...defaultSettings, lastSize: { ...defaultSettings.lastSize } },
    stats: { ...defaultStats, daily: {}, best: {}, badges: {} },
    journal: [],
    continue: null,
    runs: {},
  };
}

export function runSlot(opts: {
  mode: Mode;
  kind: PlayKind;
  date: string;
  size?: number;
  difficulty: Difficulty;
}): string {
  if (opts.kind === "daily") return `daily|${opts.mode}|${opts.date}`;
  return `practice|${opts.mode}|${opts.size ?? 0}|${opts.difficulty}`;
}

export function bestKey(mode: Mode, size: number | undefined, difficulty: Difficulty): string {
  return `${mode}|${size ?? 0}|${difficulty}`;
}

export function filledProgress(run: Pick<RunState, "puzzle" | "values" | "line">): {
  filled: number;
  total: number;
} {
  if (run.puzzle.kind === "line") {
    const g = run.line?.guesses.length ?? 0;
    return { filled: g, total: run.puzzle.maxGuesses };
  }
  let filled = 0;
  let total = 0;
  for (let r = 0; r < run.values.length; r++) {
    for (let c = 0; c < run.values[r]!.length; c++) {
      if (run.puzzle.kind === "cross") {
        const cell = run.puzzle.cells[r]![c]!;
        if (cell.type !== "digit" || cell.given) continue;
        total += 1;
        if (run.values[r]![c] !== null) filled += 1;
      } else {
        total += 1;
        if (run.values[r]![c] !== null) filled += 1;
      }
    }
  }
  return { filled, total };
}

function normalizeRuns(raw: SaveBlob["runs"] | undefined): Record<string, RunState> {
  const out: Record<string, RunState> = {};
  if (!raw) return out;
  for (const [k, r] of Object.entries(raw)) {
    if (!r?.puzzle) continue;
    out[k] = { ...r, notes: r.notes ?? {}, history: r.history ?? [], future: r.future ?? [] };
  }
  return out;
}

function migrate(raw: Partial<SaveBlob> & { version?: number }): SaveBlob {
  const settings = {
    ...defaultSettings,
    ...raw.settings,
    lastSize: { ...defaultSettings.lastSize, ...raw.settings?.lastSize },
  };
  const stats = {
    ...defaultStats,
    ...raw.stats,
    daily: raw.stats?.daily ?? {},
    best: raw.stats?.best ?? {},
    badges: raw.stats?.badges ?? {},
  };
  const profile = { ...defaultProfile, ...raw.profile };
  if (raw.version === 1 || (!raw.profile && raw.settings)) profile.firstLaunchDone = true;
  return {
    version: SAVE_VERSION,
    profile,
    settings,
    stats,
    journal: Array.isArray(raw.journal) ? raw.journal.slice(0, 20) : [],
    continue: raw.continue ?? null,
    runs: normalizeRuns(raw.runs),
  };
}

export function loadSave(): SaveBlob {
  if (typeof window === "undefined") return emptySave();
  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return emptySave();
    return migrate(JSON.parse(raw) as SaveBlob);
  } catch {
    return emptySave();
  }
}

export function writeSave(blob: SaveBlob) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...blob, version: SAVE_VERSION }));
  } catch {
    /* private mode */
  }
}

export function exportSave(blob: SaveBlob): string {
  return JSON.stringify({ ...blob, version: SAVE_VERSION }, null, 2);
}

export function importSave(json: string): SaveBlob {
  return migrate(JSON.parse(json) as SaveBlob);
}

export function unfinished(runs: Record<string, RunState>): RunState[] {
  return Object.values(runs).filter((r) => !r.won && !r.lost);
}
