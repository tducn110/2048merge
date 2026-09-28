class SoundController {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // Lazy init audio context on first user interaction
    try {
      const saved = localStorage.getItem('2048_sound_muted');
      if (saved !== null) {
        this.muted = saved === 'true';
      }
    } catch {
      // ignore
    }
  }

  private init() {
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

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    try {
      localStorage.setItem('2048_sound_muted', String(this.muted));
    } catch {
      // ignore
    }
    return this.muted;
  }

  public playShoot() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // ignore audio errors
    }
  }

  public playSettle() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // ignore
    }
  }

  public playMerge(tileValue: number, combo = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      // Frequency rises with tile value and combo
      const baseFreq = 261.63; // C4
      const exponent = Math.min(14, Math.log2(Math.max(2, tileValue)));
      const freq = baseFreq * Math.pow(1.08, exponent) * (1 + (combo - 1) * 0.08);

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.18);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.23);

      // Subtle second harmonic for rich pop
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, now);
      gain2.gain.setValueAtTime(0.1, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.16);
    } catch {
      // ignore
    }
  }

  public playSquareMerge() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      // Major golden chord: C5, E5, G5, C6 in fast arpeggio
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = now + idx * 0.05;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch {
      // ignore
    }
  }

  public playTripleMerge() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      // Electric power triplet: G4, C5, E5 with synth tone
      const notes = [392.00, 523.25, 659.25];
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = now + idx * 0.04;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.1, startTime + 0.25);

        gain.gain.setValueAtTime(0.22, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.32);
      });
    } catch {
      // ignore
    }
  }

  public playBonusRush() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      // Triumphant rising fanfare: C4, E4, G4, C5, E5, G5, C6 in energetic ascending sequence
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50];
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = now + idx * 0.045;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, startTime + 0.22);

        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.32);
      });
    } catch {
      // ignore
    }
  }

  public playGameOver() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [330, 293, 261, 196];
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = now + idx * 0.14;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.28);
      });
    } catch {
      // ignore
    }
  }

  /**
   * 3x Combo Tier: High-intensity, resonant brass/glass bell sound with rich harmonics
   */
  public playBellCombo3x() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Bell harmonic partials: fundamental A5 ~880Hz, nominal 1760Hz, quint 2640Hz + transient strike
      const partials = [
        { freq: 880, gain: 0.28, decay: 0.65, type: 'sine' as OscillatorType },
        { freq: 1046.5, gain: 0.18, decay: 0.5, type: 'sine' as OscillatorType },
        { freq: 1318.5, gain: 0.14, decay: 0.45, type: 'triangle' as OscillatorType },
        { freq: 1760, gain: 0.16, decay: 0.55, type: 'sine' as OscillatorType },
        { freq: 2640, gain: 0.09, decay: 0.35, type: 'sine' as OscillatorType },
        { freq: 3520, gain: 0.05, decay: 0.18, type: 'sine' as OscillatorType },
      ];

      partials.forEach(({ freq, gain, decay, type }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(gain, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + decay + 0.02);
      });
    } catch {
      // ignore
    }
  }

  /**
   * 4x Combo Tier: High-intensity arcade/retro 'level-up' ascending chime arpeggio with shimmering glissando
   */
  public playLevelUpChime4x() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // Ascending triumphant chord: C5, E5, G5, B5, C6 with sparkling twin harmonics
      const chimeNotes = [523.25, 659.25, 783.99, 987.77, 1046.50, 1318.51];

      chimeNotes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const startTime = now + idx * 0.045;
        const duration = 0.42;

        // Primary bright synth chime
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.04, startTime + duration);

        gain.gain.setValueAtTime(0.22, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.02);

        // Secondary high-sparkle sine overtone
        const oscHigh = this.ctx.createOscillator();
        const gainHigh = this.ctx.createGain();

        oscHigh.type = 'sine';
        oscHigh.frequency.setValueAtTime(freq * 2, startTime);

        gainHigh.gain.setValueAtTime(0.1, startTime);
        gainHigh.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);

        oscHigh.connect(gainHigh);
        gainHigh.connect(this.ctx.destination);

        oscHigh.start(startTime);
        oscHigh.stop(startTime + duration * 0.7 + 0.02);
      });
    } catch {
      // ignore
    }
  }

  /**
   * 5x+ Combo Tier: Epic, thunderous 'mythic' gong with deep sub-bass impact and shimmering metallic overtones
   */
  public playMythicGong5x() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Heavy sub-bass impact punch
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();

      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(120, now);
      subOsc.frequency.exponentialRampToValueAtTime(55, now + 0.35);

      subGain.gain.setValueAtTime(0.35, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);

      subOsc.start(now);
      subOsc.stop(now + 0.85);

      // 2. Disharmonic metallic gong cluster (authentic vibrating metal shimmer)
      const gongPartials = [
        { freq: 110, gain: 0.3, decay: 1.1, type: 'triangle' as OscillatorType },
        { freq: 164.81, gain: 0.22, decay: 0.95, type: 'sine' as OscillatorType },
        { freq: 220, gain: 0.2, decay: 0.9, type: 'triangle' as OscillatorType },
        { freq: 329.63, gain: 0.16, decay: 0.8, type: 'sine' as OscillatorType },
        { freq: 440, gain: 0.14, decay: 0.75, type: 'sine' as OscillatorType },
        { freq: 448, gain: 0.12, decay: 0.7, type: 'sine' as OscillatorType }, // Detuned partial for beating oscillation
        { freq: 659.25, gain: 0.1, decay: 0.65, type: 'triangle' as OscillatorType },
        { freq: 880, gain: 0.08, decay: 0.5, type: 'sine' as OscillatorType },
        { freq: 1320, gain: 0.05, decay: 0.4, type: 'sine' as OscillatorType },
      ];

      gongPartials.forEach(({ freq, gain, decay, type }) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gainNode.gain.setValueAtTime(gain, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay);

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + decay + 0.02);
      });
    } catch {
      // ignore
    }
  }

  /**
   * Helper to play unique sound effects based on combo tiers:
   * - 3x: Bell sound
   * - 4x: Level-up chime
   * - 5x+: Mythic gong
   */
  public playComboTierSound(combo: number) {
    if (combo >= 5) {
      this.playMythicGong5x();
    } else if (combo === 4) {
      this.playLevelUpChime4x();
    } else if (combo === 3) {
      this.playBellCombo3x();
    }
  }

  /**
   * Enhanced haptic feedback for buttons, aiming, and firing:
   * - 'tick' / 'selection': Ultra-crisp subtle tick (6ms) for column hover/aiming across grid
   * - 'tap': Gentle crisp tap (10ms) for UI button presses
   * - 'light': Snappy light pulse (16ms) for tile launch and soft actions
   * - 'double': Tactile double pulse (10ms-30ms-14ms) for tile swaps and booster activations
   * - 'medium': Solid punch (35ms) for medium merges and 3x combos
   * - 'heavy': Dynamic rhythmic pulse for 4x combos, bonus rush, and game events
   * - 'mythic': Deep multi-phase rumbling pulse (60-40-90-50-150ms) for 5x+ mega chains
   */
  public triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'mythic' | 'selection' | 'tap' | 'tick' | 'double' = 'light') {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        if (type === 'tick' || type === 'selection') {
          navigator.vibrate(6);
        } else if (type === 'tap') {
          navigator.vibrate(10);
        } else if (type === 'light') {
          navigator.vibrate(16);
        } else if (type === 'double') {
          navigator.vibrate([10, 30, 14]);
        } else if (type === 'medium') {
          navigator.vibrate(35);
        } else if (type === 'heavy') {
          navigator.vibrate([40, 30, 60]);
        } else if (type === 'mythic') {
          navigator.vibrate([60, 40, 90, 50, 150]);
        }
      } catch {
        // ignore
      }
    }
  }
}

export const soundFx = new SoundController();
