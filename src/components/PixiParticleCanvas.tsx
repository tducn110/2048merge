/**
 * components/PixiParticleCanvas.tsx  (2048-merge-5x8)
 * ─────────────────────────────────────────────────────────────────────────────
 * PixiJS v8 particle and shockwave overlay.
 *
 * ARCHITECTURE
 * ─────────────
 *  - ParticleContainer + Particle pool for merge explosion particles
 *    (single draw call, no new Particle() at runtime)
 *  - Pre-allocated Graphics pool for shockwave rings / squares
 *    (no new Graphics() in emit or ticker)
 *  - Delta-time-correct physics (ticker.deltaTime)
 *
 * SEPARATION CONTRACT
 * ───────────────────
 *  ┌────────────────────────────────────────────────────────────────┐
 *  │  GameBoard.tsx        — React DOM grid (NO canvas)             │
 *  │  PixiParticleCanvas   — ALL particles / shockwaves (PixiJS)    │
 *  │  Header.tsx           — React HUD (score, boosters, chain bar) │
 *  │  *Modal.tsx           — React modal overlays                   │
 *  └────────────────────────────────────────────────────────────────┘
 */

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as PIXI from 'pixi.js';
import { FloatingNotification } from '../types';

// ─── Pool configuration ───────────────────────────────────────────────────────

const PARTICLE_POOL_SIZE = 160;  // max simultaneous particles
const SHOCKWAVE_POOL_SIZE = 12;  // max simultaneous shockwaves

// ─── State interfaces ─────────────────────────────────────────────────────────

