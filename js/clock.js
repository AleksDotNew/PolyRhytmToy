/**
 * Master Clock and Timing Scheduler
 */

export class MasterClock {
  constructor(options = {}) {
    this.bpm = options.bpm || 120;
    this.beats = options.beats || 4;
    this.subdivision = options.subdivision || 16;
    this.isPlaying = false;

    // Time tracking
    this.phase = 0; // 0..1 normalized master cycle
    this.cycleCount = 0;
    this.lastTimestamp = null;
    this.totalElapsedTime = 0;

    // Callbacks
    this.onTickCallbacks = [];
    this.onEventCallbacks = [];

    this._rafId = null;
    this._boundLoop = this._loop.bind(this);
  }

  /**
   * Length of one full master cycle in seconds
   */
  get cycleDuration() {
    return (60 / this.bpm) * this.beats;
  }

  setBpm(bpm) {
    this.bpm = Math.max(20, Math.min(300, Number(bpm) || 120));
  }

  setMeter(beats, subdivision) {
    this.beats = Math.max(1, Math.min(16, Number(beats) || 4));
    this.subdivision = Math.max(1, Math.min(64, Number(subdivision) || 16));
  }

  onTick(cb) {
    this.onTickCallbacks.push(cb);
  }

  onEvent(cb) {
    this.onEventCallbacks.push(cb);
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.lastTimestamp = performance.now();
    this._rafId = requestAnimationFrame(this._boundLoop);
  }

  stop() {
    this.isPlaying = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this.lastTimestamp = null;
  }

  reset() {
    this.phase = 0;
    this.cycleCount = 0;
    this.totalElapsedTime = 0;
  }

  _loop(now) {
    if (!this.isPlaying) return;

    if (!this.lastTimestamp) this.lastTimestamp = now;
    const deltaMs = Math.min(now - this.lastTimestamp, 100); // clamp delta to prevent spiral
    this.lastTimestamp = now;

    const dtSeconds = deltaMs / 1000;
    this.totalElapsedTime += dtSeconds;

    const prevPhase = this.phase;
    const cycleDur = this.cycleDuration;
    const phaseAdvance = dtSeconds / cycleDur;
    let nextPhase = (prevPhase + phaseAdvance);

    let wrapped = false;
    if (nextPhase >= 1.0) {
      this.cycleCount++;
      wrapped = true;
    }
    this.phase = nextPhase % 1.0;

    // Fire tick callbacks with accurate phase range
    for (const cb of this.onTickCallbacks) {
      cb({
        prevPhase,
        currPhase: this.phase,
        dt: dtSeconds,
        wrapped,
        cycleCount: this.cycleCount,
        bpm: this.bpm,
        beats: this.beats,
        subdivision: this.subdivision
      });
    }

    this._rafId = requestAnimationFrame(this._boundLoop);
  }
}
