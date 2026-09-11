import type { Difficulty, Line2dPuzzle, LineMark, LinePuzzle } from "./types";
import type { Op } from "./math";
import { applyOp, evalChain, parseOp } from "./math";
import { int, pick, rngFromSeed, type Rng } from "./rng";

const LINE_LEN = 8;
const MAX_GUESSES = 6;

export function generateLine(opts: { difficulty: Difficulty; seed: string }): LinePuzzle {
  const rng = rngFromSeed(opts.seed);
  let equation: string | null = null;
  for (let i = 0; i < 2000; i++) {
    const eq = tryEquation(rng, opts.difficulty);
    if (eq && eq.length === LINE_LEN && validEquation(eq)) {
      equation = eq;
      break;
    }
  }
  if (!equation) equation = "12+34=46";
  return {
    kind: "line",
    equation,
    length: LINE_LEN,
    maxGuesses: MAX_GUESSES,
    seed: opts.seed,
    difficulty: opts.difficulty,
  };
}

function tryEquation(rng: Rng, difficulty: Difficulty): string | null {
  const patterns =
    difficulty === "easy"
      ? [pAdd2, pSub2, pAddChain, pMulAdd]
      : difficulty === "medium"
        ? [pAdd2, pSub2, pMul3, pDiv, pMulSub, pAddChain]
        : [pMul3, pDiv, pMulSub, pPemdas, pSub2, pAdd2];
  const fn = pick(rng, patterns);
  return fn(rng);
}

function pAdd2(rng: Rng): string | null {
  for (let t = 0; t < 40; t++) {
    const a = int(rng, 10, 89);
    const b = int(rng, 10, 99 - a);
    const c = a + b;
    if (c >= 10 && c <= 99) return `${a}+${b}=${c}`;
  }
  return null;
}

function pSub2(rng: Rng): string | null {
  for (let t = 0; t < 40; t++) {
    const a = int(rng, 20, 99);
    const b = int(rng, 10, a - 10);
    const c = a - b;
    if (c >= 10 && c <= 99) return `${a}-${b}=${c}`;
  }
  return null;
}

function pMul3(rng: Rng): string | null {
  // AB*C=DEF  (8) or A*BC=DEF
  if (rng() < 0.5) {
    const a = int(rng, 12, 32);
    const b = int(rng, 4, 9);
    const c = a * b;
    if (c >= 100 && c <= 999) return `${a}*${b}=${c}`;
  } else {
    const a = int(rng, 4, 9);
    const b = int(rng, 13, 48);
    const c = a * b;
    if (c >= 100 && c <= 999) return `${a}*${b}=${c}`;
  }
  return null;
}

function pDiv(rng: Rng): string | null {
  // ABC/D=EF
  for (let t = 0; t < 40; t++) {
    const d = int(rng, 2, 9);
    const q = int(rng, 12, 98);
    const num = d * q;
    if (num >= 100 && num <= 999) return `${num}/${d}=${q}`;
  }
  return null;
}

function pMulAdd(rng: Rng): string | null {
  // A*B+C=DE
  for (let t = 0; t < 40; t++) {
    const a = int(rng, 2, 9);
    const b = int(rng, 2, 9);
    const c = int(rng, 1, 9);
    const r = a * b + c;
    if (r >= 10 && r <= 99) return `${a}*${b}+${c}=${r}`;
  }
  return null;
}

function pMulSub(rng: Rng): string | null {
  for (let t = 0; t < 40; t++) {
    const a = int(rng, 4, 9);
    const b = int(rng, 4, 9);
    const prod = a * b;
    if (prod < 12) continue;
    const c = int(rng, 1, Math.min(9, prod - 10));
    const r = prod - c;
    if (r >= 10 && r <= 99) return `${a}*${b}-${c}=${r}`;
  }
  return null;
}

function pAddChain(rng: Rng): string | null {
  // A+B+C=DE
  for (let t = 0; t < 40; t++) {
    const a = int(rng, 1, 9);
    const b = int(rng, 1, 9);
    const c = int(rng, 1, 9);
    const r = a + b + c;
    if (r >= 10 && r <= 99) return `${a}+${b}+${c}=${r}`;
  }
  return null;
}

function pPemdas(rng: Rng): string | null {
  // A+B*C=DE  (pemdas) length 8
  for (let t = 0; t < 40; t++) {
    const a = int(rng, 1, 9);
    const b = int(rng, 2, 9);
    const c = int(rng, 2, 9);
    const r = a + b * c;
    if (r >= 10 && r <= 99) return `${a}+${b}*${c}=${r}`;
  }
  return null;
}

export function validEquation(eq: string): boolean {
  if (eq.length !== LINE_LEN) return false;
  if ((eq.match(/=/g) ?? []).length !== 1) return false;
  const [left, right] = eq.split("=");
  if (!left || !right) return false;
  if (!/^\d/.test(left) || !/^\d/.test(right)) return false;
  if (/[\+\-\*\/]{2}/.test(left)) return false;
  if (/[×÷]/.test(eq)) return false;
  if (hasLeadingZero(left) || hasLeadingZero(right)) return false;
  const value = evalExprAscii(left);
  const target = Number(right);
  if (value === null || !Number.isInteger(target)) return false;
  return value === target;
}

