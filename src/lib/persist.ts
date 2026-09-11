import type { Difficulty, Mode, PlayKind } from "@/lib/game/types";
import type { EvalMode } from "@/lib/game/math";

const KEY = "gridline.v1";
export const SAVE_VERSION = 1;

export interface DailyEntry {
  solved: boolean;
  timeMs: number;
  hints: number;
  guesses?: number;
}

export interface Stats {
  streak: number;
  bestStreak: number;
  lastDailyDate: string | null;
  daily: Record<string, Partial<Record<Mode, DailyEntry>>>;
  practiceWins: number;
}

export interface Settings {
  theme: "dark" | "light";
  evalMode: EvalMode;
  sound: boolean;
  reduceMotion: boolean;
  hideTimer: boolean;
  lastMode: Mode;
  lastKind: PlayKind;
  lastDifficulty: Difficulty;
  lastSize: Record<Mode, number>;
}

export interface SaveBlob {
  version: number;
  settings: Settings;
  stats: Stats;
}

export const defaultSettings: Settings = {
  theme: "dark",
  evalMode: "ltr",
  sound: true,
  reduceMotion: false,
  hideTimer: false,
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
};

function migrate(raw: SaveBlob): SaveBlob {
  const s = { ...raw };
  if (!s.version) s.version = 1;
  s.settings = { ...defaultSettings, ...s.settings, lastSize: { ...defaultSettings.lastSize, ...s.settings?.lastSize } };
  s.stats = { ...defaultStats, ...s.stats, daily: s.stats?.daily ?? {} };
  s.version = SAVE_VERSION;
  return s;
}

export function loadSave(): SaveBlob {
  if (typeof window === "undefined") {
    return { version: SAVE_VERSION, settings: defaultSettings, stats: defaultStats };
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: SAVE_VERSION, settings: defaultSettings, stats: defaultStats };
    const parsed = JSON.parse(raw) as SaveBlob;
    return migrate(parsed);
  } catch {
    return { version: SAVE_VERSION, settings: defaultSettings, stats: defaultStats };
  }
}

export function writeSave(blob: SaveBlob) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...blob, version: SAVE_VERSION }));
  } catch {
    /* private mode */
  }
}
