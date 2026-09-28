import React from 'react';
import { TileBlock } from './TileBlock';
import { ArrowLeftRight } from 'lucide-react';
import { soundFx } from '../utils/audio';

interface ShooterControlsProps {
  currentValue: number;
  nextValue: number;
  onSwapNext: () => void;
}

export const ShooterControls: React.FC<ShooterControlsProps> = ({
  currentValue,
  nextValue,
  onSwapNext,
}) => {
  return (
    <div className="w-full max-w-[420px] mx-auto px-2 pt-1 pb-1.5 flex items-center justify-center select-none shrink-0 z-10">
      {/* Shooter Deck: Current Tile (Ready to Shoot) + Quick Swap + Next Tile */}
      <div className="flex items-center gap-2.5 sm:gap-3 bg-[#181b25] border border-slate-800 rounded-2xl px-3.5 py-1.5 shadow-lg">
        {/* Current loaded tile */}
        <div className="flex items-center gap-2" title="Khối số hiện tại đang sẵn sàng bắn">
          <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">Bắn:</span>
          <div className="w-8 h-8 drop-shadow-md">
            <TileBlock value={currentValue} />
          </div>
        </div>

        {/* Quick Swap Button */}
        <button
          id="btn-quick-swap"
          onClick={() => {
            soundFx.triggerHaptic('double');
            onSwapNext();
          }}
          title="Đổi với khối tiếp theo"
          className="w-7 h-7 rounded-xl bg-[#222836] hover:bg-slate-700 active:scale-90 text-amber-400 flex items-center justify-center transition border border-slate-700/60 shadow"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>

        {/* Next Tile Preview */}
        <div className="flex items-center gap-2 border-l border-slate-800/90 pl-2.5 sm:pl-3" title="Khối số kế tiếp sau lượt này">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kế:</span>
          <div className="w-8 h-8 opacity-90">
            <TileBlock value={nextValue} />
          </div>
        </div>
      </div>
    </div>
  );
};
