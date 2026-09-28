import React from 'react';
import { Play, Sparkles, Trophy, ShieldCheck } from 'lucide-react';
import { Difficulty } from '../types/game';

interface StartModalProps {
  difficulty: Difficulty;
  highScore: number;
  onSelectDifficulty: (d: Difficulty) => void;
  onStartGame: () => void;
}

export const StartModal: React.FC<StartModalProps> = ({
  difficulty,
  highScore,
  onSelectDifficulty,
  onStartGame,
}) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md select-none">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 text-slate-800 dark:text-slate-100 flex flex-col items-center text-center">
        {/* Title & Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-500/10 text-lime-600 dark:text-lime-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          3D Low-Poly Arcade
        </div>

        <h1 className="text-3xl sm:text-4xl font-black font-['Fredoka'] text-slate-900 dark:text-white tracking-wide mb-1">
          두더지 잡기 3D
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-5">
          화면을 탭하거나 클릭하여 솟아오르는 두더지들을 재빠르게 잡아보세요!
        </p>

        {/* High Score Preview */}
        {highScore > 0 && (
          <div className="w-full mb-5 py-2.5 px-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>최고 기록</span>
            </div>
            <span className="font-['Fredoka'] font-black text-lg sm:text-xl tabular-nums">
              {highScore} PTS
            </span>
          </div>
        )}

        {/* Difficulty Selection */}
        <div className="w-full mb-6">
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
            난이도 선택
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => {
              const active = difficulty === d;
              return (
                <button
                  key={d}
                  onClick={() => onSelectDifficulty(d)}
                  className={`py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold uppercase transition-all active:scale-95 ${
                    active
                      ? 'bg-lime-500 text-slate-950 shadow-md shadow-lime-500/30 ring-2 ring-lime-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {d === 'easy' ? '쉬움' : d === 'normal' ? '보통' : '어려움'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mole Character Guide */}
        <div className="w-full bg-slate-100/70 dark:bg-slate-800/50 rounded-2xl p-3 mb-6 text-left">
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            두더지 도감 & 점수
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/80">
              <span className="text-base">🦔</span>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200">일반 두더지</div>
                <div className="text-[10px] text-slate-400">100점</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/80">
              <span className="text-base">⛏️</span>
              <div>
                <div className="font-bold text-amber-600 dark:text-amber-400">광부 두더지</div>
                <div className="text-[10px] text-slate-400">150점</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/80">
              <span className="text-base">👓</span>
              <div>
                <div className="font-bold text-sky-600 dark:text-sky-400">안경 두더지</div>
                <div className="text-[10px] text-slate-400">200점 (고속)</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/80">
              <span className="text-base">👑</span>
              <div>
                <div className="font-bold text-yellow-500">황금 두더지</div>
                <div className="text-[10px] text-slate-400">300점 + 1초</div>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={onStartGame}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 active:scale-[0.98] text-slate-950 font-black text-lg sm:text-xl font-['Fredoka'] shadow-xl shadow-lime-500/25 transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <Play className="w-6 h-6 fill-current" />
          <span>게임 시작!</span>
        </button>
      </div>
    </div>
  );
};
