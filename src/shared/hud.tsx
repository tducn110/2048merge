/**
 * shared/hud.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Reusable React HUD primitives shared by ALL games in the suite.
 *
 * Components exported:
 *  - <GameModal>        – dark-backdrop modal container
 *  - <HUDBar>           – translucent pill bar (top / bottom)
 *  - <IconBtn>          – square icon button (stone theme)
 *  - <ComboBadge>       – animated "🔥 COMBO x3!" badge
 *  - <ProgressBar>      – vertical or horizontal fill bar
 *  - <CoinChip>         – amber coin count pill
 *  - <PowerUpBtn>       – power-up button with badge count
 *  - <ScoreDisplay>     – score + target line
 *  - <CloseBtn>         – ✕ dismiss button
 *  - <CTAButton>        – primary amber CTA
 *  - <DangerButton>     – rose "retry" CTA
 *
 * Styles exclusively use Tailwind utility classes pulled from COLORS/CLS tokens
 * so every game automatically inherits any future style changes.
 */
import React from 'react';
import { CLS, Z } from './tokens';

// ─── GameModal ────────────────────────────────────────────────────────────────

interface GameModalProps {
  children: React.ReactNode;
  /** Extra Tailwind classes for the outer backdrop */
  backdropClassName?: string;
  /** Extra Tailwind classes for the inner card */
  cardClassName?: string;
}

export const GameModal: React.FC<GameModalProps> = ({
  children,
  backdropClassName = '',
  cardClassName = '',
}) => (
  <div
    className={`absolute inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm ${backdropClassName}`}
    style={{ zIndex: Z.modal }}
  >
    <div className={`${CLS.modalCard} ${cardClassName}`}>{children}</div>
  </div>
);

// ─── ModalHeader ─────────────────────────────────────────────────────────────

interface ModalHeaderProps {
  title: React.ReactNode;
  onClose: () => void;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose }) => (
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">{title}</h2>
    <CloseBtn onClick={onClose} />
  </div>
);

// ─── CloseBtn ─────────────────────────────────────────────────────────────────

export const CloseBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="text-stone-400 hover:text-white text-sm font-bold px-2 py-1 cursor-pointer transition-colors"
    aria-label="Close"
  >
    ✕
  </button>
);

// ─── HUDBar ──────────────────────────────────────────────────────────────────

interface HUDBarProps {
  children: React.ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'none';
}

export const HUDBar: React.FC<HUDBarProps> = ({
  children,
  className = '',
  position = 'none',
}) => {
  const posClass =
    position === 'top'
      ? 'absolute top-0 left-0 right-0 p-3 z-20'
      : position === 'bottom'
      ? 'absolute bottom-0 left-0 right-0 p-3 z-20'
      : '';

  return (
    <div className={`${posClass} flex justify-between items-start pointer-events-none ${className}`}>
      {children}
    </div>
  );
};

// ─── IconBtn ─────────────────────────────────────────────────────────────────

interface IconBtnProps {
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

export const IconBtn: React.FC<IconBtnProps> = ({
  onClick,
  title,
  children,
  active = false,
  className = '',
}) => (
  <button
    onClick={onClick}
    title={title}
    className={`${CLS.iconBtn} flex items-center justify-center pointer-events-auto ${
      active ? 'border-amber-400 bg-amber-500/20 text-amber-300' : 'text-stone-300 hover:text-white'
    } ${className}`}
  >
    {children}
  </button>
);

// ─── ComboBadge ──────────────────────────────────────────────────────────────

interface ComboBadgeProps {
  combo: number;
  /** Minimum combo count to show the badge (default 2) */
  threshold?: number;
}

export const ComboBadge: React.FC<ComboBadgeProps> = ({ combo, threshold = 2 }) => {
  if (combo < threshold) return null;
  return (
    <div className={CLS.comboBadge}>
      🔥 COMBO x{combo}!
    </div>
  );
};

// ─── ProgressBar ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  /** 0 to 1 */
  value: number;
  direction?: 'horizontal' | 'vertical';
  color?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  direction = 'horizontal',
  color = 'bg-emerald-500',
  className = '',
}) => {
  const pct = `${Math.min(100, Math.max(0, value * 100))}%`;

  if (direction === 'vertical') {
    return (
      <div
        className={`relative w-5 rounded-lg bg-stone-950 p-[2px] border border-stone-700 shadow-lg overflow-hidden flex flex-col justify-end ${className}`}
      >
        <div
          className={`w-full rounded-sm ${color} transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.7)]`}
          style={{ height: pct }}
        />
      </div>
    );
  }

  return (
    <div className={`${CLS.progressTrack} ${className}`}>
      <div
        className={`${CLS.progressFill} ${color}`}
        style={{ width: pct }}
      />
    </div>
  );
};

