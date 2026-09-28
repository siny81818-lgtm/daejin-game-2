import React from 'react';
import { Play, RotateCcw, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onGoHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onRestart,
  onGoHome,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md select-none">
      <div className="w-full max-w-xs bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-white/20 text-slate-800 dark:text-slate-100 flex flex-col items-center text-center">
        <h3 className="text-2xl font-black font-['Fredoka'] text-slate-900 dark:text-white mb-1">
          일시정지
        </h3>
        <p className="text-xs text-slate-400 mb-6">게임이 잠시 멈췄습니다.</p>

        <div className="w-full space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 rounded-2xl bg-lime-500 hover:bg-lime-400 active:scale-[0.98] text-slate-950 font-black text-sm font-['Fredoka'] shadow-md shadow-lime-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>계속하기</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] text-slate-700 dark:text-slate-200 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>처음부터 다시</span>
          </button>

          <button
            onClick={onGoHome}
            className="w-full py-3 px-4 rounded-2xl bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] text-slate-500 dark:text-slate-400 font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>메인 메뉴로 이동</span>
          </button>
        </div>
      </div>
    </div>
  );
};
