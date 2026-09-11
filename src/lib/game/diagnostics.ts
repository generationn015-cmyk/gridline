import { countKenKenSolutions } from "./cages";
import { countCrossSolutions } from "./cross";
import { generatePuzzle } from "./generate";
import { evalExprAscii, validEquation } from "./line";
import type { Difficulty } from "./types";

export interface DiagCase {
  label: string;
  passed: boolean;
  ms: number;
  detail: string;
}

export interface DiagReport {
  ranAt: string;
  cases: DiagCase[];
  passed: number;
  failed: number;
}

type CaseFn = () => string | true;

function runOne(label: string, fn: CaseFn): DiagCase {
  const t0 = performance.now();
  try {
    const r = fn();
    const ms = Math.round(performance.now() - t0);
    if (r === true) return { label, passed: true, ms, detail: "ok" };
    return { label, passed: false, ms, detail: r };
  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    return {
      label,
      passed: false,
      ms,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

function makeCases(samples: number): Array<{ label: string; fn: CaseFn }> {
  const diffs: Difficulty[] = ["easy", "medium"];
  const out: Array<{ label: string; fn: CaseFn }> = [];

  for (const diff of diffs) {
    for (const size of [5, 7] as const) {
      if (diff === "easy" && size === 7) continue;
      const n = samples;
      out.push({
        label: `Cross ${size}×${size} ${diff} ×${n}`,
        fn: () => {
          for (let i = 0; i < n; i++) {
            const p = generatePuzzle({
              mode: "cross",
              kind: "practice",
              size,
              difficulty: diff,
              evalMode: "ltr",
              entropy: 1000 + i + size * 10 + (diff === "easy" ? 0 : 50),
            });
            if (p.kind !== "cross") return "wrong kind";
            const dim = p.size === 5 ? 3 : 4;
            const count = countCrossSolutions(p.cells, dim, p.evalMode, 2);
            if (count !== 1) return `non-unique (${count}) sample ${i}`;
          }
          return true;
        },
      });
    }
  }

  for (const diff of diffs) {
    const sizes: Array<4 | 5 | 6> = diff === "easy" ? [4, 5] : [4, 5, 6];
    for (const size of sizes) {
      const n = diff === "medium" && size === 6 ? Math.min(samples, 8) : samples;
      out.push({
        label: `Cages ${size}×${size} ${diff} ×${n}`,
        fn: () => {
          for (let i = 0; i < n; i++) {
            const p = generatePuzzle({
              mode: "cages",
              kind: "practice",
              size,
              difficulty: diff,
              evalMode: "ltr",
              entropy: 2000 + i + size * 17 + (diff === "easy" ? 0 : 80),
            });
            if (p.kind !== "cages") return "wrong kind";
            const count = countKenKenSolutions(p.size, p.cages, 2);
            if (count !== 1) return `non-unique (${count}) sample ${i}`;
          }
          return true;
        },
      });
    }
  }

  for (const diff of diffs) {
    out.push({
      label: `Line ${diff} ×${samples}`,
      fn: () => {
        for (let i = 0; i < samples; i++) {
          const p = generatePuzzle({
            mode: "line",
            kind: "practice",
            difficulty: diff,
            evalMode: "ltr",
            entropy: 3000 + i + (diff === "easy" ? 0 : 90),
          });
          if (p.kind !== "line") return "wrong kind";
          if (!validEquation(p.equation)) return `invalid ${p.equation}`;
          const [left, right] = p.equation.split("=");
          if (evalExprAscii(left!) !== Number(right)) return `eval ${p.equation}`;
        }
        return true;
      },
    });
  }

  for (const diff of diffs) {
    out.push({
      label: `Stack ${diff} ×${samples}`,
      fn: () => {
        for (let i = 0; i < samples; i++) {
          const p = generatePuzzle({
            mode: "line2d",
            kind: "practice",
            difficulty: diff,
            evalMode: "ltr",
            entropy: 4000 + i,
          });
          if (p.kind !== "line2d") return "wrong kind";
          if (p.rows.length !== 3) return "not 3 rows";
          for (let r = 0; r < 3; r++) {
            const row = p.rows[r]!;
            if (r > 0 && row.left !== p.rows[r - 1]!.result) return "chain broken";
          }
        }
        return true;
      },
    });
  }

  out.push({
    label: "Daily seed stable",
    fn: () => {
      const a = generatePuzzle({
        mode: "cross",
        kind: "daily",
        date: "2026-09-11",
        size: 5,
        difficulty: "medium",
        evalMode: "ltr",
      });
      const b = generatePuzzle({
        mode: "cross",
        kind: "daily",
        date: "2026-09-11",
        size: 5,
        difficulty: "medium",
        evalMode: "ltr",
      });
      if (a.kind !== "cross" || b.kind !== "cross") return "kind";
      const sa = JSON.stringify(a.cells.map((row) => row.map((c) => c.solution ?? c.op ?? c.type)));
      const sb = JSON.stringify(b.cells.map((row) => row.map((c) => c.solution ?? c.op ?? c.type)));
      return sa === sb ? true : "mismatch";
    },
  });

  return out;
}

export function runDiagnostics(opts?: { samples?: number }): DiagReport {
  const samples = opts?.samples ?? 20;
  const cases = makeCases(samples).map((c) => runOne(c.label, c.fn));
  const passed = cases.filter((c) => c.passed).length;
  return {
    ranAt: new Date().toISOString(),
    cases,
    passed,
    failed: cases.length - passed,
  };
}

export async function runDiagnosticsAsync(
  onProgress: (report: DiagReport) => void,
  opts?: { samples?: number },
): Promise<DiagReport> {
  const samples = opts?.samples ?? 20;
  const jobs = makeCases(samples);
  const cases: DiagCase[] = [];
  for (const job of jobs) {
    await new Promise((r) => setTimeout(r, 0));
    cases.push(runOne(job.label, job.fn));
    const passed = cases.filter((c) => c.passed).length;
    onProgress({
      ranAt: new Date().toISOString(),
      cases: [...cases],
      passed,
      failed: cases.length - passed,
    });
  }
  const passed = cases.filter((c) => c.passed).length;
  return {
    ranAt: new Date().toISOString(),
    cases,
    passed,
    failed: cases.length - passed,
  };
}
