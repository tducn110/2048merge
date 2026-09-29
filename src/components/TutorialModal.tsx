import React from 'react';
import { X, Sparkles, BoxSelect, Zap, ArrowUpCircle } from 'lucide-react';
import { TileBlock } from './TileBlock';
import { soundFx } from '../utils/audio';
import { CTAButton } from '../shared/hud';
import { CLS, Z } from '../shared/tokens';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className={CLS.modalBackdrop}
      style={{ zIndex: Z.modal }}
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-black text-white">Cách Chơi & Luật Ghép</h2>
          </div>
          <button
            onClick={() => {
              soundFx.triggerHaptic('tap');
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition active:scale-95 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex flex-col gap-4 py-4 text-sm text-slate-300">
          {/* Rule 1: Bắn đẩy ô */}
          <div className="flex gap-3 bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/30">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm mb-1">
                1. Bàn cờ 5×8 & Chạm để đẩy
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bàn cờ gồm <strong className="text-slate-200">5 cột dọc</strong> và <strong className="text-slate-200">8 hàng</strong>. Chạm vào bất kỳ cột nào để đẩy khối số bay lên trên. Khối sẽ chạm trần hoặc xếp chồng lên khối trước.
              </p>
            </div>
          </div>

          {/* Rule 2: Ghép số cơ bản */}
          <div className="flex gap-3 bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-7 h-7">
                <TileBlock value={2} />
              </div>
              <span className="text-xs font-black text-slate-500">+</span>
              <div className="w-7 h-7">
                <TileBlock value={2} />
              </div>
              <span className="text-xs font-black text-slate-500">=</span>
              <div className="w-7 h-7">
                <TileBlock value={4} />
              </div>
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm mb-1">
                2. Ghép cùng giá trị
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Khi bắn vào ô có cùng số, chúng sẽ hợp nhất: <strong className="text-amber-300">2 + 2 = 4</strong>, <strong className="text-orange-300">4 + 4 = 8</strong>, tiếp tục tới <strong className="text-yellow-400">2048, 4K, 8K, 16K, 32K</strong>!
              </p>
            </div>
          </div>

          {/* Rule 3: Vuông Góc 90° */}
          <div className="flex gap-3 bg-gradient-to-r from-amber-950/40 to-slate-950/60 p-3 rounded-2xl border border-amber-500/40">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-500/40">
              <BoxSelect className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="font-extrabold text-amber-300 text-sm">
                  3. Nhận diện Vuông Góc (90° L-Shape)
                </h3>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950">
                  COMBO 1
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Khi <strong className="text-amber-200">3 khối cùng số</strong> tạo thành một góc vuông 90° (chữ L ở bất kỳ hướng nào), chúng sẽ kích hoạt hào quang vàng kim và hút nhập vào góc gập, nhân giá trị lên 4 lần!
              </p>
            </div>
          </div>

          {/* Rule 4: Chữ T Ngược ⊥ */}
          <div className="flex gap-3 bg-gradient-to-r from-fuchsia-950/40 to-slate-950/60 p-3 rounded-2xl border border-fuchsia-500/40">
            <div className="w-9 h-9 rounded-xl bg-fuchsia-500/20 text-fuchsia-300 flex items-center justify-center shrink-0 border border-fuchsia-500/40">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="font-extrabold text-fuchsia-300 text-sm">
                  4. Nhận diện Chữ T Ngược (⊥)
                </h3>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-fuchsia-400 text-slate-950">
                  COMBO 2
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Khi <strong className="text-fuchsia-200">4 khối cùng số</strong> tạo thành hình chữ T ngược ⊥ (hoặc chữ T), cả 4 khối sẽ bùng nổ, gộp vào tâm chữ T tạo khối gấp 8 lần kèm điểm thưởng siêu cấp!
              </p>
            </div>
          </div>
        </div>

        {/* Action Button with TrustMeBro CTAButton */}
        <CTAButton
          onClick={() => {
            soundFx.triggerHaptic('tap');
            onClose();
          }}
          className="w-full py-3 rounded-2xl font-black text-sm tracking-wide shadow-lg mt-2"
        >
          ĐÃ HIỂU, CHƠI NGAY!
        </CTAButton>
      </div>
    </div>
  );
};
