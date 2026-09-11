import type { Mode } from "./types";

export const NINA = {
  name: "Nina",
  role: "Setter",
} as const;

const HOUR = () => new Date().getHours();

export function ninaGreeting(streak: number): string {
  const h = HOUR();
  const tod = h < 5 ? "Still up." : h < 12 ? "Morning." : h < 18 ? "Afternoon." : "Evening.";
  if (streak >= 7) return `${tod} Seven days is a habit. I keep setting.`;
  if (streak >= 3) return `${tod} Streak of ${streak}. Don't get sentimental.`;
  if (h < 5) return "The grid doesn't sleep either. Three dailies, when you're ready.";
  return `${tod} I set today's boards. They're waiting.`;
}

export function ninaHomeLine(): string {
  return "Cross, cages, and a line. I don't repeat myself.";
}

export function ninaStart(mode: Mode, daily: boolean): string {
  if (daily) {
    if (mode === "cross") return "Today's cross. Left to right, unless you changed me.";
    if (mode === "cages") return "Cages first. Rows and columns don't share.";
    if (mode === "line") return "Eight glyphs. Six tries. I already know it.";
    return "Three equations, chained. The result walks down.";
  }
  if (mode === "cross") return "Fill digits. Every line has to be true.";
  if (mode === "cages") return "One through n. No repeats. Trust the cages.";
  if (mode === "line") return "Guess the equation. Not the answer — the writing of it.";
  return "A short stack. Shared digits, no slack.";
}

export function ninaHint(used: number): string {
  if (used <= 1) return "One cell. Don't make a habit of it.";
  if (used === 2) return "Second hint. The board is doing more work than you.";
  return "I'll stop commenting after this.";
}

export function ninaCheck(hasConflict: boolean, complete: boolean): string {
  if (complete && !hasConflict) return "Nothing lying. Finish the empty ones.";
  if (hasConflict) return "A line is lying. The marked cells.";
  return "Too early to check. Fill a line first.";
}

export function ninaWin(opts: { hints: number; seconds: number; daily: boolean }): string {
  const { hints, seconds, daily } = opts;
  if (hints === 0 && seconds < 60) return "Clean and quick. That's the one I would have filed.";
  if (hints === 0) return daily ? "Unhinted. I noticed." : "No hints. Fine work.";
  if (seconds > 600) return "Solved. Time is a gossip — ignore it.";
  return "Filed. Next.";
}

export function ninaLose(equation: string): string {
  return `It was ${equation}. Tomorrow I'm less generous.`;
}

export function ninaNew(): string {
  return "Another. I have plenty.";
}

export function ninaComposing(): string {
  return "Nina is composing…";
}

export function modeTitle(mode: Mode): string {
  switch (mode) {
    case "cross":
      return "Cross";
    case "cages":
      return "Cages";
    case "line":
      return "Line";
    case "line2d":
      return "Stack";
  }
}

export function modeDeck(mode: Mode): string {
  switch (mode) {
    case "cross":
      return "Math crossword. Across and down are true equations.";
    case "cages":
      return "Latin square with cages. KenKen, filed under Nina.";
    case "line":
      return "A hidden equation. Color, not luck.";
    case "line2d":
      return "Three chained equations sharing digits.";
  }
}
