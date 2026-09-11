# GRIDLINE

Daily math crossword suite — Cross, Cages, Line, and Stack — set by **Nina**.

No accounts. Puzzles generate on your device. Daily boards use a UTC date seed so every player gets the same puzzle.

Play: [gridline-nu.vercel.app](https://gridline-nu.vercel.app)

## Run locally

```bash
npm install
npm run dev
```

`npm run build` then `npm run preview` for the production bundle.

## Daily seeding

Seed string: `YYYY-MM-DD|mode|size|difficulty` hashed into a Mulberry32 RNG. Reload the same UTC day to get the identical board.

## Nina

Nina is the setter. She writes the boards, comments on hints, and files wins. She is a name and a voice, not a mascot.

## Diagnostics

Settings → Diagnostics runs 20 Easy and Medium generators per mode through the solver.

## Deploy

TanStack Start + Vite. `npm run build` emits Vercel Build Output via Nitro (`preset: vercel`). Production: [gridline-nu.vercel.app](https://gridline-nu.vercel.app). Source: [generationn015-cmyk/gridline](https://github.com/generationn015-cmyk/gridline).
