import type { EvalMode, Op } from "./math";

export type Difficulty = "easy" | "medium" | "hard";
export type Mode = "cross" | "cages" | "line" | "line2d";
export type PlayKind = "daily" | "practice";

export type CrossCellType = "digit" | "op" | "eq" | "black";

export interface CrossCell {
  type: CrossCellType;
  op?: Op;
  solution?: number;
  given?: boolean;
}

export interface CrossPuzzle {
  kind: "cross";
  size: 5 | 7;
  difficulty: Difficulty;
  evalMode: EvalMode;
  cells: CrossCell[][];
  seed: string;
}

export interface Cage {
  id: number;
  cells: Array<[number, number]>;
  op: Op | null;
  target: number;
}

export interface CagesPuzzle {
  kind: "cages";
  size: 4 | 5 | 6;
  difficulty: Difficulty;
  solution: number[][];
  cages: Cage[];
  seed: string;
}

export interface LinePuzzle {
  kind: "line";
  equation: string;
  length: number;
  maxGuesses: number;
  seed: string;
  difficulty: Difficulty;
}

export interface Line2dPuzzle {
  kind: "line2d";
  rows: Array<{
    left: number;
    op: Op;
    right: number;
    result: number;
  }>;
  seed: string;
  difficulty: Difficulty;
}

export type Puzzle = CrossPuzzle | CagesPuzzle | LinePuzzle | Line2dPuzzle;

export type LineMark = "correct" | "present" | "absent";
