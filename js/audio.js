/**
 * Web Audio API Percussion Synthesizer
 * Fully self-contained, zero external asset dependencies, instant low-latency playback.
 */

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.isMuted = false;
    this.initialized = false;
  }

  init() {
    if (this.initialized && this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
  }

  setMasterVolume(val) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, val)), this.ctx.currentTime, 0.02);
    }
  }

  currentTime() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /**
   * Triggers an instrument sample at a specified AudioContext time or immediately
   * @param {string} sample - 'bd' | 'sd' | 'hh' | 'oh' | 'rim'
   * @param {number} velocity - 0.0 to 1.0
   * @param {number} time - AudioContext timestamp (optional)
   */
  trigger(sample, velocity = 0.8, time = null) {
    if (!this.initialized) this.init();
    if (this.isMuted || velocity <= 0.001) return;

    const t = time !== null && time >= this.ctx.currentTime ? time : this.ctx.currentTime;
    const vel = Math.max(0.01, Math.min(1.0, velocity));

    switch (sample.toLowerCase()) {
      case 'bd':
      case 'kick':
        this.playKick(t, vel);
        break;
      case 'sd':
      case 'snare':
        this.playSnare(t, vel);
        break;
      case 'hh':
      case 'hat':
      case 'closedhh':
        this.playClosedHat(t, vel);
        break;
      case 'oh':
      case 'openhh':
        this.playOpenHat(t, vel);
        break;
      case 'rim':
      case 'perc':
        this.playRimshot(t, vel);
        break;
      default:
        this.playKick(t, vel);
        break;
    }
  }

  /**
   * Punchy 808/909-style Kick with exponential pitch envelope and transient click
   */
  playKick(t, vel) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Pitch sweep: 150Hz -> 38Hz
    osc.frequency.setValueAtTime(140 + 60 * vel, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.08);

    // Gain envelope
    gain.gain.setValueAtTime(1.0 * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    // Click transient
    const clickOsc = this.ctx.createOscillator();
    const clickGain = this.ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(300, t);
    clickGain.gain.setValueAtTime(0.6 * vel, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    osc.connect(gain);
    gain.connect(this.masterGain);
    clickOsc.connect(clickGain);
    clickGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.38);
    clickOsc.start(t);
    clickOsc.stop(t + 0.025);
  }

  /**
   * Snare Drum: Tone body + filtered white noise snap
   */
  playSnare(t, vel) {
    // 1. Tonal body
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(65, t + 0.07);

    oscGain.gain.setValueAtTime(0.7 * vel, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);

    // 2. Noise snap
    const noiseBuffer = this.getNoiseBuffer();
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1200, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.85 * vel, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.14);
    noise.start(t);
    noise.stop(t + 0.22);
  }

  /**
   * Closed Hi-Hat: Metallic filtered noise with fast decay
   */
  playClosedHat(t, vel) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(8500, t);
    bandpass.Q.setValueAtTime(2.5, t);

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(7000, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.75 * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    noise.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.06);
  }

  /**
   * Open Hi-Hat: Ringing metallic sizzle with longer decay
   */
  playOpenHat(t, vel) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer();

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(7500, t);
    bandpass.Q.setValueAtTime(1.8, t);

    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(6000, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7 * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    noise.connect(bandpass);
    bandpass.connect(highpass);
    highpass.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + 0.35);
  }

  /**
   * Percussion / Rimshot: Resonant ping
   */
  playRimshot(t, vel) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1600, t);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.03);

    gain.gain.setValueAtTime(0.9 * vel, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  getNoiseBuffer() {
    if (!this._noiseBuffer && this.ctx) {
      const bufferSize = this.ctx.sampleRate * 1.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this._noiseBuffer = buffer;
    }
    return this._noiseBuffer;
  }
}
