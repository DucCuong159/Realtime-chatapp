class SoundEffectEngine {
  private ctx: AudioContext | null = null;
  private ringInterval: number | null = null;
  private activeTimeouts: number[] = [];
  private isPlayingIncoming = false;
  private isPlayingOutgoing = false;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Plays a short tone with specified frequency, duration, and gain envelope.
   */
  private playTone(
    freq: number,
    durationMs: number,
    gainLevel = 0.15,
    type: OscillatorType = "sine",
  ) {
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const now = ctx.currentTime;
      const durationSec = durationMs / 1000;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gainLevel, now + 0.03);
      gain.gain.setValueAtTime(gainLevel, now + durationSec - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {
          // Ignore if already disconnected
        }
      };

      osc.start(now);
      osc.stop(now + durationSec);
    } catch {
      // AudioContext playback might be prevented by browser autoplay policy
    }
  }

  /**
   * Play Outgoing Ringback tone (periodic 440Hz + 480Hz tone: 1.2s ON, 2.5s OFF)
   */
  playOutgoingRing() {
    this.stopAll();
    this.isPlayingOutgoing = true;

    const playDualTone = () => {
      if (!this.isPlayingOutgoing) return;
      this.playTone(440, 1200, 0.1);
      this.playTone(480, 1200, 0.1);
    };

    playDualTone();
    this.ringInterval = window.setInterval(playDualTone, 3700);
  }

  /**
   * Play Incoming Ringtone (Harmonic chime chord sequence looping every 2.5s)
   */
  playIncomingRing() {
    this.stopAll();
    this.isPlayingIncoming = true;

    const playMelody = () => {
      if (!this.isPlayingIncoming) return;
      // Chime notes: E5 (659Hz), G#5 (830Hz), B5 (987Hz), E6 (1318Hz)
      const notes = [659.25, 830.61, 987.77, 1318.51];
      notes.forEach((freq, idx) => {
        const timeoutId = window.setTimeout(() => {
          if (this.isPlayingIncoming) {
            this.playTone(freq, 220, 0.12, "triangle");
          }
        }, idx * 140);
        this.activeTimeouts.push(timeoutId);
      });
    };

    playMelody();
    this.ringInterval = window.setInterval(playMelody, 2600);
  }

  /**
   * Play Call Ended Tone (3 descending beeps)
   */
  playCallEndTone() {
    this.stopAll();
    const beeps = [480, 400, 320];
    beeps.forEach((freq, idx) => {
      const timeoutId = window.setTimeout(() => {
        this.playTone(freq, 120, 0.12);
      }, idx * 150);
      this.activeTimeouts.push(timeoutId);
    });
  }

  /**
   * Stops all playing ringtones and clears timers
   */
  stopAll() {
    this.isPlayingIncoming = false;
    this.isPlayingOutgoing = false;
    if (this.ringInterval !== null) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    this.activeTimeouts.forEach((t) => clearTimeout(t));
    this.activeTimeouts = [];
  }

  /**
   * Full cleanup on unmount
   */
  destroy() {
    this.stopAll();
    if (this.ctx && this.ctx.state !== "closed") {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const soundEffects = new SoundEffectEngine();
