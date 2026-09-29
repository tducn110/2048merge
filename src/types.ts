export type MergeDirection = 'down' | 'up' | 'left' | 'right';

export interface TileData {
  id: string;
  value: number;
  row: number;
  col: number;
  isNew?: boolean;
  isMerging?: boolean;
  mergeDirections?: MergeDirection[];
  specialType?: 'corner' | 'inverted_t' | 'square' | 'triple' | 'cascade';
}

export type Grid = (TileData | null)[][];

export interface SpecialComboEvent {
  id: string;
  type: 'corner' | 'inverted_t' | 'square' | 'triple' | 'cascade';
  title: string;
  scoreBonus: number;
  tiles: { row: number; col: number; value: number }[];
  target: { row: number; col: number; newValue: number };
}

export interface FloatingNotification {
  id: string;
  x: number;
  y: number;
  text: string;
  subtext?: string;
  color: string;
  type?: 'score' | 'corner' | 'inverted_t' | 'square' | 'triple' | 'combo';
}

export interface GameStats {
  score: number;
  highScore: number;
  gems: number;
  comboCount: number;
  highestTile: number;
  cornerCombos: number;
  invertedTCombos: number;
  squareCombos?: number;
  tripleCombos?: number;
  totalMerges: number;
}

export interface AddInPopup {
  id: string;
  row: number;
  col: number;
  score: number;
  gems?: number;
  combo?: number;
  title?: string;
  isSpecial?: boolean;
}

export interface AbsorbingTileAnim {
  id: string;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  value: number;
}

export interface ComboHistoryItem {
  id: string;
  type: 'inverted_t' | 'corner' | 'cascade' | 'square' | 'triple';
  title: string;
  score: number;
  multiplier: number;
  tileValue: number;
  isRush?: boolean;
  timestamp: number;
}

export type PlayerTier =
  | 'Đế Vương 32K'
  | 'Thần Thoại 16K'
  | 'Bậc Thầy 8K'
  | 'Huyền Thoại 2048'
  | 'Cao Thủ 1024'
  | 'Tập Sự';

export interface LeaderboardEntry {
  id: string;
  rank: number;
  playerName: string;
  avatar: string;
  country: string;
  score: number;
  highestTile: number;
  tier: PlayerTier;
  isUser?: boolean;
  dateAchieved: string;
}

