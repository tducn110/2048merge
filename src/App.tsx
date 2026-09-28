/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { Flame, Zap, Sparkles } from 'lucide-react';
import {
  Grid,
  GameStats,
  SpecialComboEvent,
  FloatingNotification,
  AddInPopup,
  AbsorbingTileAnim,
  MergeDirection,
  ComboHistoryItem,
} from './types';
import {
  COLS,
  createEmptyGrid,
  generateInitialGrid,
  getRandomSpawnValue,
  previewShoot,
  compactGridUpwards,
  findInvertedTMatches,
  findCornerMatches,
  findAdjacentMatches,
  isGameOver,
} from './utils/gameLogic';
import { soundFx } from './utils/audio';
import { Header } from './components/Header';
import { GameBoard } from './components/GameBoard';
import { ShooterControls } from './components/ShooterControls';
// PixiJS-powered particle canvas replaces the old Canvas 2D ParticleCanvas
import { PixiParticleCanvas as ParticleCanvas, PixiParticleCanvasHandle as ParticleCanvasHandle } from './components/PixiParticleCanvas';
import { TutorialModal } from './components/TutorialModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { MilestoneModal } from './components/MilestoneModal';

interface UndoState {
  grid: Grid;
  score: number;
  currentValue: number;
  nextValue: number;
}

// Visual configuration for growing cascade multiplier badges
const getMultiplierConfig = (multiplier: number) => {
  if (multiplier >= 5) {
    return {
      title: 'ULTRA CHAIN!',
      subtitle: `${multiplier}X UNSTOPPABLE!`,
      bgGradient: 'from-rose-600 via-amber-500 to-violet-600',
      borderColor: 'border-yellow-200/90',
      glowColor: '0 0 50px rgba(251,191,36,0.95), 0 0 90px rgba(244,63,94,0.6)',
      textColor: 'text-amber-100',
      badgeBg: 'bg-black/85',
      iconCount: 3,
      iconType: 'sparkles' as const,
      ringClass: 'ring-4 ring-yellow-300/80',
      scaleClass: 'scale-125 sm:scale-135',
    };
  }
  if (multiplier === 4) {
    return {
      title: 'MEGA CHAIN!',
      subtitle: '4X MULTIPLIER!',
      bgGradient: 'from-cyan-400 via-sky-500 to-blue-600',
      borderColor: 'border-cyan-200/90',
      glowColor: '0 0 42px rgba(6,182,212,0.9), 0 0 75px rgba(59,130,246,0.5)',
      textColor: 'text-cyan-100',
      badgeBg: 'bg-slate-950/85',
      iconCount: 3,
      iconType: 'zap' as const,
      ringClass: 'ring-3 ring-cyan-300/80',
      scaleClass: 'scale-115 sm:scale-125',
    };
  }
  if (multiplier === 3) {
    return {
      title: 'SUPER CHAIN!',
      subtitle: '3X MULTIPLIER!',
      bgGradient: 'from-fuchsia-500 via-purple-600 to-pink-500',
      borderColor: 'border-fuchsia-300/90',
      glowColor: '0 0 35px rgba(217,70,239,0.85), 0 0 60px rgba(168,85,247,0.45)',
      textColor: 'text-fuchsia-100',
      badgeBg: 'bg-slate-950/85',
      iconCount: 2,
      iconType: 'flame' as const,
      ringClass: 'ring-2 ring-fuchsia-400/80',
      scaleClass: 'scale-105 sm:scale-115',
    };
  }
  // multiplier === 2
  return {
    title: 'CHAIN COMBO',
    subtitle: '2X MULTIPLIER!',
    bgGradient: 'from-amber-500 via-orange-500 to-amber-600',
    borderColor: 'border-amber-300/80',
    glowColor: '0 0 28px rgba(245,158,11,0.8), 0 0 45px rgba(249,115,22,0.4)',
    textColor: 'text-amber-100',
    badgeBg: 'bg-slate-950/85',
    iconCount: 1,
    iconType: 'flame' as const,
    ringClass: 'ring-2 ring-amber-400/70',
    scaleClass: 'scale-95 sm:scale-105',
  };
};

// Visual configuration for the center COMBO xN text layer (3x+)
// Dynamically adjusts background gradient intensity and rotation speed based on current cascade multiplier (multiplier > 3)
const getCenterComboConfig = (combo: number, multiplier: number = 3) => {
  const effectiveMultiplier = Math.max(combo, multiplier);
  const isHighMultiplier = effectiveMultiplier > 3;

  // Dynamic rotation speed calculation (multiplier > 3):
  // multiplier <= 3: 7.5s (smooth ambient rotation)
  // multiplier === 4: 3.8s (swift energetic spin)
  // multiplier === 5: 2.1s (blazing vortex)
  // multiplier >= 6: scalable hyper-speed (down to 0.85s)
  let rotationSpeed: number;
  let counterRotationSpeed: number;
  if (effectiveMultiplier <= 3) {
    rotationSpeed = 7.5;
    counterRotationSpeed = 8.5;
  } else if (effectiveMultiplier === 4) {
    rotationSpeed = 3.8;
    counterRotationSpeed = 4.4;
  } else if (effectiveMultiplier === 5) {
    rotationSpeed = 2.1;
    counterRotationSpeed = 2.6;
  } else {
    rotationSpeed = Math.max(0.85, 2.1 - (effectiveMultiplier - 5) * 0.4);
    counterRotationSpeed = Math.max(1.0, 2.6 - (effectiveMultiplier - 5) * 0.45);
  }

  // Dynamic background gradient intensity (multiplier > 3):
  // Opacity, scale, brightness, and color saturation scale upwards with multiplier > 3
  let rayOpacity: number;
  let rayScale: number;
  let rayFilter: string;
  let secondaryRayOpacity: number;
  let cardBackdropGradient: string;

  if (effectiveMultiplier <= 3) {
    rayOpacity = 0.55;
    rayScale = 1.0;
    rayFilter = 'brightness(1.15) saturate(1.25)';
    secondaryRayOpacity = 0.35;
    cardBackdropGradient =
      'radial-gradient(ellipse at center, rgba(14, 165, 233, 0.25) 0%, rgba(30, 58, 138, 0.2) 45%, rgba(15, 23, 42, 0.95) 85%)';
  } else if (effectiveMultiplier === 4) {
    rayOpacity = 0.85;
    rayScale = 1.22;
    rayFilter = 'brightness(1.5) saturate(1.75)';
    secondaryRayOpacity = 0.68;
    cardBackdropGradient =
      'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.42) 0%, rgba(234, 88, 12, 0.28) 45%, rgba(15, 23, 42, 0.96) 85%)';
  } else if (effectiveMultiplier === 5) {
    rayOpacity = 0.96;
    rayScale = 1.4;
    rayFilter = 'brightness(1.75) saturate(2.1)';
    secondaryRayOpacity = 0.86;
    cardBackdropGradient =
      'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.55) 0%, rgba(244, 63, 94, 0.38) 45%, rgba(10, 5, 20, 0.97) 90%)';
  } else {
    // multiplier >= 6
    const extraIntensity = Math.min(1.0, (effectiveMultiplier - 5) * 0.25);
    rayOpacity = 1.0;
    rayScale = Math.min(1.65, 1.4 + extraIntensity * 0.2);
    rayFilter = `brightness(${1.8 + extraIntensity * 0.35}) saturate(${2.2 + extraIntensity * 0.5})`;
    secondaryRayOpacity = Math.min(0.98, 0.88 + extraIntensity * 0.1);
    cardBackdropGradient =
      'radial-gradient(ellipse at center, rgba(254, 240, 138, 0.68) 0%, rgba(236, 72, 153, 0.48) 40%, rgba(147, 51, 234, 0.35) 65%, rgba(5, 2, 15, 0.98) 95%)';
  }

  if (effectiveMultiplier >= 5) {
    return {
      title: effectiveMultiplier === 5 ? 'MYTHIC RAMPAGE!' : `GODLIKE x${effectiveMultiplier}!`,
      text: `COMBO x${effectiveMultiplier}`,
      gradient: 'from-amber-200 via-rose-300 to-yellow-300',
      border: 'border-yellow-300/90',
      bg: 'bg-black/90',
      shadow:
        effectiveMultiplier >= 6
          ? '0 0 75px rgba(254,240,138,1), 0 0 130px rgba(244,63,94,0.9), inset 0 0 35px rgba(254,240,138,0.45)'
          : '0 0 55px rgba(251,191,36,0.95), 0 0 100px rgba(244,63,94,0.85), inset 0 0 25px rgba(251,191,36,0.35)',
      glowRays: 'from-yellow-300/85 via-rose-500/65 to-purple-600/35',
      secondaryGlowRays: 'from-amber-300/70 via-fuchsia-600/55 to-indigo-700/30',
      ringColor: effectiveMultiplier >= 6 ? 'ring-4 ring-yellow-300' : 'ring-4 ring-yellow-400/90',
      icon: 'sparkles' as const,
      rotationSpeed,
      counterRotationSpeed,
      rayOpacity,
      rayScale,
      rayFilter,
      secondaryRayOpacity,
      cardBackdropGradient,
      isHighMultiplier,
      effectiveMultiplier,
    };
  }
  if (effectiveMultiplier === 4) {
    return {
      title: 'SUPER STRIKE!',
      text: 'COMBO x4',
      gradient: 'from-amber-100 via-orange-300 to-red-500',
      border: 'border-amber-300/90',
      bg: 'bg-slate-950/90',
      shadow:
        '0 0 45px rgba(245,158,11,0.95), 0 0 85px rgba(234,88,12,0.7), inset 0 0 20px rgba(245,158,11,0.3)',
      glowRays: 'from-amber-400/65 via-orange-500/45 to-rose-600/25',
      secondaryGlowRays: 'from-yellow-400/50 via-red-500/35 to-transparent',
      ringColor: 'ring-3 ring-amber-400/80',
      icon: 'flame' as const,
      rotationSpeed,
      counterRotationSpeed,
      rayOpacity,
      rayScale,
      rayFilter,
      secondaryRayOpacity,
      cardBackdropGradient,
      isHighMultiplier,
      effectiveMultiplier,
    };
  }
  // combo/multiplier === 3
  return {
    title: 'TRIPLE CHAIN!',
    text: 'COMBO x3',
    gradient: 'from-cyan-100 via-sky-300 to-indigo-400',
    border: 'border-cyan-300/90',
    bg: 'bg-slate-950/90',
    shadow: '0 0 32px rgba(56,189,248,0.85), 0 0 60px rgba(99,102,241,0.5)',
    glowRays: 'from-cyan-400/40 via-sky-500/25 to-transparent',
    secondaryGlowRays: 'from-blue-500/25 via-indigo-600/15 to-transparent',
    ringColor: 'ring-2 ring-cyan-400/80',
    icon: 'zap' as const,
    rotationSpeed,
    counterRotationSpeed,
    rayOpacity,
    rayScale,
    rayFilter,
    secondaryRayOpacity,
    cardBackdropGradient,
    isHighMultiplier,
    effectiveMultiplier,
  };
};

