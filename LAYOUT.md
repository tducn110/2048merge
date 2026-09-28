# LAYOUT — 2048 Merge 5×8

> Map of the codebase. One line per entry. No code. Every path verified.
> Update this file as new features land.

---

## Folder Tree

```
2048merge/
  src/
    types.ts              — all shared TypeScript types and interfaces
    App.tsx               — game state machine, event handlers, cascade orchestration
    index.css             — global styles, Tailwind base, CSS custom properties
    main.tsx              — React root mount
    utils/
      gameLogic.ts        — pure game mechanics: shoot, merge, cascade, combo detection
      audio.ts            — Web Audio API sound FX singleton (soundFx)
      theme.ts            — tile color/style lookup (getTileStyle, formatTileValue)
    components/
      GameBoard.tsx       — 5×8 grid renderer, column hit zones, flying tile, AddIn popups
      TileBlock.tsx       — single tile: value, merge pop animation, ghost preview
      ShooterControls.tsx — current/next tile display, swap button, column aim touch zones
      Header.tsx          — score, high score, gem count, mute, pause, booster buttons
      PixiParticleCanvas.tsx — PixiJS particle system (merge explosions, square blasts)
      ParticleCanvas.tsx  — legacy Canvas 2D particle canvas (kept, unused in prod)
      TutorialModal.tsx   — first-run tutorial overlay
      GameOverModal.tsx   — game over screen with final score
      PauseModal.tsx      — pause menu with resume / restart
      MilestoneModal.tsx  — high-tile achievement popup
      CoinIcon.tsx        — gem/coin SVG icon used in HUD
    shared/
      hud.tsx             — shared HUD React components (progress bars, badges)
      tokens.ts           — design tokens: COLORS, SHADOWS, Z, DUR (single source of truth)
  index.html              — Vite HTML entry
  metadata.json           — app name, description, capability flags
  vite.config.ts          — Vite build config
  tsconfig.json           — TypeScript config
  package.json            — deps: React, PixiJS, GSAP, Tailwind, Lucide
```

---

## Data Model (`src/types.ts`)

| Type | Game meaning |
|------|-------------|
| `TileData` | One cell: value, grid position (row/col), merge animation state |
| `Grid` | `TileData\|null[][]` — 8 rows × 5 cols, row 0 = ceiling, row 7 = floor |
| `MergeDirection` | `'up' \| 'down' \| 'left' \| 'right'` — direction absorbed neighbor came from |
| `SpecialComboEvent` | Fired combo shape: type, tiles consumed, target cell, newValue, scoreBonus |
| `GameStats` | Live counters: score, highScore, gems, comboCount, highestTile, per-combo counts |
| `FloatingNotification` | Screen-space text popup (score flash, combo label) |
| `AddInPopup` | Grid-anchored score popup at (row, col) after a merge |
| `AbsorbingTileAnim` | Sliding domino animation: neighbor visually moves into target before merge |
| `ComboHistoryItem` | Last-5 high-scoring combos persisted to localStorage |

---

## Game Logic (`src/utils/gameLogic.ts`)

| Function | Mechanic |
|----------|---------|
| `createEmptyGrid()` | Returns 8×5 null grid |
| `generateInitialGrid()` | Spawns 2/4/8 tiles in top rows to start a game |
| `getRandomSpawnValue(highestTile)` | Weighted random: 50% → 2, 35% → 4, 15% → 8 (rare 16 at 256+) |
| `previewShoot(grid, col, value)` | Finds where an incoming tile lands (or merges) in a column |
| `compactGridUpwards(grid)` | Removes gaps: tiles float up, no empty cells between ceiling and bottom |
| `findInvertedTMatches(grid)` | Detects T-shapes (4 tiles, all orientations) → `SpecialComboEvent\|null` |
| `findCornerMatches(grid)` | Detects 3-tile L-corners (all 4 orientations) → `SpecialComboEvent\|null` |
| `findAdjacentMatches(grid, r, c)` | Returns adjacent cells with same value as `grid[r][c]` |
| `isGameOver(grid, incomingValue)` | True when no column can accept the incoming tile |

---

## State Machine (`src/App.tsx`)

**Key state slices:**

