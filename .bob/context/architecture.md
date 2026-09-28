# Architecture Snapshot — 2048 Merge 5×8

> Tier 1 context: load this file at every session start.
> Last updated: 2025-01-26

## What this project is

A mobile-first browser game: shoot numbered tiles into a 5-column × 8-row grid. Tiles merge when they match (×2), or trigger special combos for bigger multipliers. Cascade chains reward planning with exponentially growing scores.

## Stack

- Language/runtime: TypeScript + React 18 (Vite)
- Key libs: GSAP (animations + camera shake), PixiJS (particle system), Tailwind CSS, Lucide icons
- Audio: Web Audio API synthesis — no audio files
- Storage: localStorage only (high score, gems, combo history, mute state)

## Key Decisions

- **T-combo detection before corner**: T uses 4 tiles (higher value) so it fires first in cascade
- **`compactGridUpwards` is mandatory** after every tile removal — keeps grid contiguous, detection correct
- **Score contract**: `baseBonus × comboChainCount × (isBonusRushActive ? 2 : 1)` — never deviate
- **Detection priority order**: T-combo (val×8) → corner (val×4) → adjacent (val×2)
- **App.tsx is the monolith**: all state + cascade logic lives here; new mechanics → extract function to gameLogic.ts, wire in App.tsx

## Source Layout

```
src/
  types.ts            — Grid, TileData, SpecialComboEvent, GameStats, combos
  App.tsx             — state machine + resolveCascadeChain (cascade loop)
  utils/
    gameLogic.ts      — pure functions: shoot preview, merge detection, compaction
    audio.ts          — soundFx singleton (Web Audio synthesis)
    theme.ts          — getTileStyle, formatTileValue
  components/
    GameBoard.tsx     — grid render + column hit zones
    TileBlock.tsx     — single tile with merge pop animation
    ShooterControls   — current/next queue + swap
    Header.tsx        — HUD: score, gems, boosters
    PixiParticleCanvas— particle FX
  shared/
    tokens.ts         — COLORS, SHADOWS, Z, DUR design tokens
```

## Cascade Loop (core of the game)

```
resolveCascadeChain(grid, combo=1):
  while hasMatches:
    findInvertedTMatches → consume 4 tiles, newValue=val*8
    findCornerMatches    → consume 3 tiles, newValue=val*4
    findAdjacentMatches  → consume 2 tiles, newValue=val*2
    compactGridUpwards
    combo++
```

## What NOT to re-read every session

- Full LAYOUT.md → use this file + spawn_subagent if deep scan needed
- PLAN.md / ROADMAP.md → use `.bob/context/current-phase.md` instead
