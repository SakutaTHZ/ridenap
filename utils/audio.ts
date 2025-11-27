import { SoundType } from '../types';

class AlarmSystem {
  private audioContext: AudioContext | null = null;
  private isPlaying: boolean = false;
  private intervalId: number | null = null;
  private currentSoundType: SoundType = 'classic';

  private initialize() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  // Needed to unlock audio on iOS/Android
  public prime() {
    this.initialize();
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  public setSoundType(type: SoundType) {
    this.currentSoundType = type;
  }

  public previewSound(type: SoundType) {
    this.initialize();
    this.playSound(type, true);
  }

  public startAlarm() {
    if (this.isPlaying) return;
    this.initialize();
    this.isPlaying = true;

    const loop = () => {
      if (!this.isPlaying) return;
      this.playSound(this.currentSoundType);
    };

    loop();
    // Timing depends on the sound type length
    const interval = this.currentSoundType === 'chime' ? 2000 : 1000;
    this.intervalId = window.setInterval(loop, interval);
  }

  public stopAlarm() {
    this.isPlaying = false;
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private playSound(type: SoundType, isPreview = false) {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const t = ctx.currentTime;

    if (type === 'classic') {
      // Classic Beep (Square wave)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, t); 
      osc.frequency.exponentialRampToValueAtTime(440, t + 0.1);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

      osc.start(t);
      osc.stop(t + 0.5);

    } else if (type === 'chime') {
      // Soft Chime (Sine waves)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.type = 'sine';
      osc2.type = 'sine';
      
      // Major 3rd interval
      osc1.frequency.setValueAtTime(523.25, t); // C5
      osc2.frequency.setValueAtTime(659.25, t); // E5

      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.05); // Attack
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5); // Long Decay

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 1.5);
      osc2.stop(t + 1.5);

    } else if (type === 'urgent') {
      // Urgent Siren (Sawtooth ramp)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(1200, t + 0.3); // Rise

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);

      osc.start(t);
      osc.stop(t + 0.4);
    }
  }
}

export const alarmSystem = new AlarmSystem();
