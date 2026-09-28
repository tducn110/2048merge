export function formatTileValue(val: number): string {
  if (val >= 1000) {
    if (val === 1024) return '1024';
    if (val === 2048) return '2048';
    return `${Math.floor(val / 1024)}K`;
  }
  // Cho phép hiện số gọn đẹp như ảnh mẫu hoặc 02, 04, 08 nếu < 10
  if (val < 10) {
    return `${val}`;
  }
  return `${val}`;
}

export interface TileStyleConfig {
  bg: string;
  bottomBorder: string;
  glow: string;
  text: string;
  accent: string;
}

export const TILE_STYLES: Record<number, TileStyleConfig> = {
  2: {
    bg: 'bg-[#2dd4bf]', // Xanh ngọc lam teal chuẩn video
    bottomBorder: 'border-b-[#0f766e]',
    glow: 'shadow-[0_4px_12px_rgba(45,212,191,0.45)]',
    text: 'text-white',
    accent: '#2dd4bf',
  },
  4: {
    bg: 'bg-[#38bdf8]', // Xanh da trời sky blue chuẩn video
    bottomBorder: 'border-b-[#0284c7]',
    glow: 'shadow-[0_4px_12px_rgba(56,189,248,0.45)]',
    text: 'text-white',
    accent: '#38bdf8',
  },
  8: {
    bg: 'bg-[#3b82f6]', // Xanh dương đậm cobalt chuẩn video
    bottomBorder: 'border-b-[#1d4ed8]',
    glow: 'shadow-[0_4px_14px_rgba(59,130,246,0.5)]',
    text: 'text-white',
    accent: '#3b82f6',
  },
  16: {
    bg: 'bg-[#8b5cf6]', // Tím lavender chuẩn video
    bottomBorder: 'border-b-[#6d28d9]',
    glow: 'shadow-[0_4px_14px_rgba(139,92,246,0.5)]',
    text: 'text-white',
    accent: '#8b5cf6',
  },
  32: {
    bg: 'bg-[#a855f7]', // Tím violet chuẩn video (như đoạn 00:18)
    bottomBorder: 'border-b-[#7e22ce]',
    glow: 'shadow-[0_4px_16px_rgba(168,85,247,0.55)]',
    text: 'text-white',
    accent: '#a855f7',
  },
  64: {
    bg: 'bg-[#ec4899]', // Hồng fuchsia chuẩn video
    bottomBorder: 'border-b-[#be185d]',
    glow: 'shadow-[0_4px_16px_rgba(236,72,153,0.55)]',
    text: 'text-white',
    accent: '#ec4899',
  },
  128: {
    bg: 'bg-[#ef4444]', // Đỏ rực chuẩn video
    bottomBorder: 'border-b-[#b91c1c]',
    glow: 'shadow-[0_4px_18px_rgba(239,68,68,0.55)]',
    text: 'text-white',
    accent: '#ef4444',
  },
  256: {
    bg: 'bg-[#f97316]', // Cam đào chuẩn ảnh
    bottomBorder: 'border-b-[#c2410c]',
    glow: 'shadow-[0_4px_16px_rgba(249,115,22,0.5)]',
    text: 'text-white',
    accent: '#f97316',
  },
  512: {
    bg: 'bg-[#f59e0b]', // Vàng cam mật ong chuẩn ảnh
    bottomBorder: 'border-b-[#b45309]',
    glow: 'shadow-[0_4px_18px_rgba(245,158,11,0.55)]',
    text: 'text-white',
    accent: '#f59e0b',
  },
  1024: {
    bg: 'bg-[#84cc16]', // Xanh chanh tươi chuẩn ảnh
    bottomBorder: 'border-b-[#4d7c0f]',
    glow: 'shadow-[0_4px_20px_rgba(132,204,22,0.6)]',
    text: 'text-white',
    accent: '#84cc16',
  },
  2048: {
    bg: 'bg-[#eab308]', // Vàng kim neon chuẩn ảnh
    bottomBorder: 'border-b-[#a16207]',
    glow: 'shadow-[0_4px_22px_rgba(234,179,8,0.7)] animate-pulse-glow',
    text: 'text-white',
    accent: '#eab308',
  },
  4096: {
    bg: 'bg-[#f97316]', // 4K Cam hổ phách chuẩn ảnh
    bottomBorder: 'border-b-[#c2410c]',
    glow: 'shadow-[0_4px_22px_rgba(249,115,22,0.7)]',
    text: 'text-white',
    accent: '#f97316',
  },
  8192: {
    bg: 'bg-[#ec4899]', // 8K Hồng neon chuẩn ảnh
    bottomBorder: 'border-b-[#be185d]',
    glow: 'shadow-[0_4px_24px_rgba(236,72,153,0.75)]',
    text: 'text-white',
    accent: '#ec4899',
  },
  16384: {
    bg: 'bg-[#c084fc]', // 16K Tím oải hương sáng chuẩn ảnh
    bottomBorder: 'border-b-[#9333ea]',
    glow: 'shadow-[0_4px_26px_rgba(192,132,252,0.8)]',
    text: 'text-white',
    accent: '#c084fc',
  },
  32768: {
    bg: 'bg-[#3b82f6]', // 32K Xanh dương chuẩn ảnh
    bottomBorder: 'border-b-[#1d4ed8]',
    glow: 'shadow-[0_4px_28px_rgba(59,130,246,0.85)]',
    text: 'text-white',
    accent: '#3b82f6',
  },
};

export function getTileStyle(val: number): TileStyleConfig {
  if (TILE_STYLES[val]) return TILE_STYLES[val];
  return {
    bg: 'bg-[#06b6d4]',
    bottomBorder: 'border-b-[#0e7490]',
    glow: 'shadow-[0_4px_28px_rgba(6,182,212,0.85)]',
    text: 'text-white',
    accent: '#06b6d4',
  };
}
