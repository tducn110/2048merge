import React, { useRef } from 'react';
import { COLS, ROWS, previewShoot } from '../utils/gameLogic';
import { Grid, SpecialComboEvent, AddInPopup, AbsorbingTileAnim } from '../types';
import { TileBlock } from './TileBlock';
import { ArrowUp, Flame, Zap } from 'lucide-react';
import { formatTileValue, getTileStyle } from '../utils/theme';
import { CoinIcon } from './CoinIcon';
import { soundFx } from '../utils/audio';

interface GameBoardProps {
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
}

export const GameBoard: React.FC<GameBoardProps> = ({
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
}) => {
  // Effective active column: only active when player is actively aiming or hovering over a column
  const activeCol = hoverCol;
  const hoverPreview = activeCol !== null ? previewShoot(grid, activeCol, incomingValue) : null;
  const incomingStyle = getTileStyle(incomingValue);

  const laneContainerRef = useRef<HTMLDivElement | null>(null);
  const isAimingRef = useRef<boolean>(false);
  const activeColRef = useRef<number | null>(activeCol);
  activeColRef.current = activeCol;

  // Accurately map pointer clientX to column 0..4 across the full board width
  const getColFromX = (clientX: number): number => {
    if (!laneContainerRef.current) return activeColRef.current ?? 2;
    const rect = laneContainerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const colWidth = rect.width / COLS;
    const col = Math.floor(relX / colWidth);
    return Math.max(0, Math.min(COLS - 1, col));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (hammerMode) return;
    const col = getColFromX(e.clientX);
    isAimingRef.current = true;
    onColumnHover(col);
    soundFx.triggerHaptic('tap');
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (hammerMode) return;
    const col = getColFromX(e.clientX);
    // Realtime aim tracking across 2 sides (col 0, 1) and middle (col 2) and right (col 3, 4)
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
      // Clear active aim after launching so no column is left randomly glowing or holding a tile
      onColumnHover(null);
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerCancel = () => {
    isAimingRef.current = false;
    onColumnHover(null);
  };

  return (
    <div
      className={`relative w-full max-w-[420px] mx-auto p-1.5 sm:p-2 bg-[#12151d] rounded-2xl border transition-all duration-300 flex flex-col select-none touch-none overflow-hidden ${
        isBonusRushActive
          ? 'border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_30px_rgba(251,191,36,0.35)]'
          : 'border-slate-800/90 shadow-2xl'
      }`}
    >
      {/* 5 Vertical Column Lanes Container with Full Width Pointer Drag & Tap Aiming */}
      <div
        ref={laneContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={() => {
          if (!isAimingRef.current) {
            onColumnHover(null);
          }
        }}
        className="w-full flex gap-1 sm:gap-1.5 relative cursor-pointer"
      >
        {Array.from({ length: COLS }).map((_, c) => {
          const isSelectedCol = activeCol === c;
          const isTargetInThisCol = isSelectedCol && hoverPreview && hoverPreview.valid && !flyingTile && !absorbingTile;

          return (
            <div
              key={`column-lane-${c}`}
              id={`column-lane-${c}`}
              className={`relative flex-1 flex flex-col justify-between p-0.5 rounded-xl transition-all duration-150 ${
                isSelectedCol
                  ? 'border shadow-md'
                  : 'bg-[#181b25] border border-slate-800/60 hover:border-slate-700/80'
              }`}
              style={{
                borderColor: isSelectedCol ? `${incomingStyle.accent}70` : undefined,
                backgroundColor: isSelectedCol ? `${incomingStyle.accent}12` : undefined,
                boxShadow: isSelectedCol ? `0 0 16px ${incomingStyle.accent}25` : undefined,
              }}
            >
              {/* Vertical Guide Track Beam when hovered - strictly inside this column */}
              {isSelectedCol && (
                <div
                  className="absolute inset-0 pointer-events-none rounded-xl"
                  style={{
                    background: `linear-gradient(to top, ${incomingStyle.accent}20, ${incomingStyle.accent}05, transparent)`,
                  }}
                />
              )}

              {/* 8 slots inside this vertical column (row 0 at top down to row 7) */}
              <div className="w-full flex flex-col gap-1 sm:gap-1.5 relative z-10 aspect-[1/8]">
                {Array.from({ length: ROWS }).map((__, r) => {
                  const tile = grid[r][c];
                  const isGhostTarget = isTargetInThisCol && hoverPreview.targetRow === r;

                  // Check if cell is in active combo
                  const isInvertedTCell =
                    activeSpecialCombo &&
                    activeSpecialCombo.type === 'inverted_t' &&
                    activeSpecialCombo.tiles.some((t) => t.row === r && t.col === c);

                  const isCornerCell =
                    activeSpecialCombo &&
                    activeSpecialCombo.type === 'corner' &&
                    activeSpecialCombo.tiles.some((t) => t.row === r && t.col === c);

                  const isSquareCell =
                    activeSpecialCombo &&
                    activeSpecialCombo.type === 'square' &&
                    activeSpecialCombo.tiles.some((t) => t.row === r && t.col === c);

                  const isTripleCell =
                    activeSpecialCombo &&
                    activeSpecialCombo.type === 'triple' &&
                    activeSpecialCombo.tiles.some((t) => t.row === r && t.col === c);

                  return (
                    <div
                      key={`slot-${c}-${r}`}
                      onClick={(e) => {
                        if (hammerMode && tile && onTileClick) {
                          e.stopPropagation();
                          onTileClick(r, c);
                        }
                      }}
                      className={`flex-1 w-full rounded-xl relative flex items-center justify-center transition-all ${
                        tile || isGhostTarget
                          ? ''
                          : 'bg-[#1e2330]/50 border border-slate-800/40'
                      } ${
                        isInvertedTCell
                          ? 'ring-4 ring-fuchsia-400 z-20 animate-inverted-t-beacon'
                          : isCornerCell
                          ? 'ring-4 ring-amber-400 z-20 animate-corner-beacon'
                          : isSquareCell
                          ? 'ring-4 ring-yellow-400 z-20 animate-square-beacon'
                          : isTripleCell
                          ? 'ring-4 ring-cyan-400 z-20 animate-triple-pulse'
                          : ''
                      } ${hammerMode && tile ? 'hover:ring-4 hover:ring-rose-500 cursor-crosshair' : ''}`}
                    >
                      {/* Settled Tile Block with 3D Bevel */}
                      {tile && (
                        <TileBlock
                          value={tile.value}
                          isMerging={tile.isMerging}
                          mergeDirections={tile.mergeDirections}
                          className={hammerMode ? 'cursor-crosshair' : ''}
                        />
                      )}

                      {/* Ghost preview of incoming block (same color, same 3D block style, but paler) */}
                      {!tile && isGhostTarget && (
                        <TileBlock value={incomingValue} isGhost={true} />
                      )}

                      {/* Clean highlight on existing tile when incoming block matches */}
                      {tile && isGhostTarget && hoverPreview?.isMerge && (
                        <div
                          className="absolute inset-0 rounded-xl z-20 pointer-events-none ring-2 ring-white/80"
                          style={{
                            boxShadow: `0 0 14px ${incomingStyle.accent}90`,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Row (Row 9: Shooter Launcher Dock - matches exact design) */}
              <div className="mt-1 sm:mt-1.5 w-full aspect-square rounded-xl relative flex items-center justify-center">
                {isSelectedCol && (!flyingTile || flyingTile.col !== c) ? (
                  // Active Ready Shooter Tile on currently aimed column
                  <div className="w-full h-full transform transition-transform duration-100 scale-100 hover:scale-105 animate-in fade-in zoom-in-95">
                    <TileBlock value={incomingValue} />
                  </div>
                ) : (
                  // Inactive column lane slot with ArrowUp icon
                  <div
                    className={`w-full h-full rounded-xl flex items-center justify-center transition ${
                      isSelectedCol
                        ? 'bg-[#1e2330] border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                        : 'bg-[#1e2330] border border-slate-700/60 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Persistent Bonus Rush Progress Bar at bottom of Game Board */}
      {(() => {
        const isNearlyFull = !isBonusRushActive && bonusRushMax > 0 && (bonusRushProgress / bonusRushMax) >= 0.9;

        return (
          <div className="w-full mt-2 pt-1.5 border-t border-slate-800/80 flex flex-col gap-1 select-none">
            {/* Status Header */}
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
                /* Active Draining Timer Bar */
                <div
                  style={{ width: `${Math.max(0, (bonusRushTimeRemaining / 10) * 100)}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-yellow-300 transition-[width] duration-100 ease-linear shadow-[0_0_12px_rgba(251,191,36,0.9)] relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-energy-shimmer" />
                </div>
              ) : (
                /* Charging Progress Bar */
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
        );
      })()}

      {/* Direct Flying Animation: Bắn thẳng từ dưới đáy cột bay thẳng vào ô/khối trước */}
      {flyingTile && (
        <div
          style={{
            left: `calc(6px + ${flyingTile.col} * ((100% - 12px) / 5) + 3px)`,
            width: `calc(((100% - 12px) / 5) - 6px)`,
            height: `calc(((100% - 56px) / 9) - 4px)`,
            top: `calc(6px + ${flyingTile.targetRow} * ((100% - 56px) / 9))`,
            '--fly-distance': `${(8 - flyingTile.targetRow) * 52}px`,
          } as React.CSSProperties}
          className="absolute z-30 pointer-events-none animate-[flyUpDirect_0.18s_cubic-bezier(0.16,0.96,0.26,1)_forwards]"
        >
          <TileBlock value={flyingTile.value} />
        </div>
      )}

      {/* Domino Slide Animation during Cascade: Neighbor slide into center */}
      {absorbingTile && (
        <div
          style={{
            left: `calc(6px + ${absorbingTile.fromCol} * ((100% - 12px) / 5) + 3px)`,
            width: `calc(((100% - 12px) / 5) - 6px)`,
            height: `calc(((100% - 56px) / 9) - 4px)`,
            top: `calc(6px + ${absorbingTile.fromRow} * ((100% - 56px) / 9))`,
            '--slide-x': `calc(${absorbingTile.toCol - absorbingTile.fromCol} * ((100% - 12px) / 5))`,
            '--slide-y': `calc(${absorbingTile.toRow - absorbingTile.fromRow} * ((100% - 56px) / 9))`,
            animation: 'slideIntoTarget 0.26s cubic-bezier(0.2, 0.95, 0.3, 1) forwards',
          } as React.CSSProperties}
          className="absolute z-30 pointer-events-none"
        >
          <TileBlock value={absorbingTile.value} />
        </div>
      )}

      {/* Floating In-Board Add-In Score Badges directly over merged tiles */}
      {addIns.map((addIn) => (
        <div
          key={addIn.id}
          style={{
            left: `calc(6px + ${addIn.col} * ((100% - 12px) / 5) + ((100% - 12px) / 10))`,
            top: `calc(6px + ${addIn.row} * ((100% - 56px) / 9) + 12px)`,
          }}
          className="absolute z-40 pointer-events-none flex flex-col items-center animate-float-addin"
        >
          {/* Main Score Bubble */}
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

          {/* Sub combo badge if chain merge */}
          {addIn.combo && addIn.combo > 1 && (
            <span className="text-[10px] font-black text-rose-200 bg-rose-950/95 px-2 py-0.5 rounded-full border border-rose-400/90 mt-0.5 shadow-[0_0_12px_rgba(244,63,94,0.7)]">
              COMBO ×{addIn.combo}!
            </span>
          )}

          {/* Special combo badge (Square / Triple) */}
          {addIn.title && (
            <span className="text-[10px] font-black text-amber-200 bg-slate-950/95 px-2 py-0.5 rounded-full border border-amber-400/90 mt-0.5 shadow">
              {addIn.title}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};
