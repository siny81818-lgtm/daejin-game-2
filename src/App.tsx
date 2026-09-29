import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { StartModal } from './components/StartModal';
import { GameOverModal } from './components/GameOverModal';
import { PauseModal } from './components/PauseModal';
import { MoleScene } from './three/MoleScene';
import { MoleType, HoleState, MoleInfo, Difficulty, GameStats, FloatingTextEvent } from './types/game';
import { sound } from './services/audio';

type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('whack_mole_highscore') || '0', 10);
    } catch {
      return 0;
    }
  });
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [combo, setCombo] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(true);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextEvent[]>([]);

  // Detailed Game Stats for Results
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    highScore: 0,
    timeLeft: 30,
    combo: 0,
    maxCombo: 0,
    molesHit: 0,
    totalMolesSpawned: 0,
    accuracy: 100,
    clicks: 0,
  });

  const sceneRef = useRef<MoleScene | null>(null);
  const gameLoopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);

  // References to keep state fresh inside callbacks without stale closures
  const stateRef = useRef({
    gameState: 'menu' as GameState,
    score: 0,
    combo: 0,
    maxCombo: 0,
    molesHit: 0,
    clicks: 0,
    totalMolesSpawned: 0,
    difficulty: 'normal' as Difficulty,
    timeLeft: 30,
  });

  useEffect(() => {
    stateRef.current.gameState = gameState;
    stateRef.current.score = score;
    stateRef.current.combo = combo;
    stateRef.current.difficulty = difficulty;
    stateRef.current.timeLeft = timeLeft;
  }, [gameState, score, combo, difficulty, timeLeft]);

  // Handle floating text creation
  const addFloatingText = useCallback((text: string, color: string, x: number, y: number) => {
    const id = Math.random().toString(36).substring(2, 9);
    setFloatingTexts((prev) => [...prev, { id, text, color, x, y }]);
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 700);
  }, []);

  // When a mole is successfully hit
  const handleMoleHit = useCallback(
    (mole: MoleInfo, hitX: number, hitY: number) => {
      if (stateRef.current.gameState !== 'playing') return;

      const currentCombo = stateRef.current.combo + 1;
      const newMaxCombo = Math.max(stateRef.current.maxCombo, currentCombo);
      stateRef.current.combo = currentCombo;
      stateRef.current.maxCombo = newMaxCombo;
      stateRef.current.molesHit += 1;
      stateRef.current.clicks += 1;

      // Combo bonus: +10% per combo, capped at +100%
      const comboMultiplier = 1 + Math.min((currentCombo - 1) * 0.1, 1.0);
      const points = Math.round(mole.scoreValue * comboMultiplier);

      const newScore = stateRef.current.score + points;
      stateRef.current.score = newScore;
      setScore(newScore);
      setCombo(currentCombo);

      sound.playHit(mole.type, currentCombo);

      // Floating text effect
      const color =
        mole.type === 'golden'
          ? '#f59e0b'
          : mole.type === 'miner'
          ? '#38bdf8'
          : mole.type === 'goggle'
          ? '#a855f7'
          : '#4ade80';

      addFloatingText(`+${points}`, color, hitX, hitY);

      // Golden mole bonus time!
      if (mole.type === 'golden') {
        setTimeLeft((prev) => prev + 1);
        setTimeout(() => {
          addFloatingText('+1 SEC! ⏳', '#fbbf24', hitX, hitY - 30);
        }, 150);
      }

      // Combo milestone cheer
      if (currentCombo === 5 || currentCombo === 10 || currentCombo === 15 || currentCombo === 20) {
        sound.playComboCheer();
        setTimeout(() => {
          addFloatingText(`${currentCombo} COMBO! 🔥`, '#f97316', hitX, hitY - 45);
        }, 100);
      }
    },
    [addFloatingText]
  );

  // When user misses (clicks ground or empty hole)
  const handleMiss = useCallback(() => {
    if (stateRef.current.gameState !== 'playing') return;
    stateRef.current.clicks += 1;
    // Break combo on miss
    stateRef.current.combo = 0;
    setCombo(0);
  }, []);

  const handleScreenCoords = useCallback(
    (screenX: number, screenY: number, text: string, color: string) => {
      addFloatingText(text, color, screenX, screenY);
    },
    [addFloatingText]
  );

  // Start / Restart Game
  const startGame = useCallback(() => {
    const initialTime = difficulty === 'easy' ? 40 : difficulty === 'hard' ? 25 : 30;
    setScore(0);
    setCombo(0);
    setTimeLeft(initialTime);
    setGameState('playing');

    stateRef.current = {
      gameState: 'playing',
      score: 0,
      combo: 0,
      maxCombo: 0,
      molesHit: 0,
      clicks: 0,
      totalMolesSpawned: 0,
      difficulty,
      timeLeft: initialTime,
    };

    if (sceneRef.current) {
      sceneRef.current.resetAllMoles();
    }

    sound.playStart();
  }, [difficulty]);

  // End Game
  const endGame = useCallback(() => {
    setGameState('gameover');
    sound.playGameOver();

    const finalScore = stateRef.current.score;
    const finalClicks = Math.max(stateRef.current.clicks, 1);
    const finalHits = stateRef.current.molesHit;
    const accuracy = Math.min(100, Math.round((finalHits / finalClicks) * 100));

    let newHighScore = highScore;
    if (finalScore > highScore) {
      newHighScore = finalScore;
      setHighScore(finalScore);
      try {
        localStorage.setItem('whack_mole_highscore', finalScore.toString());
      } catch {
        // ignore storage error
      }
    }

    setStats({
      score: finalScore,
      highScore: newHighScore,
      timeLeft: 0,
      combo: stateRef.current.combo,
      maxCombo: stateRef.current.maxCombo,
      molesHit: finalHits,
      totalMolesSpawned: stateRef.current.totalMolesSpawned,
      accuracy,
      clicks: finalClicks,
    });
  }, [highScore]);

  // Main countdown timer (1s interval)
  useEffect(() => {
    if (gameState !== 'playing') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          endGame();
          return 0;
        }
        if (prev <= 6) {
          sound.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, endGame]);

  // Mole Spawning Algorithm
  useEffect(() => {
    if (gameState !== 'playing') return;

    let isCancelled = false;

    const scheduleNextSpawn = () => {
      if (isCancelled || stateRef.current.gameState !== 'playing') return;

      const remainingTime = stateRef.current.timeLeft;
      const diff = stateRef.current.difficulty;

      // Dynamic difficulty curve based on remaining time
      let spawnDelay: number;
      let moleLifetime: number;
      let maxSimultaneous: number;

      if (diff === 'easy') {
        spawnDelay = 850 + Math.random() * 450;
        moleLifetime = 1.3 + Math.random() * 0.4;
        maxSimultaneous = 2;
      } else if (diff === 'hard') {
        spawnDelay = 400 + Math.random() * 350;
        moleLifetime = 0.75 + Math.random() * 0.35;
        maxSimultaneous = 4;
      } else {
        // Normal: accelerates in the last 15 seconds!
        if (remainingTime > 15) {
          spawnDelay = 650 + Math.random() * 400;
          moleLifetime = 1.05 + Math.random() * 0.35;
          maxSimultaneous = 2;
        } else {
          // Fever Time!
          spawnDelay = 450 + Math.random() * 300;
          moleLifetime = 0.85 + Math.random() * 0.3;
          maxSimultaneous = 3;
        }
      }

      spawnTimerRef.current = setTimeout(() => {
        if (sceneRef.current && stateRef.current.gameState === 'playing') {
          const availableHoles = sceneRef.current.getAvailableHoleIndices();
          if (availableHoles.length > 0) {
            // Determine how many moles to spawn this tick
            const currentActive = 9 - availableHoles.length;
            const toSpawn = currentActive < maxSimultaneous ? 1 : 0;

            if (toSpawn > 0) {
              const randomHoleIdx =
                availableHoles[Math.floor(Math.random() * availableHoles.length)];

              // Mole Type selection with weights
              const rand = Math.random();
              let moleType: MoleType = 'standard';
              if (rand < 0.08) {
                moleType = 'golden'; // 8% chance
              } else if (rand < 0.22) {
                moleType = 'goggle'; // 14% chance
              } else if (rand < 0.48) {
                moleType = 'miner'; // 26% chance
              } else if (rand < 0.58 && diff === 'hard') {
                moleType = 'hardhat'; // 10% chance on hard
              } else {
                moleType = 'standard'; // 52% chance
              }

              sceneRef.current.spawnMole(randomHoleIdx, moleType, moleLifetime);
              stateRef.current.totalMolesSpawned += 1;
            }
          }
        }
        scheduleNextSpawn();
      }, spawnDelay);
    };

    scheduleNextSpawn();

    return () => {
      isCancelled = true;
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current);
    };
  }, [gameState, difficulty]);

  // Audio & Haptics toggle handlers
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.setSoundEnabled(next);
  };

  const handleToggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    sound.setHapticsEnabled(next);
    if (next) sound.vibrate(30);
  };

  const handleTogglePause = () => {
    if (gameState === 'playing') {
      setGameState('paused');
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  };

  const handleRestart = () => {
    sound.playHit('gold', 0);
    addFloatingText('새 게임 시작!', '#10b981', window.innerWidth / 2, window.innerHeight / 2);
    startGame();
  };

  const handleGoHome = () => {
    setGameState('menu');
    if (sceneRef.current) {
      sceneRef.current.resetAllMoles();
    }
  };

  return (
    <main className="relative w-screen h-screen h-[100dvh] overflow-hidden bg-slate-900 font-sans select-none touch-none">
      {/* 3D WebGL Canvas Layer */}
      <GameCanvas
        callbacks={{
          onMoleHit: handleMoleHit,
          onMiss: handleMiss,
          onScreenCoords: handleScreenCoords,
        }}
        onSceneReady={(scene) => {
          sceneRef.current = scene;
        }}
      />

      {/* In-Game HUD (Visible during play and pause) */}
      {(gameState === 'playing' || gameState === 'paused') && (
        <HUD
          score={score}
          timeLeft={timeLeft}
          combo={combo}
          difficulty={difficulty}
          isPaused={gameState === 'paused'}
          soundEnabled={soundEnabled}
          hapticsEnabled={hapticsEnabled}
          floatingTexts={floatingTexts}
          onTogglePause={handleTogglePause}
          onToggleSound={handleToggleSound}
          onToggleHaptics={handleToggleHaptics}
          onResetGame={handleRestart}
        />
      )}

      {/* Start Modal (Menu) */}
      {gameState === 'menu' && (
        <StartModal
          difficulty={difficulty}
          highScore={highScore}
          onSelectDifficulty={setDifficulty}
          onStartGame={startGame}
        />
      )}

      {/* Pause Modal */}
      {gameState === 'paused' && (
        <PauseModal
          onResume={() => setGameState('playing')}
          onRestart={handleRestart}
          onGoHome={handleGoHome}
        />
      )}

      {/* Game Over Modal */}
      {gameState === 'gameover' && (
        <GameOverModal
          stats={stats}
          isNewRecord={stats.score > 0 && stats.score >= stats.highScore}
          onPlayAgain={startGame}
          onGoHome={handleGoHome}
        />
      )}
    </main>
  );
}