const MATCH_HISTORY_STORAGE_KEY = '2048_shooter_match_history';

// Default initial high-scoring combo history so the panel has rich initial data on first open
const INITIAL_MATCH_HISTORY: ComboHistoryItem[] = [
  {
    id: 'history-sample-1',
    type: 'inverted_t',
    title: 'Combo Chữ T Ngược ⊥',
    score: 4096,
    multiplier: 4,
    tileValue: 512,
    isRush: true,
    timestamp: Date.now() - 1000 * 60 * 3,
  },
  {
    id: 'history-sample-2',
    type: 'corner',
    title: 'Combo Vuông Góc 90°',
    score: 2048,
    multiplier: 3,
    tileValue: 256,
    isRush: false,
    timestamp: Date.now() - 1000 * 60 * 8,
  },
  {
    id: 'history-sample-3',
    type: 'cascade',
    title: 'Cascade Domino Combo',
    score: 1024,
    multiplier: 2,
    tileValue: 128,
    isRush: false,
    timestamp: Date.now() - 1000 * 60 * 15,
  },
  {
    id: 'history-sample-4',
    type: 'inverted_t',
    title: 'Combo Chữ T Ngược ⊥',
    score: 800,
    multiplier: 2,
    tileValue: 64,
    isRush: false,
    timestamp: Date.now() - 1000 * 60 * 22,
  },
  {
    id: 'history-sample-5',
    type: 'corner',
    title: 'Combo Vuông Góc 90°',
    score: 512,
    multiplier: 2,
    tileValue: 32,
    isRush: false,
    timestamp: Date.now() - 1000 * 60 * 35,
  },
];

