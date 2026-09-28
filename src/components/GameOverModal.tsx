import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { RotateCcw, Home, Trophy, Target, Zap, Award } from 'lucide-react';
import { GameStats } from '../types/game';

interface GameOverModalProps {
  stats: GameStats;
  isNewRecord: boolean;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  isNewRecord,
  onPlayAgain,
  onGoHome,
}) => {
  useEffect(() => {
    // Fire confetti celebration
    try {
      confetti({
        particleCount: isNewRecord ? 90 : 50,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#84cc16', '#f59e0b', '#06b6d4', '#f43f5e', '#a855f7'],
      });
    } catch {
      // ignore confetti errors
    }
  }, [isNewRecord]);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md select-none animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20 text-slate-800 dark:text-slate-100 flex flex-col items-center text-center">
        {/* Banner */}
        {isNewRecord ? (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold uppercase tracking-wider mb-2 animate-bounce">
            <Trophy className="w-4 h-4 fill-amber-500" />
            <span>최고 기록 갱신! 🎉</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Award className="w-4 h-4" />
            <span>게임 종료</span>
          </div>
        )}

        <h2 className="text-3xl sm:text-4xl font-black font-['Fredoka'] text-slate-900 dark:text-white mb-2">
          {stats.score >= 2500 ? '두더지 마스터!' : stats.score >= 1200 ? '훌륭한 순발력!' : '수고하셨습니다!'}
        </h2>

        {/* Score Box */}
        <div className="w-full my-4 py-5 px-6 rounded-3xl bg-gradient-to-br from-lime-500/15 via-emerald-500/10 to-transparent border border-lime-500/30 flex flex-col items-center justify-center">
          <span className="text-xs font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
            최종 점수
          </span>
          <span className="text-4xl sm:text-5xl font-black font-['Fredoka'] text-lime-600 dark:text-lime-400 tabular-nums">
            {stats.score.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 mt-1">
            최고 점수: {stats.highScore.toLocaleString()}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="w-full grid grid-cols-3 gap-2.5 mb-6 text-center">
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
            <Target className="w-4 h-4 mx-auto text-sky-500 mb-1" />
            <div className="text-[11px] text-slate-400 font-medium">잡은 두더지</div>
            <div className="text-base sm:text-lg font-black font-['Fredoka'] text-slate-800 dark:text-white tabular-nums">
              {stats.molesHit}마리
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
            <Zap className="w-4 h-4 mx-auto text-amber-500 mb-1" />
            <div className="text-[11px] text-slate-400 font-medium">최대 콤보</div>
            <div className="text-base sm:text-lg font-black font-['Fredoka'] text-slate-800 dark:text-white tabular-nums">
              {stats.maxCombo}x
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50">
            <Award className="w-4 h-4 mx-auto text-purple-500 mb-1" />
            <div className="text-[11px] text-slate-400 font-medium">타격 정확도</div>
            <div className="text-base sm:text-lg font-black font-['Fredoka'] text-slate-800 dark:text-white tabular-nums">
              {stats.accuracy}%
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex items-center gap-3">
          <button
            onClick={onGoHome}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] font-bold text-sm text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>메뉴</span>
          </button>

          <button
            onClick={onPlayAgain}
            className="flex-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-lime-500 to-emerald-500 hover:from-lime-400 hover:to-emerald-400 active:scale-[0.98] text-slate-950 font-black text-base font-['Fredoka'] shadow-lg shadow-lime-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>다시 플레이</span>
          </button>
        </div>
      </div>
    </div>
  );
};
