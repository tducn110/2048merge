/**
 * components/PixiGameBoard.tsx (2048-merge-5x8)
 * ─────────────────────────────────────────────────────────────────────────────
 * Complete PixiJS v8 Gameplay Stage renderer.
 *
 * Replaces the old React DOM grid with a high-performance WebGL stage:
 *  - 5 column lanes with real-time hover track beam & aim highlight
 *  - 5×8 grid slots & 3D beveled numbered blocks
 *  - Dynamic ghost placement preview & merge highlight rings
 *  - Smooth upward flying tile launch animation (60fps lerp)
 *  - Smooth domino cascade slide (absorbing tile) animation
 *  - Special combo beacons (Inverted-T, Corner, Square, Triple)
 *  - Row 8 shooter launcher dock
 *  - Integrated PixiJS particle & shockwave system (single WebGL context)
 *  - Full touch & pointer drag aiming with pointer capture
 */

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import * as PIXI from 'pixi.js';
import {
  Grid,
  SpecialComboEvent,
  AddInPopup,
  AbsorbingTileAnim,
  FloatingNotification,
} from '../types';
import { COLS, ROWS, previewShoot } from '../utils/gameLogic';
import { getTileStyle, formatTileValue } from '../utils/theme';
import { soundFx } from '../utils/audio';
import { Flame, Zap } from 'lucide-react';
import { CoinIcon } from './CoinIcon';

// ─── Particle & Shockwave Pool Constants ──────────────────────────────────────

const PARTICLE_POOL_SIZE = 160;
const SHOCKWAVE_POOL_SIZE = 12;

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

// ─── Tile Color Helper ────────────────────────────────────────────────────────

