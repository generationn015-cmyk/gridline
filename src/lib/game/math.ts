export type Op = "+" | "-" | "×" | "÷";
export type EvalMode = "ltr" | "pemdas";

export const OPS: readonly Op[] = ["+", "-", "×", "÷"];
export const OP_CHARS = OPS;
export const OP_ASCII: Record<Op, string> = {
  "+": "+",
  "-": "-",
  "×": "*",
  "÷": "/",
};

export function parseOp(ch: string): Op | null {
  if (ch === "+" || ch === "-" || ch === "×" || ch === "÷") return ch;
  if (ch === "*") return "×";
  if (ch === "/") return "÷";
  if (ch === "x" || ch === "X") return "×";
  return null;
}

export function applyOp(a: number, op: Op, b: number): number | null {
  switch (op) {
    case "+":
      return a + b;
    case "-":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      if (b === 0) return null;
      if (a % b !== 0) return null;
      return a / b;
  }
}

export function evalChain(nums: number[], ops: Op[], mode: EvalMode): number | null {
  if (nums.length === 0) return null;
  if (ops.length !== nums.length - 1) return null;
  if (nums.some((n) => !Number.isInteger(n))) return null;

  if (mode === "pemdas") {
    const n = nums.slice();
    const o = ops.slice();
    for (let i = 0; i < o.length; ) {
      if (o[i] === "×" || o[i] === "÷") {
        const r = applyOp(n[i]!, o[i]!, n[i + 1]!);
        if (r === null) return null;
        n.splice(i, 2, r);
        o.splice(i, 1);
      } else {
        i++;
      }
    }
    return evalLtr(n, o);
  }
  return evalLtr(nums, ops);
}

function evalLtr(nums: number[], ops: Op[]): number | null {
  let v = nums[0]!;
  for (let i = 0; i < ops.length; i++) {
    const r = applyOp(v, ops[i]!, nums[i + 1]!);
    if (r === null) return null;
    v = r;
  }
  return v;
}

export function isSingleDigit(n: number): boolean {
  return Number.isInteger(n) && n >= 0 && n <= 9;
}

/** Find operator sequences so eval(nums, ops) is an integer in [0, 9]. */
export function findOpsForResult(
  nums: number[],
  mode: EvalMode,
  prefer: readonly Op[],
  rng: () => number,
): { ops: Op[]; result: number } | null {
  const needed = nums.length - 1;
  if (needed <= 0) {
    const n = nums[0]!;
    return isSingleDigit(n) ? { ops: [], result: n } : null;
  }
  const pool = prefer.length ? prefer : OPS;
  const combos = opCombos(needed, pool);
  // Shuffle lightly so dailies vary, but still try all.
  for (let i = combos.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [combos[i], combos[j]] = [combos[j]!, combos[i]!];
  }
  for (const ops of combos) {
    const r = evalChain(nums, ops, mode);
    if (r !== null && isSingleDigit(r)) return { ops, result: r };
  }
  return null;
}

function opCombos(n: number, pool: readonly Op[]): Op[][] {
  if (n === 1) return pool.map((op) => [op]);
  const out: Op[][] = [];
  const rec = (cur: Op[]) => {
    if (cur.length === n) {
      out.push(cur.slice());
      return;
    }
    for (const op of pool) {
      cur.push(op);
      rec(cur);
      cur.pop();
    }
  };
  rec([]);
  return out;
}

export function opsForDifficulty(difficulty: "easy" | "medium" | "hard"): Op[] {
  if (difficulty === "easy") return ["+", "-", "+", "×"];
  if (difficulty === "medium") return ["+", "-", "×", "÷"];
  return ["×", "÷", "+", "-"];
}