| State | Type | Purpose |
|-------|------|---------|
| `grid` | `Grid` | Current 5×8 board |
| `currentValue` / `nextValue` | `number` | Shooter queue (current tile + preview next) |
| `stats` | `GameStats` | Score, gems, combo counters |
| `bonusRushProgress` / `isBonusRushActive` | `number` / `bool` | 10-merge fill → 10s of 2× score |
| `cascadeMultiplier` | `{multiplier:number}\|null` | Growing combo badge (×2 → ×5+) |
| `flyingTile` | object\|null | Tile currently in-flight from shooter to grid |
| `absorbingTile` | `AbsorbingTileAnim\|null` | Domino slide animation before merge pop |
| `activeSpecialCombo` | `SpecialComboEvent\|null` | Combo shape currently animating |
| `hammerMode` / `hammerCharges` | bool / number | Booster: tap to delete one tile |
| `undoStack` | `UndoState[]` | Last-move undo buffer |

**Key handlers:**

| Handler | What it does |
|---------|-------------|
| `handleShoot(col)` | Validate column, save undo, animate flyingTile, call `resolveCascadeChain` |
| `resolveCascadeChain(grid, startCombo)` | Loop: T-combo → corner → adjacent → compact until no matches |
| `handleRestart()` | Reset all state to fresh game |
| `handleSwapNext()` | Swap current ↔ next tile |
| `handleUseHammer()` | Deduct 225 gems, enter hammerMode |
| `handleUseBlackHole()` | Deduct 200 gems, clear fullest row + compact |
| `registerMergeForBonusRush(n)` | Fill rush bar; activate 10s 2× mode at 10 merges |
| `triggerCameraShake(intensity)` | GSAP board shake scaled to combo intensity |
| `showMultiplierBadge(n)` | GSAP pop-in for combo badge (×2, ×3, ×4, ×5+) |

---

## Main Game Flow (Shoot-to-Score Pipeline)

```
Player aims → ShooterControls onColumnTouch
  → App.handleShoot(col)
    → previewShoot(grid, col, currentValue)           ← where does it land?
      → setFlyingTile (animation)
        → resolveCascadeChain(newGrid, combo=1)       ← cascade loop
          → findInvertedTMatches → T-combo            (priority 1)
          → findCornerMatches   → corner-combo        (priority 2)
          → findAdjacentMatches → domino cascade      (priority 3)
          → compactGridUpwards after each match
          → repeat until no matches
        → setGrid(finalGrid)
        → spawn next tile (getRandomSpawnValue)
        → isGameOver check
```

---

## Combo System

| Combo | Shape | Tiles | newValue formula | scoreBonus | Particle color |
|-------|-------|-------|-----------------|------------|----------------|
| T-Ngược ⊥ | 4 tiles: horizontal bar + 1 stem (4 orientations) | 4 | `val × 8` | `newValue × 10` | Magenta `#d946ef` |
| Vuông Góc 90° | 3 tiles: L-corner (4 orientations) | 3 | `val × 4` | `newValue × 6` | Gold `#f59e0b` |
| Domino Cascade | 2 adjacent equal tiles | 2 | `val × 2` | `newValue × combo` | Purple `#a855f7` / Rush gold |

**Score multiplier**: `baseBonus × comboChainCount × (isBonusRushActive ? 2 : 1)`

---

## Booster / Powerup Map

| Booster | Gem cost | Effect | Handler |
|---------|---------|--------|---------|
| Swap | 20 💎 | Swap current ↔ next tile | `handleUseSwap` |
| Hammer | 225 💎 | Delete any 1 tile (tap to pick) | `handleUseHammer` → `handleTileClick` |
| Black Hole / Vortex | 200 💎 | Clear fullest row + compact | `handleUseBlackHole` |

---

## Audio (`src/utils/audio.ts`)

Singleton `soundFx`. Web Audio API synthesis (no audio files). Key methods:

| Method | Trigger |
|--------|---------|
| `playShoot()` | Tile fired |
| `playMerge(value, combo)` | Adjacent merge pop (pitch scales with value) |
| `playTripleMerge()` | Corner combo |
| `playSquareMerge()` | T-combo / heavy events |
| `playBellCombo3x()` | Combo ×3 |
| `playLevelUpChime4x()` | Combo ×4 |
| `playMythicGong5x()` | Combo ×5+ |
| `playBonusRush()` | Bonus Rush activation |
| `triggerHaptic(level)` | Vibration: `'tap'\|'light'\|'medium'\|'heavy'\|'mythic'\|'double'` |

---

## Architectural Notes

- **`App.tsx` is monolithic** — state machine, all handlers, and cascade orchestration live here. New features should be wired here but logic extracted to `gameLogic.ts`.
- **Detection priority** matters: T-combo fires before corner which fires before adjacent. A new combo check must declare its position in this order.
- **`compactGridUpwards` is mandatory** after every tile removal — skip it and detection breaks.
- **Score formula is a contract**: `baseBonus × combo × rushMultiplier`. Never deviate.
