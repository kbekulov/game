import type { SurfaceType } from "@/core/config.ts";

const clampGain = (value: number): number => Math.max(0, Math.min(1, value));

export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private startedAmbient = false;
  private birdTimer = 0;
  private volume = 0.8;

  async resume(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.ambientGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.ambientGain.connect(this.masterGain);
      this.ambientGain.gain.value = 0.08;
      this.masterGain.gain.value = this.volume;
    }

    if (this.context.state !== "running") {
      await this.context.resume();
    }

    if (!this.startedAmbient) {
      this.startAmbient();
    }
  }

  setVolume(value: number): void {
    this.volume = clampGain(value);
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.05);
    }
  }

  update(dt: number, active: boolean): void {
    if (!this.context || !this.ambientGain) {
      return;
    }

    const target = active ? 0.08 : 0.03;
    this.ambientGain.gain.setTargetAtTime(target, this.context.currentTime, 0.4);
    this.birdTimer -= dt;

    if (active && this.birdTimer <= 0) {
      this.playBirdChirp();
      this.birdTimer = 4 + Math.random() * 6;
    }
  }

  playShot(): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const now = this.context.currentTime;
    const noise = this.createNoiseSource(0.06);
    const highPass = this.context.createBiquadFilter();
    highPass.type = "highpass";
    highPass.frequency.value = 620;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    noise.connect(highPass);
    highPass.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.08);

    this.playTone(150, 0.03, "triangle", 0.18, 0.001);
    this.playTone(96, 0.08, "sine", 0.13, 0.001);
  }

  playDryFire(): void {
    this.playTone(440, 0.018, "square", 0.05, 0.001);
    this.playTone(220, 0.025, "triangle", 0.03, 0.001);
  }

  playReloadOut(): void {
    this.playTone(520, 0.02, "triangle", 0.05, 0.001);
    this.playTone(240, 0.03, "square", 0.03, 0.001);
  }

  playReloadIn(): void {
    this.playTone(330, 0.03, "triangle", 0.06, 0.001);
    this.playTone(180, 0.06, "sine", 0.04, 0.001);
  }

  playSlideRack(): void {
    this.playTone(740, 0.02, "triangle", 0.045, 0.001);
    this.playTone(260, 0.05, "square", 0.04, 0.001);
  }

  playPressCheck(): void {
    this.playTone(610, 0.028, "triangle", 0.045, 0.001);
    this.playTone(270, 0.04, "sine", 0.03, 0.001);
  }

  playTargetImpact(): void {
    this.playTone(920, 0.03, "triangle", 0.06, 0.001);
    this.playTone(430, 0.07, "sine", 0.05, 0.001);
  }

  playTargetFall(): void {
    this.playTone(280, 0.08, "triangle", 0.06, 0.001);
  }

  playImpact(surface: SurfaceType): void {
    if (surface === "metal") {
      this.playTone(1100, 0.028, "triangle", 0.03, 0.001);
      return;
    }

    if (surface === "wood") {
      this.playTone(180, 0.05, "square", 0.03, 0.001);
      return;
    }

    this.playTone(120, 0.06, "triangle", 0.025, 0.001);
  }

  playFootstep(surface: SurfaceType, intensity: number): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const now = this.context.currentTime;
    const noise = this.createNoiseSource(0.06);
    const filter = this.context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = surface === "wood" ? 220 : surface === "metal" ? 820 : 340;
    filter.Q.value = 0.9;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.05 * intensity, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
    noise.stop(now + 0.08);
  }

  playJump(): void {
    this.playTone(210, 0.04, "triangle", 0.035, 0.001);
  }

  playLand(intensity: number): void {
    this.playTone(110, 0.07, "triangle", 0.04 * intensity, 0.001);
  }

  private startAmbient(): void {
    if (!this.context || !this.masterGain || !this.ambientGain) {
      return;
    }

    const noise = this.createNoiseSource(4);
    const filter = this.context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 600;
    const gain = this.context.createGain();
    gain.gain.value = 0.035;
    noise.loop = true;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ambientGain);
    noise.start();
    this.startedAmbient = true;
  }

  private playBirdChirp(): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(980 + Math.random() * 180, now);
    oscillator.frequency.exponentialRampToValueAtTime(1460 + Math.random() * 120, now + 0.08);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.02, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(now);
    oscillator.stop(now + 0.16);
  }

  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    peak: number,
    end: number
  ): void {
    if (!this.context || !this.masterGain) {
      return;
    }

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(peak, now);
    gain.gain.exponentialRampToValueAtTime(end, now + duration);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }

  private createNoiseSource(duration: number): AudioBufferSourceNode {
    if (!this.context) {
      throw new Error("AudioContext has not been initialized.");
    }

    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, Math.max(1, Math.floor(sampleRate * duration)), sampleRate);
    const channel = buffer.getChannelData(0);

    for (let index = 0; index < channel.length; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    const source = this.context.createBufferSource();
    source.buffer = buffer;
    return source;
  }
}
