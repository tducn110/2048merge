---
name: pixijs-particle-container
description: Render merge explosion particles in 2048 Merge using PixiJS v8 ParticleContainer + Particle + object pooling. Use whenever implementing or modifying the particle system in PixiParticleCanvas.tsx. Replaces the old Graphics-per-particle anti-pattern.
---

# PixiJS ParticleContainer — 2048 Merge 5×8

Particles in this game are **circle/diamond shapes** emitted on merge events. The correct PixiJS v8 approach is `ParticleContainer` + `Particle` instances + object pool. **Never create `new PIXI.Graphics()` per particle per frame.**

## Why ParticleContainer (not Graphics)

| Old (wrong) | New (correct) |
|-------------|---------------|
| `new PIXI.Graphics()` per particle → O(n) GC/frame | Pool of `Particle` objects → single draw call |
| `gfx.destroy()` on expiry → allocation pressure | Return to pool, reuse |
| Each particle = separate draw call | All particles = 1 draw call |

## Setup Pattern

Since `ParticleContainer` requires a shared texture, generate a small programmatic texture at init time using a temporary `Graphics` → `renderer.generateTexture()`:

```ts
// Generate circle texture once at init
const tmpGfx = new PIXI.Graphics();
tmpGfx.circle(0, 0, 8).fill(0xffffff); // white circle, tinted per particle
const circleTexture = app.renderer.generateTexture(tmpGfx);
tmpGfx.destroy();

// Diamond texture for star particles
const tmpDiamond = new PIXI.Graphics();
tmpDiamond
  .moveTo(0, -8)
  .lineTo(5.6, 0)
  .lineTo(0, 8)
  .lineTo(-5.6, 0)
  .closePath()
  .fill(0xffffff);
const diamondTexture = app.renderer.generateTexture(tmpDiamond);
tmpDiamond.destroy();
```

## Pool Init

```ts
const POOL_SIZE = 128;
const particlePool: PIXI.Particle[] = [];
const activeParticles: ParticleState[] = [];

// Pre-fill pool
for (let i = 0; i < POOL_SIZE; i++) {
  particlePool.push(new PIXI.Particle({ texture: circleTexture, x: 0, y: 0, alpha: 0 }));
}

const pContainer = new PIXI.ParticleContainer({
  texture: circleTexture,
  dynamicProperties: { position: true, rotation: true, color: true, vertex: true },
  boundsArea: new PIXI.Rectangle(0, 0, 800, 1000),
});
app.stage.addChild(pContainer);

// Pre-add all pool particles to the container
for (const p of particlePool) {
  pContainer.addParticle(p);
}
```

## Emit Function

```ts
interface ParticleState {
  particle: PIXI.Particle;
  vx: number; vy: number;
  life: number; maxLife: number;
  isStar: boolean;
}

function emitParticles(x: number, y: number, color: number, count: number) {
  let spawned = 0;
  for (const p of particlePool) {
    if (p.alpha > 0) continue; // in use
    if (spawned >= count) break;

    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    const isStar = Math.random() > 0.6;

    p.texture = isStar ? diamondTexture : circleTexture;
    p.x = x; p.y = y;
    p.tint = color;
    p.alpha = 1;
    p.scaleX = p.scaleY = (Math.random() * 0.5 + 0.3);
    p.anchorX = p.anchorY = 0.5;

    activeParticles.push({
      particle: p,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5,
      life: 0,
      maxLife: Math.random() * 25 + 25,
      isStar,
    });
    spawned++;
  }
}
```

## Ticker Update

```ts
app.ticker.add((ticker) => {
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const s = activeParticles[i];
    s.particle.x += s.vx * ticker.deltaTime;
    s.particle.y += s.vy * ticker.deltaTime;
    s.vy += 0.12 * ticker.deltaTime; // gravity
    s.vx *= 0.96;
    s.life++;
    s.particle.alpha = Math.max(0, 1 - s.life / s.maxLife);

    if (s.particle.alpha <= 0) {
      s.particle.alpha = 0; // return to pool
      activeParticles.splice(i, 1);
    }
  }
});
```

## Key Rules

- **`dynamicProperties: { position: true, rotation: true, color: true, vertex: true }`** — mark all properties you animate as dynamic
- **`boundsArea`** must be set — without it the container is culled as invisible
- **All particles share one base texture source** — use tint for color variation
- **Pre-add ALL pool particles to the container** at init — `addParticle` is expensive per-call at runtime
- **Return to pool by setting `alpha = 0`**, not by removing from container

## References

- ParticleContainer: https://pixijs.download/release/docs/scene.ParticleContainer.html.md
- Particle: https://pixijs.download/release/docs/scene.Particle.html.md
- `renderer.generateTexture()`: creates a texture from a Graphics object
