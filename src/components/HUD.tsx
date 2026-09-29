import React from 'react';
import { Volume2, VolumeX, Pause, Play, Smartphone, Flame, RotateCw } from 'lucide-react';
import { Difficulty, FloatingTextEvent } from '../types/game';

interface HUDProps {
  score: number;
  timeLeft: number;
  combo: number;
  difficulty: Difficulty;
  isPaused: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  floatingTexts: FloatingTextEvent[];
  onTogglePause: () => void;
  onToggleSound: () => void;
  onToggleHaptics: () => void;
  onResetGame: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  score,
  timeLeft,
  combo,
  difficulty,
  isPaused,
  soundEnabled,
  hapticsEnabled,
  floatingTexts,
  onTogglePause,
  onToggleSound,
  onToggleHaptics,
  onResetGame,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-20">
      {/* Top Header Row */}
      <header className="absolute top-0 left-0 right-0 p-3 sm:p-5 flex items-start justify-between">
        {/* Left Side: Controls & Info */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Pause / Resume */}
          <button
            onClick={onTogglePause}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-md border border-white/20 flex items-center justify-center text-slate-800 dark:text-white active:scale-95 transition-transform"
            aria-label={isPaused ? 'Resume' : 'Pause'}
            title={isPaused ? '계속하기 (Resume)' : '일시정지 (Pause)'}
          >
            {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
          </button>

          {/* Reset / Restart Game Button */}
          <button
            onClick={onResetGame}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-md border border-white/20 flex items-center justify-center text-slate-800 dark:text-white active:scale-95 transition-transform hover:bg-white/90 dark:hover:bg-slate-900/90"
            aria-label="게임 재시작"
            title="게임 재시작 (Restart Game)"
          >
            <RotateCw className="w-5 h-5 text-amber-500 hover:rotate-180 transition-transform duration-300" />
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl backdrop-blur-md shadow-md border border-white/20 flex items-center justify-center transition-transform active:scale-95 ${
              soundEnabled
                ? 'bg-white/80 dark:bg-slate-900/80 text-emerald-500'
                : 'bg-white/50 dark:bg-slate-900/50 text-slate-400'
            }`}
            aria-label="Toggle Sound"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Haptic Vibration Toggle (Mobile touch friendly) */}
          <button
            onClick={onToggleHaptics}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl backdrop-blur-md shadow-md border border-white/20 flex items-center justify-center transition-transform active:scale-95 ${
              hapticsEnabled
                ? 'bg-white/80 dark:bg-slate-900/80 text-amber-500'
                : 'bg-white/50 dark:bg-slate-900/50 text-slate-400'
            }`}
            aria-label="Toggle Vibration"
            title="Toggle Vibration"
          >
            <Smartphone className="w-5 h-5" />
          </button>

          {/* Difficulty pill */}
          <div className="hidden sm:flex items-center px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-white/90 border border-white/10">
            {difficulty}
          </div>
        </div>

        {/* Center: Combo Indicator */}
        {combo > 1 && (
          <div className="absolute left-1/2 -translate-x-1/2 top-4 sm:top-5 animate-bounce flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-orange-500/30 border border-amber-300">
            <Flame className="w-4 h-4 fill-amber-200 text-yellow-100" />
            <span>{combo} COMBO!</span>
            <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-md">
              +{Math.min(combo * 10, 100)}%
            </span>
          </div>
        )}

        {/* Right Side: Score & Time matching the reference image layout */}
        <div className="flex flex-col items-end pointer-events-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
          <div className="text-2xl sm:text-4xl font-black tracking-wider text-white font-['Fredoka'] drop-shadow-[0_2px_0_#0f172a]">
            SCORE: <span className="tabular-nums">{score}</span>
          </div>
          <div
            className={`text-xl sm:text-3xl font-black tracking-wider font-['Fredoka'] drop-shadow-[0_2px_0_#0f172a] ${
              timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'
            }`}
          >
            TIME: <span className="tabular-nums">{timeLeft}</span>
          </div>
        </div>
      </header>

      {/* Floating Score and Hit Reaction Popups */}
      {floatingTexts.map((f) => (
        <div
          key={f.id}
          style={{
            left: `${f.x}px`,
            top: `${f.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="fixed pointer-events-none font-['Fredoka'] font-black text-xl sm:text-2xl animate-out fade-out slide-out-to-top duration-700 fill-mode-forwards select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
        >
          <span
            style={{ color: f.color }}
            className="inline-block animate-bounce px-2 py-0.5"
          >
            {f.text}
          </span>
        </div>
      ))}
    </div>
  );
};
