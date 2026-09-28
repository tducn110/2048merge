---
name: gsap-react
description: GSAP animation patterns for 2048 Merge React components — useRef targets, gsap.killTweensOf cleanup, camera shake timelines, badge pop-ins. Use when adding or modifying any GSAP animation in App.tsx or components.
---

# GSAP with React — 2048 Merge 5×8

GSAP drives: camera shake (`boardContainerRef`), multiplier badge pop-in (`multiplierBadgeRef`), center combo overlay (`centerComboTextRef`), screen flash (`screenFlashRef`).

## Pattern Used in This Game

All GSAP animations target **refs** via `gsap.killTweensOf(el)` before re-triggering:

```tsx
const badgeRef = useRef<HTMLDivElement | null>(null);

// Inside a callback triggered by user action:
requestAnimationFrame(() => {
  if (!badgeRef.current) return;
  const el = badgeRef.current;
  gsap.killTweensOf(el); // cancel any in-progress animation on this element

  gsap.timeline()
    .fromTo(el,
      { scale: 0.35, opacity: 0, y: -18, rotation: (Math.random() - 0.5) * 14 },
      { scale: 1.35, opacity: 1, y: 0, rotation: 0, duration: 0.22, ease: 'back.out(2.4)' }
    )
    .to(el, { scale: 1.0, duration: 0.14, ease: 'power2.out' });
});
```

**Why `requestAnimationFrame`?** The ref element may not be mounted yet when the state setter fires. Wrapping in `rAF` defers to the next paint cycle.

## Camera Shake Pattern

```tsx
const triggerCameraShake = useCallback((intensity: 'light' | 'medium' | 'heavy' | 'mythic') => {
  const el = boardContainerRef.current;
  if (!el) return;
  gsap.killTweensOf(el);

  const amp = intensity === 'heavy' ? 7 : intensity === 'medium' ? 4 : 2;
  const dur = intensity === 'heavy' ? 0.045 : intensity === 'medium' ? 0.035 : 0.03;

  gsap.timeline({
    onComplete: () => gsap.set(el, { x: 0, y: 0, clearProps: 'transform' }),
  })
    .to(el, { x: -amp, y: amp * 0.7, duration: dur, ease: 'power1.out' })
    .to(el, { x: amp * 0.8, y: -amp * 0.6, duration: dur })
    .to(el, { x: -amp * 0.5, y: amp * 0.3, duration: dur })
    .to(el, { x: 0, y: 0, duration: 0.04, ease: 'power2.out' });
}, []);
```

**Rule**: always call `gsap.set(el, { clearProps: 'transform' })` in `onComplete` — otherwise GSAP inline styles accumulate and the element drifts.

## GSAP Fade-Out Dismiss

```tsx
const hideElement = useCallback(() => {
  const el = ref.current;
  if (!el) { setState(null); return; }
  gsap.to(el, {
    scale: 1.25, opacity: 0, y: -15, duration: 0.3, ease: 'power2.in',
    onComplete: () => setState(null),
  });
}, []);
```

## Rules for This Game

- **Always `gsap.killTweensOf(el)` before re-triggering** — combo chains fire rapidly; without this, animations stack and the element jumps
- **Use `clearProps: 'transform'` in `onComplete`** for camera shake — prevents drift
- **Wrap in `requestAnimationFrame`** when the DOM element is conditionally rendered (not always in DOM)
- **Do not use `useGSAP` here** — the animations are triggered imperatively from async callbacks, not from React render cycles. Plain `useRef` + `gsap.*` is correct
- **Do not call `gsap.context()` cleanup** for these imperative triggers — `gsap.killTweensOf(el)` provides sufficient cleanup per animation

## GSAP is Already Installed

`package.json` has `"gsap": "^3.x"`. Do not reinstall. Import as `import gsap from 'gsap'`.