function hexToInt(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

function getTileHexColors(val: number): { bg: number; bottom: number; accent: number } {
  const style = getTileStyle(val);
  const accentHex = hexToInt(style.accent);
  const match = style.bottomBorder.match(/#([0-9a-fA-F]{6})/);
  const bottomHex = match ? hexToInt(match[1]) : accentHex;
  return {
    bg: accentHex,
    bottom: bottomHex,
    accent: accentHex,
  };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Component Props & Handle ─────────────────────────────────────────────────

export interface PixiGameBoardHandle {
  emitMergeParticles: (x: number, y: number, color: string, count?: number) => void;
  emitSquareExplosion: (x: number, y: number, width: number, height: number, color: string) => void;
  emitTripleBeam: (x: number, y: number, isVertical: boolean, color: string) => void;
}

export interface PixiGameBoardProps {
  grid: Grid;
  hoverCol: number | null;
  incomingValue: number;
  activeSpecialCombo: SpecialComboEvent | null;
  flyingTile: {
    col: number;
    fromRow: number;
    targetRow: number;
    value: number;
    isMerge?: boolean;
    isAbsorbing?: boolean;
  } | null;
  absorbingTile?: AbsorbingTileAnim | null;
  addIns?: AddInPopup[];
  hammerMode?: boolean;
  onTileClick?: (row: number, col: number) => void;
  onColumnTouch: (col: number) => void;
  onColumnHover: (col: number | null) => void;
  // Bonus Rush Persistent HUD Props
  bonusRushProgress?: number;
  bonusRushMax?: number;
  isBonusRushActive?: boolean;
  bonusRushTimeRemaining?: number;
  // Floating notifications overlay
  notifications?: FloatingNotification[];
  onRemoveNotification?: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PixiGameBoard = forwardRef<PixiGameBoardHandle, PixiGameBoardProps>(
  (
    {
      grid,
      hoverCol,
      incomingValue,
      activeSpecialCombo,
      flyingTile,
      absorbingTile,
      addIns = [],
      hammerMode = false,
      onTileClick,
      onColumnTouch,
      onColumnHover,
      bonusRushProgress = 0,
      bonusRushMax = 10,
      isBonusRushActive = false,
      bonusRushTimeRemaining = 0,
      notifications = [],
      onRemoveNotification,
    },
    ref
  ) => {
    const boardContainerRef = useRef<HTMLDivElement | null>(null);
    const canvasMountRef = useRef<HTMLDivElement | null>(null);
    const appRef = useRef<PIXI.Application | null>(null);

    // Track active aiming across drag gestures
    const isAimingRef = useRef<boolean>(false);
    const activeColRef = useRef<number | null>(hoverCol);
    activeColRef.current = hoverCol;

    // References to current props for ticker access without stale closures
    const propsRef = useRef({
      grid,
      hoverCol,
      incomingValue,
      activeSpecialCombo,
      flyingTile,
      absorbingTile,
      hammerMode,
      onTileClick,
    });
    propsRef.current = {
      grid,
      hoverCol,
      incomingValue,
      activeSpecialCombo,
      flyingTile,
      absorbingTile,
      hammerMode,
      onTileClick,
    };

    // Animation progress states
    const flyAnimRef = useRef<{
      startTime: number;
      duration: number;
      col: number;
      fromY: number;
      toY: number;
      value: number;
    } | null>(null);

    const absorbAnimRef = useRef<{
      startTime: number;
      duration: number;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      value: number;
    } | null>(null);

    // Particle & shockwave pools
    const particlePoolRef = useRef<PIXI.Particle[]>([]);
    const activeParticlesRef = useRef<ParticleState[]>([]);
    const shockwavePoolRef = useRef<PIXI.Graphics[]>([]);
    const activeShockwavesRef = useRef<ShockwaveState[]>([]);

    // ─── Imperative Handle for Particle Emitters ──────────────────────────────

    useImperativeHandle(ref, () => ({
      emitMergeParticles(x, y, color, count = 24) {
        const pool = particlePoolRef.current;
        const active = activeParticlesRef.current;
        const col = hexToInt(color);
        let spawned = 0;

        for (const p of pool) {
          if (p.alpha > 0) continue;
          if (spawned >= count) break;

          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 2;
          const isStar = Math.random() > 0.6;

          p.x = x;
          p.y = y;
          p.tint = col;
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

        spawnShockwave(x, y, col, 0.9, 4, 65, false, 0, 0);
      },

      emitSquareExplosion(x, y, w, h, color) {
        const pool = particlePoolRef.current;
        const active = activeParticlesRef.current;
        const goldCol = 0xfacc15;
        const col = hexToInt(color);
        let spawned = 0;

        for (const p of pool) {
          if (p.alpha > 0) continue;
          if (spawned >= 48) break;

          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 7 + 3;

          p.x = x + (Math.random() - 0.5) * w;
          p.y = y + (Math.random() - 0.5) * h;
          p.tint = spawned % 2 === 0 ? goldCol : col;
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
        const pool = particlePoolRef.current;
        const active = activeParticlesRef.current;
        const cyanCol = 0x38bdf8;
        const col = hexToInt(color);
        let spawned = 0;

        for (const p of pool) {
          if (p.alpha > 0) continue;
          if (spawned >= 36) break;

          const spread = (Math.random() - 0.5) * 80;
          p.x = isVertical ? x + (Math.random() - 0.5) * 20 : x + spread;
          p.y = isVertical ? y + spread : y + (Math.random() - 0.5) * 20;
          p.tint = spawned % 2 === 0 ? cyanCol : col;
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

    function spawnShockwave(
      x: number,
      y: number,
      color: number,
      alpha: number,
      lineWidth: number,
      maxRadius: number,
      isSquare: boolean,
      w: number,
      h: number
    ) {
      const pool = shockwavePoolRef.current;
      const active = activeShockwavesRef.current;
      const gfx = pool.find((g) => !g.visible);
      if (!gfx) return;

      gfx.visible = true;
      active.push({ gfx, x, y, radius: 8, maxRadius, color, alpha, lineWidth, isSquare, width: w, height: h });
    }

    // ─── Watch Flying Tile Prop Changes ───────────────────────────────────────

    useEffect(() => {
      if (flyingTile) {
        const distance = 8 - flyingTile.targetRow;
        const duration = Math.min(220, Math.max(140, distance * 18));
        flyAnimRef.current = {
          startTime: performance.now(),
          duration,
          col: flyingTile.col,
          fromY: 0, // will be computed in ticker based on current slot dimensions
          toY: 0,
          value: flyingTile.value,
        };
      } else {
        flyAnimRef.current = null;
      }
    }, [flyingTile]);

    // ─── Watch Absorbing Tile Prop Changes ─────────────────────────────────────

    useEffect(() => {
      if (absorbingTile) {
        absorbAnimRef.current = {
          startTime: performance.now(),
          duration: 260,
          fromX: 0,
          fromY: 0,
          toX: 0,
          toY: 0,
          value: absorbingTile.value,
        };
      } else {
        absorbAnimRef.current = null;
      }
    }, [absorbingTile]);

    // ─── Pointer Interaction Handlers ─────────────────────────────────────────

    const getColFromX = useCallback((clientX: number): number => {
      if (!canvasMountRef.current) return activeColRef.current ?? 2;
      const rect = canvasMountRef.current.getBoundingClientRect();
      const relX = clientX - rect.left;
      const colWidth = rect.width / COLS;
      const col = Math.floor(relX / colWidth);
      return Math.max(0, Math.min(COLS - 1, col));
    }, []);

    const getRowColFromClient = useCallback(
      (clientX: number, clientY: number): { row: number; col: number } | null => {
        if (!canvasMountRef.current) return null;
        const rect = canvasMountRef.current.getBoundingClientRect();
        const relX = clientX - rect.left;
        const relY = clientY - rect.top;
        const colWidth = rect.width / COLS;
        const rowHeight = (rect.height - 56) / 9;
        const c = Math.floor(relX / colWidth);
        const r = Math.floor(relY / rowHeight);
        if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
          return { row: r, col: c };
        }
        return null;
      },
      []
    );

    const handlePointerDown = (e: React.PointerEvent) => {
      if (hammerMode) {
        const hit = getRowColFromClient(e.clientX, e.clientY);
        if (hit && grid[hit.row]?.[hit.col] && onTileClick) {
          onTileClick(hit.row, hit.col);
        }
        return;
      }
      const col = getColFromX(e.clientX);
      isAimingRef.current = true;
      onColumnHover(col);
      soundFx.triggerHaptic('tap');
      try {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } catch {}
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (hammerMode) return;
      const col = getColFromX(e.clientX);
      if (col !== hoverCol) {
        onColumnHover(col);
        soundFx.triggerHaptic('tick');
      }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      if (hammerMode) return;
      if (isAimingRef.current) {
        isAimingRef.current = false;
        const targetCol = getColFromX(e.clientX);
        soundFx.triggerHaptic('light');
        onColumnTouch(targetCol);
        onColumnHover(null);
      }
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
    };

    const handlePointerCancel = () => {
      isAimingRef.current = false;
      onColumnHover(null);
    };

    // ─── PixiJS v8 Application Lifecycle ──────────────────────────────────────

    useEffect(() => {
      const mount = canvasMountRef.current;
      if (!mount) return;

      let unmounted = false;
      const app = new PIXI.Application();

      (async () => {
        try {
          await app.init({
            backgroundAlpha: 0,
            resizeTo: mount,
            antialias: true,
            resolution: Math.min(window.devicePixelRatio || 1, 2),
            autoDensity: true,
          });
        } catch {
          return;
        }

        if (unmounted) {
          app.destroy(true, { children: true });
          return;
        }

        mount.appendChild(app.canvas);
        appRef.current = app;

        // ── Scene Graph Root Containers ───────────────────────────────────────
        const lanesContainer = new PIXI.Container();
        const slotsContainer = new PIXI.Container();
        const tilesContainer = new PIXI.Container();
        const ghostContainer = new PIXI.Container();
        const launcherContainer = new PIXI.Container();
        const animContainer = new PIXI.Container();
        const shockwaveContainer = new PIXI.Container();

        app.stage.addChild(lanesContainer);
        app.stage.addChild(slotsContainer);
        app.stage.addChild(tilesContainer);
        app.stage.addChild(ghostContainer);
        app.stage.addChild(launcherContainer);
        app.stage.addChild(animContainer);

        // ── Pre-allocate Display Objects for 5 Columns × 8 Rows ───────────────
        // 1. Lanes Graphics (5 columns)
        const laneGfxList: PIXI.Graphics[] = [];
        for (let c = 0; c < COLS; c++) {
          const g = new PIXI.Graphics();
          lanesContainer.addChild(g);
          laneGfxList.push(g);
        }

        // 2. Empty Slot Graphics (5 cols × 8 rows)
        const slotGfxList: PIXI.Graphics[][] = [];
        for (let r = 0; r < ROWS; r++) {
          slotGfxList[r] = [];
          for (let c = 0; c < COLS; c++) {
            const g = new PIXI.Graphics();
            slotsContainer.addChild(g);
            slotGfxList[r][c] = g;
          }
        }

        // 3. Settled Tile Nodes (5 cols × 8 rows)
        interface TileNode {
          container: PIXI.Container;
          bgGfx: PIXI.Graphics;
          text: PIXI.Text;
          beaconGfx: PIXI.Graphics;
        }
        const tileNodes: TileNode[][] = [];
        for (let r = 0; r < ROWS; r++) {
          tileNodes[r] = [];
          for (let c = 0; c < COLS; c++) {
            const cont = new PIXI.Container();
            const beaconGfx = new PIXI.Graphics();
            const bgGfx = new PIXI.Graphics();
            const text = new PIXI.Text({
              text: '',
              style: {
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontSize: 22,
                fontWeight: '900',
                fill: 0xffffff,
                dropShadow: {
                  color: 0x000000,
                  alpha: 0.6,
                  blur: 2,
                  distance: 1.5,
                },
              },
            });
            text.anchor.set(0.5, 0.5);

            cont.addChild(beaconGfx);
            cont.addChild(bgGfx);
            cont.addChild(text);
            cont.visible = false;

            tilesContainer.addChild(cont);
            tileNodes[r][c] = { container: cont, bgGfx, text, beaconGfx };
          }
        }

        // 4. Ghost Preview Node
        const ghostGfx = new PIXI.Graphics();
        const ghostText = new PIXI.Text({
          text: '',
          style: {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 22,
            fontWeight: '900',
            fill: 0xffffff,
            dropShadow: { color: 0x000000, alpha: 0.5, blur: 2, distance: 1 },
          },
        });
        ghostText.anchor.set(0.5, 0.5);
        ghostContainer.addChild(ghostGfx);
        ghostContainer.addChild(ghostText);
        ghostContainer.visible = false;

        // 5. Launcher Dock Nodes (5 columns in Row 8)
        interface LauncherNode {
          container: PIXI.Container;
          bgGfx: PIXI.Graphics;
          text: PIXI.Text;
          arrowGfx: PIXI.Graphics;
        }
        const launcherNodes: LauncherNode[] = [];
        for (let c = 0; c < COLS; c++) {
          const cont = new PIXI.Container();
          const bgGfx = new PIXI.Graphics();
          const arrowGfx = new PIXI.Graphics();
          const text = new PIXI.Text({
            text: '',
            style: {
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 22,
              fontWeight: '900',
              fill: 0xffffff,
              dropShadow: { color: 0x000000, alpha: 0.6, blur: 2, distance: 1.5 },
            },
          });
          text.anchor.set(0.5, 0.5);

          cont.addChild(bgGfx);
          cont.addChild(arrowGfx);
          cont.addChild(text);
          launcherContainer.addChild(cont);
          launcherNodes.push({ container: cont, bgGfx, text, arrowGfx });
        }

        // 6. Flying Tile Node
        const flyingCont = new PIXI.Container();
        const flyingGfx = new PIXI.Graphics();
        const flyingText = new PIXI.Text({
          text: '',
          style: {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 22,
            fontWeight: '900',
            fill: 0xffffff,
            dropShadow: { color: 0x000000, alpha: 0.7, blur: 2, distance: 1.5 },
          },
        });
        flyingText.anchor.set(0.5, 0.5);
        flyingCont.addChild(flyingGfx);
        flyingCont.addChild(flyingText);
        flyingCont.visible = false;
        animContainer.addChild(flyingCont);

        // 7. Absorbing / Sliding Domino Tile Node
        const absorbingCont = new PIXI.Container();
        const absorbingGfx = new PIXI.Graphics();
        const absorbingText = new PIXI.Text({
          text: '',
          style: {
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 22,
            fontWeight: '900',
            fill: 0xffffff,
            dropShadow: { color: 0x000000, alpha: 0.7, blur: 2, distance: 1.5 },
          },
        });
        absorbingText.anchor.set(0.5, 0.5);
        absorbingCont.addChild(absorbingGfx);
        absorbingCont.addChild(absorbingText);
        absorbingCont.visible = false;
        animContainer.addChild(absorbingCont);

        // ── Particles & Shockwave Setup ───────────────────────────────────────
        const tmpCircle = new PIXI.Graphics();
        tmpCircle.circle(0, 0, 8).fill(0xffffff);
        const circleTexture = app.renderer.generateTexture(tmpCircle);
        tmpCircle.destroy();

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

        const pContainer = new PIXI.ParticleContainer({
          texture: circleTexture,
          dynamicProperties: { position: true, rotation: true, color: true, vertex: true },
          boundsArea: new PIXI.Rectangle(0, 0, 800, 1200),
        });
        app.stage.addChild(pContainer);

        for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
          const isDiamond = i % 3 === 2;
          const p = new PIXI.Particle({
            texture: isDiamond ? diamondTexture : circleTexture,
            x: 0,
            y: 0,
            anchorX: 0.5,
            anchorY: 0.5,
            alpha: 0,
          });
          pContainer.addParticle(p);
          particlePoolRef.current.push(p);
        }

        app.stage.addChild(shockwaveContainer);
        for (let i = 0; i < SHOCKWAVE_POOL_SIZE; i++) {
          const gfx = new PIXI.Graphics();
          gfx.visible = false;
          shockwaveContainer.addChild(gfx);
          shockwavePoolRef.current.push(gfx);
        }

        // ── Drawing Helper for 3D Beveled Blocks ──────────────────────────────
        function draw3DBlock(
          gfx: PIXI.Graphics,
          w: number,
          h: number,
          val: number,
          alpha = 1,
          isGhost = false
        ) {
          gfx.clear();
          const colors = getTileHexColors(val);
          const radius = Math.min(12, Math.floor(w * 0.18));
          const bevelH = Math.max(4, Math.floor(h * 0.08));

          if (isGhost) {
            gfx
              .roundRect(0, 0, w, h, radius)
              .fill({ color: colors.bg, alpha: 0.45 * alpha })
              .stroke({ width: 1.5, color: 0xffffff, alpha: 0.65 * alpha });
            gfx
              .roundRect(1, 1, w - 2, Math.floor(h * 0.45), Math.max(0, radius - 1))
              .fill({ color: 0xffffff, alpha: 0.15 * alpha });
            return;
          }

          // 1. Main body
          gfx.roundRect(0, 0, w, h, radius).fill({ color: colors.bg, alpha });

          // 2. 3D Bottom Bevel
          gfx
            .roundRect(0, h - bevelH, w, bevelH, Math.max(0, radius - 2))
            .fill({ color: colors.bottom, alpha });

          // 3. Top Gloss shine
          gfx
            .roundRect(1, 1, w - 2, 2.5, Math.max(0, radius - 1))
            .fill({ color: 0xffffff, alpha: 0.3 * alpha });

          // 4. Subtle top half reflection
          gfx
            .roundRect(2, 2, w - 4, Math.floor((h - bevelH) * 0.45), Math.max(0, radius - 2))
            .fill({ color: 0xffffff, alpha: 0.07 * alpha });
        }

        function getFontSize(formatted: string, tileWidth: number): number {
          if (formatted.length <= 2) return Math.floor(tileWidth * 0.42);
          if (formatted.length === 3) return Math.floor(tileWidth * 0.34);
          if (formatted.length === 4) return Math.floor(tileWidth * 0.26);
          return Math.floor(tileWidth * 0.24);
        }

        // ── Main Ticker Render Loop ───────────────────────────────────────────
        let pulseTimer = 0;

        app.ticker.add((ticker) => {
          const dt = ticker.deltaTime;
          pulseTimer += 0.05 * dt;

          const currentWidth = app.screen.width;
          const currentHeight = app.screen.height;
          if (currentWidth <= 0 || currentHeight <= 0) return;

          const padX = 6;
          const padY = 6;
          const gapX = 4;
          const gapY = 4;
          const dockGap = 6;

          const colWidth = (currentWidth - padX * 2 - (COLS - 1) * gapX) / COLS;
          const slotHeight = (currentHeight - padY * 2 - 7 * gapY - dockGap) / 9;

          const getCellX = (c: number) => padX + c * (colWidth + gapX);
          const getCellY = (r: number) => padY + r * (slotHeight + gapY);
          const launcherY = padY + 8 * (slotHeight + gapY) + dockGap;

          const {
            grid: curGrid,
            hoverCol: curHoverCol,
            incomingValue: curIncoming,
            activeSpecialCombo: curCombo,
            flyingTile: curFlying,
            absorbingTile: curAbsorbing,
            hammerMode: curHammer,
          } = propsRef.current;

          const incomingColors = getTileHexColors(curIncoming);
          const hoverPreview =
            curHoverCol !== null ? previewShoot(curGrid, curHoverCol, curIncoming) : null;

          // ── 1. Draw Lane Backgrounds & Guide Tracks ─────────────────────────
          for (let c = 0; c < COLS; c++) {
            const laneG = laneGfxList[c];
            laneG.clear();
            const x = getCellX(c) - 1.5;
            const y = padY - 1.5;
            const w = colWidth + 3;
            const h = getCellY(7) + slotHeight - padY + 3;

            const isSelected = curHoverCol === c;

            if (isSelected) {
              laneG
                .roundRect(x, y, w, h, 12)
                .fill({ color: incomingColors.accent, alpha: 0.12 })
                .stroke({ width: 1.5, color: incomingColors.accent, alpha: 0.75 });

              // Guide track beam
              laneG
                .roundRect(x + 2, y + 2, w - 4, h - 4, 10)
                .fill({ color: incomingColors.accent, alpha: 0.08 });
            } else {
              laneG
                .roundRect(x, y, w, h, 12)
                .fill({ color: 0x181b25, alpha: 0.7 })
                .stroke({ width: 1, color: 0x334155, alpha: 0.35 });
            }
          }

          // ── 2. Draw Empty Slots ─────────────────────────────────────────────
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              const sg = slotGfxList[r][c];
              sg.clear();
              const hasTile = curGrid[r]?.[c] !== null;

              if (!hasTile) {
                sg.roundRect(getCellX(c), getCellY(r), colWidth, slotHeight, 10)
                  .fill({ color: 0x1e2330, alpha: 0.5 })
                  .stroke({ width: 1, color: 0x334155, alpha: 0.35 });
              }
            }
          }

          // ── 3. Draw Settled Tiles ───────────────────────────────────────────
          for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
              const tile = curGrid[r]?.[c];
              const node = tileNodes[r][c];

              if (!tile) {
                node.container.visible = false;
                continue;
              }

              node.container.visible = true;
              node.container.position.set(getCellX(c), getCellY(r));

              // Check if tile is in active combo
              const isInCombo =
                curCombo && curCombo.tiles.some((t) => t.row === r && t.col === c);

              node.beaconGfx.clear();
              if (isInCombo) {
                const comboColor =
                  curCombo.type === 'inverted_t'
                    ? 0xe879f9
                    : curCombo.type === 'corner'
                    ? 0xfbbf24
                    : curCombo.type === 'square'
                    ? 0xfacc15
                    : 0x22d3ee;
                const ringAlpha = 0.6 + 0.35 * Math.sin(pulseTimer * 3);
                node.beaconGfx
                  .roundRect(-3, -3, colWidth + 6, slotHeight + 6, 13)
                  .stroke({ width: 3.5, color: comboColor, alpha: ringAlpha });
              }

              // Check if hammer mode active
              if (curHammer) {
                node.beaconGfx
                  .roundRect(-2, -2, colWidth + 4, slotHeight + 4, 12)
                  .stroke({ width: 2, color: 0xf43f5e, alpha: 0.8 });
              }

              draw3DBlock(node.bgGfx, colWidth, slotHeight, tile.value);

              const formatted = formatTileValue(tile.value);
              node.text.text = formatted;
              node.text.style.fontSize = getFontSize(formatted, colWidth);
              const bevelH = Math.max(4, Math.floor(slotHeight * 0.08));
              node.text.position.set(colWidth / 2, (slotHeight - bevelH) / 2);

              // Merge pop scale pulse
              if (tile.isMerging) {
                const popScale = 1.0 + 0.18 * Math.sin(pulseTimer * 4);
                node.container.scale.set(popScale);
                node.container.pivot.set(
                  (colWidth * (popScale - 1)) / (2 * popScale),
                  (slotHeight * (popScale - 1)) / (2 * popScale)
                );
              } else {
                node.container.scale.set(1);
                node.container.pivot.set(0, 0);
              }
            }
          }

          // ── 4. Draw Ghost Placement Preview ─────────────────────────────────
          const isTargetActive =
            curHoverCol !== null &&
            hoverPreview &&
            hoverPreview.valid &&
            !curFlying &&
            !curAbsorbing;

          if (isTargetActive) {
            const tr = hoverPreview.targetRow;
            const tc = curHoverCol!;
            const targetTile = curGrid[tr]?.[tc];

            if (!targetTile) {
              ghostContainer.visible = true;
              ghostContainer.position.set(getCellX(tc), getCellY(tr));
              const breath = 0.85 + 0.15 * Math.sin(pulseTimer * 2.5);
              draw3DBlock(ghostGfx, colWidth, slotHeight, curIncoming, breath, true);
              const formatted = formatTileValue(curIncoming);
              ghostText.text = formatted;
              ghostText.style.fontSize = getFontSize(formatted, colWidth);
              const bevelH = Math.max(4, Math.floor(slotHeight * 0.08));
              ghostText.position.set(colWidth / 2, (slotHeight - bevelH) / 2);
              ghostText.alpha = 0.7 * breath;
            } else if (hoverPreview.isMerge) {
              ghostContainer.visible = true;
              ghostContainer.position.set(getCellX(tc), getCellY(tr));
              ghostGfx.clear();
              const glowAlpha = 0.7 + 0.3 * Math.sin(pulseTimer * 3);
              ghostGfx
                .roundRect(-3, -3, colWidth + 6, slotHeight + 6, 13)
                .stroke({ width: 3, color: 0xffffff, alpha: glowAlpha });
              ghostText.text = '';
            }
          } else {
            ghostContainer.visible = false;
          }

          // ── 5. Draw Row 8 Shooter Launcher Dock ─────────────────────────────
          for (let c = 0; c < COLS; c++) {
            const lNode = launcherNodes[c];
            const isSelected = curHoverCol === c;
            const isColFlying = curFlying && curFlying.col === c;

            lNode.container.position.set(getCellX(c), launcherY);

            if (isSelected && !isColFlying) {
              lNode.arrowGfx.clear();
              lNode.arrowGfx.visible = false;
              draw3DBlock(lNode.bgGfx, colWidth, slotHeight, curIncoming);

              const formatted = formatTileValue(curIncoming);
              lNode.text.text = formatted;
              lNode.text.style.fontSize = getFontSize(formatted, colWidth);
              const bevelH = Math.max(4, Math.floor(slotHeight * 0.08));
              lNode.text.position.set(colWidth / 2, (slotHeight - bevelH) / 2);
              lNode.text.visible = true;
            } else {
              lNode.text.visible = false;
              lNode.bgGfx.clear();
              lNode.bgGfx
                .roundRect(0, 0, colWidth, slotHeight, 10)
                .fill({ color: 0x1e2330, alpha: 0.9 })
                .stroke({ width: 1, color: isSelected ? 0xf59e0b : 0x334155, alpha: 0.6 });

              lNode.arrowGfx.clear();
              lNode.arrowGfx.visible = true;
              const arrowCol = isSelected ? 0xfcd34d : 0x64748b;
              const cx = colWidth / 2;
              const cy = slotHeight / 2;
              lNode.arrowGfx
                .moveTo(cx, cy - 7)
                .lineTo(cx - 6, cy + 3)
                .lineTo(cx - 2, cy + 3)
                .lineTo(cx - 2, cy + 8)
                .lineTo(cx + 2, cy + 8)
                .lineTo(cx + 2, cy + 3)
                .lineTo(cx + 6, cy + 3)
                .closePath()
                .fill({ color: arrowCol, alpha: 0.8 });
            }
          }

          // ── 6. Animate Flying Tile ───────────────────────────────────────────
          if (flyAnimRef.current && curFlying) {
            const now = performance.now();
            const anim = flyAnimRef.current;
            const progress = Math.min(1, (now - anim.startTime) / anim.duration);
            const easeP = easeOutCubic(progress);

            const startY = launcherY;
            const targetY = getCellY(curFlying.targetRow);
            const curY = startY + (targetY - startY) * easeP;

            flyingCont.visible = true;
            flyingCont.position.set(getCellX(curFlying.col), curY);
            draw3DBlock(flyingGfx, colWidth, slotHeight, curFlying.value);

            const formatted = formatTileValue(curFlying.value);
            flyingText.text = formatted;
            flyingText.style.fontSize = getFontSize(formatted, colWidth);
            const bevelH = Math.max(4, Math.floor(slotHeight * 0.08));
            flyingText.position.set(colWidth / 2, (slotHeight - bevelH) / 2);
          } else {
            flyingCont.visible = false;
          }

          // ── 7. Animate Absorbing / Domino Slide Tile ─────────────────────────
          if (absorbAnimRef.current && curAbsorbing) {
            const now = performance.now();
            const anim = absorbAnimRef.current;
            const progress = Math.min(1, (now - anim.startTime) / anim.duration);
            const easeP = easeOutCubic(progress);

            const sX = getCellX(curAbsorbing.fromCol);
            const sY = getCellY(curAbsorbing.fromRow);
            const eX = getCellX(curAbsorbing.toCol);
            const eY = getCellY(curAbsorbing.toRow);

            const curX = sX + (eX - sX) * easeP;
            const curY = sY + (eY - sY) * easeP;

            absorbingCont.visible = true;
            absorbingCont.position.set(curX, curY);
            draw3DBlock(absorbingGfx, colWidth, slotHeight, curAbsorbing.value);

            const formatted = formatTileValue(curAbsorbing.value);
            absorbingText.text = formatted;
            absorbingText.style.fontSize = getFontSize(formatted, colWidth);
            const bevelH = Math.max(4, Math.floor(slotHeight * 0.08));
            absorbingText.position.set(colWidth / 2, (slotHeight - bevelH) / 2);
          } else {
            absorbingCont.visible = false;
          }

          // ── 8. Update Active Particles ───────────────────────────────────────
          const active = activeParticlesRef.current;
          for (let i = active.length - 1; i >= 0; i--) {
            const s = active[i];
            const p = s.particle;

            p.x += s.vx * dt;
            p.y += s.vy * dt;
            s.vy += 0.12 * dt;
            s.vx *= Math.pow(0.96, dt);
            s.life += dt;
            p.rotation += 0.04 * dt;

            const progress = s.life / s.maxLife;
            p.alpha = Math.max(0, 1 - progress);
            const sc = (1 - progress * 0.4) * (p.scaleX > 0 ? p.scaleX : 0.5);
            p.scaleX = sc;
            p.scaleY = sc;

            if (p.alpha <= 0) {
              p.alpha = 0;
              active.splice(i, 1);
            }
          }

          // ── 9. Update Active Shockwaves ──────────────────────────────────────
          const shocks = activeShockwavesRef.current;
          for (let i = shocks.length - 1; i >= 0; i--) {
            const sw = shocks[i];
            sw.radius += 2.8 * dt;
            sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);

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
        particlePoolRef.current = [];
        activeParticlesRef.current = [];
        shockwavePoolRef.current = [];
        activeShockwavesRef.current = [];

        if (appRef.current) {
          appRef.current.destroy(true, { children: true });
          appRef.current = null;
        }
      };
    }, []);

    // ── Render Component JSX ──────────────────────────────────────────────────

    const isNearlyFull =
      !isBonusRushActive && bonusRushMax > 0 && bonusRushProgress / bonusRushMax >= 0.9;

    return (
      <div
        ref={boardContainerRef}
        className={`relative w-full max-w-[420px] mx-auto p-1.5 sm:p-2 bg-[#12151d] rounded-2xl border transition-all duration-300 flex flex-col select-none touch-none overflow-hidden ${
          isBonusRushActive
            ? 'border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_30px_rgba(251,191,36,0.35)]'
            : 'border-slate-800/90 shadow-2xl'
        }`}
      >
        {/* Canvas Viewport Mount with Full Width Pointer Touch Aiming */}
        <div
          ref={canvasMountRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onPointerLeave={() => {
            if (!isAimingRef.current) {
              onColumnHover(null);
            }
          }}
          className="w-full aspect-[5/9] relative cursor-pointer overflow-hidden rounded-xl"
        >
          {/* PixiJS canvas is appended here imperatively in useEffect */}

          {/* Floating In-Board Add-In Score Badges */}
          {addIns.map((addIn) => (
            <div
              key={addIn.id}
              style={{
                left: `calc(6px + ${addIn.col} * ((100% - 12px) / 5) + ((100% - 12px) / 10))`,
                top: `calc(6px + ${addIn.row} * ((100% - 56px) / 9) + 12px)`,
              }}
              className="absolute z-40 pointer-events-none flex flex-col items-center animate-float-addin"
            >
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full shadow-[0_4px_16px_rgba(245,158,11,0.95)] border-2 border-white">
                <span className="text-xs sm:text-sm font-black tracking-tight leading-none drop-shadow-sm">
                  +{addIn.score.toLocaleString()}
                </span>
                {addIn.gems && addIn.gems > 0 && (
                  <span className="text-[10px] font-black bg-amber-950 text-yellow-300 px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-inner border border-yellow-500/40">
                    +{addIn.gems} <CoinIcon size={11} sparkle={false} />
                  </span>
                )}
              </div>

              {addIn.combo && addIn.combo > 1 && (
                <span className="text-[10px] font-black text-rose-200 bg-rose-950/95 px-2 py-0.5 rounded-full border border-rose-400/90 mt-0.5 shadow-[0_0_12px_rgba(244,63,94,0.7)]">
                  COMBO ×{addIn.combo}!
                </span>
              )}

              {addIn.title && (
                <span className="text-[10px] font-black text-amber-200 bg-slate-950/95 px-2 py-0.5 rounded-full border border-amber-400/90 mt-0.5 shadow">
                  {addIn.title}
                </span>
              )}
            </div>
          ))}

          {/* HTML Floating Notifications (Overlaid on top of PixiJS canvas) */}
          {notifications.map((notif) => (
            <div
              key={notif.id}
              onAnimationEnd={() => onRemoveNotification?.(notif.id)}
              style={{
                left: `${notif.x}px`,
                top: `${notif.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute z-40 flex flex-col items-center pointer-events-none animate-[floatUp_1.3s_cubic-bezier(0.16,1,0.3,1)_forwards] drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
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

        {/* Persistent Bonus Rush Progress Bar at bottom of Game Board */}
        <div className="w-full mt-2 pt-1.5 border-t border-slate-800/80 flex flex-col gap-1 select-none">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              {isBonusRushActive ? (
                <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 animate-bounce" />
              ) : (
                <Flame
                  className={`w-3.5 h-3.5 transition-colors ${
                    isNearlyFull
                      ? 'text-yellow-300 fill-yellow-300 animate-bounce'
                      : 'text-amber-400 fill-amber-400'
                  }`}
                />
              )}
              <span
                className={`text-[11px] font-black tracking-wider uppercase transition-colors ${
                  isBonusRushActive
                    ? 'text-yellow-300 animate-pulse'
                    : isNearlyFull
                    ? 'text-amber-300 animate-pulse'
                    : 'text-slate-200'
                }`}
              >
                {isBonusRushActive ? 'Bonus Rush Active!' : 'Bonus Rush'}
              </span>
              <span
                className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider uppercase border transition-all ${
                  isBonusRushActive
                    ? 'bg-rose-500 text-white border-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.8)] animate-pulse'
                    : isNearlyFull
                    ? 'bg-amber-500/30 text-yellow-200 border-yellow-400/90 shadow-[0_0_12px_rgba(251,191,36,0.65)] animate-pulse'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {isNearlyFull ? 'Sắp kích hoạt!' : '2X Điểm'}
              </span>
            </div>

            <div className="flex items-center gap-1 font-mono">
              {isBonusRushActive ? (
                <span className="text-xs font-black text-amber-300 tracking-tight animate-pulse">
                  {bonusRushTimeRemaining.toFixed(1)}s
                </span>
              ) : (
                <span
                  className={`text-[10px] font-bold transition-colors ${
                    isNearlyFull ? 'text-amber-200 animate-pulse' : 'text-slate-400'
                  }`}
                >
                  <span
                    className={`font-extrabold ${
                      isNearlyFull ? 'text-yellow-300' : 'text-amber-300'
                    }`}
                  >
                    {bonusRushProgress}
                  </span>
                  /{bonusRushMax} Merges
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar Track */}
          <div
            className={`relative w-full h-2.5 rounded-full overflow-hidden transition-all duration-300 border ${
              isBonusRushActive
                ? 'bg-slate-900 border-amber-400/90 shadow-[0_0_14px_rgba(251,191,36,0.7)]'
                : isNearlyFull
                ? 'bg-slate-900/90 border-amber-400/90 animate-bonus-rush-urgent'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            {isBonusRushActive ? (
              <div
                style={{ width: `${Math.max(0, (bonusRushTimeRemaining / 10) * 100)}%` }}
                className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-yellow-300 transition-[width] duration-100 ease-linear shadow-[0_0_12px_rgba(251,191,36,0.9)] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-energy-shimmer" />
              </div>
            ) : (
              <div
                style={{ width: `${Math.min(100, (bonusRushProgress / bonusRushMax) * 100)}%` }}
                className={`h-full rounded-full transition-all duration-300 relative overflow-hidden ${
                  isNearlyFull
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-200 animate-bonus-rush-urgent-fill shadow-[0_0_16px_rgba(251,191,36,0.95)]'
                    : 'bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                }`}
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent ${
                    isNearlyFull ? 'animate-energy-shimmer-fast' : 'animate-energy-shimmer'
                  }`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);
