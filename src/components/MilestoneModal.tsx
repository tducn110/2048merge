import React, { useEffect, useRef, useState } from 'react';
import { X, Trophy, CheckCircle2, Lock, Sparkles, History, Zap, Flame } from 'lucide-react';
import { formatTileValue, getTileStyle } from '../utils/theme';
import { CoinIcon } from './CoinIcon';
import { ComboHistoryItem } from '../types';
import { soundFx } from '../utils/audio';
import gsap from 'gsap';
import { CLS, Z } from '../shared/tokens';

interface MilestoneModalProps {
  isOpen: boolean;
  highestTile: number;
  score: number;
  coins: number;
  matchHistory?: ComboHistoryItem[];
  onClose: () => void;
}

interface MilestoneDef {
  value: number;
  rewardCoins: number;
  title: string;
}

const MILESTONES: MilestoneDef[] = [
  { value: 128, rewardCoins: 50, title: 'Tập sự số học' },
  { value: 256, rewardCoins: 80, title: 'Bắn phá cơ bản' },
  { value: 512, rewardCoins: 120, title: 'Chuyên gia chuỗi' },
  { value: 1024, rewardCoins: 200, title: 'Cao thủ xếp khối' },
  { value: 2048, rewardCoins: 350, title: 'Huyền thoại 2048' },
  { value: 4096, rewardCoins: 500, title: 'Bậc thầy siêu cấp' },
  { value: 8192, rewardCoins: 750, title: 'Thần thoại không gian' },
  { value: 16384, rewardCoins: 1000, title: 'Đỉnh cao vĩ đại' },
  { value: 32768, rewardCoins: 2000, title: 'Đế vương 32K' },
];

