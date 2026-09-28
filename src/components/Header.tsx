import React from 'react';
import { Trophy, Pause, RotateCcw, Volume2, VolumeX, Zap } from 'lucide-react';
import { GameStats } from '../types';
import { formatTileValue, getTileStyle } from '../utils/theme';
import { CoinIcon } from './CoinIcon';
import { soundFx } from '../utils/audio';

interface HeaderProps {
  stats: GameStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenPause: () => void;
  onOpenMilestone: () => void;
  onRestart: () => void;
  onUseBlackHole: () => void;
  onUseHammer: () => void;
  onUseSwap: () => void;
  hammerMode: boolean;
  cascadeMultiplier?: number;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  isMuted,
  onToggleMute,
  onOpenPause,
  onOpenMilestone,
  onRestart,
  onUseBlackHole,
  onUseHammer,
  onUseSwap,
  hammerMode,
  cascadeMultiplier = 1,
}) => {
  // Target tile unlock (e.g. 32K or next milestone above highest reached)
  const targetUnlock = Math.max(32768, Math.pow(2, Math.ceil(Math.log2(Math.max(stats.highestTile * 2, 32768)))));
  const targetStyle = getTileStyle(targetUnlock);

  const isChaining = cascadeMultiplier >= 2;

  let statusText = 'Ready';
  let statusBadgeStyle = 'text-slate-500';

  if (cascadeMultiplier >= 5) {
    statusText = `×${cascadeMultiplier} Overdrive!`;
    statusBadgeStyle = 'bg-rose-500/20 border border-rose-400/80 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.5)] animate-pulse';
  } else if (cascadeMultiplier === 4) {
    statusText = '×4 Mega!';
    statusBadgeStyle = 'bg-cyan-500/20 border border-cyan-400/80 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]';
  } else if (cascadeMultiplier === 3) {
    statusText = '×3 Super!';
    statusBadgeStyle = 'bg-fuchsia-500/20 border border-fuchsia-400/80 text-fuchsia-300 shadow-[0_0_8px_rgba(217,70,239,0.4)]';
  } else if (cascadeMultiplier === 2) {
    statusText = '×2 Combo';
    statusBadgeStyle = 'bg-amber-500/20 border border-amber-400/80 text-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.4)]';
  }

  const segments = [
    {
      level: 2,
      label: '2X',
      activeClass:
        'bg-gradient-to-r from-amber-500 to-orange-500 border border-amber-300/80 shadow-[0_0_8px_rgba(245,158,11,0.7)]',
      activeLabel: 'text-amber-400 font-bold',
    },
    {
      level: 3,
      label: '3X',
      activeClass:
        'bg-gradient-to-r from-fuchsia-500 to-purple-600 border border-fuchsia-300/80 shadow-[0_0_10px_rgba(217,70,239,0.75)]',
      activeLabel: 'text-fuchsia-400 font-bold',
    },
    {
      level: 4,
      label: '4X',
      activeClass:
        'bg-gradient-to-r from-cyan-400 to-blue-500 border border-cyan-300/80 shadow-[0_0_12px_rgba(6,182,212,0.8)]',
      activeLabel: 'text-cyan-400 font-bold',
    },
    {
      level: 5,
      label: 'MAX 5X',
      activeClass:
        'bg-gradient-to-r from-rose-500 via-amber-400 to-yellow-300 border border-yellow-200/90 shadow-[0_0_14px_rgba(251,191,36,0.9)] animate-pulse',
      activeLabel: 'text-yellow-300 font-black animate-pulse',
    },
  ];

  return (
    <header className="w-full max-w-md mx-auto px-2 pt-1 pb-1 flex flex-col gap-1.5 select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        {/* Pause / Sound / Restart Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            id="btn-pause"
            onClick={() => {
              soundFx.triggerHaptic('tap');
              onOpenPause();
            }}
            title="Tạm dừng trò chơi"
            className="w-10 h-10 rounded-xl bg-[#202532] hover:bg-[#282e3e] active:scale-95 text-slate-200 border border-slate-700/80 flex items-center justify-center shadow-md transition"
          >
            <Pause className="w-5 h-5 fill-current" />
          </button>

          <button
            id="btn-sound-toggle"
            onClick={() => {
              soundFx.triggerHaptic('tap');
              onToggleMute();
            }}
            title={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="w-10 h-10 rounded-xl bg-[#202532] hover:bg-[#282e3e] active:scale-95 text-slate-300 flex items-center justify-center border border-slate-700/80 shadow-md transition"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            id="btn-restart-quick"
            onClick={() => {
              soundFx.triggerHaptic('tap');
              onRestart();
            }}
            title="Chơi lại ván mới"
            className="w-10 h-10 rounded-xl bg-[#202532] hover:bg-[#282e3e] active:scale-95 text-slate-300 flex items-center justify-center border border-slate-700/80 shadow-md transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Big Current Score & High Score */}
        <div className="flex flex-col items-center justify-center">
          <span className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none drop-shadow-md">
            {stats.score.toLocaleString()}
          </span>
          <div className="flex items-center gap-1 mt-0.5 text-xs font-bold text-slate-400">
            <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            <span>{stats.highScore.toLocaleString()}</span>
          </div>
        </div>

        {/* Right: Target Milestone Block (32K - Click to open Milestone Screen) */}
        <button
          id="btn-milestone-target"
          onClick={() => {
            soundFx.triggerHaptic('tap');
            onOpenMilestone();
          }}
          title="Xem hành trình đạt cột mốc 32K"
          className="flex flex-col items-center group transition active:scale-95"
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border-t border-white/20 border-b-4 shadow-md group-hover:shadow-[0_0_12px_rgba(234,179,8,0.5)] transition ${targetStyle.bg} ${targetStyle.bottomBorder}`}
          >
            <span className="text-xs sm:text-sm font-black text-white drop-shadow">
              {formatTileValue(targetUnlock)}
            </span>
          </div>
          <span className="text-[10px] font-bold text-amber-300 group-hover:text-yellow-300 leading-none mt-1">
            Cột mốc
          </span>
        </button>
      </div>

      {/* Subtle Energy Meter Visual (Fills up as Cascade Multiplier grows) */}
      <div
        className={`w-full px-2.5 py-1 rounded-xl transition-all duration-300 flex flex-col gap-1 border ${
          isChaining
            ? 'bg-[#181d29]/90 border-slate-700/80 shadow-[0_0_14px_rgba(0,0,0,0.5)]'
            : 'bg-[#151923]/40 border-slate-800/40'
        }`}
      >
        {/* Meter Info & Chain Status */}
        <div className="flex items-center justify-between px-0.5 text-[9.5px] font-bold tracking-wider select-none">
          <div className="flex items-center gap-1.5">
            <Zap
              className={`w-3.5 h-3.5 transition-all duration-300 ${
                isChaining
                  ? 'text-amber-400 fill-amber-400 animate-pulse drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                  : 'text-slate-600 fill-transparent'
              }`}
            />
            <span
              className={`uppercase tracking-widest text-[9px] font-extrabold transition-colors duration-300 ${
                isChaining ? 'text-slate-200' : 'text-slate-500'
              }`}
            >
              Chain Energy
            </span>
          </div>

          <div className="flex items-center gap-1">
            {isChaining ? (
              <span
                className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase transition-all duration-300 ${statusBadgeStyle}`}
              >
                {statusText}
              </span>
            ) : (
              <span className="text-[9px] font-semibold text-slate-600 tracking-wider uppercase">
                Ready
              </span>
            )}
          </div>
        </div>

        {/* 4-Segment Growing Energy Bars */}
        <div className="grid grid-cols-4 gap-1.5 h-1.5 sm:h-2">
          {segments.map((seg) => {
            const isFilled = cascadeMultiplier >= seg.level;
            return (
              <div
                key={seg.level}
                className={`relative rounded-full overflow-hidden transition-all duration-300 ${
                  isFilled
                    ? seg.activeClass
                    : 'bg-slate-800/70 border border-slate-700/40'
                }`}
              >
                {isFilled && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-energy-shimmer" />
                )}
              </div>
            );
          })}
        </div>

        {/* Segment Milestone Tick Labels */}
        <div className="grid grid-cols-4 gap-1.5 px-0.5 text-[8px] font-black tracking-tighter text-center select-none">
          {segments.map((seg) => {
            const isFilled = cascadeMultiplier >= seg.level;
            return (
              <span
                key={`label-${seg.level}`}
                className={`transition-colors duration-300 ${
                  isFilled ? seg.activeLabel : 'text-slate-600'
                }`}
              >
                {seg.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Sub-bar: Golden Coins & 3 Booster Items */}
      <div className="flex items-center justify-between px-1 pt-0.5">
        {/* Left: Golden Coins Display with rich yellow styling */}
        <div
          className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-yellow-500/15 border border-yellow-500/40 rounded-full px-2.5 py-1 shadow-inner cursor-pointer hover:border-yellow-400 active:scale-95 transition"
          title="Tiền vàng (Coins)"
          onClick={() => {
            soundFx.triggerHaptic('tap');
            onOpenMilestone();
          }}
        >
          <CoinIcon size={18} />
          <span className="text-sm font-black text-yellow-300 tracking-wide">
            {stats.gems}
          </span>
        </div>

        {/* Right: 3 Booster Skills (Blackhole 200, Hammer 225, Swap 20) */}
        <div className="flex items-center gap-2">
          {/* Black Hole / Clean Row Booster (200) */}
          <button
            id="btn-booster-blackhole"
            onClick={() => {
              soundFx.triggerHaptic('double');
              onUseBlackHole();
            }}
            title="Hố đen lốc xoáy (200 Coins): Hút sạch hàng nhiều khối nhất"
            className="flex items-center gap-1 bg-[#202532] hover:bg-[#282e3e] active:scale-95 border border-slate-700/80 rounded-xl px-2.5 py-1 shadow transition group"
          >
            <span className="text-base leading-none">🌀</span>
            <CoinIcon size={13} sparkle={false} />
            <span className="text-xs font-black text-yellow-300">200</span>
          </button>

          {/* Hammer Booster (225) */}
          <button
            id="btn-booster-hammer"
            onClick={() => {
              soundFx.triggerHaptic('tap');
              onUseHammer();
            }}
            title="Búa (225 Coins): Đập vỡ một khối bất kỳ"
            className={`flex items-center gap-1 rounded-xl px-2.5 py-1 border transition shadow group active:scale-95 ${
              hammerMode
                ? 'bg-amber-500 border-amber-300 ring-2 ring-amber-400 text-slate-950 animate-pulse'
                : 'bg-[#202532] hover:bg-[#282e3e] border-slate-700/80 text-slate-200'
            }`}
          >
            <span className="text-base leading-none">🔨</span>
            <CoinIcon size={13} sparkle={false} />
            <span className={`text-xs font-black ${hammerMode ? 'text-slate-950' : 'text-yellow-300'}`}>
              225
            </span>
          </button>

          {/* Swap Tile Booster (20) */}
          <button
            id="btn-booster-swap"
            onClick={() => {
              soundFx.triggerHaptic('double');
              onUseSwap();
            }}
            title="Đổi khối (20 Coins): Hoán đổi khối bắn với khối kế tiếp"
            className="flex items-center gap-1 bg-[#202532] hover:bg-[#282e3e] active:scale-95 border border-slate-700/80 rounded-xl px-2.5 py-1 shadow transition group"
          >
            <span className="text-base leading-none">🔁</span>
            <CoinIcon size={13} sparkle={false} />
            <span className="text-xs font-black text-yellow-300">20</span>
          </button>
        </div>
      </div>
    </header>
  );
};
