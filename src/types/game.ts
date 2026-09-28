export type MoleType = 'standard' | 'miner' | 'goggle' | 'golden' | 'hardhat';

export type HoleState = 'hidden' | 'emerging' | 'idle' | 'submerging' | 'hit';

export interface MoleInfo {
  holeIndex: number;
  type: MoleType;
  state: HoleState;
  progress: number; // 0 to 1 for animations
  lifetime: number; // seconds remaining in idle state
  maxLifetime: number;
  hitsRequired: number;
  hitsReceived: number;
  scoreValue: number;
  hasAccessory?: string;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface GameStats {
  score: number;
  highScore: number;
  timeLeft: number;
  combo: number;
  maxCombo: number;
  molesHit: number;
  totalMolesSpawned: number;
  accuracy: number;
  clicks: number;
}

export interface FloatingTextEvent {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}