function formatTimeAgo(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  return `${Math.floor(diffHour / 24)} ngày trước`;
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen,
  highestTile,
  score,
  coins,
  matchHistory = [],
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'milestones' | 'history'>('milestones');

  useEffect(() => {
    if (!isOpen || !cardRef.current) return;
    const el = cardRef.current;
    gsap.fromTo(
      el,
      { scale: 0.88, opacity: 0, y: 30 },
      { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.4)' }
    );
    return () => {
      gsap.killTweensOf(el);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const targetTile = 32768;
  const targetStyle = getTileStyle(targetTile);
  const isTargetAchieved = highestTile >= targetTile;

  // Calculate progress toward 32K
  const currentLevel = Math.max(1, Math.log2(Math.max(highestTile, 2)));
  const targetLevel = Math.log2(targetTile); // 15
  const progressPercent = Math.min(100, Math.round((currentLevel / targetLevel) * 100));

  // Get the last 5 high-scoring combo chains
  const last5Combos = matchHistory.slice(0, 5);

  const getComboTypeBadge = (type: ComboHistoryItem['type']) => {
    switch (type) {
      case 'inverted_t':
        return {
          label: 'Chữ T Ngược ⊥',
          badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50 shadow-[0_0_8px_rgba(217,70,239,0.3)]',
          icon: '⊥',
        };
      case 'corner':
        return {
          label: 'Vuông Góc 90°',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]',
          icon: 'llcorner',
        };
      case 'cascade':
        return {
          label: 'Cascade Domino',
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]',
          icon: '⚡',
        };
      case 'square':
        return {
          label: 'Khối Vuông 2x2',
          badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/50',
          icon: '◼',
        };
      case 'triple':
        return {
          label: 'Chuỗi Bộ Ba',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
          icon: '▲',
        };
      default:
        return {
          label: 'Combo Đặc Biệt',
          badgeClass: 'bg-slate-700/60 text-slate-300 border-slate-600',
          icon: '★',
        };
    }
  };

  return (
    <div
      className={CLS.modalBackdrop}
      style={{ zIndex: Z.modal }}
    >
      <div
        ref={cardRef}
        className="w-full max-w-md bg-[#131722] border border-slate-700/80 rounded-3xl p-5 shadow-2xl flex flex-col items-center relative max-h-[90vh] overflow-hidden"
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 inset-x-0 h-32 bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            soundFx.triggerHaptic('tap');
            onClose();
          }}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition active:scale-95 z-10 cursor-pointer"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-2 mb-2">
          {activeTab === 'milestones' ? (
            <Trophy className="w-5 h-5 text-yellow-400" />
          ) : (
            <History className="w-5 h-5 text-amber-400" />
          )}
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide uppercase">
            {activeTab === 'milestones' ? 'Hành Trình Cột Mốc' : 'Lịch Sử Trận Đấu'}
          </h2>
        </div>

        <p className="text-xs text-slate-400 font-medium text-center mb-3">
          {activeTab === 'milestones'
            ? 'Bắn và ghép nối để mở khóa các mốc danh hiệu & nhận tiền vàng'
            : '5 chuỗi combo điểm cao nhất gần đây và loại combo đã kích hoạt'}
        </p>

        {/* Segmented Control Tabs */}
        <div className="w-full flex p-1 bg-[#181d29] rounded-2xl border border-slate-800 mb-3 select-none">
          <button
            onClick={() => {
              soundFx.triggerHaptic('tap');
              setActiveTab('milestones');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 active:scale-98 ${
              activeTab === 'milestones'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Cột Mốc 32K</span>
          </button>
          <button
            onClick={() => {
              soundFx.triggerHaptic('tap');
              setActiveTab('history');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 active:scale-98 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-amber-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch Sử Combo (5)</span>
          </button>
        </div>

        {/* TAB 1: MILESTONES VIEW */}
        {activeTab === 'milestones' && (
          <>
            {/* Featured Big 32K Target Banner */}
            <div className="w-full bg-gradient-to-br from-[#1c2232] to-[#161a26] border border-slate-700/80 rounded-2xl p-4 flex items-center justify-between mb-3 shadow-lg relative overflow-hidden">
              <div className="flex items-center gap-3 relative z-10">
                {/* 32K Tile Block */}
                <div
                  className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-t border-white/30 border-b-4 shadow-xl ${targetStyle.bg} ${targetStyle.bottomBorder}`}
                  style={{ boxShadow: `0 0 20px ${targetStyle.accent}60` }}
                >
                  <span className="text-base sm:text-lg font-black text-white drop-shadow">
                    {formatTileValue(targetTile)}
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-white">Mục Tiêu Lớn 32K</span>
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-spin" />
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {isTargetAchieved ? 'Đã chinh phục thành công!' : 'Đang tiến về đích 32.768'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <CoinIcon size={16} />
                    <span className="text-xs font-black text-yellow-300">+2.000 Vàng</span>
                  </div>
                </div>
              </div>

              {/* Progress Pill */}
              <div className="flex flex-col items-end relative z-10">
                <span className="text-lg font-black text-yellow-400">{progressPercent}%</span>
                <span className="text-[10px] font-bold text-slate-400">Tiến độ</span>
              </div>

              {/* Background Ambient Glow */}
              <div
                className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-xl pointer-events-none opacity-25"
                style={{ backgroundColor: targetStyle.accent }}
              />
            </div>

            {/* Quick Match History Teaser Banner */}
            <div
              onClick={() => {
                soundFx.triggerHaptic('tap');
                setActiveTab('history');
              }}
              className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-950/40 via-purple-900/30 to-amber-950/40 border border-fuchsia-500/30 flex items-center justify-between cursor-pointer hover:border-fuchsia-400/60 transition mb-3 group active:scale-98"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition animate-pulse" />
                <span className="text-xs font-black text-slate-200">
                  Match History: 5 chuỗi combo điểm cao gần nhất
                </span>
              </div>
              <span className="text-[11px] font-bold text-amber-300 group-hover:translate-x-0.5 transition flex items-center gap-0.5">
                Xem ngay &rarr;
              </span>
            </div>

            {/* Milestone List (Scrollable) */}
            <div className="w-full flex-1 overflow-y-auto pr-1 flex flex-col gap-2 mb-4 scrollbar-thin scrollbar-thumb-slate-700">
              {MILESTONES.map((milestone) => {
                const isReached = highestTile >= milestone.value;
                const isNext = !isReached && highestTile * 2 === milestone.value;
                const style = getTileStyle(milestone.value);

                return (
                  <div
                    key={milestone.value}
                    className={`w-full p-2.5 rounded-2xl border flex items-center justify-between transition ${
                      isReached
                        ? 'bg-[#1b2333]/70 border-emerald-500/40 shadow-sm'
                        : isNext
                        ? 'bg-[#222838] border-amber-400/60 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                        : 'bg-[#161a25]/50 border-slate-800/80 opacity-60'
                    }`}
                  >
                    {/* Left: Tile Mini Display & Title */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border-t border-white/20 border-b-2 font-black text-xs text-white shadow ${style.bg} ${style.bottomBorder}`}
                      >
                        {formatTileValue(milestone.value)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-200">
                            {milestone.title}
                          </span>
                          {isReached && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          Mốc khối: <strong className="text-slate-300">{milestone.value.toLocaleString()}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Right: Reward & Status */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-[#12151e] border border-yellow-500/30 px-2 py-1 rounded-xl shadow-inner">
                        <CoinIcon size={14} />
                        <span className="text-xs font-black text-yellow-300">
                          +{milestone.rewardCoins}
                        </span>
                      </div>

                      {isReached ? (
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                          Đạt được
                        </span>
                      ) : isNext ? (
                        <span className="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-400/30 animate-pulse">
                          Tiếp theo
                        </span>
                      ) : (
                        <Lock className="w-4 h-4 text-slate-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TAB 2: MATCH HISTORY VIEW (LAST 5 HIGH-SCORING COMBO CHAINS) */}
        {activeTab === 'history' && (
          <div className="w-full flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 mb-4 scrollbar-thin scrollbar-thumb-slate-700">
            {last5Combos.length === 0 ? (
              <div className="w-full py-12 px-4 rounded-2xl bg-[#171b26] border border-slate-800 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 text-amber-400">
                  <Zap className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-black text-white mb-1 uppercase tracking-wider">
                  Chưa có chuỗi combo nào
                </h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Hãy bắn và tạo các chuỗi <strong className="text-fuchsia-300">Chữ T Ngược ⊥</strong>, <strong className="text-amber-300">Vuông Góc 90°</strong> hoặc <strong className="text-cyan-300">Domino Cascade</strong> để ghi danh vào bảng vàng lịch sử!
                </p>
              </div>
            ) : (
              last5Combos.map((item, idx) => {
                const badge = getComboTypeBadge(item.type);
                const tileStyle = getTileStyle(item.tileValue);

                return (
                  <div
                    key={item.id || idx}
                    className="w-full p-3 rounded-2xl bg-gradient-to-br from-[#1b202e] to-[#141823] border border-slate-700/80 shadow-md flex items-center justify-between gap-3 hover:border-slate-600 transition relative overflow-hidden"
                  >
                    {/* Left: Index, Combo Type Badge & Timing */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Rank Index Pill */}
                      <div className="w-7 h-7 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-300 font-black text-xs flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>

                      {/* Combo Details */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Special Combo Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider uppercase border flex items-center gap-1 ${badge.badgeClass}`}
                          >
                            <span>{badge.icon}</span>
                            <span>{badge.label}</span>
                          </span>

                          {/* Multiplier Badge */}
                          {item.multiplier > 1 && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              ×{item.multiplier}
                            </span>
                          )}

                          {/* Bonus Rush Pill */}
                          {item.isRush && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-0.5 animate-pulse">
                              <Flame className="w-2.5 h-2.5 text-rose-400" />
                              2X RUSH
                            </span>
                          )}
                        </div>

                        {/* Relative Timestamp */}
                        <div className="text-[10px] font-medium text-slate-400">
                          {formatTimeAgo(item.timestamp)}
                        </div>
                      </div>
                    </div>

                    {/* Right: Score Achieved & Resulting Tile Block */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {/* Big Score Display */}
                      <div className="flex flex-col items-end">
                        <span className="text-base sm:text-lg font-black text-amber-300 tracking-tight leading-none drop-shadow">
                          +{item.score.toLocaleString()}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                          Điểm
                        </span>
                      </div>

                      {/* Resulting Tile Block */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white border-t border-white/20 border-b-2 shadow-sm shrink-0 ${tileStyle.bg} ${tileStyle.bottomBorder}`}
                        title={`Khối sinh ra: ${item.tileValue}`}
                      >
                        {formatTileValue(item.tileValue)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer: Close button */}
        <button
          onClick={() => {
            soundFx.triggerHaptic('tap');
            onClose();
          }}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-sm tracking-wide shadow-lg active:scale-98 transition"
        >
          Trở Lại Trò Chơi
        </button>
      </div>
    </div>
  );
};
