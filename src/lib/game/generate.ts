import { generateCages } from "./cages";
import { generateCross } from "./cross";
import { generateLine, generateLine2d } from "./line";
import { dailySeed, hashString } from "./rng";
import type { Difficulty, Mode, PlayKind, Puzzle } from "./types";
import type { EvalMode } from "./math";

export interface GenerateRequest {
  mode: Mode;
  kind: PlayKind;
  date?: string;
  size?: number;
  difficulty: Difficulty;
  evalMode: EvalMode;
  entropy?: number;
}

export function defaultSize(mode: Mode, difficulty: Difficulty): number {
  if (mode === "cross") return difficulty === "hard" ? 7 : 5;
  if (mode === "cages") {
    if (difficulty === "easy") return 4;
    if (difficulty === "medium") return 5;
    return 6;
  }
  return 0;
}

export function seedFor(req: GenerateRequest): string {
  if (req.kind === "daily") {
    return dailySeed({
      date: req.date ?? "1970-01-01",
      mode: req.mode,
      size: req.size ?? defaultSize(req.mode, req.difficulty),
      difficulty: req.difficulty,
    });
  }
  const ent = req.entropy ?? Date.now();
  return `practice|${req.mode}|${req.size ?? ""}|${req.difficulty}|${req.evalMode}|${ent}`;
}

export function generatePuzzle(req: GenerateRequest): Puzzle {
  const size = req.size ?? defaultSize(req.mode, req.difficulty);
  const seed = seedFor(req);
  switch (req.mode) {
    case "cross":
      return generateCross({
        size: size === 7 ? 7 : 5,
        difficulty: req.difficulty,
        evalMode: req.evalMode,
        seed,
      });
    case "cages":
      return generateCages({
        size: size === 6 ? 6 : size === 5 ? 5 : 4,
        difficulty: req.difficulty,
        seed,
      });
    case "line":
      return generateLine({ difficulty: req.difficulty, seed });
    case "line2d":
      return generateLine2d({ difficulty: req.difficulty, seed });
  }
}

export function dailyDifficulty(): Difficulty {
  return "medium";
}

export function dailySize(mode: Mode): number {
  if (mode === "cross") return 5;
  if (mode === "cages") return 5;
  return 0;
}

export function puzzleId(p: Puzzle): string {
  return `${p.kind}:${p.seed}:${hashString(p.seed)}`;
}
