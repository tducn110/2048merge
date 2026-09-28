/**
 * shared/tokens.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all design tokens used across EVERY game in this
 * suite.  Import this file whenever you need a colour, spacing value, z-index
 * level, animation duration, or shadow token rather than hard-coding raw values.
 *
 * HOW TO USE
 * ----------
 * import { COLORS, SHADOWS, Z, DUR } from '../shared/tokens';
 *
 * In Tailwind class strings the values below map to the corresponding CSS
 * custom-properties that are declared in index.css's @layer base block.
 * For inline `style` props use the raw hex / string directly.
 */

// ─── Colour Palette ──────────────────────────────────────────────────────────

export const COLORS = {
  // Backgrounds
  bgDeep:    '#0a0c14',   // deepest outer shell
  bgDark:    '#12151d',   // game board background
  bgCard:    '#1a1d2a',   // modal / card surface
  bgPanel:   '#1e2130',   // HUD panel / top-bar

  // Stone tones (Tailwind stone-*)
  stone950:  '#0c0a09',
  stone900:  '#1c1917',
  stone800:  '#292524',
  stone700:  '#44403c',
  stone600:  '#57534e',
  stone400:  '#a8a29e',
  stone300:  '#d6d3d1',
  stone200:  '#e7e5e4',

  // Accent – Amber / Gold
  amber400:  '#fbbf24',
  amber500:  '#f59e0b',
  amber300:  '#fcd34d',
  gold:      '#facc15',

  // Accent – Emerald / Success
  emerald400: '#34d399',
  emerald500: '#10b981',

  // Accent – Rose / Danger
  rose500:   '#f43f5e',
  rose600:   '#e11d48',

  // Accent – Cyan / Info
  cyan400:   '#22d3ee',

  // White / overlays
  white:     '#ffffff',
  overlay60: 'rgba(0,0,0,0.60)',
  overlay80: 'rgba(0,0,0,0.80)',
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const SHADOWS = {
  card:   '0 8px 32px rgba(0,0,0,0.55)',
  modal:  '0 16px 56px rgba(0,0,0,0.80)',
  glow:   (color: string, strength = 1) =>
    `0 0 ${14 * strength}px ${color}, 0 0 ${28 * strength}px ${color}40`,
  amber:  '0 0 14px rgba(251,191,36,0.55)',
  rose:   '0 0 14px rgba(244,63,94,0.55)',
} as const;

// ─── Z-Index Ladder ───────────────────────────────────────────────────────────

export const Z = {
  canvas:    0,   // PixiJS / canvas sits at z=0
  board:     10,  // game board DOM layer
  hud:       20,  // always-visible HUD bars
  overlay:   30,  // particle / effect overlays
  modal:     50,  // modals (settings, victory, game-over …)
  toast:     60,  // transient toasts / combo badges
} as const;

// ─── Animation Durations (ms) ─────────────────────────────────────────────────

export const DUR = {
  instant:  80,
  fast:     150,
  normal:   250,
  slow:     400,
  xslow:    600,
} as const;

// ─── Border Radii ─────────────────────────────────────────────────────────────

export const RADII = {
  sm:   '8px',
  md:   '12px',
  lg:   '16px',
  xl:   '20px',
  '2xl':'24px',
  full: '9999px',
} as const;

// ─── Spacing tokens (multiples of 4 px) ──────────────────────────────────────

export const SPACE = {
  1:  '4px',
  2:  '8px',
  3:  '12px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  8:  '32px',
  10: '40px',
} as const;

// ─── Tailwind class-name snippets reused in HUD components ───────────────────
// Import these into any component rather than duplicating the long strings.

export const CLS = {
  // Full-screen dark backdrop for modals
  modalBackdrop:
    'absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4',

  // Modal container card
  modalCard:
    'w-full max-w-xs bg-gradient-to-b from-stone-900 to-stone-950 text-white rounded-2xl p-5 border border-stone-700 shadow-2xl',

  // HUD top/bottom bar pill
  hudBar:
    'flex items-center gap-1.5 px-3 py-1.5 bg-stone-900/90 backdrop-blur-sm rounded-full border border-stone-700/80 shadow-md',

  // Standard icon button (square)
  iconBtn:
    'p-1.5 rounded-xl bg-stone-900/90 hover:bg-stone-800 border border-stone-700 transition-transform active:scale-95 cursor-pointer',

  // Primary CTA button (amber)
  ctaBtn:
    'w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-black tracking-wide shadow-md active:scale-95 transition-all cursor-pointer',

  // Danger / retry button (rose)
  dangerBtn:
    'w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-black tracking-wide shadow-md active:scale-95 transition-all cursor-pointer',

  // Progress bar track
  progressTrack:
    'w-full h-2.5 rounded-full bg-stone-950 border border-stone-700 overflow-hidden',

  // Progress bar fill (amber glow)
  progressFill:
    'h-full rounded-full bg-emerald-500 transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.7)]',

  // Badge / pill chip
  chip:
    'px-2 py-0.5 rounded-full text-[10px] font-bold border bg-stone-900/90 text-stone-300 border-stone-700/80',

  // Score display
  scoreText:
    'text-amber-400 font-black text-base tracking-wider',

  // Combo badge (bouncing)
  comboBadge:
    'px-2.5 py-0.5 rounded-full bg-amber-500 text-stone-950 text-[11px] font-black tracking-wide shadow-md animate-bounce border border-amber-300',
} as const;
