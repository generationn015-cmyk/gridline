import type { CrossCell, CrossPuzzle, Difficulty } from "./types";
import type { EvalMode, Op } from "./math";
import { evalChain, findOpsForResult, isSingleDigit, opsForDifficulty } from "./math";
import { int, rngFromSeed, shuffled, type Rng } from "./rng";

export function generateCross(opts: {
  size: 5 | 7;
  difficulty: Difficulty;
  evalMode: EvalMode;
  seed: string;
}): CrossPuzzle {
  const rng = rngFromSeed(opts.seed);
  const n = opts.size === 5 ? 3 : 4;
  const prefer = opsForDifficulty(opts.difficulty);

  let digits: number[][] | null = null;
  let hops: Op[][] | null = null;
  let vops: Op[][] | null = null;

  for (let attempt = 0; attempt < 4000; attempt++) {
    const built = tryBuild(n, opts.evalMode, prefer, rng);
    if (built) {
      digits = built.digits;
      hops = built.hops;
      vops = built.vops;
      break;
    }
  }
  if (!digits || !hops || !vops) {
    const fallback = tryBuild(n, opts.evalMode, ["+"], rng) ?? forceEasy(n, opts.evalMode);
    digits = fallback.digits;
    hops = fallback.hops;
    vops = fallback.vops;
  }

  const cells = layoutCells(n, digits, hops, vops);
  punchGivens(cells, n, opts.difficulty, opts.evalMode, rng);

  return {
    kind: "cross",
    size: opts.size,
    difficulty: opts.difficulty,
    evalMode: opts.evalMode,
    cells,
    seed: opts.seed,
  };
}

function tryBuild(
  n: number,
  mode: EvalMode,
  prefer: readonly Op[],
  rng: Rng,
): { digits: number[][]; hops: Op[][]; vops: Op[][] } | null {
  const eqRows = n - 1;
  const operandCols = n - 1;
  const digits: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const hops: Op[][] = Array.from({ length: eqRows }, () => Array(Math.max(0, operandCols - 1)).fill("+"));
  const vops: Op[][] = Array.from({ length: Math.max(0, eqRows - 1) }, () => Array(n).fill("+"));

  for (let r = 0; r < eqRows; r++) {
    let found = false;
    for (let t = 0; t < 80; t++) {
      const nums: number[] = [];
      for (let c = 0; c < operandCols; c++) nums.push(int(rng, 1, 9));
      const hit = findOpsForResult(nums, mode, prefer, rng);
      if (!hit) continue;
      for (let c = 0; c < operandCols; c++) digits[r]![c] = nums[c]!;
      hops[r] = hit.ops;
      digits[r]![n - 1] = hit.result;
      found = true;
      break;
    }
    if (!found) return null;
  }

  for (let c = 0; c < n; c++) {
    const nums = Array.from({ length: eqRows }, (_, r) => digits[r]![c]!);
    const hit = findOpsForResult(nums, mode, prefer, rng);
    if (!hit) return null;
    for (let k = 0; k < hit.ops.length; k++) vops[k]![c] = hit.ops[k]!;
    digits[n - 1]![c] = hit.result;
  }

  return { digits, hops, vops };
}

function forceEasy(n: number, mode: EvalMode): {
  digits: number[][];
  hops: Op[][];
  vops: Op[][];
} {
  const eqRows = n - 1;
  const operandCols = n - 1;
  const digits: number[][] = Array.from({ length: n }, () => Array(n).fill(1));
  const hops: Op[][] = Array.from({ length: eqRows }, () => Array(Math.max(0, operandCols - 1)).fill("+"));
  const vops: Op[][] = Array.from({ length: Math.max(0, eqRows - 1) }, () => Array(n).fill("+"));
  for (let r = 0; r < eqRows; r++) {
    const nums = Array.from({ length: operandCols }, () => 1);
    const hit = findOpsForResult(nums, mode, ["+"], () => 0.5);
    if (!hit) throw new Error("forceEasy failed");
    for (let c = 0; c < operandCols; c++) digits[r]![c] = 1;
    hops[r] = hit.ops;
    digits[r]![n - 1] = hit.result;
  }
  for (let c = 0; c < n; c++) {
    const nums = Array.from({ length: eqRows }, (_, r) => digits[r]![c]!);
    const hit = findOpsForResult(nums, mode, ["+"], () => 0.5);
    if (!hit) throw new Error("forceEasy col failed");
    for (let k = 0; k < hit.ops.length; k++) vops[k]![c] = hit.ops[k]!;
    digits[n - 1]![c] = hit.result;
  }
  return { digits, hops, vops };
}

