import React from 'react';
import { getTileStyle, formatTileValue } from '../utils/theme';
import { MergeDirection } from '../types';

interface TileBlockProps {
  value: number;
  isMerging?: boolean;
  mergeDirections?: MergeDirection[];
  isGhost?: boolean;
  className?: string;
  onClick?: () => void;
}

export const TileBlock: React.FC<TileBlockProps> = ({
  value,
  isMerging = false,
  mergeDirections = ['down'],
  isGhost = false,
  className = '',
  onClick,
}) => {
  const style = getTileStyle(value);
  const formatted = formatTileValue(value);

  // Dynamic font sizing based on string length
  const getFontSize = () => {
    if (formatted.length <= 2) return 'text-xl sm:text-2xl';
    if (formatted.length === 3) return 'text-lg sm:text-xl';
    if (formatted.length === 4) return 'text-sm sm:text-base';
    return 'text-base sm:text-lg';
  };

  if (isGhost) {
    return (
      <div
        className={`w-full h-full rounded-xl flex items-center justify-center border-t border-white/30 border-b-[4px] sm:border-b-[5px] select-none relative transition-all opacity-55 animate-pulse ${
          style.bg
        } ${style.bottomBorder} ${className}`}
        style={{
          boxShadow: `0 0 16px ${style.accent}70`,
        }}
      >
        {/* Faint dashed border overlay to denote placement ghost guide */}
        <div className="absolute inset-0 rounded-xl border border-dashed border-white/50 pointer-events-none" />

        {/* Gloss reflection overlay */}
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-t-xl pointer-events-none" />

        <span
          className={`text-white font-black tracking-tight leading-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.6)] ${getFontSize()}`}
        >
          {formatted}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`w-full h-full rounded-xl flex items-center justify-center border-t border-white/25 border-b-[4px] sm:border-b-[5px] select-none relative transition-transform ${
        style.bg
      } ${style.bottomBorder} ${
        isMerging ? 'animate-merge-pop z-20 ring-2 ring-white/90 shadow-[0_0_20px_rgba(255,255,255,0.85)]' : 'scale-100'
      } ${className}`}
      style={{
        boxShadow: isMerging
          ? `0 0 24px ${style.accent}cc`
          : '0 3px 8px rgba(0,0,0,0.3)',
      }}
    >
      <span
        className={`text-white font-black tracking-tight leading-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.6)] ${getFontSize()}`}
      >
        {formatted}
      </span>
    </div>
  );
};
