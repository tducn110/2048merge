---
name: project-roadmap
description: Generate PLAN.md and ROADMAP.md for a new feature, mechanic, or full development sprint in 2048 Merge. Use when adding a new combo type, booster, UI overhaul, or starting a new game feature from scratch.
---

# Project Roadmap Generator — 2048 Merge 5×8

Generate two documents for any feature or sprint:
- `PLAN.md` — frozen master plan: phases, tasks, exit criteria, risks.
- `ROADMAP.md` — live status board: ticked as work lands.

## Core Principle

Every plan must trace back to **game feel**: does this make the game more satisfying, more readable, or more replayable? If it doesn't improve one of those three, question whether it belongs.

## 3-Tier Context Model

| Tier | File | Max size | When loaded |
|------|------|----------|-------------|
| 1 | `.bob/context/architecture.md` | ~500 tokens | Every session |
| 2 | `.bob/context/current-phase.md` | ~200 tokens | Each session scope |
| 3 | `PLAN.md` + `ROADMAP.md` | unbounded | On demand via subagent |

---

## Step 1 — Gather the Feature Brief

Read the user's request for:
- **Feature name and one-sentence goal** (e.g. "Square Combo — 4 identical tiles in a 2×2 block merge into one with ×16 multiplier")
- **Which layer it touches**: game logic only / UI only / both / audio
- **Files it will modify**: `gameLogic.ts`, `App.tsx`, a component, `audio.ts`…
- **Any design constraint** (e.g. must not break existing T-combo or corner-combo detection)

If anything is missing and cannot be inferred from `LAYOUT.md`, ask in one batch.

---

## Step 2 — Decompose into Phases

Each phase must map to one of the game's layers:

| Phase theme | Typical work |
|-------------|--------------|
| Logic | New detection function in `gameLogic.ts`, unit-testable |
| Integration | Wire detection into `resolveCascadeChain` in `App.tsx` |
| Visual | TileBlock highlight, particle color, AddIn popup label |
| Audio | New sound trigger in `audio.ts`, haptic pattern |
| Balance | Tweak multiplier, bonus formula, spawn weights |
| Polish | Animation timing, camera shake intensity, edge cases |

Use 2–6 phases. Never merge Logic + Integration into one phase — they break independently.

---

## Step 3 — Write `PLAN.md`

```
# Feature Plan: <name>

> Static master plan. Never edit to record progress — use ROADMAP.md.

## Overview
- Goal: <one sentence>
- Layers: <logic / UI / audio / all>
- Files affected: <list>
- Risk: <biggest thing that could go wrong>

## Decisions Log
| Topic | Decision | Reason |

## Phase 1: Logic
### Build
- [ ] Add `find<Feature>Matches(grid)` to gameLogic.ts — returns SpecialComboEvent | null
### Measure
- [ ] Manual smoke test: create a grid state that triggers the combo, confirm detection fires
### Exit criteria
- [ ] `find<Feature>Matches` detects all orientations and returns null when shape is absent

## Phase 2: Integration
### Build
- [ ] Add combo check in `resolveCascadeChain` (before or after corner check, justify order)
- [ ] Add score formula: `newValue * <multiplier> * combo`
- [ ] Tick `stats.<featureCombos>` counter
- [ ] Record in `recordComboHistory` with correct type
### Exit criteria
- [ ] Firing the combo in-game produces correct score, correct merged tile, correct cascade continue

## Phase N: ...

## Risks and Fallbacks
| Risk | Signal | Fallback |
| Detection overlaps existing combo | Both fire in same cascade step | Priority order: T > corner > <new> |
```

---

## Step 4 — Write `ROADMAP.md`

Standard TMB format with:
- `<!-- progress:start -->` / `<!-- progress:end -->` markers
- One `## Phase N: <name>` per phase
- Only Phase 1 expanded into checkboxes; others say "Not started."
- **Immediate Next Actions** section at bottom

---

## Step 5 — Create Tier 1: `.bob/context/architecture.md`

500-token cap. Focus on:
- The cascade resolution loop in `App.tsx` (the heart of the game)
- Detection function priority order
- Score formula pattern: `baseBonus * comboMultiplier * (isRush ? 2 : 1)`
- Grid coordinate convention: `grid[row][col]`, row 0 = ceiling, row 7 = floor

---

## Step 6 — Create Tier 2: `.bob/context/current-phase.md`

200-token cap. Only Phase 1 open tasks + phase summary.

---

## Step 7 — Hand Off

Tell the user:
1. Files created
2. Phase breakdown with the game-layer mapping
3. The single most important architectural constraint to keep in mind
4. "Run `/roadmap-navigator` at session start. Run `/dev-workflow` to execute."
