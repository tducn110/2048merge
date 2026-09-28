---
name: pixijs-ticker
description: Run per-frame logic for particles and shockwaves in 2048 Merge using the PixiJS v8 Ticker. Use when adding or modifying the animation loop in PixiParticleCanvas.tsx, or when delta-time-correct physics is needed.
---

# PixiJS Ticker — 2048 Merge 5×8

The game's particle and shockwave system runs on `app.ticker`. Use `ticker.deltaTime` for frame-rate-independent motion.

## Key Time Values

| Property | Unit | Use case |
|----------|------|---------|
| `ticker.deltaTime` | dimensionless (~1.0 @ 60fps) | Multiply velocities, gravity, friction |
| `ticker.deltaMS` | milliseconds | Real-time duration checks |
| `ticker.FPS` | fps | Debug overlay |

`deltaTime ≈ 1.0` at 60fps, `≈ 2.0` at 30fps. Always multiply physics by `deltaTime`.

## Pattern Used in PixiParticleCanvas

```ts
app.ticker.add((ticker) => {
  const dt = ticker.deltaTime;

  // Particles
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const s = activeParticles[i];
    s.particle.x  += s.vx * dt;
    s.particle.y  += s.vy * dt;
    s.vy           += 0.12 * dt;  // gravity
    s.vx           *= Math.pow(0.96, dt);  // frame-rate-independent friction
    s.life         += dt;
    s.particle.alpha = Math.max(0, 1 - s.life / s.maxLife);
    if (s.particle.alpha <= 0) {
      s.particle.alpha = 0;
      activeParticles.splice(i, 1);
    }
  }

  // Shockwaves
  for (let i = activeShockwaves.length - 1; i >= 0; i--) {
    const sw = activeShockwaves[i];
    sw.radius += 2.8 * dt;
    sw.alpha   = Math.max(0, 1 - sw.radius / sw.maxRadius);
    if (sw.alpha <= 0) {
      sw.gfx.visible = false;
      sw.gfx.clear();
      activeShockwaves.splice(i, 1);
      continue;
    }
    sw.gfx.clear();
    sw.gfx.setStrokeStyle({ width: sw.lineWidth, color: sw.color, alpha: sw.alpha });
    sw.gfx.circle(sw.x, sw.y, sw.radius).stroke();
  }
});
```

## Cleanup

Always remove the ticker callback on unmount (or it leaks into the next render):

```ts
// Option A: destroy the whole app (recommended in this game — useEffect cleanup)
app.destroy(true);

// Option B: remove specific callback
const onTick = (ticker: PIXI.Ticker) => { /* ... */ };
app.ticker.add(onTick);
// on cleanup:
app.ticker.remove(onTick);
```

In `PixiParticleCanvas`, `app.destroy(true)` in the `useEffect` return handles cleanup of the whole ticker.

## Pausing the Loop

When the game is paused, the PixiJS ticker keeps running (the overlay still needs to finish existing particle animations). There is no need to stop the ticker on pause — particles will naturally expire.

## References

- Ticker: https://pixijs.download/release/docs/ticker.Ticker.html.md
- `deltaTime` vs `deltaMS` vs `elapsedMS`
- `UPDATE_PRIORITY` for ordering multiple ticker callbacks
