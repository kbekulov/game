import { randRange } from "../core/math";

type ReloadKind = "reload" | "empty";

export class AudioManager {
  private readonly context: AudioContext | null;
  private readonly masterGain: GainNode | null;
  private readonly ambienceGain: GainNode | null;
  private readonly sfxGain: GainNode | null;
  private readonly noiseBuffer: AudioBuffer | null;
  private windSource: AudioBufferSourceNode | null = null;
  private birdTimer = randRange(2.5, 5.5);
  private unlocked = false;

  constructor() {
    const AudioContextCtor = window.AudioContext;

    if (!AudioContextCtor) {
      this.context = null;
      this.masterGain = null;
      this.ambienceGain = null;
      this.sfxGain = null;
      this.noiseBuffer = null;
      return;
    }

    this.context = new AudioContextCtor();
    this.masterGain = this.context.createGain();
    this.ambienceGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.noiseBuffer = this.createNoiseBuffer(4);

    this.masterGain.gain.value = 0.8;
    this.ambienceGain.gain.value = 0.14;
    this.sfxGain.gain.value = 0.95;

    this.ambienceGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
  }

  async unlock(): Promise<void> {
    if (!this.context) {
      return;
    }

    if (this.context.state !== "running") {
      await this.context.resume();
    }

    this.unlocked = true;
    this.ensureAmbient();
  }

  update(dt: number): void {
    if (!this.context || !this.unlocked) {
      return;
    }

    this.birdTimer -= dt;

    if (this.birdTimer <= 0) {
      this.playBirdChirp();
      this.birdTimer = randRange(3.6, 7.4);
    }
  }

  playGunshot(): void {
    if (!this.context || !this.sfxGain || !this.unlocked) {
      return;
    }

    const now = this.context.currentTime;
    this.playTone(now, 165, 72, 0.13, 0.17, "triangle");
    this.playNoise(now, 0.08, 0.18, 680, 3800);
    this.playTone(now + 0.01, 920, 280, 0.04, 0.04, "square");
  }

  playReload(kind: ReloadKind): void {
    if (!this.context || !this.unlocked) {
      return;
    }

    const now = this.context.currentTime;
    const clicks = kind === "empty"
      ? [0.0, 0.18, 0.42, 0.69, 0.97, 1.18]
      : [0.0, 0.19, 0.49, 0.84];

    for (const offset of clicks) {
      this.playTone(now + offset, 420, 180, 0.03, 0.03, "square");
      this.playNoise(now + offset, 0.02, 0.03, 1100, 5400);
    }
  }

  playDryFire(): void {
    if (!this.context || !this.unlocked) {
      return;
    }

    const now = this.context.currentTime;
    this.playTone(now, 510, 220, 0.04, 0.025, "square");
    this.playNoise(now, 0.018, 0.018, 1900, 6200);
  }

  playFootstep(sprinting: boolean): void {
    if (!this.context || !this.unlocked) {
      return;
    }

    const now = this.context.currentTime;
    this.playTone(now, sprinting ? 84 : 62, 40, 0.09, sprinting ? 0.08 : 0.055, "triangle");
    this.playNoise(now, sprinting ? 0.06 : 0.045, sprinting ? 0.065 : 0.05, 120, 950);
  }

  playEnemyShot(): void {
    if (!this.context || !this.unlocked) {
      return;
    }

    const now = this.context.currentTime;
    this.playTone(now, 480, 160, 0.16, 0.09, "sawtooth");
    this.playNoise(now, 0.05, 0.05, 2400, 6200);
  }

  playHitConfirm(): void {
    if (!this.context || !this.unlocked) {
      return;
    }

    const now = this.context.currentTime;
    this.playTone(now, 920, 1040, 0.06, 0.05, "triangle");
  }

  playDamage(): void {
    if (!this.context || !this.unlocked) {
      return;
    }

    const now = this.context.currentTime;
    this.playTone(now, 120, 48, 0.18, 0.16, "sawtooth");
    this.playNoise(now, 0.08, 0.07, 80, 560);
  }

  private ensureAmbient(): void {
    if (!this.context || !this.ambienceGain || !this.noiseBuffer || this.windSource) {
      return;
    }

    const wind = this.context.createBufferSource();
    wind.buffer = this.noiseBuffer;
    wind.loop = true;

    const highpass = this.context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 190;

    const lowpass = this.context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = 1800;

    const gain = this.context.createGain();
    gain.gain.value = 0.22;

    wind.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.ambienceGain);
    wind.start();

    this.windSource = wind;
  }

  private playTone(
    start: number,
    frequencyStart: number,
    frequencyEnd: number,
    duration: number,
    volume: number,
    type: OscillatorType
  ): void {
    if (!this.context || !this.sfxGain) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(10, frequencyStart), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(10, frequencyEnd), start + duration);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(this.sfxGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  private playNoise(
    start: number,
    duration: number,
    volume: number,
    low: number,
    high: number
  ): void {
    if (!this.context || !this.sfxGain || !this.noiseBuffer) {
      return;
    }

    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;

    const highpass = this.context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = low;

    const lowpass = this.context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = high;

    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(this.sfxGain);
    source.start(start);
    source.stop(start + duration + 0.03);
  }

  private playBirdChirp(): void {
    if (!this.context || !this.unlocked) {
      return;
    }

    const now = this.context.currentTime;
    this.playTone(now, randRange(1400, 1900), randRange(2000, 2600), 0.16, 0.025, "triangle");
    this.playTone(
      now + 0.12,
      randRange(1900, 2300),
      randRange(2400, 3100),
      0.11,
      0.018,
      "triangle"
    );
  }

  private createNoiseBuffer(duration: number): AudioBuffer {
    if (!this.context) {
      throw new Error("Audio context missing");
    }

    const sampleRate = this.context.sampleRate;
    const frameCount = Math.floor(sampleRate * duration);
    const buffer = this.context.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < frameCount; index += 1) {
      data[index] = Math.random() * 2 - 1;
    }

    return buffer;
  }
}