function layoutCells(
  n: number,
  digits: number[][],
  hops: Op[][],
  vops: Op[][],
): CrossCell[][] {
  const size = 2 * n - 1;
  const cells: CrossCell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({ type: "black" as const })),
  );

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const rEven = r % 2 === 0;
      const cEven = c % 2 === 0;
      if (rEven && cEven) {
        const nr = r / 2;
        const nc = c / 2;
        cells[r]![c] = {
          type: "digit",
          solution: digits[nr]![nc],
          given: true,
        };
      } else if (rEven && !cEven) {
        const nr = r / 2;
        if (nr === n - 1) {
          cells[r]![c] = { type: "black" };
        } else {
          const oddIndex = (c - 1) / 2;
          if (oddIndex === n - 2) {
            cells[r]![c] = { type: "eq" };
          } else {
            cells[r]![c] = { type: "op", op: hops[nr]![oddIndex] };
          }
        }
      } else if (!rEven && cEven) {
        const nc = c / 2;
        const oddIndex = (r - 1) / 2;
        if (oddIndex === n - 2) {
          cells[r]![c] = { type: "eq" };
        } else {
          cells[r]![c] = { type: "op", op: vops[oddIndex]![nc] };
        }
      } else {
        cells[r]![c] = { type: "black" };
      }
    }
  }
  return cells;
}

function punchGivens(
  cells: CrossCell[][],
  n: number,
  difficulty: Difficulty,
  evalMode: EvalMode,
  rng: Rng,
) {
  const size = cells.length;
  const results: Array<[number, number]> = [];
  const operands: Array<[number, number]> = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (cells[r]![c]!.type !== "digit") continue;
      const nr = r / 2;
      const nc = c / 2;
      if (nr === n - 1 || nc === n - 1) results.push([r, c]);
      else operands.push([r, c]);
    }
  }
  const total = results.length + operands.length;
  const keep =
    difficulty === "easy"
      ? Math.ceil(total * 0.62)
      : difficulty === "medium"
        ? Math.ceil(total * 0.42)
        : Math.ceil(total * 0.28);

  const order = [...shuffled(rng, results), ...shuffled(rng, operands)];
  for (const [r, c] of order) {
    const remaining = cells.flat().filter((x) => x.type === "digit" && x.given).length;
    if (remaining <= keep) break;
    const cell = cells[r]![c]!;
    cell.given = false;
    const count = countCrossSolutions(cells, n, evalMode, 2);
    if (count !== 1) cell.given = true;
  }
}

function operandCoords(n: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let nr = 0; nr < n - 1; nr++) {
    for (let nc = 0; nc < n - 1; nc++) out.push([nr * 2, nc * 2]);
  }
  return out;
}

function acrossOps(cells: CrossCell[][], nr: number, n: number): Op[] {
  const r = nr * 2;
  const ops: Op[] = [];
  for (let odd = 0; odd < n - 2; odd++) {
    const c = odd * 2 + 1;
    const cell = cells[r]![c]!;
    if (cell.type === "op" && cell.op) ops.push(cell.op);
  }
  return ops;
}

function downOps(cells: CrossCell[][], nc: number, n: number): Op[] {
  const c = nc * 2;
  const ops: Op[] = [];
  for (let odd = 0; odd < n - 2; odd++) {
    const r = odd * 2 + 1;
    const cell = cells[r]![c]!;
    if (cell.type === "op" && cell.op) ops.push(cell.op);
  }
  return ops;
}

function givenAt(cells: CrossCell[][], r: number, c: number): number | null {
  const cell = cells[r]![c]!;
  if (cell.type === "digit" && cell.given && cell.solution != null) return cell.solution;
  return null;
}

/**
 * Search only operand cells (1–9). Result cells are computed from equations
 * and must match any givens. This keeps 7×7 uniqueness in a tiny domain.
 */
export function countCrossSolutions(
  cells: CrossCell[][],
  n: number,
  evalMode: EvalMode,
  cap = 2,
): number {
  const operands = operandCoords(n);
  const unknown = operands.filter(([r, c]) => !cells[r]![c]!.given);
  const assigned: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (const [r, c] of operands) {
    const g = givenAt(cells, r, c);
    if (g != null) assigned[r / 2]![c / 2] = g;
  }

  let count = 0;

  const checkComplete = () => {
    const eqRows = n - 1;
    const operandCols = n - 1;
    const rowResults: number[] = [];
    for (let nr = 0; nr < eqRows; nr++) {
      const nums = Array.from({ length: operandCols }, (_, nc) => assigned[nr]![nc]!);
      const ops = acrossOps(cells, nr, n);
      const v = evalChain(nums, ops, evalMode);
      if (v === null || !isSingleDigit(v)) return false;
      const g = givenAt(cells, nr * 2, (n - 1) * 2);
      if (g != null && g !== v) return false;
      rowResults.push(v);
    }
    for (let nc = 0; nc < n; nc++) {
      const nums =
        nc < operandCols
          ? Array.from({ length: eqRows }, (_, nr) => assigned[nr]![nc]!)
          : rowResults;
      const ops = downOps(cells, nc, n);
      const v = evalChain(nums, ops, evalMode);
      if (v === null || !isSingleDigit(v)) return false;
      const g = givenAt(cells, (n - 1) * 2, nc * 2);
      if (g != null && g !== v) return false;
    }
    return true;
  };

  const rec = (i: number) => {
    if (count >= cap) return;
    if (i === unknown.length) {
      if (checkComplete()) count++;
      return;
    }
    const [r, c] = unknown[i]!;
    const nr = r / 2;
    const nc = c / 2;
    for (let d = 1; d <= 9; d++) {
      assigned[nr]![nc] = d;
      rec(i + 1);
      if (count >= cap) return;
    }
    assigned[nr]![nc] = 0;
  };

  rec(0);
  return count;
}