interface ParticleState {
  particle: PIXI.Particle;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

interface ShockwaveState {
  gfx: PIXI.Graphics;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: number;
  alpha: number;
  lineWidth: number;
  isSquare: boolean;
  width: number;
  height: number;
}

// ─── Public handle (same API as old ParticleCanvas) ──────────────────────────

export interface PixiParticleCanvasHandle {
  emitMergeParticles:  (x: number, y: number, color: string, count?: number) => void;
  emitSquareExplosion: (x: number, y: number, width: number, height: number, color: string) => void;
  emitTripleBeam:      (x: number, y: number, isVertical: boolean, color: string) => void;
}

interface PixiParticleCanvasProps {
  notifications:        FloatingNotification[];
  onRemoveNotification: (id: string) => void;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PixiParticleCanvas = forwardRef<PixiParticleCanvasHandle, PixiParticleCanvasProps>(
  ({ notifications, onRemoveNotification }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const appRef       = useRef<PIXI.Application | null>(null);

    // Pools stored in refs so emit functions close over stable references
    const particlePoolRef    = useRef<PIXI.Particle[]>([]);
    const activeParticlesRef = useRef<ParticleState[]>([]);
    const shockwavePoolRef   = useRef<PIXI.Graphics[]>([]);
    const activeShockwavesRef = useRef<ShockwaveState[]>([]);

    // ── Imperative API ────────────────────────────────────────────────────────

    useImperativeHandle(ref, () => ({

      emitMergeParticles(x, y, color, count = 24) {
        const pool   = particlePoolRef.current;
        const active = activeParticlesRef.current;
        const col    = hexToInt(color);
        let spawned  = 0;

        for (const p of pool) {
          if (p.alpha > 0) continue; // in use
          if (spawned >= count) break;

          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 2;
          const isStar = Math.random() > 0.6;

          p.x = x;
          p.y = y;
          p.tint  = col;
          p.alpha = 1;
          const sc = Math.random() * 0.5 + 0.35;
          p.scaleX = isStar ? sc * 1.2 : sc;
          p.scaleY = isStar ? sc * 1.2 : sc;
          p.rotation = Math.random() * Math.PI * 2;

          active.push({
            particle: p,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            life: 0,
            maxLife: Math.random() * 25 + 25,
          });
          spawned++;
        }

        // Shockwave ring
        spawnShockwave(x, y, col, 0.9, 4, 65, false, 0, 0);
      },

      emitSquareExplosion(x, y, w, h, color) {
        const pool   = particlePoolRef.current;
        const active = activeParticlesRef.current;
        const goldCol = 0xfacc15;
        const col     = hexToInt(color);
        let spawned   = 0;

        for (const p of pool) {
          if (p.alpha > 0) continue;
          if (spawned >= 48) break;

          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 7 + 3;

          p.x = x + (Math.random() - 0.5) * w;
          p.y = y + (Math.random() - 0.5) * h;
          p.tint  = spawned % 2 === 0 ? goldCol : col;
          p.alpha = 1;
          const sc = Math.random() * 0.6 + 0.4;
          p.scaleX = sc * 1.3;
          p.scaleY = sc * 1.3;
          p.rotation = Math.random() * Math.PI * 2;

          active.push({
            particle: p,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2,
            life: 0,
            maxLife: Math.random() * 35 + 30,
          });
          spawned++;
        }

        spawnShockwave(x, y, goldCol, 1, 5, Math.max(w, h) * 1.3, true, w, h);
      },

      emitTripleBeam(x, y, isVertical, color) {
        const pool   = particlePoolRef.current;
        const active = activeParticlesRef.current;
        const cyanCol = 0x38bdf8;
        const col     = hexToInt(color);
        let spawned   = 0;

        for (const p of pool) {
          if (p.alpha > 0) continue;
          if (spawned >= 36) break;

          const spread = (Math.random() - 0.5) * 80;
          p.x = isVertical ? x + (Math.random() - 0.5) * 20 : x + spread;
          p.y = isVertical ? y + spread : y + (Math.random() - 0.5) * 20;
          p.tint  = spawned % 2 === 0 ? cyanCol : col;
          p.alpha = 1;
          const sc = Math.random() * 0.55 + 0.35;
          p.scaleX = sc * 1.2;
          p.scaleY = sc * 1.2;
          p.rotation = Math.random() * Math.PI * 2;

          active.push({
            particle: p,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 2,
            life: 0,
            maxLife: 35,
          });
          spawned++;
        }

        spawnShockwave(x, y, 0xa855f7, 1, 4, 75, false, 0, 0);
      },
    }));

    // ── Shockwave pool helper ─────────────────────────────────────────────────

    function spawnShockwave(
      x: number, y: number,
      color: number, alpha: number, lineWidth: number, maxRadius: number,
      isSquare: boolean, w: number, h: number
    ) {
      const pool   = shockwavePoolRef.current;
      const active = activeShockwavesRef.current;
      const gfx    = pool.find(g => !g.visible);
      if (!gfx) return; // pool full

      gfx.visible = true;
      active.push({ gfx, x, y, radius: 8, maxRadius, color, alpha, lineWidth, isSquare, width: w, height: h });
    }

    // ── PixiJS setup ──────────────────────────────────────────────────────────

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      // Guard against StrictMode double-invoke: cleanup runs before async init
      // completes, so we track whether this effect instance was torn down.
      let unmounted = false;

      const app = new PIXI.Application();

      (async () => {
        try {
          await app.init({
            backgroundAlpha: 0,
            resizeTo: container,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
          });
        } catch {
          // init can throw if the WebGL context was lost or the element was
          // removed before init completed (e.g. StrictMode teardown).
          return;
        }

        // Component was unmounted while we were awaiting — bail out cleanly.
        if (unmounted) {
          app.destroy(true, { children: true });
          return;
        }

        container.appendChild(app.canvas);
        appRef.current = app;

        // ── Generate shared textures ────────────────────────────────────────
        // Circle texture (droplet particles)
        const tmpCircle = new PIXI.Graphics();
        tmpCircle.circle(0, 0, 8).fill(0xffffff);
        const circleTexture = app.renderer.generateTexture(tmpCircle);
        tmpCircle.destroy();

        // Diamond texture (star particles)
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

        // ── Build particle pool ─────────────────────────────────────────────
        const pContainer = new PIXI.ParticleContainer({
          texture: circleTexture,
          dynamicProperties: {
            position: true,
            rotation: true,
            color:    true,
            vertex:   true,
          },
          boundsArea: new PIXI.Rectangle(0, 0, 800, 1200),
        });
        app.stage.addChild(pContainer);

        for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
          // Alternate diamond/circle textures so we can toggle per-particle via texture swap
          const isDiamond = i % 3 === 2; // ~33% diamonds
          const p = new PIXI.Particle({
            texture: isDiamond ? diamondTexture : circleTexture,
            x: 0, y: 0,
            anchorX: 0.5, anchorY: 0.5,
            alpha: 0, // start invisible = "in pool"
          });
          pContainer.addParticle(p);
          particlePoolRef.current.push(p);
        }

        // ── Build shockwave pool ────────────────────────────────────────────
        const swContainer = new PIXI.Container();
        app.stage.addChild(swContainer);

        for (let i = 0; i < SHOCKWAVE_POOL_SIZE; i++) {
          const gfx = new PIXI.Graphics();
          gfx.visible = false;
          swContainer.addChild(gfx);
          shockwavePoolRef.current.push(gfx);
        }

        // ── Ticker ──────────────────────────────────────────────────────────
        app.ticker.add((ticker) => {
          const dt       = ticker.deltaTime;
          const active   = activeParticlesRef.current;
          const shocks   = activeShockwavesRef.current;

          // Update particles
          for (let i = active.length - 1; i >= 0; i--) {
            const s = active[i];
            const p = s.particle;

            p.x   += s.vx * dt;
            p.y   += s.vy * dt;
            s.vy  += 0.12 * dt;              // gravity
            s.vx  *= Math.pow(0.96, dt);     // frame-rate-independent friction
            s.life += dt;
            p.rotation += 0.04 * dt;         // gentle spin

            const progress = s.life / s.maxLife;
            p.alpha = Math.max(0, 1 - progress);
            // Shrink slightly as they fade
            const sc = (1 - progress * 0.4) * (p.scaleX > 0 ? p.scaleX : 0.5);
            p.scaleX = sc;
            p.scaleY = sc;

            if (p.alpha <= 0) {
              p.alpha = 0;
              active.splice(i, 1);
            }
          }

          // Update shockwaves
          for (let i = shocks.length - 1; i >= 0; i--) {
            const sw = shocks[i];
            sw.radius += 2.8 * dt;
            sw.alpha   = Math.max(0, 1 - sw.radius / sw.maxRadius);

            if (sw.alpha <= 0) {
              sw.gfx.clear();
              sw.gfx.visible = false;
              shocks.splice(i, 1);
              continue;
            }

            sw.gfx.clear();
            sw.gfx.setStrokeStyle({ width: sw.lineWidth, color: sw.color, alpha: sw.alpha });

            if (sw.isSquare && sw.width > 0 && sw.height > 0) {
              const grow = sw.radius * 0.8;
              sw.gfx
                .rect(
                  sw.x - (sw.width + grow) / 2,
                  sw.y - (sw.height + grow) / 2,
                  sw.width + grow,
                  sw.height + grow
                )
                .stroke();
            } else {
              sw.gfx.circle(sw.x, sw.y, sw.radius).stroke();
            }
          }
        });
      })();

      return () => {
        unmounted = true;

        // Clear pools immediately so any in-flight ticker callbacks see empty arrays.
        particlePoolRef.current  = [];
        activeParticlesRef.current = [];
        shockwavePoolRef.current  = [];
        activeShockwavesRef.current = [];

        // Only destroy if init has already completed (appRef is set).
        // If init is still in-flight, the async block above will destroy when it resolves.
        if (appRef.current) {
          appRef.current.destroy(true, { children: true });
          appRef.current = null;
        }
      };
    }, []);