function hasLeadingZero(expr: string): boolean {
  return /(?:^|[\+\-\*\/])0\d/.test(expr);
}

export function evalExprAscii(expr: string): number | null {
  const nums: number[] = [];
  const ops: Op[] = [];
  let buf = "";
  for (const ch of expr) {
    if (ch >= "0" && ch <= "9") buf += ch;
    else {
      const op = parseOp(ch);
      if (!op || buf.length === 0) return null;
      nums.push(Number(buf));
      ops.push(op);
      buf = "";
    }
  }
  if (buf.length === 0) return null;
  nums.push(Number(buf));
  return evalChain(nums, ops, "pemdas");
}

export function scoreLine(guess: string, solution: string): LineMark[] {
  const n = solution.length;
  const marks: LineMark[] = Array(n).fill("absent");
  const remain: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    if (guess[i] === solution[i]) marks[i] = "correct";
    else remain[solution[i]!] = (remain[solution[i]!] ?? 0) + 1;
  }
  for (let i = 0; i < n; i++) {
    if (marks[i] === "correct") continue;
    const ch = guess[i]!;
    if ((remain[ch] ?? 0) > 0) {
      marks[i] = "present";
      remain[ch]!--;
    }
  }
  return marks;
}

export function generateLine2d(opts: { difficulty: Difficulty; seed: string }): Line2dPuzzle {
  const rng = rngFromSeed(opts.seed);
  const prefer: Op[] =
    opts.difficulty === "easy"
      ? ["+", "-"]
      : opts.difficulty === "medium"
        ? ["+", "-", "×"]
        : ["+", "-", "×", "÷"];

  for (let attempt = 0; attempt < 2000; attempt++) {
    const rows: Line2dPuzzle["rows"] = [];
    let carry = int(rng, 1, 9);
    let ok = true;
    for (let i = 0; i < 3; i++) {
      let placed = false;
      for (let t = 0; t < 40; t++) {
        const op = prefer[int(rng, 0, prefer.length - 1)]!;
        const right = int(rng, 1, 9);
        const result = applyOp(carry, op, right);
        if (result === null) continue;
        if (result < 0 || result > 9) continue;
        if (!Number.isInteger(result)) continue;
        rows.push({ left: carry, op, right, result });
        carry = result;
        placed = true;
        break;
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (ok && rows.length === 3) {
      return {
        kind: "line2d",
        rows,
        seed: opts.seed,
        difficulty: opts.difficulty,
      };
    }
  }

  return {
    kind: "line2d",
    rows: [
      { left: 2, op: "+", right: 3, result: 5 },
      { left: 5, op: "×", right: 1, result: 5 },
      { left: 5, op: "-", right: 2, result: 3 },
    ],
    seed: opts.seed,
    difficulty: opts.difficulty,
  };
}

export function emptyLine2dValues(puzzle: Line2dPuzzle): (number | null)[][] {
  // 3 rows × 3 digits (left, right, result). Shared: row[i].result === row[i+1].left
  return puzzle.rows.map(() => [null, null, null]);
}

export function line2dSolutionGrid(puzzle: Line2dPuzzle): number[][] {
  return puzzle.rows.map((row) => [row.left, row.right, row.result]);
}

export function isLine2dWin(puzzle: Line2dPuzzle, values: (number | null)[][]): boolean {
  const sol = line2dSolutionGrid(puzzle);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (values[r]![c] !== sol[r]![c]) return false;
    }
  }
  return true;
}

export function line2dConflicts(
  puzzle: Line2dPuzzle,
  values: (number | null)[][],
): boolean[][] {
  const mark = Array.from({ length: 3 }, () => Array(3).fill(false));
  for (let r = 0; r < 3; r++) {
    const [a, b, c] = values[r]!;
    if (a === null || b === null || c === null) continue;
    const v = applyOp(a, puzzle.rows[r]!.op, b);
    if (v !== c) {
      mark[r]![0] = true;
      mark[r]![1] = true;
      mark[r]![2] = true;
    }
  }
  // Shared-digit mismatches
  for (let r = 0; r < 2; r++) {
    const end = values[r]![2];
    const next = values[r + 1]![0];
    if (end !== null && next !== null && end !== next) {
      mark[r]![2] = true;
      mark[r + 1]![0] = true;
    }
  }
  return mark;
}

export function hintLine2d(
  puzzle: Line2dPuzzle,
  values: (number | null)[][],
): { r: number; c: number; digit: number } | null {
  const sol = line2dSolutionGrid(puzzle);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (values[r]![c] !== null && values[r]![c] !== sol[r]![c]) {
        return { r, c, digit: sol[r]![c]! };
      }
    }
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (values[r]![c] === null) return { r, c, digit: sol[r]![c]! };
    }
  }
  return null;
}

export const LINE_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "+", "-", "*", "/", "="] as const;
