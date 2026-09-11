import type { Cage, CagesPuzzle, Difficulty } from "./types";
import type { Op } from "./math";
import { int, rngFromSeed, shuffled, type Rng } from "./rng";

const DIRS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function generateCages(opts: {
  size: 4 | 5 | 6;
  difficulty: Difficulty;
  seed: string;
}): CagesPuzzle {
  const rng = rngFromSeed(opts.seed);
  const n = opts.size;
  const solution = latinSquare(n, rng);
  const cages = buildUniqueCages(n, solution, opts.difficulty, rng);
  return {
    kind: "cages",
    size: n,
    difficulty: opts.difficulty,
    solution,
    cages,
    seed: opts.seed,
  };
}

function latinSquare(n: number, rng: Rng): number[][] {
  const g = Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => ((r + c) % n) + 1),
  );
  const rows = shuffled(rng, Array.from({ length: n }, (_, i) => i));
  const cols = shuffled(rng, Array.from({ length: n }, (_, i) => i));
  const syms = shuffled(rng, Array.from({ length: n }, (_, i) => i + 1));
  const out: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = g[rows[r]!]![cols[c]!]!;
      out[r]![c] = syms[v - 1]!;
    }
  }
  return out;
}

function singletonCages(n: number, solution: number[][]): Cage[] {
  const cages: Cage[] = [];
  let id = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      cages.push({
        id: id++,
        cells: [[r, c]],
        op: null,
        target: solution[r]![c]!,
      });
    }
  }
  return cages;
}

function cageIdAt(cages: Cage[], r: number, c: number): number {
  const found = cages.find((g) => g.cells.some(([a, b]) => a === r && b === c));
  return found?.id ?? -1;
}

/**
 * Start from 1-cell cages (unique by construction) and merge adjacent cages
 * only while the board stays unique. Early uniqueness checks are cheap.
 */
function buildUniqueCages(
  n: number,
  solution: number[][],
  difficulty: Difficulty,
  rng: Rng,
): Cage[] {
  const cages = singletonCages(n, solution);
  const maxSize = difficulty === "easy" ? 2 : difficulty === "medium" ? 3 : 4;
  const mergeTarget =
    difficulty === "easy"
      ? Math.floor(n * n * 0.42)
      : difficulty === "medium"
        ? Math.floor(n * n * 0.55)
        : Math.floor(n * n * 0.66);

  let merges = 0;
  let guard = 0;
  while (merges < mergeTarget && guard++ < n * n * 14) {
    const r = int(rng, 0, n - 1);
    const c = int(rng, 0, n - 1);
    const [dr, dc] = DIRS[int(rng, 0, 3)]!;
    const nr = r + dr;
    const nc = c + dc;
    if (nr < 0 || nc < 0 || nr >= n || nc >= n) continue;
    const a = cages.find((g) => g.id === cageIdAt(cages, r, c));
    const b = cages.find((g) => g.id === cageIdAt(cages, nr, nc));
    if (!a || !b || a.id === b.id) continue;
    if (a.cells.length + b.cells.length > maxSize) continue;

    const aCells = a.cells.slice();
    const aOp = a.op;
    const aTarget = a.target;
    const bCopy: Cage = { ...b, cells: b.cells.slice() };

    a.cells = a.cells.concat(b.cells);
    const idx = cages.findIndex((g) => g.id === b.id);
    if (idx >= 0) cages.splice(idx, 1);
    assignTargets([a], solution, rng);

    const unique = countKenKenSolutions(n, cages, 2) === 1;
    if (unique) {
      merges++;
    } else {
      a.cells = aCells;
      a.op = aOp;
      a.target = aTarget;
      cages.splice(idx < 0 ? cages.length : Math.min(idx, cages.length), 0, bCopy);
    }
  }

  cages.forEach((g, i) => {
    g.id = i;
  });
  return cages;
}

