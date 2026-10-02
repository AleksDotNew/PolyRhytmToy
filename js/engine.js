/**
 * Rhythmic Polygon Engine System
 * Handles Static, Rotation, Phase Drift, Mutation, and Controlled Random generative behaviors.
 */

import { sum } from './geometry.js';
import { SeededRandom } from './random.js';

export class EngineManager {
  constructor(seed = 48372) {
    this.seed = seed;
    this.rng = new SeededRandom(seed);
    this.instrumentStates = new Map(); // tracks last mutation cycle per instrument
  }

  setSeed(seed) {
    this.seed = seed;
    this.rng.setSeed(seed);
    this.instrumentStates.clear();
  }

  /**
   * Update instrument phases and generative mutations on each clock tick
   * @param {Array} instruments - list of instrument objects
   * @param {Object} tickInfo - { dt, currPhase, wrapped, cycleCount, bpm, beats }
   */
  update(instruments, tickInfo) {
    const { dt, wrapped, cycleCount } = tickInfo;

    instruments.forEach((inst) => {
      if (!inst || inst.muted) return;

      const engine = inst.engine || 'static';
      const params = inst.engineParams || {};

      switch (engine) {
        case 'static':
          // Static: polygon orientation is fixed, does not rotate automatically
          break;

        case 'rotation': {
          // Continuous uniform rotation
          // speed factor: 1.0 means 1 full rotation per master cycle
          const speed = params.speed !== undefined ? params.speed : (inst.rotation || 1.0);
          const degPerSec = (speed * 360) / ((60 / tickInfo.bpm) * tickInfo.beats);
          inst.phase = (inst.phase + degPerSec * dt) % 360;
          if (inst.phase < 0) inst.phase += 360;
          break;
        }

        case 'drift': {
          // Slow gradual phase shift
          const driftDegPerSec = (params.drift || 0.15) * 360;
          inst.phase = (inst.phase + driftDegPerSec * dt) % 360;
          if (inst.phase < 0) inst.phase += 360;
          break;
        }

        case 'mutation': {
          // Periodically swap or mutate adjacent ratios preserving sum(ratios)
          if (wrapped) {
            const cycleInterval = Math.max(1, Math.round(params.cycleLength || 4));
            if (cycleCount % cycleInterval === 0) {
              this.applyMutation(inst, params.mutationAmount || 1, params.mutationProb || 0.4);
            }
          }
          break;
        }

        case 'random': {
          // Controlled deterministic random mutation using seed
          if (wrapped) {
            const cycleInterval = Math.max(1, Math.round(params.cycleLength || 2));
            if (cycleCount % cycleInterval === 0) {
              const roll = this.rng.next();
              const prob = params.mutationProb !== undefined ? params.mutationProb : 0.5;
              if (roll < prob) {
                this.applyControlledRandom(inst, params.mutationAmount || 1);
              }
            }
          }
          break;
        }
      }
    });
  }

  /**
   * Controlled mutation: slightly perturbs two adjacent ratios while strictly preserving their sum.
   * Keeps ratios within bounded musical range [1, 16].
   */
  applyMutation(inst, amount = 1, probability = 0.5) {
    if (!inst.ratios || inst.ratios.length < 2) return;
    if (Math.random() > probability) return;

    const count = inst.ratios.length;
    const i = Math.floor(Math.random() * count);
    const j = (i + 1) % count;

    const delta = (Math.random() > 0.5 ? 1 : -1) * amount;
    const minVal = 1;
    const maxVal = 16;

    if (inst.ratios[i] + delta >= minVal &&
        inst.ratios[i] + delta <= maxVal &&
        inst.ratios[j] - delta >= minVal &&
        inst.ratios[j] - delta <= maxVal) {
      inst.ratios[i] += delta;
      inst.ratios[j] -= delta;
    }
  }

  /**
   * Deterministic mutation using the seeded PRNG
   */
  applyControlledRandom(inst, maxDelta = 1) {
    if (!inst.ratios || inst.ratios.length < 2) return;

    const count = inst.ratios.length;
    const i = this.rng.rangeInt(0, count - 1);
    const j = (i + 1) % count;

    const delta = (this.rng.next() > 0.5 ? 1 : -1) * Math.max(1, Math.round(maxDelta));
    const minVal = 1;
    const maxVal = 16;

    if (inst.ratios[i] + delta >= minVal &&
        inst.ratios[i] + delta <= maxVal &&
        inst.ratios[j] - delta >= minVal &&
        inst.ratios[j] - delta <= maxVal) {
      inst.ratios[i] += delta;
      inst.ratios[j] -= delta;
    }
  }
}
