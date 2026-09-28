---
name: dev-workflow
description: Execute the current phase's development tasks for 2048 Merge — write code, run checks, tick ROADMAP.md. Use when the user says "let's build", "implement this", "do the next task", "start working", or "tick this off".
---

# Developer Workflow Executor — 2048 Merge 5×8

Execute the active phase's tasks one at a time. Tick ROADMAP.md after each. Never skip exit criteria.

## Core Principle

Narrow context → focused execution → verified ticks → phase close.
The game has a clear layer stack: Logic → Integration → Visual → Audio → Balance → Polish.
Always work in that order within a phase. Never implement UI before the logic is verified.

## 3-Tier Context Loading (enforce strictly)

| Tier | File | When to load |
|------|------|--------------|
| 1 | `.bob/context/architecture.md` | Once at session start — always |
| 2 | `.bob/context/current-phase.md` | At start of each task — this is your scope |
| 3 | `PLAN.md` + `ROADMAP.md` | Never into main context — use `spawn_subagent` |

---

## Step 1 — Load Context

Read `.bob/context/current-phase.md`. If missing or stale, run `/roadmap-navigator` first.

Confirm `.bob/context/architecture.md` is in context. If not, read it.

Extract: phase name, open tasks, exit criteria.

---

## Step 2 — Pick the Next Task

Present the first open task and confirm:

> "Next task: **[Build]** `<task>` in `<file>`
> Shall I start? (yes / skip / reprioritise)"

---

## Step 3 — Plan Before Acting

Before calling any tool, declare a todo list with `update_todo_list`:

```
[ ] Identify what information is needed
[ ] Check: is any of it already in this conversation?
[ ] Fetch only what is missing (one call per unique resource)
[ ] Execute
[ ] Verify output → tick ROADMAP.md
```

**Rules:**
- Never `read_file` the same file twice in one session
- If data is already in context → mark `[x]`, skip the tool call
- Use `spawn_subagent(type:"explore")` for full-codebase scans (e.g. "find all combo checks")

---

## Step 4 — Execute by Task Type

### BUILD tasks (Logic / Integration / Visual / Audio)

**Logic tasks** (`gameLogic.ts`):
1. Read the existing detection functions for pattern reference (`findInvertedTMatches`, `findCornerMatches`)
2. Implement the new function following the same return shape: `SpecialComboEvent | null`
3. Verify: manually construct a `Grid` state that should trigger it and confirm the function returns the right shape
4. Verify: construct a state that should NOT trigger it and confirm `null`

**Integration tasks** (`App.tsx` — `resolveCascadeChain`):
1. Read `resolveCascadeChain` to find where to insert the new check (before or after existing checks)
2. Add the check block following the exact pattern of the existing T-combo or corner block:
   - call detection function
   - set `activeSpecialCombo`
   - play sound + haptic + camera shake scaled to combo tier
   - emit particles with combo-appropriate color
   - apply Bonus Rush multiplier: `isRush ? baseBonus * 2 : baseBonus`
   - call `recordComboHistory`
   - show multiplier badge if `combo >= 2`
   - `addNotification`
   - `triggerAddIn`
   - `setStats` to increment the right counter
   - `await sleep(200)` then apply grid mutations
   - call `compactGridUpwards`
   - `setGrid`; increment `combo`; `await sleep(180)`
3. Run `npm run build` — must pass with 0 errors

**Visual tasks** (`TileBlock.tsx` / `GameBoard.tsx`):
1. Read the existing `specialType` handling for reference
2. Add the new `specialType` case with the correct highlight color
3. Visually verify in browser: does the combo glow match the game's color language?

**Audio tasks** (`audio.ts`):
1. Add the new sound method following the existing pattern (Web Audio API synthesis)
2. Call it from the integration block at the right combo tier

### BALANCE tasks

1. Read current multiplier formulas in `gameLogic.ts` and `App.tsx`
2. Propose the new formula with reasoning (e.g. "×4 on tile value because it's harder to set up than corner")
3. Surface to user before implementing — this is a game-design decision
4. After user confirms, apply and note in PLAN.md Decisions Log

### POLISH tasks

1. Animation timing: run `npm run dev` and play until you trigger the combo 5+ times
2. Camera shake: match intensity to `triggerCameraShake` level used by similar-value combos
3. Edge cases: grid full, combo at row boundary, combo during Bonus Rush

---

## Step 5 — Tick in ROADMAP.md

After a task is verified:
1. `[ ]` → `[x]`
2. Add dated Change Log line:
   ```
   - YYYY-MM-DD: Phase <N> — completed: <short description>
   ```
3. Remove the task from `current-phase.md`, increment counter

After every single task — not in bulk.

---

## Step 6 — Update Progress Bars

Recount `[x]` items per phase. Render bars (each `█` = 5%):
- 0%: `[░░░░░░░░░░░░░░░░░░░░]`
- 100%: `[████████████████████]`

Update overall progress line in `<!-- progress:start -->` / `<!-- progress:end -->`.

---

## Step 7 — Check Exit Criteria

After all phase tasks are `[x]`:

1. For each exit criterion, explicitly verify:
   - Logic: detection fires on all orientations ✓/✗
   - Integration: cascade chain continues correctly after the new combo ✓/✗
   - Build: `npm run build` passes with 0 errors ✓/✗

Report:
```
## Phase <N> Exit Check
- [PASS] Detection fires on all 4 orientations
- [PASS] Score formula: val * 4 * combo * rushMultiplier ✓
- [FAIL] Visual highlight not applied to top-left corner orientation
→ Phase not closed. Fix the visual case first.
```

---

## Step 8 — Close the Phase

All criteria pass:
1. Mark all exit criteria `[x]`, add closing Change Log line
2. Update `current-phase.md` to point to the next phase
3. Tell the user:
   > "✅ Phase <N> closed. Run `/roadmap-navigator` to load Phase <N+1>."

---

## Guardrails

- **Always run `npm run build` after any Integration task** — TypeScript errors are exit blockers
- **Never modify `findInvertedTMatches` or `findCornerMatches`** unless the plan explicitly says so — they are the game's existing combo foundation
- **The cascade order matters**: new combo checks must not steal matches that T-combo or corner should have handled first. If order needs to change, surface it as a Decisions row
- **`compactGridUpwards` is mandatory** after any tile removal — floating tiles break all detection
- **Score formula consistency**: always use `baseBonus * combo * (isRush ? 2 : 1)` — no ad-hoc multipliers