function assignTargets(cages: Cage[], solution: number[][], rng: Rng) {
  for (const cage of cages) {
    const vals = cage.cells.map(([r, c]) => solution[r]![c]!);
    if (vals.length === 1) {
      cage.op = null;
      cage.target = vals[0]!;
      continue;
    }
    const options: Array<{ op: Op; target: number }> = [];
    const sum = vals.reduce((a, b) => a + b, 0);
    const prod = vals.reduce((a, b) => a * b, 1);
    options.push({ op: "+", target: sum });
    if (prod <= 9999) options.push({ op: "×", target: prod });
    if (vals.length === 2) {
      const [x, y] = [Math.max(vals[0]!, vals[1]!), Math.min(vals[0]!, vals[1]!)];
      options.push({ op: "-", target: x - y });
      if (y !== 0 && x % y === 0) options.push({ op: "÷", target: x / y });
    }
    const pick = options[int(rng, 0, options.length - 1)]!;
    cage.op = pick.op;
    cage.target = pick.target;
  }
}

export function countKenKenSolutions(n: number, cages: Cage[], cap = 2): number {
  const cageOf: (Cage | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
  for (const cage of cages) {
    for (const [r, c] of cage.cells) cageOf[r]![c] = cage;
  }

  const grid: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const rowMask = Array(n).fill(0);
  const colMask = Array(n).fill(0);
  const full = (1 << (n + 1)) - 2;

  let count = 0;
  let nodes = 0;
  const NODE_CAP = 80_000;

  const cagePossible = (cage: Cage): boolean => {
    const filled: number[] = [];
    let empty = 0;
    for (const [r, c] of cage.cells) {
      const v = grid[r]![c]!;
      if (v === 0) empty++;
      else filled.push(v);
    }
    if (empty === 0) {
      if (cage.op === null) return filled[0] === cage.target;
      if (cage.op === "+") return filled.reduce((a, b) => a + b, 0) === cage.target;
      if (cage.op === "×") return filled.reduce((a, b) => a * b, 1) === cage.target;
      if (filled.length !== 2) return false;
      if (cage.op === "-") return Math.abs(filled[0]! - filled[1]!) === cage.target;
      const hi = Math.max(filled[0]!, filled[1]!);
      const lo = Math.min(filled[0]!, filled[1]!);
      return lo !== 0 && hi / lo === cage.target;
    }
    if (cage.op === "+") {
      const sum = filled.reduce((a, b) => a + b, 0);
      return cage.target >= sum + empty && cage.target <= sum + empty * n;
    }
    if (cage.op === "×") {
      const prod = filled.reduce((a, b) => a * b, 1);
      return cage.target % prod === 0;
    }
    if (cage.op === "-" && filled.length === 1) {
      const v = filled[0]!;
      return v + cage.target <= n || v - cage.target >= 1;
    }
    if (cage.op === "÷" && filled.length === 1) {
      const v = filled[0]!;
      return v * cage.target <= n || (v % cage.target === 0 && v / cage.target >= 1);
    }
    return true;
  };

  const cells: Array<[number, number]> = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) cells.push([r, c]);

  const rec = (i: number) => {
    if (count >= cap) return;
    if (++nodes > NODE_CAP) return;
    if (i === cells.length) {
      count++;
      return;
    }
    let best = i;
    let bestCount = 99;
    for (let k = i; k < cells.length; k++) {
      const [r, c] = cells[k]!;
      const avail = full & ~rowMask[r]! & ~colMask[c]!;
      let bits = 0;
      for (let v = 1; v <= n; v++) if (avail & (1 << v)) bits++;
      if (bits < bestCount) {
        bestCount = bits;
        best = k;
        if (bits === 0) break;
      }
    }
    if (bestCount === 0) return;
    [cells[i], cells[best]] = [cells[best]!, cells[i]!];
    const [r, c] = cells[i]!;
    const avail = full & ~rowMask[r]! & ~colMask[c]!;
    const cage = cageOf[r]![c]!;
    for (let v = 1; v <= n; v++) {
      if (!(avail & (1 << v))) continue;
      grid[r]![c] = v;
      rowMask[r] |= 1 << v;
      colMask[c] |= 1 << v;
      if (cagePossible(cage)) rec(i + 1);
      grid[r]![c] = 0;
      rowMask[r] &= ~(1 << v);
      colMask[c] &= ~(1 << v);
      if (count >= cap) return;
    }
    [cells[i], cells[best]] = [cells[best]!, cells[i]!];
  };

  rec(0);
  if (nodes > NODE_CAP && count < cap) return cap;
  return count;
}