    // ── JSX ──────────────────────────────────────────────────────────────────

    return (
      <div
        ref={containerRef}
        className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
      >
        {/* PixiJS canvas appended imperatively in useEffect */}

        {/* HTML floating text notifications — rendered over the Pixi canvas */}
        {notifications.map((notif) => (
          <div
            key={notif.id}
            onAnimationEnd={() => onRemoveNotification(notif.id)}
            style={{
              left:      `${notif.x}px`,
              top:       `${notif.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute flex flex-col items-center pointer-events-none animate-[floatUp_1.3s_cubic-bezier(0.16,1,0.3,1)_forwards] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
          >
            <span
              className={`font-black tracking-wider text-center ${
                notif.type === 'square'
                  ? 'text-yellow-300 text-lg sm:text-xl font-extrabold bg-slate-950/90 px-3 py-1 rounded-full border-2 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.8)]'
                  : notif.type === 'triple'
                  ? 'text-cyan-300 text-base sm:text-lg font-extrabold bg-slate-950/90 px-3 py-1 rounded-full border-2 border-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.8)]'
                  : notif.type === 'combo'
                  ? 'text-rose-300 text-base font-bold bg-slate-950/80 px-2.5 py-0.5 rounded-full border border-rose-400'
                  : 'text-white text-base sm:text-lg font-black'
              }`}
            >
              {notif.text}
            </span>
            {notif.subtext && (
              <span className="text-xs font-semibold text-yellow-200/90 bg-slate-950/70 px-2 py-0.5 rounded-md mt-0.5">
                {notif.subtext}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }
);
