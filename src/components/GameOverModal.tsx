import React from 'react';
import { Trophy, RotateCcw, BoxSelect, Zap, Flame, BarChart2 } from 'lucide-react';
import { GameStats } from '../types';
import { formatTileValue } from '../utils/theme';
import { CoinIcon } from './CoinIcon';
import { soundFx } from '../utils/audio';
import { CTAButton, DangerButton } from '../shared/hud';
import { CLS, Z } from '../shared/tokens';

interface GameOverModalProps {
  isOpen: boolean;
  stats: GameStats;
  onRestart: () => void;
  onOpenLeaderboard: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ isOpen, stats, onRestart, onOpenLeaderboard }) => {
  if (!isOpen) return null;

  const isNewHighScore = stats.score >= stats.highScore && stats.score > 0;

  return (
    <div
      className={CLS.modalBackdrop}
      style={{ zIndex: Z.modal }}
    >
      <div className="w-full max-w-sm bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col items-center text-center animate-in fade-in zoom-in-95">
        {/* Badge / Trophy */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.6)] mb-3 border-2 border-yellow-200">
          <Trophy className="w-8 h-8 text-amber-950" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-wide mb-1">
          HẾT NƯỚC ĐI!
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Bàn cờ 5×8 đã đầy. Cùng xem thành tích của bạn:
        </p>

        {/* Score Breakdown Card */}
        <div className="w-full bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-4 flex flex-col gap-2.5">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
            <span className="text-xs text-slate-400 font-bold uppercase">Tổng Điểm</span>
            <span className="text-xl font-black text-amber-300">
              {stats.score.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
            <span className="text-xs text-slate-400 font-bold uppercase">Kỷ Lục Cao Nhất</span>
            <span className="text-base font-black text-white">
              {stats.highScore.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
            <span className="text-xs text-slate-400 font-bold uppercase">Khối Đạt Cao Nhất</span>
            <span className="text-base font-black text-emerald-400">
              {formatTileValue(stats.highestTile)}
            </span>
          </div>

          <div className="flex justify-between items-center pb-2 border-b border-slate-800/80">
            <span className="text-xs text-slate-400 font-bold uppercase">Tiền Vàng (Coins)</span>
            <div className="flex items-center gap-1.5">
              <CoinIcon size={16} />
              <span className="text-base font-black text-yellow-300">
                {stats.gems.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Special Combo Stats */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-left">
            <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-amber-500/20">
              <BoxSelect className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block leading-tight">Vuông góc 90°</span>
                <span className="text-xs font-black text-amber-300">{stats.cornerCombos ?? 0} lần</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-fuchsia-500/20">
              <Zap className="w-4 h-4 text-fuchsia-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block leading-tight">Chữ T ngược ⊥</span>
                <span className="text-xs font-black text-fuchsia-300">{stats.invertedTCombos ?? 0} lần</span>
              </div>
            </div>
          </div>
        </div>

        {isNewHighScore && (
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/40 mb-4 animate-bounce">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>KỶ LỤC ĐIỂM MỚI ĐƯỢC THIẾT LẬP!</span>
          </div>
        )}

        {/* Restart Action with TrustMeBro CTAButton */}
        <CTAButton
          onClick={() => {
            soundFx.triggerHaptic('tap');
            onRestart();
          }}
          className="w-full py-3.5 rounded-2xl font-black text-base shadow-xl"
        >
          <RotateCcw className="w-5 h-5" />
          <span>CHƠI LẠI VÁN MỚI</span>
        </CTAButton>

        {/* Leaderboard secondary button */}
        <button
          onClick={() => {
            soundFx.triggerHaptic('tap');
            onOpenLeaderboard();
          }}
          className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-300 text-sm font-black transition active:scale-95"
        >
          <BarChart2 className="w-4 h-4 text-amber-400" />
          <span>XEM BẢNG XẾP HẠNG</span>
        </button>
      </div>
    </div>
  );
};
