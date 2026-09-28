---
name: roadmap-navigator
description: Load the current development phase for 2048 Merge at session start — surface open tasks, phase status, and next action without loading the full PLAN.md. Use when starting a session, checking what to work on next, or when the user says "where am I", "what's next", or "load my roadmap".
---

# Roadmap Navigator — 2048 Merge 5×8

Solve context window pollution: read only the current phase, surface exactly what needs to happen. Nothing more.

## Core Principle

A large PLAN.md full of completed phases wastes tokens and degrades accuracy on the **current task**. This skill reads ROADMAP.md, finds the active phase, and writes a ≤200-token Tier 2 snapshot for focused work.

## 3-Tier Model

| Tier | File | Your job |
|------|------|----------|
| 1 | `.bob/context/architecture.md` | Read it — never rewrite unless asked |
| 2 | `.bob/context/current-phase.md` | **Write/refresh every session** |
| 3 | `PLAN.md` + `ROADMAP.md` | Source of truth — read directly, never fully load |

---

## Step 1 — Locate ROADMAP.md

Look in project root. If not found:
- `PLAN.md` exists → tell user to run `/project-roadmap` first.
- Neither exists → tell user to run `/project-roadmap` with a feature brief.

---

## Step 2 — Parse the Active Phase

The active phase = **first phase with at least one `[ ]` or `[~]` item**.

Extract:
1. Phase name + number
2. All open tasks by section (Build / Visual / Audio / Balance / Polish / Exit)
3. "Immediate Next Actions" from ROADMAP.md bottom

If all phases are `[x]` → project/feature is complete; report that to the user.

---

## Step 3 — Check Tier 1

Read `.bob/context/architecture.md`. Confirm it mentions the cascade resolution loop and score formula. If missing:
> "`.bob/context/architecture.md` not found. Run `/project-roadmap` to generate it."

---

## Step 4 — Write Tier 2: `current-phase.md` (≤200 tokens)

```
# Current Phase Context

**Project**: 2048 Merge 5×8
**Feature**: <feature name from ROADMAP.md>
**Current phase**: Phase <N> — <name> (<layer: Logic / Integration / Visual / Audio / Balance / Polish>)
**Phase status**: <not started | in progress | N/M tasks done>
**Last updated**: <today>

## Open Tasks

### Build
- [ ] ...

### Visual / Audio / Balance (whichever applies)
- [ ] ...

### Exit criteria
- [ ] ...

## Completed this phase
<count only — e.g. "3 of 7 tasks done">

## Immediate next action
<single most important next step>

## Phase summary
<2 sentences: what this phase does and why it comes before the next>
```

---

## Step 5 — Session Brief

```
## 📍 Session Brief — 2048 Merge 5×8

**Feature**: <name>
**Current phase**: Phase <N> — <name> [<layer>]
**Progress**: <N>/<M> tasks  [████████░░░░░░░░░░░░] <X>%

**Open tasks** (<count>):
Build:   ...
Visual:  ...
Exit:    ...

**Context loaded**:
- Tier 1: architecture.md ✓
- Tier 2: current-phase.md ✓ (refreshed)
- Tier 3: NOT loaded

**Next action**: <single most important step>

---
Run `/dev-workflow` to execute.
```

---

## Step 6 — Offer to Proceed

> "Ready? Run `/dev-workflow` to start, or tell me which task to tackle first."

Never start executing automatically.

## Notes

- Run at the **start of every session** — costs 1–2 file reads, prevents stale context.
- `current-phase.md` is NOT committed to git — add to `.gitignore`.
- If mid-phase from a previous session, just verify and refresh the snapshot.
