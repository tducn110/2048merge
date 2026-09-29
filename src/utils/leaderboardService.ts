import { PlayerTier, LeaderboardEntry } from '../types';
import type { WinkLeaderboardEntry } from '../integrations/wink/client';

// ── localStorage keys ────────────────────────────────────────────────────────
const KEY_USER_PROFILE = '2048_user_profile';

// ── User profile ─────────────────────────────────────────────────────────────
export interface UserProfile {
  name: string;
  avatar: string;   // emoji
  country: string;  // flag emoji
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Bạn',
  avatar: '🎮',
  country: '🇻🇳',
};

export function getUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(KEY_USER_PROFILE);
    if (!raw) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(KEY_USER_PROFILE, JSON.stringify(profile));
  } catch {
    // storage quota – ignore
  }
}

// ── Tier calculation ──────────────────────────────────────────────────────────
export function getPlayerTier(highestTile: number): PlayerTier {
  if (highestTile >= 32768) return 'Đế Vương 32K';
  if (highestTile >= 16384) return 'Thần Thoại 16K';
  if (highestTile >= 8192)  return 'Bậc Thầy 8K';
  if (highestTile >= 2048)  return 'Huyền Thoại 2048';
  if (highestTile >= 1024)  return 'Cao Thủ 1024';
  return 'Tập Sự';
}

// ── Map Wink SDK entries to UI model ───────────────────────────────────────────
export function mapWinkEntries(
  entries: WinkLeaderboardEntry[],
  lastSubmittedId: string | null,
  userProfile: UserProfile,
  fallbackScore: number,
  fallbackHighestTile: number,
): LeaderboardEntry[] {
  if (!entries || entries.length === 0) {
    return [];
  }

  return entries.map((e) => {
    const isUser = e.id === lastSubmittedId;
    return {
      id: e.id,
      rank: e.rank,
      playerName: isUser
        ? userProfile.name
        : (e.displayName || (e.isAnonymous ? 'Người chơi ẩn danh' : 'Người chơi')),
      avatar: isUser ? userProfile.avatar : '🎮',
      country: isUser ? userProfile.country : '🇻🇳',
      score: e.score,
      highestTile: isUser ? fallbackHighestTile : 0,
      tier: getPlayerTier(isUser ? fallbackHighestTile : 0),
      isUser,
      dateAchieved: e.createdAt ? e.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    };
  });
}