export default function App() {
  const [grid, setGrid] = useState<Grid>(() => generateInitialGrid());
  const [currentValue, setCurrentValue] = useState<number>(() => getRandomSpawnValue(8));
  const [nextValue, setNextValue] = useState<number>(() => getRandomSpawnValue(8));
  const [hoverCol, setHoverCol] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundFx.isMuted());
  const [tutorialOpen, setTutorialOpen] = useState<boolean>(false);
  const [gameOverOpen, setGameOverOpen] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [milestoneOpen, setMilestoneOpen] = useState<boolean>(false);

  // Powerups & Tools
  const [hammerMode, setHammerMode] = useState<boolean>(false);
  const [hammerCharges, setHammerCharges] = useState<number>(1);
  const [undoStack, setUndoStack] = useState<UndoState[]>([]);

  // Visual Events & FX
  const [activeSpecialCombo, setActiveSpecialCombo] = useState<SpecialComboEvent | null>(null);
  const [floatingNotifications, setFloatingNotifications] = useState<FloatingNotification[]>([]);
  const [addIns, setAddIns] = useState<AddInPopup[]>([]);
  const [absorbingTile, setAbsorbingTile] = useState<AbsorbingTileAnim | null>(null);
  const [flyingTile, setFlyingTile] = useState<{
    col: number;
    fromRow: number;
    targetRow: number;
    value: number;
    isMerge?: boolean;
    isAbsorbing?: boolean;
  } | null>(null);

  // Stats
  const [stats, setStats] = useState<GameStats>(() => {
    let savedHighScore = 0;
    let savedGems = 42;
    try {
      savedHighScore = Number(localStorage.getItem('2048_highscore')) || 0;
      const g = localStorage.getItem('2048_gems');
      if (g !== null) savedGems = Number(g);
    } catch {
      // ignore
    }
    return {
      score: 0,
      highScore: savedHighScore,
      gems: savedGems,
      comboCount: 0,
      highestTile: 8,
      cornerCombos: 0,
      invertedTCombos: 0,
      squareCombos: 0,
      tripleCombos: 0,
      totalMerges: 0,
    };
  });

  const particleCanvasRef = useRef<ParticleCanvasHandle | null>(null);
  const boardContainerRef = useRef<HTMLDivElement | null>(null);

  // Bonus Rush Mode (Persistent Progress Bar, fills on merges, 10s of 2X doubled score)
  const BONUS_RUSH_MAX_MERGES = 10;
  const [bonusRushProgress, setBonusRushProgress] = useState<number>(0);
  const [isBonusRushActive, setIsBonusRushActive] = useState<boolean>(false);
  const isBonusRushActiveRef = useRef<boolean>(false);
  const [bonusRushTimeRemaining, setBonusRushTimeRemaining] = useState<number>(0);

  // Match History state (persisting last 5 high-scoring combo chains)
  const [matchHistory, setMatchHistory] = useState<ComboHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(MATCH_HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_MATCH_HISTORY;
  });

  useEffect(() => {
    try {
      localStorage.setItem(MATCH_HISTORY_STORAGE_KEY, JSON.stringify(matchHistory));
    } catch {
      // ignore
    }
  }, [matchHistory]);

  const recordComboHistory = useCallback(
    (item: Omit<ComboHistoryItem, 'id' | 'timestamp'>) => {
      setMatchHistory((prev) => {
        const newItem: ComboHistoryItem = {
          ...item,
          id: `combo-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          timestamp: Date.now(),
        };
        return [newItem, ...prev].slice(0, 5);
      });
    },
    []
  );

  // Cascade Multiplier UI Badge (x2, x3, x4...)
  const [cascadeMultiplier, setCascadeMultiplier] = useState<{
    multiplier: number;
  } | null>(null);
  const cascadeMultiplierRef = useRef<number>(1);
  const multiplierBadgeRef = useRef<HTMLDivElement | null>(null);
  const screenFlashRef = useRef<HTMLDivElement | null>(null);

  // Visual Center Combo Text Overlay ('COMBO xN' for 3x+ combos)
  const [centerComboText, setCenterComboText] = useState<{
    combo: number;
    multiplier: number;
    id: number;
  } | null>(null);
  const centerComboTextRef = useRef<HTMLDivElement | null>(null);

  // Trigger Center 'COMBO xN' Visual Text Layer during combo chain (3x+)
  // Dynamically alters background gradient intensity and rotation speed when multiplier > 3
  const triggerCenterComboOverlay = useCallback((combo: number, explicitMultiplier?: number) => {
    if (combo < 3) return;

    const currentMultiplier =
      explicitMultiplier !== undefined
        ? explicitMultiplier
        : Math.max(combo, cascadeMultiplierRef.current || 1);

    setCenterComboText({ combo, multiplier: currentMultiplier, id: Date.now() });

    requestAnimationFrame(() => {
      if (centerComboTextRef.current) {
        const el = centerComboTextRef.current;
        gsap.killTweensOf(el);

        const isMythic = combo >= 5;
        const popScale = isMythic ? 1.35 : combo === 4 ? 1.25 : 1.15;

        gsap
          .timeline({
            onComplete: () => {
              setCenterComboText(null);
            },
          })
          .fromTo(
            el,
            {
              scale: 0.25,
              opacity: 0,
              y: 20,
              rotation: (Math.random() - 0.5) * 8,
            },
            {
              scale: popScale,
              opacity: 1,
              y: 0,
              rotation: 0,
              duration: 0.16,
              ease: 'back.out(2.4)',
            }
          )
          .to(el, {
            scale: 1.0,
            duration: 0.1,
            ease: 'power1.out',
          })
          // Hold visible briefly for high-intensity audiovisual alignment
          .to(el, {
            duration: isMythic ? 0.45 : 0.35,
          })
          // Explosive dissolve outwards & upwards
          .to(el, {
            scale: popScale * 1.2,
            opacity: 0,
            y: -24,
            duration: 0.24,
            ease: 'power2.in',
          });
      }
    });
  }, []);

  // GSAP Camera Shake (tactile screen vibration effect on impact)
  const triggerCameraShake = useCallback(
    (intensity: 'light' | 'medium' | 'heavy' | 'mythic' = 'light') => {
      if (!boardContainerRef.current) return;
      const el = boardContainerRef.current;

      gsap.killTweensOf(el);

      if (intensity === 'mythic') {
        // High-intensity Camera Shake for 5x+ mega combo chains
        // Enhanced amplitude (18px), rotational tilt (up to ±3.2deg), scale compression pop, and 8-stage decay
        gsap
          .timeline({
            onComplete: () => {
              gsap.set(el, { x: 0, y: 0, rotation: 0, scale: 1, clearProps: 'transform' });
            },
          })
          .to(el, { x: -18, y: 14, rotation: -3.2, scale: 1.05, duration: 0.045, ease: 'power2.out' })
          .to(el, { x: 17, y: -12, rotation: 2.8, scale: 0.97, duration: 0.04, ease: 'power1.inOut' })
          .to(el, { x: -14, y: 10, rotation: -2.2, scale: 1.03, duration: 0.038, ease: 'power1.inOut' })
          .to(el, { x: 11, y: -8, rotation: 1.6, scale: 0.99, duration: 0.035, ease: 'power1.inOut' })
          .to(el, { x: -8, y: 6, rotation: -1.0, scale: 1.01, duration: 0.032, ease: 'power1.inOut' })
          .to(el, { x: 5, y: -4, rotation: 0.6, scale: 1.0, duration: 0.03, ease: 'power1.inOut' })
          .to(el, { x: -2, y: 2, rotation: -0.3, scale: 1.0, duration: 0.028, ease: 'power1.inOut' })
          .to(el, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.04, ease: 'power2.out' });

        // Flash dramatic luminous shockwave overlay for 5x+
        if (screenFlashRef.current) {
          gsap.killTweensOf(screenFlashRef.current);
          gsap.fromTo(
            screenFlashRef.current,
            { opacity: 0.8, scale: 0.94 },
            { opacity: 0, scale: 1.08, duration: 0.48, ease: 'power2.out' }
          );
        }
        return;
      }

      const amplitude = intensity === 'heavy' ? 7 : intensity === 'medium' ? 4 : 2;
      const duration = intensity === 'heavy' ? 0.045 : intensity === 'medium' ? 0.035 : 0.03;

      gsap
        .timeline({
          onComplete: () => {
            gsap.set(el, { x: 0, y: 0, clearProps: 'transform' });
          },
        })
        .to(el, { x: -amplitude, y: amplitude * 0.7, duration, ease: 'power1.out' })
        .to(el, { x: amplitude * 0.8, y: -amplitude * 0.6, duration, ease: 'power1.inOut' })
        .to(el, { x: -amplitude * 0.5, y: amplitude * 0.3, duration, ease: 'power1.inOut' })
        .to(el, { x: amplitude * 0.25, y: -amplitude * 0.15, duration, ease: 'power1.inOut' })
        .to(el, { x: 0, y: 0, duration: 0.04, ease: 'power2.out' });
    },
    []
  );

  // Show & upgrade growing Multiplier badge with GSAP pop animation
  const showMultiplierBadge = useCallback(
    (multiplier: number) => {
      cascadeMultiplierRef.current = multiplier;
      setCascadeMultiplier({ multiplier });

      // Tactile camera shake scaling in intensity with each link
      if (multiplier >= 5) {
        triggerCameraShake('mythic');
      } else if (multiplier === 4) {
        triggerCameraShake('heavy');
      } else if (multiplier === 3) {
        triggerCameraShake('medium');
      } else {
        triggerCameraShake('light');
      }

      // Briefly overlap board center with 'COMBO xN' visual text layer (3x+)
      if (multiplier >= 3) {
        triggerCenterComboOverlay(multiplier, multiplier);
      }

      // GSAP punch-in pop animation scaling in size and intensity with each link
      requestAnimationFrame(() => {
        if (multiplierBadgeRef.current) {
          const el = multiplierBadgeRef.current;
          gsap.killTweensOf(el);

          const baseScale =
            multiplier >= 5 ? 1.35 : multiplier === 4 ? 1.25 : multiplier === 3 ? 1.15 : 1.0;
          const popScale = baseScale * 1.35;

          gsap
            .timeline()
            .fromTo(
              el,
              {
                scale: baseScale * 0.35,
                opacity: 0,
                y: -18,
                rotation: (Math.random() - 0.5) * 14,
              },
              {
                scale: popScale,
                opacity: 1,
                y: 0,
                rotation: 0,
                duration: 0.22,
                ease: 'back.out(2.4)',
              }
            )
            .to(el, {
              scale: baseScale,
              duration: 0.14,
              ease: 'power2.out',
            });
        }
      });
    },
    [triggerCameraShake, triggerCenterComboOverlay]
  );

  // Smooth dismiss of the Multiplier badge when cascade finishes
  const hideMultiplierBadge = useCallback(() => {
    if (multiplierBadgeRef.current) {
      const el = multiplierBadgeRef.current;
      gsap.to(el, {
        scale: 1.25,
        opacity: 0,
        y: -15,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          setCascadeMultiplier(null);
          cascadeMultiplierRef.current = 1;
        },
      });
    } else {
      setCascadeMultiplier(null);
      cascadeMultiplierRef.current = 1;
    }
  }, []);

  // Sync high score & gems to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('2048_gems', String(stats.gems));
    } catch {
      // ignore
    }
  }, [stats.gems]);

  useEffect(() => {
    if (stats.score > stats.highScore) {
      setStats((prev) => {
        const updated = { ...prev, highScore: prev.score };
        try {
          localStorage.setItem('2048_highscore', String(updated.highScore));
        } catch {
          // ignore
        }
        return updated;
      });
    }
  }, [stats.score, stats.highScore]);

  // Toggle Mute
  const handleToggleMute = useCallback(() => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
  }, []);

  // Add floating notification
  const addNotification = useCallback(
    (
      text: string,
      subtext?: string,
      type: 'score' | 'corner' | 'inverted_t' | 'square' | 'triple' | 'combo' = 'score'
    ) => {
      const id = `notif-${Date.now()}-${Math.random()}`;
      const x = window.innerWidth > 640 ? 220 : window.innerWidth / 2;
      const y = 240;
      setFloatingNotifications((prev) => [
        ...prev,
        { id, x, y, text, subtext, color: '#facc15', type },
      ]);
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setFloatingNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // In-board Add-In popups directly anchored to tile (row, col)
  const triggerAddIn = useCallback(
    (
      row: number,
      col: number,
      score: number,
      gems?: number,
      combo?: number,
      title?: string,
      isSpecial?: boolean
    ) => {
      const id = `addin-${Date.now()}-${Math.random()}`;
      setAddIns((prev) => [
        ...prev,
        { id, row, col, score, gems, combo, title, isSpecial },
      ]);
      setTimeout(() => {
        setAddIns((prev) => prev.filter((a) => a.id !== id));
      }, 950);
    },
    []
  );

  // Emit canvas particles at exact tile row & col
  const emitParticlesAt = useCallback((row: number, col: number, color: string, count = 22) => {
    if (!boardContainerRef.current || !particleCanvasRef.current) return;
    const rect = boardContainerRef.current.getBoundingClientRect();
    const x = rect.width * ((col + 0.5) / 5);
    const y = rect.height * ((row + 0.5) / 9);
    particleCanvasRef.current.emitMergeParticles(x, y, color, count);
  }, []);

  // Restart game
  const handleRestart = useCallback(() => {
    soundFx.triggerHaptic('tap');
    hideMultiplierBadge();
    const newGrid = generateInitialGrid();
    const newCur = getRandomSpawnValue(8);
    const newNext = getRandomSpawnValue(8);
    setGrid(newGrid);
    setCurrentValue(newCur);
    setNextValue(newNext);
    setUndoStack([]);
    setHammerMode(false);
    setHammerCharges(1);
    setIsProcessing(false);
    setGameOverOpen(false);
    setActiveSpecialCombo(null);
    setFlyingTile(null);
    setBonusRushProgress(0);
    setIsBonusRushActive(false);
    isBonusRushActiveRef.current = false;
    setBonusRushTimeRemaining(0);
    setStats((prev) => ({
      score: 0,
      highScore: prev.highScore,
      gems: prev.gems,
      comboCount: 0,
      highestTile: 8,
      cornerCombos: 0,
      invertedTCombos: 0,
      squareCombos: 0,
      tripleCombos: 0,
      totalMerges: 0,
    }));
  }, [hideMultiplierBadge]);

  // Trigger merge progress towards Bonus Rush
  const registerMergeForBonusRush = useCallback(
    (count = 1) => {
      if (isBonusRushActiveRef.current) return;

      setBonusRushProgress((prev) => {
        const next = prev + count;
        if (next >= BONUS_RUSH_MAX_MERGES) {
          setIsBonusRushActive(true);
          isBonusRushActiveRef.current = true;
          setBonusRushTimeRemaining(10);
          soundFx.playBonusRush();
          soundFx.triggerHaptic('heavy');
          triggerCameraShake('heavy');
          particleCanvasRef.current?.emitMergeParticles(200, 300, '#fbbf24', 40);
          addNotification('BONUS RUSH KÍCH HOẠT!', 'ĐIỂM X2 TRONG 10S! 🔥', 'square');
          return 0;
        }
        return next;
      });
    },
    [addNotification, triggerCameraShake]
  );

  // Countdown timer for 10 seconds of active Bonus Rush mode
  useEffect(() => {
    if (!isBonusRushActive || isPaused) return;

    const timer = setInterval(() => {
      setBonusRushTimeRemaining((prev) => {
        if (prev <= 0.1) {
          setIsBonusRushActive(false);
          isBonusRushActiveRef.current = false;
          soundFx.playTripleMerge();
          addNotification('BONUS RUSH KẾT THÚC!', undefined, 'score');
          return 0;
        }
        return Number((prev - 0.1).toFixed(1));
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isBonusRushActive, isPaused, addNotification]);

  // Swap current with next tile (Cost 20 gems from booster or free via quick button)
  const handleSwapNext = useCallback(() => {
    if (isProcessing) return;
    soundFx.playSettle();
    soundFx.triggerHaptic('double');
    setCurrentValue((prevCur) => {
      setNextValue(prevCur);
      return nextValue;
    });
  }, [isProcessing, nextValue]);

  // Booster: Swap (20 coins)
  const handleUseSwap = useCallback(() => {
    if (isProcessing || isPaused) return;
    if (stats.gems < 20) {
      soundFx.triggerHaptic('heavy');
      addNotification('CẦN 20 VÀNG!', undefined, 'combo');
      return;
    }
    setStats((prev) => ({ ...prev, gems: prev.gems - 20 }));
    soundFx.playSettle();
    handleSwapNext();
    addNotification('ĐÃ ĐỔI Ô!', undefined, 'score');
  }, [isProcessing, isPaused, stats.gems, addNotification, handleSwapNext]);

  // Booster: Hammer (225 coins) - Toggle target selection
  const handleUseHammer = useCallback(() => {
    if (isProcessing || isPaused) return;
    if (hammerMode) {
      setHammerMode(false);
      return;
    }
    if (stats.gems < 225) {
      soundFx.triggerHaptic('heavy');
      addNotification('CẦN 225 VÀNG!', undefined, 'combo');
      return;
    }
    setHammerMode(true);
    addNotification('CHỌN 1 Ô ĐỂ ĐẬP!', undefined, 'score');
  }, [isProcessing, isPaused, hammerMode, stats.gems, addNotification]);

  // Booster: Black Hole / Vortex (200 coins) - Clean row with most tiles
  const handleUseBlackHole = useCallback(() => {
    if (isProcessing || isPaused) return;
    if (stats.gems < 200) {
      soundFx.triggerHaptic('heavy');
      addNotification('CẦN 200 VÀNG!', undefined, 'combo');
      return;
    }

    // Find row with highest tile count (favoring bottom rows)
    let bestRow = 7;
    let maxCount = -1;
    for (let r = 7; r >= 0; r--) {
      let count = 0;
      for (let c = 0; c < 5; c++) {
        if (grid[r][c] !== null) count++;
      }
      if (count > maxCount && count > 0) {
        maxCount = count;
        bestRow = r;
      }
    }

    if (maxCount <= 0) {
      addNotification('BÀN ĐANG TRỐNG!', undefined, 'score');
      return;
    }

    setStats((prev) => ({ ...prev, gems: prev.gems - 200, score: prev.score + maxCount * 50 }));
    soundFx.playSquareMerge();
    soundFx.triggerHaptic('heavy');
    particleCanvasRef.current?.emitSquareExplosion(200, 240, 200, 40, '#a855f7');
    addNotification('LỐC XOÁY ĐÃ HÚT!', undefined, 'square');

    const newGrid = createEmptyGrid();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 5; c++) {
        newGrid[r][c] = r === bestRow ? null : grid[r][c];
      }
    }
    const compacted = compactGridUpwards(newGrid).newGrid;
    setGrid(compacted);
  }, [isProcessing, stats.gems, grid, addNotification]);

  // Direct Tile Click (e.g. for Hammer tool)
  const handleTileClick = useCallback((row: number, col: number) => {
    if (!hammerMode || isProcessing) return;
    const tile = grid[row][col];
    if (!tile) return;

    soundFx.playSquareMerge();
    soundFx.triggerHaptic('heavy');
    particleCanvasRef.current?.emitMergeParticles(200, 240, '#f97316', 30);
    addNotification('ĐÃ ĐẬP KHỐI!', undefined, 'score');

    const newGrid = createEmptyGrid();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 5; c++) {
        newGrid[r][c] = grid[r][c];
      }
    }
    newGrid[row][col] = null;
    const compacted = compactGridUpwards(newGrid).newGrid;
    setGrid(compacted);
    setStats((prev) => ({ ...prev, gems: Math.max(0, prev.gems - 225) }));
    setHammerMode(false);
  }, [hammerMode, isProcessing, grid, addNotification]);

  // Undo last move
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || isProcessing) return;
    const lastState = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setGrid(lastState.grid);
    setCurrentValue(lastState.currentValue);
    setNextValue(lastState.nextValue);
    setStats((prev) => ({ ...prev, score: lastState.score, comboCount: 0 }));
    soundFx.playSettle();
    soundFx.triggerHaptic('light');
  }, [undoStack, isProcessing]);

  // Resolve grid cascading matches (Squares, Triples, Adjacent chain merges)
  const resolveCascadeChain = useCallback(
    async (
      initialGrid: Grid,
      startingCombo: number = 1
    ): Promise<{ finalGrid: Grid; addedScore: number; maxTile: number }> => {
      let currentGrid = initialGrid;
      let totalAddedScore = 0;
      let combo = startingCombo;
      let currentMaxTile = stats.highestTile;

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      let hasMatches = true;
      while (hasMatches) {
        hasMatches = false;

        // 1. Check Combo 2: Chữ T Ngược (Inverted T ⊥ - 4 khối tạo hình chữ T ngược / chữ T)
        const invertedTMatch = findInvertedTMatches(currentGrid);
        if (invertedTMatch) {
          hasMatches = true;
          setActiveSpecialCombo(invertedTMatch);

          // Unique high-intensity sound effects based on combo tiers
          if (combo >= 5) {
            soundFx.playMythicGong5x();
            soundFx.triggerHaptic('mythic');
            triggerCameraShake('mythic');
            triggerCenterComboOverlay(combo);
          } else if (combo === 4) {
            soundFx.playLevelUpChime4x();
            soundFx.triggerHaptic('heavy');
            triggerCameraShake('heavy');
            triggerCenterComboOverlay(combo);
          } else if (combo === 3) {
            soundFx.playBellCombo3x();
            soundFx.triggerHaptic('heavy');
            triggerCameraShake('heavy');
            triggerCenterComboOverlay(combo);
          } else {
            soundFx.playSquareMerge();
            soundFx.triggerHaptic('heavy');
            triggerCameraShake('heavy');
          }

          const targetR = invertedTMatch.target.row;
          const targetC = invertedTMatch.target.col;

          // Emit vibrant magenta-fuchsia particle explosion
          emitParticlesAt(targetR, targetC, '#d946ef', 40);

          const isRush = isBonusRushActiveRef.current;
          const baseBonus = invertedTMatch.scoreBonus * combo;
          const bonus = isRush ? baseBonus * 2 : baseBonus;
          totalAddedScore += bonus;
          currentMaxTile = Math.max(currentMaxTile, invertedTMatch.target.newValue);
          registerMergeForBonusRush(1);

          recordComboHistory({
            type: 'inverted_t',
            title: 'Combo Chữ T Ngược ⊥',
            score: bonus,
            multiplier: combo,
            tileValue: invertedTMatch.target.newValue,
            isRush,
          });

          if (combo >= 2) {
            showMultiplierBadge(combo);
          }

          addNotification(
            `+${bonus.toLocaleString()}`,
            isRush ? `CHỮ T NGƯỢC (2X RUSH! 🔥)` : `COMBO CHỮ T NGƯỢC ⊥!`,
            'inverted_t'
          );
          triggerAddIn(targetR, targetC, bonus, 10, combo, isRush ? 'CHỮ T (2X RUSH!)' : 'CHỮ T NGƯỢC ⊥!');

          setStats((prev) => ({
            ...prev,
            invertedTCombos: prev.invertedTCombos + 1,
            comboCount: combo,
          }));

          setHammerCharges((c) => Math.min(3, c + 1));

          // Snappy beacon flash on the 4 tiles
          await sleep(200);

          const nextGrid = createEmptyGrid();
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 5; c++) {
              nextGrid[r][c] = currentGrid[r][c];
            }
          }

          invertedTMatch.tiles.forEach((t) => {
            nextGrid[t.row][t.col] = null;
          });

          const tDirs: MergeDirection[] = [];
          invertedTMatch.tiles.forEach((t) => {
            if (t.row === targetR && t.col === targetC) return;
            if (t.row > targetR) tDirs.push('down');
            else if (t.row < targetR) tDirs.push('up');
            else if (t.col < targetC) tDirs.push('left');
            else if (t.col > targetC) tDirs.push('right');
          });

          nextGrid[targetR][targetC] = {
            id: `merged-t-${Date.now()}`,
            value: invertedTMatch.target.newValue,
            row: targetR,
            col: targetC,
            isMerging: true,
            mergeDirections: tDirs.length > 0 ? tDirs : ['down', 'left', 'right'],
          };

          const compacted = compactGridUpwards(nextGrid).newGrid;
          currentGrid = compacted;
          setGrid(compacted);
          setActiveSpecialCombo(null);

          combo++;
          // Snappy merge pop
          await sleep(180);
          continue;
        }

        // 2. Check Combo 1: Vuông Góc 90° (Right-Angle Corner L-Shape - 3 khối tạo góc vuông)
        const cornerMatch = findCornerMatches(currentGrid);
        if (cornerMatch) {
          hasMatches = true;
          setActiveSpecialCombo(cornerMatch);

          // Unique high-intensity sound effects based on combo tiers
          if (combo >= 5) {
            soundFx.playMythicGong5x();
            soundFx.triggerHaptic('mythic');
            triggerCameraShake('mythic');
            triggerCenterComboOverlay(combo);
          } else if (combo === 4) {
            soundFx.playLevelUpChime4x();
            soundFx.triggerHaptic('heavy');
            triggerCameraShake('heavy');
            triggerCenterComboOverlay(combo);
          } else if (combo === 3) {
            soundFx.playBellCombo3x();
            soundFx.triggerHaptic('heavy');
            triggerCameraShake('heavy');
            triggerCenterComboOverlay(combo);
          } else {
            soundFx.playTripleMerge();
            soundFx.triggerHaptic('medium');
            triggerCameraShake('heavy');
          }

          const targetR = cornerMatch.target.row;
          const targetC = cornerMatch.target.col;

          // Emit gold-amber particle beam at corner
          emitParticlesAt(targetR, targetC, '#f59e0b', 34);

          const isRush = isBonusRushActiveRef.current;
          const baseBonus = cornerMatch.scoreBonus * combo;
          const bonus = isRush ? baseBonus * 2 : baseBonus;
          totalAddedScore += bonus;
          currentMaxTile = Math.max(currentMaxTile, cornerMatch.target.newValue);
          registerMergeForBonusRush(1);

          recordComboHistory({
            type: 'corner',
            title: 'Combo Vuông Góc 90°',
            score: bonus,
            multiplier: combo,
            tileValue: cornerMatch.target.newValue,
            isRush,
          });

          if (combo >= 2) {
            showMultiplierBadge(combo);
          }

          addNotification(
            `+${bonus.toLocaleString()}`,
            isRush ? `VUÔNG GÓC 90° (2X RUSH! 🔥)` : `COMBO VUÔNG GÓC 90°!`,
            'corner'
          );
          triggerAddIn(targetR, targetC, bonus, 6, combo, isRush ? 'VUÔNG GÓC (2X RUSH!)' : 'VUÔNG GÓC 90°!');

          setStats((prev) => ({
            ...prev,
            cornerCombos: prev.cornerCombos + 1,
            comboCount: combo,
          }));

          // Snappy beacon flash on corner tiles
          await sleep(200);

          const nextGrid = createEmptyGrid();
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 5; c++) {
              nextGrid[r][c] = currentGrid[r][c];
            }
          }

          cornerMatch.tiles.forEach((t) => {
            nextGrid[t.row][t.col] = null;
          });

          const cDirs: MergeDirection[] = [];
          cornerMatch.tiles.forEach((t) => {
            if (t.row === targetR && t.col === targetC) return;
            if (t.row > targetR) cDirs.push('down');
            else if (t.row < targetR) cDirs.push('up');
            else if (t.col < targetC) cDirs.push('left');
            else if (t.col > targetC) cDirs.push('right');
          });

          nextGrid[targetR][targetC] = {
            id: `merged-cr-${Date.now()}`,
            value: cornerMatch.target.newValue,
            row: targetR,
            col: targetC,
            isMerging: true,
            mergeDirections: cDirs.length > 0 ? cDirs : ['down'],
          };

          const compacted = compactGridUpwards(nextGrid).newGrid;
          currentGrid = compacted;
          setGrid(compacted);
          setActiveSpecialCombo(null);

          combo++;
          // Snappy merge pop
          await sleep(180);
          continue;
        }

        // 3. Check for standard adjacent merges across the board with sliding absorption
        let foundAdjacent = false;
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 5; c++) {
            const tile = currentGrid[r][c];
            if (!tile) continue;

            const neighbors = findAdjacentMatches(currentGrid, r, c);
            if (neighbors.length > 0) {
              foundAdjacent = true;
              hasMatches = true;

              const neighbor = neighbors[0];
              const newValue = tile.value * 2;
              const isRush = isBonusRushActiveRef.current;
              const basePoints = newValue * combo;
              const points = isRush ? basePoints * 2 : basePoints;
              totalAddedScore += points;
              currentMaxTile = Math.max(currentMaxTile, newValue);
              registerMergeForBonusRush(1);

              // 1. Neighbor domino visibly slides into target tile
              setAbsorbingTile({
                id: `abs-${Date.now()}`,
                fromRow: neighbor.row,
                fromCol: neighbor.col,
                toRow: r,
                toCol: c,
                value: tile.value,
              });

              // Temporarily remove neighbor from the static grid so it slides smoothly
              const tempGrid = createEmptyGrid();
              for (let gr = 0; gr < 8; gr++) {
                for (let gc = 0; gc < 5; gc++) {
                  tempGrid[gr][gc] = currentGrid[gr][gc];
                }
              }
              tempGrid[neighbor.row][neighbor.col] = null;
              setGrid(tempGrid);

              // Quick slide duration
              await sleep(130);
              setAbsorbingTile(null);

              // 2. Chomp & Pop at target tile with eating sound & tactile haptic
              soundFx.playMerge(newValue, combo);

              // Unique high-intensity sound effects for combo tiers
              if (combo >= 5) {
                soundFx.playMythicGong5x();
                soundFx.triggerHaptic('mythic');
                triggerCameraShake('mythic');
                triggerCenterComboOverlay(combo);
              } else if (combo === 4) {
                soundFx.playLevelUpChime4x();
                soundFx.triggerHaptic('heavy');
                triggerCameraShake('heavy');
                triggerCenterComboOverlay(combo);
              } else if (combo === 3) {
                soundFx.playBellCombo3x();
                soundFx.triggerHaptic('medium');
                triggerCameraShake('medium');
                triggerCenterComboOverlay(combo);
              } else {
                soundFx.triggerHaptic('medium');
                triggerCameraShake('medium');
              }

              emitParticlesAt(r, c, isRush ? '#fbbf24' : '#a855f7', 24);
              triggerAddIn(r, c, points, 2, combo > 1 ? combo : undefined, isRush ? '2X RUSH!' : undefined);

              if (combo >= 2) {
                showMultiplierBadge(combo);
              }

              if (combo > 1) {
                addNotification(`+${points}`, isRush ? `COMBO ×${combo} (2X RUSH! 🔥)` : `COMBO ×${combo}!`, 'combo');
              } else {
                addNotification(`+${points}`, isRush ? '2X RUSH! 🔥' : undefined, 'score');
              }

              if (combo >= 2 || points >= 128) {
                recordComboHistory({
                  type: 'cascade',
                  title: combo > 1 ? `Cascade Chuỗi ×${combo}` : 'Chuỗi Domino Cascade',
                  score: points,
                  multiplier: combo,
                  tileValue: newValue,
                  isRush,
                });
              }

              // Direction of incoming neighbor relative to (r, c)
              let dir: MergeDirection = 'down';
              if (neighbor.row > r) dir = 'down';
              else if (neighbor.row < r) dir = 'up';
              else if (neighbor.col < c) dir = 'left';
              else if (neighbor.col > c) dir = 'right';

              // Upgrade target with isMerging: true for merge pop
              tempGrid[r][c] = {
                id: `cascade-${Date.now()}-${r}-${c}`,
                value: newValue,
                row: r,
                col: c,
                isMerging: true,
                mergeDirections: [dir],
              };

              const compacted = compactGridUpwards(tempGrid).newGrid;
              currentGrid = compacted;
              setGrid(compacted);

              combo++;
              // Snappy pop delay
              await sleep(160);
              break;
            }
          }
          if (foundAdjacent) break;
        }
      }

      // Reset any active isMerging flags before returning
      const cleanGrid = currentGrid.map((row) =>
        row.map((cell) => (cell ? { ...cell, isMerging: false } : null))
      );
      setGrid(cleanGrid);

      return { finalGrid: cleanGrid, addedScore: totalAddedScore, maxTile: currentMaxTile };
    },
    [
      stats.highestTile,
      addNotification,
      triggerAddIn,
      emitParticlesAt,
      triggerCameraShake,
      showMultiplierBadge,
      triggerCenterComboOverlay,
    ]
  );

  // Main Action: Touch & Push Tile along column
  const handleLaunchColumn = useCallback(
    async (col: number) => {
      if (isProcessing || isPaused) return;

      // Handle Hammer tool if active
      if (hammerMode) {
        let targetRow = -1;
        for (let r = 7; r >= 0; r--) {
          if (grid[r][col] !== null) {
            targetRow = r;
            break;
          }
        }

        if (targetRow !== -1) {
          soundFx.playSquareMerge();
          soundFx.triggerHaptic('heavy');
          emitParticlesAt(targetRow, col, '#f97316', 32);
          triggerAddIn(targetRow, col, 0, undefined, undefined, 'ĐÃ ĐẬP KHỐI!');
          addNotification('ĐÃ ĐẬP KHỐI!', undefined, 'score');

          const newGrid = createEmptyGrid();
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 5; c++) {
              newGrid[r][c] = grid[r][c];
            }
          }
          newGrid[targetRow][col] = null;
          const compacted = compactGridUpwards(newGrid).newGrid;
          setGrid(compacted);
          setHammerCharges((c) => Math.max(0, c - 1));
          setHammerMode(false);
        }
        return;
      }

      const preview = previewShoot(grid, col, currentValue);
      if (!preview.valid) {
        soundFx.triggerHaptic('medium');
        addNotification('CỘT ĐÃ ĐẦY!', undefined, 'combo');
        return;
      }

      // Check if this column already has blocks before launching
      const isExistingCol = grid.some((r) => r[col] !== null);

      // Save Undo State
      setUndoStack((prev) => [
        ...prev.slice(-9),
        {
          grid: grid.map((r) => [...r]),
          score: stats.score,
          currentValue,
          nextValue,
        },
      ]);

      setIsProcessing(true);
      soundFx.playShoot();
      soundFx.triggerHaptic('light');

      const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      // 1. Tile launches and shoots straight upward towards targetRow (snappy, smooth)
      const distance = 8 - preview.targetRow;
      const flyDuration = Math.min(220, Math.max(140, distance * 18));

      setFlyingTile({
        col,
        fromRow: 8,
        targetRow: preview.targetRow,
        value: currentValue,
        isMerge: preview.isMerge,
      });

      await sleep(flyDuration);

      let stepScore = 0;
      let highestReached = stats.highestTile;
      let newGrid = createEmptyGrid();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 5; c++) {
          newGrid[r][c] = grid[r][c];
        }
      }

      if (preview.isMerge && preview.mergedValue) {
        // Remove flying tile immediately - no absorption pause or loading delay!
        setFlyingTile(null);

        const isRush = isBonusRushActiveRef.current;
        const baseVal = preview.mergedValue;
        const mergedVal = isRush ? baseVal * 2 : baseVal;
        stepScore += mergedVal;
        highestReached = Math.max(highestReached, baseVal);
        registerMergeForBonusRush(1);

        soundFx.playMerge(baseVal, 1);
        soundFx.triggerHaptic('medium');
        triggerCameraShake('medium');
        emitParticlesAt(preview.targetRow, col, isRush ? '#fbbf24' : '#f59e0b', 26);
        triggerAddIn(preview.targetRow, col, mergedVal, 2, undefined, isRush ? '2X RUSH!' : undefined);
        addNotification(`+${mergedVal}`, isRush ? '2X RUSH! 🔥' : undefined, 'score');

        // Target tile undergoes instant crisp merge pop
        newGrid[preview.targetRow][col] = {
          id: `tile-${Date.now()}-${preview.targetRow}-${col}`,
          value: mergedVal,
          row: preview.targetRow,
          col,
          isMerging: true,
          mergeDirections: ['down'],
        };
        setGrid([...newGrid]);

        // Snappy pop delay (160ms) - completely eliminating the old 220ms + 550ms freeze
        await sleep(160);
      } else {
        // Settle into empty slot
        setFlyingTile(null);
        soundFx.playSettle();
        if (isExistingCol) {
          triggerCameraShake('light');
        }
        newGrid[preview.targetRow][col] = {
          id: `tile-${Date.now()}-${preview.targetRow}-${col}`,
          value: currentValue,
          row: preview.targetRow,
          col,
        };
        setGrid([...newGrid]);
        await sleep(80);
      }

      // Compact column
      newGrid = compactGridUpwards(newGrid).newGrid;
      setGrid(newGrid);

      // Brief pause before cascading chain begins
      await sleep(60);

      // Run Cascade Chain check (Chữ T Ngược ⊥, Vuông Góc 90°, Adjacent dominoes)
      const cascadeResult = await resolveCascadeChain(newGrid, preview.isMerge ? 2 : 1);
      newGrid = cascadeResult.finalGrid;
      stepScore += cascadeResult.addedScore;
      highestReached = Math.max(highestReached, cascadeResult.maxTile);

      // If a multiplier badge was active during chain merges, hold it for a moment then smoothly fade out
      if (cascadeMultiplierRef.current >= 2) {
        await sleep(550);
        hideMultiplierBadge();
      }

      // Clear any remaining isMerging states
      const settledGrid = newGrid.map((row) =>
        row.map((cell) => (cell ? { ...cell, isMerging: false } : null))
      );
      setGrid(settledGrid);

      // Update stats and reward gems
      const addedGems = (preview.isMerge ? 2 : 0) + (cascadeResult.addedScore > 0 ? 3 : 0);
      setStats((prev) => ({
        ...prev,
        score: prev.score + stepScore,
        gems: prev.gems + addedGems,
        highestTile: highestReached,
        totalMerges: prev.totalMerges + (stepScore > 0 ? 1 : 0),
        comboCount: 0,
      }));

      // Advance incoming values
      const nextSpawn = getRandomSpawnValue(highestReached);
      setCurrentValue(nextValue);
      setNextValue(nextSpawn);

      // Check for Game Over condition
      if (isGameOver(settledGrid, nextValue)) {
        soundFx.playGameOver();
        soundFx.triggerHaptic('heavy');
        setGameOverOpen(true);
      }

      setIsProcessing(false);
    },
    [
      isProcessing,
      isPaused,
      hammerMode,
      grid,
      currentValue,
      nextValue,
      stats.score,
      stats.highestTile,
      addNotification,
      triggerAddIn,
      emitParticlesAt,
      resolveCascadeChain,
      triggerCameraShake,
      hideMultiplierBadge,
    ]
  );

  return (
    <main className="relative min-h-screen w-full bg-[#0d1017] text-slate-100 flex flex-col justify-between items-center py-1 px-2 overflow-y-auto">
      {/* Background ambient lighting effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header matching exact 2048 Shooter Top Bar & Sub-bar */}
      <Header
        stats={stats}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onOpenPause={() => setIsPaused(true)}
        onOpenMilestone={() => setMilestoneOpen(true)}
        onRestart={handleRestart}
        onUseBlackHole={handleUseBlackHole}
        onUseHammer={handleUseHammer}
        onUseSwap={handleUseSwap}
        hammerMode={hammerMode}
        cascadeMultiplier={cascadeMultiplier ? cascadeMultiplier.multiplier : 1}
      />

      {/* Main Game Stage Container with Continuous Bonus Rush Rumble */}
      <div
        className={`relative w-full flex-1 flex items-center justify-center my-1 max-w-[420px] transition-transform duration-200 ${
          isBonusRushActive ? 'animate-bonus-rush-rumble' : ''
        }`}
      >
        {/* Bonus Rush Ambient Energy Glow Border & Pulse */}
        {isBonusRushActive && (
          <div className="absolute -inset-1 rounded-3xl border-2 border-amber-400/50 pointer-events-none z-20 animate-bonus-rush-aura" />
        )}

        {/* Mythic 5x+ Combo Screen Flash Shockwave */}
        <div
          ref={screenFlashRef}
          className="absolute -inset-12 rounded-3xl pointer-events-none z-40 opacity-0 bg-[radial-gradient(ellipse_at_center,_rgba(251,191,36,0.45)_0%,_rgba(236,72,153,0.3)_40%,_transparent_75%)]"
        />

        <div ref={boardContainerRef} className="relative w-full flex items-center justify-center">
          {/* Visual FX & Particle Overlay */}
          <ParticleCanvas
            ref={particleCanvasRef}
            notifications={floatingNotifications}
            onRemoveNotification={removeNotification}
          />

          {/* The 5x8 Grid Board + Bottom Launcher Row */}
          <GameBoard
            grid={grid}
            hoverCol={hoverCol}
            incomingValue={currentValue}
            activeSpecialCombo={activeSpecialCombo}
            flyingTile={flyingTile}
            absorbingTile={absorbingTile}
            addIns={addIns}
            hammerMode={hammerMode}
            onTileClick={handleTileClick}
            onColumnTouch={handleLaunchColumn}
            onColumnHover={setHoverCol}
            bonusRushProgress={bonusRushProgress}
            bonusRushMax={BONUS_RUSH_MAX_MERGES}
            isBonusRushActive={isBonusRushActive}
            bonusRushTimeRemaining={bonusRushTimeRemaining}
          />

          {/* Growing Cascade Multiplier Badge (x2, x3, x4...) */}
          {cascadeMultiplier && (() => {
            const config = getMultiplierConfig(cascadeMultiplier.multiplier);
            return (
              <div
                ref={multiplierBadgeRef}
                className={`absolute top-10 sm:top-14 inset-x-0 mx-auto z-50 pointer-events-none flex flex-col items-center justify-center ${config.scaleClass}`}
                style={{ transformOrigin: 'center center' }}
              >
                <div
                  className={`relative px-4 sm:px-6 py-2 sm:py-2.5 rounded-2xl border ${config.borderColor} ${config.badgeBg} backdrop-blur-md flex flex-col items-center ${config.ringClass}`}
                  style={{
                    boxShadow: config.glowColor,
                  }}
                >
                  {/* Top Banner Tag */}
                  <div
                    className={`px-2.5 py-0.5 rounded-full bg-gradient-to-r ${config.bgGradient} text-[10px] sm:text-xs font-black tracking-wider text-white uppercase shadow-md flex items-center gap-1 -mt-4 mb-0.5 border border-white/50`}
                  >
                    {config.iconType === 'flame' && <Flame className="w-3.5 h-3.5 fill-current animate-bounce" />}
                    {config.iconType === 'zap' && <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />}
                    {config.iconType === 'sparkles' && <Sparkles className="w-3.5 h-3.5 fill-current animate-spin" />}
                    <span>{config.title}</span>
                    {config.iconCount > 1 && config.iconType === 'flame' && <Flame className="w-3.5 h-3.5 fill-current animate-bounce" />}
                    {config.iconCount > 1 && config.iconType === 'zap' && <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />}
                    {config.iconCount > 1 && config.iconType === 'sparkles' && <Sparkles className="w-3.5 h-3.5 fill-current animate-spin" />}
                  </div>

                  {/* Main Multiplier Number */}
                  <div className="flex items-baseline justify-center">
                    <span
                      className={`text-4xl sm:text-5xl font-black tracking-tighter bg-gradient-to-b ${config.bgGradient} bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]`}
                      style={{
                        WebkitTextStroke: '1.5px rgba(255,255,255,0.85)',
                      }}
                    >
                      ×{cascadeMultiplier.multiplier}
                    </span>
                  </div>

                  {/* Subtitle */}
                  <div className="text-[10px] sm:text-xs font-extrabold tracking-wide text-white/95 drop-shadow">
                    {config.subtitle}
                  </div>

                  {/* Ambient background glow */}
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${config.bgGradient} opacity-30 -z-10 blur-md`}
                  />
                </div>
              </div>
            );
          })()}

          {/* Visual Text Layer 'COMBO xN' briefly overlapping the board at the center (3x+) */}
          {centerComboText && (() => {
            const config = getCenterComboConfig(
              centerComboText.combo,
              centerComboText.multiplier ?? cascadeMultiplierRef.current ?? 3
            );
            return (
              <div
                ref={centerComboTextRef}
                className="absolute inset-0 m-auto flex flex-col items-center justify-center pointer-events-none z-50 select-none pb-8 sm:pb-12"
                style={{ transformOrigin: 'center center' }}
              >
                {/* Background Shockwave Ring with scaled dynamic intensity */}
                <div
                  className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full border animate-combo-shockwave"
                  style={{
                    borderColor:
                      config.effectiveMultiplier >= 5
                        ? '#fde047'
                        : config.effectiveMultiplier === 4
                        ? '#fb923c'
                        : '#38bdf8',
                    borderWidth: config.isHighMultiplier ? '3.5px' : '2px',
                  }}
                />

                {/* Primary Rotating Background Glow Rays - dynamic rotation speed & gradient intensity */}
                <div
                  className={`absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full bg-gradient-to-r ${config.glowRays} blur-xl animate-combo-rays transition-all duration-300`}
                  style={{
                    animationDuration: `${config.rotationSpeed}s`,
                    opacity: config.rayOpacity,
                    transform: `scale(${config.rayScale})`,
                    filter: config.rayFilter,
                  }}
                />

                {/* Secondary Counter-Rotating Glow Rays for multiplier > 3 (creates an intense dynamic vortex) */}
                {config.isHighMultiplier && (
                  <div
                    className={`absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-gradient-to-tr ${config.secondaryGlowRays} blur-2xl animate-combo-rays-reverse transition-all duration-300 pointer-events-none`}
                    style={{
                      animationDuration: `${config.counterRotationSpeed}s`,
                      opacity: config.secondaryRayOpacity,
                      filter: config.rayFilter,
                    }}
                  />
                )}

                {/* Main Center Floating Card / Banner with Dynamic Gradient Backdrop */}
                <div
                  className={`relative px-5 sm:px-7 py-3 sm:py-3.5 rounded-3xl border-2 ${config.border} backdrop-blur-xl flex flex-col items-center justify-center ${config.ringColor} transition-all duration-300`}
                  style={{
                    background: config.cardBackdropGradient,
                    boxShadow: config.shadow,
                  }}
                >
                  {/* Top Floating Tag */}
                  <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/60 border border-white/30 text-[10px] sm:text-xs font-black tracking-widest uppercase text-white -mt-6 sm:-mt-7 mb-1 shadow-lg">
                    {config.icon === 'sparkles' && <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />}
                    {config.icon === 'flame' && <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />}
                    {config.icon === 'zap' && <Zap className="w-3.5 h-3.5 text-cyan-300 fill-cyan-300 animate-pulse" />}
                    <span>{config.title}</span>
                    {config.icon === 'sparkles' && <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin" />}
                    {config.icon === 'flame' && <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-bounce" />}
                    {config.icon === 'zap' && <Zap className="w-3.5 h-3.5 text-cyan-300 fill-cyan-300 animate-pulse" />}
                  </div>

                  {/* Big Impact 'COMBO xN' Text */}
                  <div className="flex items-center justify-center">
                    <span
                      className={`text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter bg-gradient-to-b ${config.gradient} bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]`}
                      style={{
                        WebkitTextStroke: '2px rgba(255,255,255,0.95)',
                      }}
                    >
                      {config.text}
                    </span>
                  </div>

                  {/* Subtitle / Cheer with Dynamic Multiplier Indicator */}
                  <div className="text-[10px] sm:text-xs font-extrabold tracking-widest text-white/90 uppercase drop-shadow mt-0.5">
                    {config.effectiveMultiplier >= 5
                      ? '🔥 UNSTOPPABLE FRENZY! 🔥'
                      : config.effectiveMultiplier === 4
                      ? '⚡ MEGA COMBO CHAIN! ⚡'
                      : '✨ TRIPLE HARMONY! ✨'}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Bottom Auxiliary Controls (Next tile & Quick swap, Undo button removed as requested) */}
      <ShooterControls
        currentValue={currentValue}
        nextValue={nextValue}
        onSwapNext={handleSwapNext}
      />

      {/* Modals */}
      <PauseModal
        isOpen={isPaused}
        stats={stats}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onResume={() => setIsPaused(false)}
        onRestart={() => {
          setIsPaused(false);
          handleRestart();
        }}
        onOpenTutorial={() => {
          setIsPaused(false);
          setTutorialOpen(true);
        }}
        onOpenMilestone={() => {
          setIsPaused(false);
          setMilestoneOpen(true);
        }}
      />
      <MilestoneModal
        isOpen={milestoneOpen}
        highestTile={stats.highestTile}
        score={stats.score}
        coins={stats.gems}
        matchHistory={matchHistory}
        onClose={() => setMilestoneOpen(false)}
      />
      <TutorialModal isOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />
      <GameOverModal isOpen={gameOverOpen} stats={stats} onRestart={handleRestart} />
    </main>
  );
}
