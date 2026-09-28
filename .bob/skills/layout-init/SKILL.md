---
name: layout-init
description: Map the 2048 Merge codebase into LAYOUT.md — covering the folder tree, component responsibilities, game logic flow, and where each mechanic lives. Use when asked to document, map, or describe the architecture of this shooter-merge game.
---

# Layout Init — 2048 Merge 5×8

Write `LAYOUT.md` in the project root: a map that lets anyone find where game mechanics live and where a new feature fits, without re-reading every file.

If `LAYOUT.md` already exists, update it in place and report what changed.

## 1. Read

1. `package.json`, `tsconfig.json`, `vite.config.ts`, `metadata.json` — stack and entry points.
2. `src/types.ts` — the data model (Grid, TileData, SpecialComboEvent, GameStats, etc.).
3. `src/utils/gameLogic.ts` — core mechanics (shoot, merge, cascade, combo detection).
4. `src/utils/audio.ts` — sound FX triggers.
5. `src/utils/theme.ts` — visual theme tokens.
6. `src/App.tsx` — game state machine, event handlers, cascade chain orchestration.
7. `src/components/` — each UI component: what it renders and which props/callbacks it consumes.
8. `src/shared/` — shared HUD elements and design tokens.

Skip `node_modules/`, `dist/`.

## 2. Write `LAYOUT.md`

Sections (tight — one line per entry, no code):

### Folder Tree
Every folder and meaningful file with a one-line purpose.

### Data Model (`src/types.ts`)
Each exported type/interface: what it represents in the game.

### Game Logic (`src/utils/gameLogic.ts`)
Each exported function: what mechanic it implements, file:function.

### State Machine (`src/App.tsx`)
Key state slices (grid, currentValue, nextValue, stats, bonusRush, cascade…) and the main event handlers (handleShoot, resolveCascadeChain, handleRestart…).

### Components
One row per component: path, what it renders, key props.

### Main Game Flow
The shoot-to-score pipeline as a chain:
`ShooterControls → handleShoot → previewShoot → flyingTile → resolveCascadeChain → findInvertedTMatches / findCornerMatches / findAdjacentMatches → compactGridUpwards → setGrid`

### Combo System
Each combo type: trigger shape, tiles consumed, multiplier formula, score bonus formula.

### Booster / Powerup Map
Each booster: gem cost, what it does, handler function.

## 3. Keep It Tight

- Target ≤ 120 lines so it loads fully in session context.
- No code blocks, no prose. Pure map.
- Check that every path written actually exists.

## 4. Report

Summarize in 3–4 lines: component count, combo types, biggest architectural risk (e.g. monolithic App.tsx). Tell the user that from now on, new features should be planned against this layout and recorded in `ROADMAP.md`.
