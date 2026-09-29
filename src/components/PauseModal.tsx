import React, { useEffect, useRef } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, HelpCircle, Trophy, X } from 'lucide-react';
import { GameStats } from '../types';
import { CoinIcon } from './CoinIcon';
import { soundFx } from '../utils/audio';
import gsap from 'gsap';
import { CTAButton, DangerButton, IconBtn } from '../shared/hud';
import { CLS, Z } from '../shared/tokens';

interface PauseModalProps {
  isOpen: boolean;
  stats: GameStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onResume: () => void;
  onRestart: () => void;
  onOpenTutorial: () => void;
  onOpenMilestone: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  stats,
  isMuted,
  onToggleMute,
  onResume,
  onRestart,
  onOpenTutorial,
  onOpenMilestone,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen || !cardRef.current) return;
    const el = cardRef.current;
    gsap.fromTo(
      el,
      { scale: 0.85, opacity: 0, y: 20 },
      { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.5)' }
    );
    return () => {
      gsap.killTweensOf(el);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      className={CLS.modalBackdrop}
      style={{ zIndex: Z.modal }}
    >
      <div
        ref={cardRef}
        className="w-full max-w-sm bg-[#151923] border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col items-center relative overflow-hidden"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 inset-x-0 h-32 bg-amber-500/15 blur-2xl rounded-full pointer-events-none" />

        {/* Close Button at top-right */}
        <button
          onClick={() => {
            soundFx.triggerHaptic('tap');
            onResume();
          }}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition active:scale-95 cursor-pointer"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.5)] mb-3 border border-amber-300/40">
          <Play className="w-7 h-7 text-slate-950 fill-slate-950 translate-x-0.5" />
        </div>

        <h2 className="text-2xl font-black text-white tracking-wide uppercase">
          Tạm Dừng
        </h2>
        <p className="text-xs text-slate-400 font-medium mt-0.5 mb-4">
          Trò chơi đang được tạm hoãn
        </p>

        {/* Stats Grid: Score, High Score & Golden Coins */}
        <div className="w-full grid grid-cols-2 gap-2.5 mb-5">
          {/* Current Score */}
          <div className="bg-[#1b202c] border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Điểm Hiện Tại
            </span>
            <span className="text-xl font-black text-white mt-0.5">
              {stats.score.toLocaleString()}
            </span>
          </div>

          {/* High Score */}
          <div className="bg-[#1b202c] border border-slate-800 rounded-2xl p-3 flex flex-col items-center">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              <span>Kỷ Lục</span>
            </div>
            <span className="text-xl font-black text-yellow-400 mt-0.5">
              {stats.highScore.toLocaleString()}
            </span>
          </div>

          {/* Golden Coins Row */}
          <div className="col-span-2 bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-yellow-500/15 border border-yellow-500/35 rounded-2xl px-4 py-2.5 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-2">
              <CoinIcon size={24} />
              <span className="text-xs font-bold text-yellow-200">
                Tiền Vàng (Coins)
              </span>
            </div>
            <span className="text-lg font-black text-yellow-300 tracking-wider">
              {stats.gems.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Milestone Quick Link */}
        <button
          onClick={() => {
            soundFx.triggerHaptic('tap');
            onOpenMilestone();
          }}
          className="w-full mb-4 py-2.5 px-3 rounded-2xl bg-[#1e2433] hover:bg-[#252d40] border border-indigo-500/30 flex items-center justify-between text-left transition active:scale-98 cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-xs border border-indigo-400/30">
              32K
            </div>
            <div>
              <div className="text-xs font-black text-slate-200">Cột Mốc 32K</div>
              <div className="text-[10px] text-slate-400">Xem hành trình mở khóa kỷ lục</div>
            </div>
          </div>
          <span className="text-xs font-bold text-indigo-400">Chi tiết &rarr;</span>
        </button>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          {/* Resume Button with TrustMeBro CTAButton */}
          <CTAButton
            onClick={() => {
              soundFx.triggerHaptic('tap');
              onResume();
            }}
            className="w-full py-3.5 rounded-2xl font-black text-base shadow-[0_4px_16px_rgba(245,158,11,0.4)]"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Tiếp Tục Chơi</span>
          </CTAButton>

          {/* Sound & Tutorial row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                soundFx.triggerHaptic('tap');
                onToggleMute();
              }}
              className="py-2.5 px-3 rounded-xl bg-[#1f2533] hover:bg-[#272f42] border border-slate-700/70 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span>Bật Âm</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span>Tắt Âm</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                soundFx.triggerHaptic('tap');
                onOpenTutorial();
              }}
              className="py-2.5 px-3 rounded-xl bg-[#1f2533] hover:bg-[#272f42] border border-slate-700/70 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>Hướng Dẫn</span>
            </button>
          </div>

          {/* Restart Button with TrustMeBro DangerButton */}
          <DangerButton
            onClick={() => {
              soundFx.triggerHaptic('tap');
              onRestart();
            }}
            className="w-full py-2.5 rounded-xl font-bold text-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Chơi Lại Ván Mới</span>
          </DangerButton>
        </div>
      </div>
    </div>
  );
};
