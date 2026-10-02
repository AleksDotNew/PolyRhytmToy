/**
 * Rhythm Polygon Entity
 * Encapsulates single polygon properties, geometry computation, and serialization.
 */

import { sum, calculateEventPositions, computePolygonVertices, updateRatiosFromVertexDrag } from './geometry.js';

export class RhythmPolygon {
  constructor(config = {}) {
    this.id = config.id || 'poly_' + Math.random().toString(36).substr(2, 9);
    this.name = config.name || 'Kick';
    this.sample = config.sample || 'bd';
    this.ratios = [...(config.ratios || [3, 3, 2, 4])];
    this.phase = config.phase || 0; // 0..360 deg
    this.rotation = config.rotation !== undefined ? config.rotation : 1.0;
    this.gain = [...(config.gain || this.ratios.map(() => 0.8))];
    this.radius = config.radius !== undefined ? config.radius : 0.5;
    this.color = config.color || '#ff2d55';
    this.muted = !!config.muted;
    this.solo = !!config.solo;
    this.engine = config.engine || 'static';
    this.engineParams = { ...(config.engineParams || { speed: 1.0, drift: 0.15, mutationProb: 0.3, mutationAmount: 1, cycleLength: 4 }) };
    this.cycleMode = config.cycleMode || 'locked';
  }

  get totalRatios() {
    return sum(this.ratios);
  }

  get eventPositions() {
    return calculateEventPositions(this.ratios);
  }

  computeVertices(center, maxRadius, quantizeSub = null) {
    return computePolygonVertices(this, center, maxRadius, quantizeSub);
  }

  updateVertexDrag(vertexIdx, newPhaseTurns) {
    return updateRatiosFromVertexDrag(this.ratios, vertexIdx, newPhaseTurns, this.phase);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      sample: this.sample,
      ratios: [...this.ratios],
      phase: this.phase,
      rotation: this.rotation,
      gain: [...this.gain],
      radius: this.radius,
      color: this.color,
      muted: this.muted,
      solo: this.solo,
      engine: this.engine,
      engineParams: { ...this.engineParams },
      cycleMode: this.cycleMode
    };
  }
}
