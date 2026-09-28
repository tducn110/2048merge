---
name: pixijs-scene-graphics
description: Draw vector shapes in PixiJS v8 for 2048 Merge — shockwave rings, square outlines, tile highlight glows. Use the shape-then-fill/stroke pattern. Use when drawing any Graphics-based effect in PixiParticleCanvas or a future PixiJS layer.
---

# PixiJS Graphics — 2048 Merge 5×8

`Graphics` is used for **shockwave rings** and **square shockwaves** in this game. Do NOT use `Graphics` for particles — use `ParticleContainer` instead.

## v8 API: Shape → Fill/Stroke (chain pattern)

```ts
const g = new PIXI.Graphics();

// Circle shockwave ring
g.clear();
g.setStrokeStyle({ width: 4, color: 0xd946ef, alpha: 0.85 });
g.circle(x, y, radius).stroke();

// Square shockwave outline
g.clear();
g.setStrokeStyle({ width: 5, color: 0xfacc15, alpha: 0.9 });
g.rect(x - w/2, y - h/2, w, h).stroke();
```

## Shockwave Pool Pattern (reuse, never recreate)

In the ticker loop, shockwaves are updated per frame. **Pre-create a pool of Graphics objects** and reuse them — never call `new PIXI.Graphics()` inside the ticker:

```ts
// Pool at init time
const SHOCKWAVE_POOL_SIZE = 8;
const shockwavePool: PIXI.Graphics[] = [];
for (let i = 0; i < SHOCKWAVE_POOL_SIZE; i++) {
  const g = new PIXI.Graphics();
  shockwavePool.push(g);
  shockwaveContainer.addChild(g);
  g.visible = false;
}

// Activate from pool
function spawnShockwave(x: number, y: number, color: number) {
  const g = shockwavePool.find(gfx => !gfx.visible);
  if (!g) return; // pool exhausted
  g.visible = true;
  // store state externally; update in ticker
}

// Return to pool (in ticker when expired)
g.clear();
g.visible = false;
```

## Per-Frame Update Pattern

```ts
app.ticker.add(() => {
  for (const sw of activeShockwaves) {
    sw.radius += 2.8;
    sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

    if (sw.alpha <= 0) {
      sw.gfx.visible = false;
      sw.gfx.clear();
      activeShockwaves.delete(sw);
      continue;
    }

    sw.gfx.clear();
    sw.gfx.setStrokeStyle({ width: sw.lineWidth, color: sw.color, alpha: sw.alpha });
    sw.gfx.circle(sw.x, sw.y, sw.radius).stroke();
  }
});
```

## Do NOT

- ❌ `new PIXI.Graphics()` inside a ticker callback or emit function — always pre-pool
- ❌ `g.beginFill()` / `g.endFill()` — that is v7 API; v8 uses `.fill()` / `.stroke()` after shape
- ❌ Leave `gfx.destroy()` uncalled when removing from stage — always destroy or return to pool

## References

- Graphics v8: https://pixijs.download/release/docs/scene.Graphics.html.md
- `setStrokeStyle`, `setFillStyle`, `clear()`, `circle()`, `rect()`, `stroke()`, `fill()`