export function cagesConflicts(
  puzzle: CagesPuzzle,
  values: (number | null)[][],
): boolean[][] {
  const n = puzzle.size;
  const mark = Array.from({ length: n }, () => Array(n).fill(false));

  for (let r = 0; r < n; r++) {
    const seen = new Map<number, number[]>();
    for (let c = 0; c < n; c++) {
      const v = values[r]![c];
      if (v === null) continue;
      const list = seen.get(v) ?? [];
      list.push(c);
      seen.set(v, list);
    }
    for (const cols of seen.values()) {
      if (cols.length > 1) for (const c of cols) mark[r]![c] = true;
    }
  }
  for (let c = 0; c < n; c++) {
    const seen = new Map<number, number[]>();
    for (let r = 0; r < n; r++) {
      const v = values[r]![c];
      if (v === null) continue;
      const list = seen.get(v) ?? [];
      list.push(r);
      seen.set(v, list);
    }
    for (const rows of seen.values()) {
      if (rows.length > 1) for (const r of rows) mark[r]![c] = true;
    }
  }

  for (const cage of puzzle.cages) {
    const vals = cage.cells.map(([r, c]) => values[r]![c]);
    if (vals.some((v) => v === null)) continue;
    const nums = vals as number[];
    let ok = false;
    if (cage.op === null) ok = nums[0] === cage.target;
    else if (cage.op === "+") ok = nums.reduce((a, b) => a + b, 0) === cage.target;
    else if (cage.op === "×") ok = nums.reduce((a, b) => a * b, 1) === cage.target;
    else if (cage.op === "-") ok = Math.abs(nums[0]! - nums[1]!) === cage.target;
    else if (cage.op === "÷") {
      const hi = Math.max(nums[0]!, nums[1]!);
      const lo = Math.min(nums[0]!, nums[1]!);
      ok = lo !== 0 && hi / lo === cage.target;
    }
    if (!ok) for (const [r, c] of cage.cells) mark[r]![c] = true;
  }
  return mark;
}

export function emptyCagesValues(puzzle: CagesPuzzle): (number | null)[][] {
  return Array.from({ length: puzzle.size }, () => Array(puzzle.size).fill(null));
}

export function isCagesWin(puzzle: CagesPuzzle, values: (number | null)[][]): boolean {
  const n = puzzle.size;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (values[r]![c] !== puzzle.solution[r]![c]) return false;
    }
  }
  return true;
}

export function hintCages(
  puzzle: CagesPuzzle,
  values: (number | null)[][],
): { r: number; c: number; digit: number } | null {
  const n = puzzle.size;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const v = values[r]![c];
      if (v !== null && v !== puzzle.solution[r]![c]) {
        return { r, c, digit: puzzle.solution[r]![c]! };
      }
    }
  }
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (values[r]![c] === null) return { r, c, digit: puzzle.solution[r]![c]! };
    }
  }
  return null;
}

export function cageLabel(cage: Cage): string {
  if (cage.op === null) return String(cage.target);
  return `${cage.target}${cage.op}`;
}

export function cageBorder(
  puzzle: CagesPuzzle,
  r: number,
  c: number,
): { t: boolean; r: boolean; b: boolean; l: boolean } {
  const idAt = (rr: number, cc: number) => {
    if (rr < 0 || cc < 0 || rr >= puzzle.size || cc >= puzzle.size) return -1;
    const found = puzzle.cages.find((g) => g.cells.some(([a, b]) => a === rr && b === cc));
    return found?.id ?? -2;
  };
  const id = idAt(r, c);
  return {
    t: idAt(r - 1, c) !== id,
    r: idAt(r, c + 1) !== id,
    b: idAt(r + 1, c) !== id,
    l: idAt(r, c - 1) !== id,
  };
}
