---
name: pixijs-application
description: Create or configure the PixiJS v8 Application in 2048 Merge — async app.init(), transparent overlay canvas, resize with boardContainer, proper destroy on unmount. Use when setting up or modifying the PixiJS Application in PixiParticleCanvas.tsx or any new PixiJS overlay.
---

# PixiJS Application — 2048 Merge 5×8

The PixiJS canvas in this game is a **transparent pointer-events-none overlay** that sits above the React DOM grid. The Application is created in a `useEffect`, appended imperatively, and destroyed on unmount.

## Critical Rules for This Game

- **`backgroundAlpha: 0`** — always. The overlay must be transparent so the React grid shows through.
- **`resizeTo: containerRef.current`** — resize to the parent div, not `window`.
- **`antialias: true, resolution: window.devicePixelRatio, autoDensity: true`** — for sharp particles on HiDPI screens.
- **Never pass options to `new Application()`** — options go to `await app.init({...})`.
- **Await `app.init()` before appending `app.canvas`** — canvas is undefined before init resolves.
- **Destroy with `app.destroy(true)`** in the `useEffect` cleanup — removes canvas from DOM.

## Correct Pattern for This Game

```tsx
useEffect(() => {
  const container = containerRef.current;
  if (!container) return;

  const app = new PIXI.Application();

  (async () => {
    await app.init({
      backgroundAlpha: 0,
      resizeTo: container,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(app.canvas);
    appRef.current = app;

    // set up ticker, stage children here
  })();

  return () => {
    // destroy all stage children first, then app
    app.stage.removeChildren();
    app.destroy(true); // true = remove canvas from DOM
    appRef.current = null;
  };
}, []);
```

## Common Mistakes in This Codebase

| Wrong | Right |
|-------|-------|
| `new Application({ width, height })` | `new Application(); await app.init({...})` |
| `app.view` | `app.canvas` |
| Appending canvas before `await app.init()` | Append inside the async block, after init resolves |
| Leaking `Graphics` objects without `destroy()` | Pool or reuse, always `gfx.destroy()` on removal |

## Stage Architecture for Particle Overlay

```
app.stage (Container)
  └── particleContainer (ParticleContainer) — all merge particles
  └── shockwaveContainer (Container) — ring / square shockwaves (Graphics, reused)
```

Always structure the stage into named sub-containers. Do not dump everything onto `app.stage` directly.

## References

- PixiJS v8 Application: https://pixijs.download/release/docs/app.Application.html.md
- `backgroundAlpha` option: controls canvas transparency
- `resizeTo`: element whose size the renderer tracks via ResizePlugin