function equationCoords(n: number, size: number): Array<Array<[number, number]>> {
  const eqs: Array<Array<[number, number]>> = [];
  const eqRows = n - 1;
  for (let nr = 0; nr < eqRows; nr++) {
    const r = nr * 2;
    const coords: Array<[number, number]> = [];
    for (let c = 0; c < size; c++) coords.push([r, c]);
    eqs.push(coords);
  }
  for (let nc = 0; nc < n; nc++) {
    const c = nc * 2;
    const coords: Array<[number, number]> = [];
    for (let r = 0; r < size; r++) coords.push([r, c]);
    eqs.push(coords);
  }
  return eqs;
}

function readEq(
  cells: CrossCell[][],
  grid: (number | null)[][],
  coords: Array<[number, number]>,
): { nums: (number | null)[]; ops: Op[] } {
  const nums: (number | null)[] = [];
  const ops: Op[] = [];
  for (const [r, c] of coords) {
    const cell = cells[r]![c]!;
    if (cell.type === "digit") nums.push(grid[r]![c]);
    else if (cell.type === "op" && cell.op) ops.push(cell.op);
  }
  return { nums, ops };
}

export function crossPartialValid(
  cells: CrossCell[][],
  grid: (number | null)[][],
  n: number,
  evalMode: EvalMode,
): boolean {
  const size = cells.length;
  for (const coords of equationCoords(n, size)) {
    const { nums, ops } = readEq(cells, grid, coords);
    if (nums.some((x) => x === null)) continue;
    const result = nums[nums.length - 1];
    const left = nums.slice(0, -1) as number[];
    const v = evalChain(left, ops, evalMode);
    if (v === null || v !== result) return false;
    if (!isSingleDigit(v)) return false;
  }
  return true;
}

export function crossFullyValid(
  cells: CrossCell[][],
  grid: (number | null)[][],
  n: number,
  evalMode: EvalMode,
): boolean {
  if (grid.some((row, r) => row.some((v, c) => cells[r]![c]!.type === "digit" && v === null))) {
    return false;
  }
  return crossPartialValid(cells, grid, n, evalMode);
}

export function crossConflicts(
  puzzle: CrossPuzzle,
  values: (number | null)[][],
): boolean[][] {
  const n = puzzle.size === 5 ? 3 : 4;
  const size = puzzle.size;
  const mark = Array.from({ length: size }, () => Array(size).fill(false));
  for (const coords of equationCoords(n, size)) {
    const { nums, ops } = readEq(puzzle.cells, values, coords);
    if (nums.some((x) => x === null)) continue;
    const result = nums[nums.length - 1];
    const left = nums.slice(0, -1) as number[];
    const v = evalChain(left, ops, puzzle.evalMode);
    if (v === null || v !== result) {
      for (const [r, c] of coords) {
        if (puzzle.cells[r]![c]!.type === "digit") mark[r]![c] = true;
      }
    }
  }
  return mark;
}

export function emptyCrossValues(puzzle: CrossPuzzle): (number | null)[][] {
  return puzzle.cells.map((row) =>
    row.map((cell) => (cell.type === "digit" && cell.given ? (cell.solution ?? null) : null)),
  );
}

export function isCrossWin(puzzle: CrossPuzzle, values: (number | null)[][]): boolean {
  const n = puzzle.size === 5 ? 3 : 4;
  return crossFullyValid(puzzle.cells, values, n, puzzle.evalMode);
}

export function hintCross(
  puzzle: CrossPuzzle,
  values: (number | null)[][],
): { r: number; c: number; digit: number } | null {
  const candidates: Array<{ r: number; c: number; digit: number }> = [];
  for (let r = 0; r < puzzle.size; r++) {
    for (let c = 0; c < puzzle.size; c++) {
      const cell = puzzle.cells[r]![c]!;
      if (cell.type !== "digit" || cell.given) continue;
      if (values[r]![c] === cell.solution) continue;
      if (values[r]![c] !== null && values[r]![c] !== cell.solution) {
        candidates.unshift({ r, c, digit: cell.solution! });
      } else if (values[r]![c] === null) {
        candidates.push({ r, c, digit: cell.solution! });
      }
    }
  }
  return candidates[0] ?? null;
}
