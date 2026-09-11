# NINA

Daily math crossword suite — Cross, Cages, Line, and Stack — set by **Nina**.

No accounts. Puzzles generate on your device. Daily boards use a UTC date seed so every player gets the same puzzle. Progress lives in this browser under Continue.

## Games

- **Cross** — a crossword of digits. Every across and down line is a true equation.
- **Cages** — Latin square with cages (KenKen).
- **Line** — a hidden eight-character equation, six tries.
- **Stack** — three chained equations sharing digits.

## Nina

Nina is the setter. She writes the boards, comments on hints, and files wins. She is a name and a voice, not a mascot.

## Saves

Versioned local save (`nina.v2`). Daily and practice are separate slots. Export and import from Settings. Unfinished boards resume from Continue.

## Diagnostics

Settings → Diagnostics runs 20 Easy and Medium generators per mode through the solver.

## Deploy

TanStack Start + Vite. `npm run build` emits Vercel Build Output via Nitro (`preset: vercel`).