// ─── CoinChip ────────────────────────────────────────────────────────────────

interface CoinChipProps {
  amount: number;
  onClick?: () => void;
}

export const CoinChip: React.FC<CoinChipProps> = ({ amount, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-900/90 hover:bg-stone-800 rounded-full text-xs font-semibold text-amber-300 border border-amber-500/30 active:scale-95 transition-all shadow-inner cursor-pointer pointer-events-auto"
    title="Coins"
  >
    <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-[10px] text-amber-950 font-black">
      $
    </div>
    <span className="font-mono tabular-nums font-bold">{amount}</span>
  </button>
);

// ─── PowerUpBtn ──────────────────────────────────────────────────────────────

interface PowerUpBtnProps {
  onClick: () => void;
  icon: React.ReactNode;
  count: number;
  title?: string;
  active?: boolean;
  /** Tailwind color for the count badge — default emerald-600 */
  badgeColor?: string;
}

export const PowerUpBtn: React.FC<PowerUpBtnProps> = ({
  onClick,
  icon,
  count,
  title,
  active = false,
  badgeColor = 'bg-emerald-600',
}) => (
  <button
    onClick={onClick}
    title={title}
    className={`relative group p-2.5 rounded-2xl transition-all shadow-md border flex items-center justify-center active:scale-95 cursor-pointer ${
      active
        ? 'bg-gradient-to-b from-cyan-900/90 to-cyan-950 border-cyan-400 ring-2 ring-cyan-500/50'
        : 'bg-gradient-to-b from-slate-700/80 to-slate-800/90 hover:from-slate-600 hover:to-slate-700 border-slate-600/40'
    }`}
  >
    <span className="group-hover:scale-110 transition-transform block">{icon}</span>
    <span
      className={`absolute -top-1 -right-1 w-5 h-5 rounded-full ${badgeColor} text-white text-[11px] font-bold flex items-center justify-center border-2 border-slate-900 shadow`}
    >
      {count}
    </span>
  </button>
);

// ─── ScoreDisplay ─────────────────────────────────────────────────────────────

interface ScoreDisplayProps {
  score: number;
  target?: number;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, target }) => (
  <div className="px-4 py-1 bg-stone-900/90 backdrop-blur-sm rounded-full border border-stone-700/80 text-center shadow-md">
    <span className={CLS.scoreText}>{score.toLocaleString()}</span>
    {target !== undefined && (
      <span className="text-stone-400 text-xs font-semibold ml-1.5">
        / {target.toLocaleString()}
      </span>
    )}
  </div>
);

// ─── CTAButton ────────────────────────────────────────────────────────────────

interface CTAButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

export const CTAButton: React.FC<CTAButtonProps> = ({ onClick, children, className = '' }) => (
  <button onClick={onClick} className={`${CLS.ctaBtn} flex items-center justify-center gap-2 ${className}`}>
    {children}
  </button>
);

// ─── DangerButton ─────────────────────────────────────────────────────────────

export const DangerButton: React.FC<CTAButtonProps> = ({ onClick, children, className = '' }) => (
  <button onClick={onClick} className={`${CLS.dangerBtn} flex items-center justify-center gap-2 ${className}`}>
    {children}
  </button>
);
