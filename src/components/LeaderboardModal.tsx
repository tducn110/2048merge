import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Star, RefreshCw, Pencil, Check, X, ShieldAlert, Loader2 } from 'lucide-react';
import gsap from 'gsap';
import {
  getUserProfile,
  saveUserProfile,
  getPlayerTier,
  mapWinkEntries,
  UserProfile,
} from '../utils/leaderboardService';
import { LeaderboardEntry } from '../types';
import { CTAButton, CloseBtn } from '../shared/hud';
import { CLS, Z } from '../shared/tokens';
import { winkGame } from '../integrations/wink/client';

// ── Tier badge ────────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: LeaderboardEntry['tier'] }) {
  const map: Record<string, string> = {
    'Đế Vương 32K':    'bg-gradient-to-r from-yellow-400 to-amber-400 text-black',
    'Thần Thoại 16K':  'bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white',
    'Bậc Thầy 8K':     'bg-gradient-to-r from-blue-500 to-cyan-400 text-white',
    'Huyền Thoại 2048':'bg-gradient-to-r from-emerald-500 to-teal-400 text-white',
    'Cao Thủ 1024':    'bg-gradient-to-r from-orange-500 to-rose-400 text-white',
    'Tập Sự':          'bg-stone-700 text-stone-300',
  };
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${map[tier] ?? 'bg-stone-700 text-stone-300'}`}>
      {tier}
    </span>
  );
}

// ── Medal for top-3 ───────────────────────────────────────────────────────────
function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-base">🥇</span>;
  if (rank === 2) return <span className="text-base">🥈</span>;
  if (rank === 3) return <span className="text-base">🥉</span>;
  return <span className="w-5 text-center text-xs font-black text-stone-400">#{rank}</span>;
}

// ── Avatar editor options ─────────────────────────────────────────────────────
const AVATAR_OPTIONS = ['🎮','⚡','🔥','🌟','🐯','🦊','🐲','🧊','🦉','🌙','🐱','🧙','🦎','🌈','💎','🚀'];
const COUNTRY_OPTIONS = ['🇻🇳','🇯🇵','🇰🇷','🇺🇸','🇨🇳','🇩🇪','🇫🇷','🇧🇷','🇷🇺','🇮🇳','🇹🇭','🇵🇭','🌍'];

// ── Props ─────────────────────────────────────────────────────────────────────
interface LeaderboardModalProps {
  isOpen: boolean;
  score: number;
  highestTile: number;
  onClose: () => void;
  onPlayAgain: () => void;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  score,
  highestTile,
  onClose,
  onPlayAgain,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // ── Profile state ────────────────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile>(getUserProfile);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('🎮');
  const [editCountry, setEditCountry] = useState('🇻🇳');

  // ── Leaderboard state ─────────────────────────────────────────────────────
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [personalBestScore, setPersonalBestScore] = useState<number>(score);
  const [isLoading, setIsLoading] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const fetchBoard = useCallback(async (force = false) => {
    setIsLoading(true);
    const hasCapability = winkGame.capabilities.getLeaderboard;
    setIsStandalone(!hasCapability);

    if (!hasCapability) {
      setIsLoading(false);
      setEntries([]);
      setUserRank(null);
      return;
    }

    try {
      const [boardRes, myBest] = await Promise.allSettled([
        winkGame.refreshLeaderboard({ limit: 20, force }),
        winkGame.getPersonalBest(),
      ]);

      const board = boardRes.status === 'fulfilled' ? boardRes.value : { entries: [], total: 0, me: null };
      const me = myBest.status === 'fulfilled' ? myBest.value : board.me;

      const mapped = mapWinkEntries(
        board.entries || [],
        winkGame.lastSubmittedEntryId,
        profile,
        score,
        highestTile,
      );

      setEntries(mapped);

      if (me) {
        setUserRank(me.rank);
        setPersonalBestScore(me.score);
      } else {
        const found = mapped.find((e) => e.isUser);
        if (found) {
          setUserRank(found.rank);
          setPersonalBestScore(found.score);
        } else {
          setUserRank(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [profile, score, highestTile]);

  // Fetch when opened
  useEffect(() => {
    if (isOpen) {
      void fetchBoard(false);
    }
  }, [isOpen, fetchBoard]);

  // ── Entry animation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen && cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { scale: 0.88, opacity: 0, y: 24 },
        { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.4)' },
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Profile edit helpers ─────────────────────────────────────────────────
  function startEdit() {
    setEditName(profile.name);
    setEditAvatar(profile.avatar);
    setEditCountry(profile.country);
    setEditing(true);
  }

  function confirmEdit() {
    const next: UserProfile = {
      name: editName.trim() || 'Bạn',
      avatar: editAvatar,
      country: editCountry,
    };
    saveUserProfile(next);
    setProfile(next);
    setEditing(false);
  }

  const userTier = getPlayerTier(highestTile);

  return (
    <div className={CLS.modalBackdrop} style={{ zIndex: Z.modal }}>
      <div
        ref={cardRef}
        className="w-full max-w-sm bg-gradient-to-b from-stone-900 to-stone-950 text-white rounded-2xl border border-stone-700 shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92dvh' }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span className="font-black text-base text-white tracking-wide">BẢNG XẾP HẠNG</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => void fetchBoard(true)}
              disabled={isLoading}
              title="Làm mới bảng xếp hạng"
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 transition active:scale-95 disabled:opacity-50 text-stone-300"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <CloseBtn onClick={onClose} />
          </div>
        </div>

        {/* ── User profile card ──────────────────────────────────────────── */}
        <div className="mx-4 mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl shrink-0">
          {!editing ? (
            <div className="flex items-center gap-3">
              <span className="text-2xl">{profile.avatar}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm text-amber-300 truncate">{profile.name}</span>
                  <span className="text-sm">{profile.country}</span>
                </div>
                <TierBadge tier={userTier} />
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-stone-400">Điểm cao nhất</div>
                <div className="text-sm font-black text-amber-300">
                  {Math.max(score, personalBestScore).toLocaleString()}
                </div>
                {userRank ? (
                  <div className="text-[10px] text-stone-400 font-bold">Hạng #{userRank}</div>
                ) : (
                  <div className="text-[10px] text-stone-500">Chưa xếp hạng</div>
                )}
              </div>
              <button
                onClick={startEdit}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-600 transition active:scale-95"
              >
                <Pencil className="w-3.5 h-3.5 text-stone-300" />
              </button>
            </div>
          ) : (
            /* ── Edit mode ─────────────────────────────────────────────── */
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editName}
                maxLength={18}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Tên của bạn"
                className="w-full px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-600 text-white text-sm font-bold placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
              />
              <div>
                <div className="text-[10px] text-stone-400 mb-1 font-bold">Avatar</div>
                <div className="flex flex-wrap gap-1">
                  {AVATAR_OPTIONS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setEditAvatar(a)}
                      className={`text-lg p-0.5 rounded-lg transition ${editAvatar === a ? 'bg-amber-500/30 ring-1 ring-amber-400' : 'hover:bg-stone-700'}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-stone-400 mb-1 font-bold">Quốc gia</div>
                <div className="flex flex-wrap gap-1">
                  {COUNTRY_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditCountry(c)}
                      className={`text-lg p-0.5 rounded-lg transition ${editCountry === c ? 'bg-amber-500/30 ring-1 ring-amber-400' : 'hover:bg-stone-700'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={confirmEdit}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" /> Lưu
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-stone-700 hover:bg-stone-600 text-white text-xs font-black transition active:scale-95"
                >
                  <X className="w-3.5 h-3.5" /> Hủy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Standalone Mode Notice ─────────────────────────────────────── */}
        {isStandalone && (
          <div className="mx-4 mb-2 p-2 bg-stone-800/80 border border-stone-700 rounded-xl flex items-center gap-2 text-stone-400 text-xs shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Chế độ Standalone (Offline). Kết nối qua Wink iframe để xem thứ hạng toàn cầu.</span>
          </div>
        )}

        {/* ── Leaderboard list ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 flex flex-col gap-1.5 min-h-[160px]">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-stone-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              <span className="text-xs font-bold">Đang tải bảng xếp hạng...</span>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-stone-400 text-center gap-2">
              <Trophy className="w-8 h-8 text-stone-600" />
              <div className="text-xs font-bold text-stone-300">Chưa có điểm số nào</div>
              <div className="text-[11px] text-stone-500 max-w-[200px]">
                {isStandalone
                  ? 'Hãy ghi điểm và mở game trên Wink để tham gia đua top!'
                  : 'Hãy là người đầu tiên ghi điểm trên bảng xếp hạng!'}
              </div>
            </div>
          ) : (
            entries.map((entry) => {
              const isUser = entry.isUser;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition ${
                    isUser
                      ? 'bg-amber-500/15 border-amber-500/50'
                      : 'bg-stone-800/60 border-stone-700/60'
                  }`}
                >
                  {/* Rank */}
                  <div className="w-6 flex items-center justify-center shrink-0">
                    <RankMedal rank={entry.rank} />
                  </div>

                  {/* Avatar */}
                  <span className="text-xl shrink-0">{entry.avatar}</span>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`text-xs font-black truncate ${isUser ? 'text-amber-300' : 'text-white'}`}>
                        {entry.playerName}
                      </span>
                      <span className="text-sm shrink-0">{entry.country}</span>
                      {isUser && (
                        <span className="text-[9px] font-black px-1 py-px rounded bg-amber-400 text-stone-950">
                          BẠN
                        </span>
                      )}
                    </div>
                    {entry.highestTile > 0 && <TierBadge tier={entry.tier} />}
                  </div>

                  {/* Score */}
                  <div className="text-right shrink-0">
                    <div className={`text-xs font-black ${isUser ? 'text-amber-300' : 'text-white'}`}>
                      {entry.score.toLocaleString()}
                    </div>
                    {entry.highestTile > 0 && (
                      <div className="text-[10px] text-stone-500 flex items-center gap-0.5 justify-end">
                        <Star className="w-2.5 h-2.5 text-amber-500" />
                        {entry.highestTile >= 1024
                          ? `${entry.highestTile / 1024}K`
                          : entry.highestTile}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer actions ──────────────────────────────────────────────── */}
        <div className="px-4 pt-2 pb-4 flex flex-col gap-2 shrink-0 border-t border-stone-800">
          <CTAButton
            onClick={() => {
              onClose();
              onPlayAgain();
            }}
            className="w-full py-3 rounded-xl font-black"
          >
            <Trophy className="w-4 h-4" />
            <span>CHƠI LẠI ĐỂ PHÁ KỶ LỤC</span>
          </CTAButton>
          <button
            onClick={onClose}
            className="text-xs text-stone-500 hover:text-stone-300 transition text-center py-1 cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
