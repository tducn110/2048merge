---
name: game-audio-design
description: Audio implementation standard for 2048 Merge — Web Audio API SFX triggers, mute lifecycle, per-combo sound semantics, iOS AudioContext unlock. Use when adding new sounds, fixing audio bugs, or mapping new combos to sound events.
---

# Game Audio Design — 2048 Merge 5×8

Audio is part of gameplay feedback, not decoration. Every merge event has exactly one corresponding sound. No sound fires on rejected actions.

## Audio Architecture

`src/utils/audio.ts` — singleton `soundFx` (Web Audio API, no audio files)

```
SoundController
  ctx: AudioContext | null  — lazy-init on first user interaction
  muted: boolean            — persisted to localStorage('2048_sound_muted')
```

## Sound → Action Mapping

| Action | Sound method | Haptic level |
|--------|-------------|-------------|
| Tile shoot | `playShoot()` | `'light'` |
| Tile settle (no merge) | `playSettle()` | none |
| Adjacent merge | `playMerge(value, combo)` | `'medium'` |
| Corner combo | `playTripleMerge()` | `'medium'` |
| T-combo / heavy events | `playSquareMerge()` | `'heavy'` |
| Combo ×3 chain | `playBellCombo3x()` | `'heavy'` |
| Combo ×4 chain | `playLevelUpChime4x()` | `'heavy'` |
| Combo ×5+ mythic | `playMythicGong5x()` | `'mythic'` |
| Bonus Rush activation | `playBonusRush()` | `'heavy'` |
| Game over | `playGameOver()` | `'heavy'` |

## Rules

- **Never fire a success sound on a rejected action** (e.g. column full → haptic only, no SFX)
- **Never fire SFX directly on `pointerdown`** — fire on the confirmed game logic event
- **Combo tier sounds are exclusive**: if `combo >= 5` plays mythic gong, skip the merge sound entirely
- **Mute state persists** across sessions via `localStorage('2048_sound_muted')`

## Adding a New Combo Sound

1. Add a method to `SoundController` in `audio.ts` following the existing synthesis pattern
2. Map the new method to the correct combo tier in `resolveCascadeChain` in `App.tsx`
3. Follow the existing pattern: `if (combo >= 5) → mythic; else if (combo === 4) → chime4x; ...`
4. Never duplicate an existing tier's sound for a different event — use distinguishable synthesis

## iOS AudioContext Unlock

The `init()` method in `SoundController` lazily creates `AudioContext` on first call. This is called from `playShoot()`, `playMerge()`, etc. — all of which are triggered by user gestures. **Do NOT call `init()` on mount** — iOS Safari rejects AudioContext creation not in a user gesture stack.

```ts
private init() {
  if (!this.ctx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) this.ctx = new AudioCtx();
  }
  if (this.ctx?.state === 'suspended') {
    this.ctx.resume().catch(() => {});
  }
}
```

## Haptic Levels

| Level | Vibration pattern | When |
|-------|------------------|------|
| `'tap'` | 10ms | UI tap |
| `'light'` | 15ms | Tile shoot |
| `'double'` | 15ms, 15ms | Swap |
| `'medium'` | 25ms | Merge, corner |
| `'heavy'` | 40ms | T-combo, Rush |
| `'mythic'` | 30ms, 20ms, 50ms | 5x+ combo |

## Verification States

- `CODE VERIFIED`: SFX method exists in `audio.ts`
- `RUNTIME VERIFIED`: SFX fires when the combo triggers in game
- Do not mark audio complete without at least CODE VERIFIED
