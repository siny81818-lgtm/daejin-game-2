/**
 * Web Audio API synthesizer for whack-a-mole sound effects.
 * 100% self-contained with no external audio file dependencies.
 */

class SoundService {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private hapticsEnabled: boolean = true;

  constructor() {
    // Lazily initialized on first user interaction to comply with browser autoplay policies
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setHapticsEnabled(enabled: boolean) {
    this.hapticsEnabled = enabled;
  }

  public isHapticsEnabled(): boolean {
    return this.hapticsEnabled;
  }

  public vibrate(pattern: number | number[] = 15) {
    if (!this.hapticsEnabled || typeof navigator === 'undefined') return;
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Ignore vibration errors
    }
  }

  /**
   * Sound when a mole pops up from the hole
   */
  public playPop() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // audio error handling
    }
  }

  /**
   * Satisfying whack/bonk sound when hammer hits a mole
   */
  public playHit(moleType: string = 'standard', combo: number = 0) {
    this.vibrate(combo > 3 ? [20, 30, 40] : [25, 20]);
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Low frequency punch / thud
      const punchOsc = this.ctx.createOscillator();
      const punchGain = this.ctx.createGain();
      punchOsc.type = 'triangle';
      punchOsc.frequency.setValueAtTime(140, now);
      punchOsc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

      punchGain.gain.setValueAtTime(0.45, now);
      punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      punchOsc.connect(punchGain);
      punchGain.connect(this.ctx.destination);
      punchOsc.start(now);
      punchOsc.stop(now + 0.15);

      // 2. High frequency cartoon "bonk" or chime
      const bonkOsc = this.ctx.createOscillator();
      const bonkGain = this.ctx.createGain();
      bonkOsc.type = 'sine';

      // Pitch scales up with combo
      const baseFreq = 480 + Math.min(combo * 40, 400);
      bonkOsc.frequency.setValueAtTime(baseFreq, now);
      bonkOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.08);

      bonkGain.gain.setValueAtTime(0.3, now);
      bonkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      bonkOsc.connect(bonkGain);
      bonkGain.connect(this.ctx.destination);
      bonkOsc.start(now);
      bonkOsc.stop(now + 0.18);

      // 3. Special sound for miner / golden
      if (moleType === 'miner') {
        // Metallic clink
        this.playMinerClink(now + 0.04);
      } else if (moleType === 'golden') {
        // Golden chime
        this.playGoldenChime(now + 0.02);
      }
    } catch {
      // audio error handling
    }
  }

  private playMinerClink(startTime: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, startTime);
    osc.frequency.exponentialRampToValueAtTime(800, startTime + 0.2);

    gain.gain.setValueAtTime(0.15, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(startTime);
    osc.stop(startTime + 0.2);
  }

  private playGoldenChime(startTime: number) {
    if (!this.ctx) return;
    const notes = [880, 1108, 1320, 1760];
    notes.forEach((freq, idx) => {
      const t = startTime + idx * 0.05;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  /**
   * Sound when swinging and missing (empty hole or ground)
   */
  public playMiss() {
    this.vibrate(10);
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // White noise whoosh
      const bufferSize = this.ctx.sampleRate * 0.12;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.12);
      filter.Q.value = 2.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.12);
    } catch {
      // audio error handling
    }
  }

  /**
   * Sound for reaching a high combo (e.g., 5x, 10x)
   */
  public playComboCheer() {
    this.vibrate([30, 20, 30, 20, 50]);
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const t = now + idx * 0.06;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + 0.2);
      });
    } catch {
      // audio error handling
    }
  }

  /**
   * Warning tick when time is less than 5 seconds
   */
  public playTick() {
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // audio error handling
    }
  }

  /**
   * Game start sound
   */
  public playStart() {
    this.vibrate(20);
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const chords = [440, 554.37, 659.25]; // A major
      chords.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now);
        osc.stop(now + 0.4);
      });
    } catch {
      // audio error handling
    }
  }

  /**
   * Game Over fanfare
   */
  public playGameOver() {
    this.vibrate([100, 50, 100, 50, 200]);
    if (!this.soundEnabled) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [
        { f: 523.25, d: 0.15 }, // C5
        { f: 493.88, d: 0.15 }, // B4
        { f: 440.00, d: 0.15 }, // A4
        { f: 392.00, d: 0.50 }, // G4
      ];

      let elapsed = 0;
      notes.forEach((note) => {
        const t = now + elapsed;
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.f, t);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + note.d);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(t);
        osc.stop(t + note.d);

        elapsed += note.d * 0.9;
      });
    } catch {
      // audio error handling
    }
  }
}

export const sound = new SoundService();
