---
name: roadmap-sync
description: Check ROADMAP.md against the actual 2048 Merge code and git history — fix drift, ticked items whose code is gone, finished work nobody ticked, stale next-actions. Use when returning after a break, switching branches, or when the roadmap feels out of date.
---

# Roadmap Sync — 2048 Merge 5×8

Detect and repair drift between `ROADMAP.md` and the actual game code.

---

## Step 1 — Read Sources

- `ROADMAP.md` + `PLAN.md`
- `git log --oneline -30` since the last Change Log date
- `git status` for uncommitted changes
- `LAYOUT.md` if it exists (to cross-check file paths)

---

## Step 2 — Verify `[x]` Items

For each ticked item, check whether its evidence exists:

| Item type | How to verify |
|-----------|---------------|
| New function | `grep` for function name in `gameLogic.ts` |
| Wired into cascade | `grep` for the function call inside `resolveCascadeChain` in `App.tsx` |
| Visual highlight | Check `TileBlock.tsx` for the corresponding `specialType` case |
| Audio trigger | Check `audio.ts` for the sound method |
| Stats counter | Check `GameStats` interface in `types.ts` |
| Score formula | Grep for `scoreBonus` assignment in `App.tsx` |

If a `[x]` item's evidence is missing → turn it back to `[~]` (written but unverified).

---

## Step 3 — Find Unticked Finished Work

Scan git log for commits that complete an open `[ ]` item. Common patterns:
- "add findSquareMatches" → tick the Logic phase Build task
- "wire corner combo audio" → tick the Audio phase task
- "fix cascade order" → tick any relevant integration task

---

## Step 4 — Check Format

The ROADMAP.md must have:
- `<!-- progress:start -->` / `<!-- progress:end -->` markers
- One `## Phase N: <name>` heading per phase (no merged ranges like "Phases 2–4")
- A **Change Log** section at the bottom
- An **Immediate Next Actions** section

If any marker is missing, add it. If a multi-phase heading exists, split it.

---

## Step 5 — Report Drift

Short list: item / what you found / proposed change.

```
## Sync Report
- [x] findInvertedTMatches — code exists ✓
- [x] Wire T-combo into cascade — grep confirmed ✓
- [~] Audio: playSquareMerge — method missing in audio.ts → revert to [ ]
- [ ] Add squareCombos to GameStats — found in types.ts → tick [x]
- Stale next-actions: "Add Square combo" already done → update to Phase 3 Visual tasks
```

After user confirms, apply all changes in one pass:
1. Update checkbox states
2. Add dated Change Log line: `- YYYY-MM-DD: synced with code: <summary>`
3. Update "Immediate Next Actions" to the real next open tasks
4. Recount progress bars

---

## Guardrails

- **Never change PLAN.md here.** Plan changes go through `/roadmap-planner` with a Deviations line.
- If a detection function was renamed, fix ROADMAP.md references AND update `LAYOUT.md`.
- If the cascade order changed, flag it — detection priority is a game-balance decision.
