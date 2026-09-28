---
name: roadmap-planner
description: Plan a new feature or mechanic for 2048 Merge — from a brief idea into PLAN.md with phases, tasks, and exit criteria. Also handles large refactors (e.g. extract game logic from App.tsx) or full new game modes. Use when the user wants to plan a new combo type, booster, UI overhaul, or any significant change.
---

# Roadmap Planner — 2048 Merge 5×8

Two stages with a hard stop between them. Stage 1 drafts `PLAN.md`; Stage 2 runs only after the user approves it.

**Planning an addition to existing gameplay**: read `LAYOUT.md` first. Every task must name the specific file and function it touches. If `PLAN.md` already exists, append new phases and add a Deviations line: `- YYYY-MM-DD: added <feature> (awaiting approval)`.

---

## Stage 1 — Draft the Plan

### 1. Gather

Ask in ONE batch only what you cannot infer from `LAYOUT.md`:
- **What mechanic / feature?** (e.g. "Square Combo: 2×2 block of 4 equal tiles → ×16 merge")
- **Game-feel goal**: does it reward patience, create chaos, or teach new strategy?
- **Layer(s) touched**: Logic only / UI only / Audio only / multiple
- **Breaking constraint**: what existing combo or rule must NOT be disrupted?
- **Done signal**: what does "it's working" look like during playtesting?

### 2. Resolve Conflicts

When the brief conflicts with `LAYOUT.md` (e.g. proposed detection order breaks cascade), raise it as a Decisions row. Never silently pick one side.

### 3. Write `PLAN.md`

Phases follow the game's layer stack — never collapse layers:

| Phase | Layer | Contents |
|-------|-------|----------|
| 1 | Logic | Detection function in `gameLogic.ts` |
| 2 | Integration | Wire into `resolveCascadeChain`, score formula, stats counter |
| 3 | Visual | Tile highlight, particle color, AddIn label |
| 4 | Audio | Sound trigger in `audio.ts`, haptic level |
| 5 | Balance | Multiplier, bonus formula, spawn weight tuning |
| 6 | Polish | Animation timing, camera shake, edge cases, game-over check |

Drop layers with nothing real in them. Never pad.

Each task must be **checkable**: name the function, file, and expected output. "Work on X" is not a task.

Exit criteria are observable: "detection fires on all 4 orientations", "merged tile has correct value", "no regression in corner/T combo tests".

Front-load risk: what is most likely to break the cascade chain goes in Phase 1 risk row.

### 4. Stop

Summarize: phases, files affected, biggest risk, one open question. Ask user to review `PLAN.md`. Do NOT create `ROADMAP.md`.

---

## Stage 2 — After User Approves

1. Create `ROADMAP.md` with one `## Phase N: <name>` per phase. Expand only Phase 1 into checkboxes; others say "Not started. See `PLAN.md`."
2. Fill "Immediate Next Actions" with Phase 1 items in order, **User action** items first.
3. Create/update `.bob/context/architecture.md` (Tier 1) if it does not exist or is stale.
4. Create `.bob/context/current-phase.md` (Tier 2) for Phase 1.
5. Do the first action, tick it with evidence, add Change Log line.

From here, use `/dev-workflow` to execute and `/roadmap-navigator` at each session start.

---

## Game-Specific Checklist (run before finalizing any plan)

- [ ] Does the new combo detection run **before** or **after** existing checks in `resolveCascadeChain`? Justify.
- [ ] Does the score formula follow the pattern `baseBonus * combo * (isRush ? 2 : 1)`?
- [ ] Is `compactGridUpwards` called after tiles are consumed?
- [ ] Is `recordComboHistory` called with the correct combo type string?
- [ ] Does `isGameOver` still work after the new mechanic is added?
- [ ] Is a new `stats` counter needed in `GameStats` interface?
