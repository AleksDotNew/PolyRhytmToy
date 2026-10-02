/**
 * Mathematical model for Rhythmic Polygon geometry and timing
 */

export const TWO_PI = Math.PI * 2;

/**
 * Sum an array of numbers
 */
export function sum(arr) {
  return arr.reduce((acc, val) => acc + (Number(val) || 0), 0);
}

/**
 * Calculates cumulative normalized event times [0..1) from an array of ratios.
 * Events:
 * position[0] = 0
 * position[1] = ratios[0] / total
 * position[2] = (ratios[0] + ratios[1]) / total
 * ...
 */
export function calculateEventPositions(ratios) {
  if (!ratios || ratios.length === 0) return [];
  const total = sum(ratios);
  if (total <= 0) return ratios.map(() => 0);

  let accumulated = 0;
  return ratios.map((ratio) => {
    const pos = accumulated / total;
    accumulated += ratio;
    return pos;
  });
}

/**
 * Quantize a normalized phase [0..1) to closest grid step if quantize is active.
 * @param {number} t - normalized time in [0, 1)
 * @param {number|null} quantizeSubdivision - e.g. 16 for 1/16, or null for OFF
 */
export function quantizeTime(t, quantizeSubdivision) {
  if (!quantizeSubdivision || quantizeSubdivision <= 0) return t;
  const step = 1 / quantizeSubdivision;
  const snapped = Math.round(t / step) * step;
  return (snapped % 1 + 1) % 1;
}

/**
 * Converts normalized phase and radius into 2D cartesian coordinates on a circle.
 * Angle starts at 12 o'clock (-PI/2) and moves clockwise.
 */
export function phaseToCoordinates(phaseNormalized, radius, center = { x: 400, y: 400 }) {
  const angle = phaseNormalized * TWO_PI - Math.PI / 2;
  return {
    x: center.x + radius * Math.cos(angle),
    y: center.y + radius * Math.sin(angle),
    angle
  };
}

/**
 * Converts 2D cartesian point to normalized phase [0, 1) clockwise from 12 o'clock.
 */
export function coordinatesToPhase(point, center = { x: 400, y: 400 }) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  let angle = Math.atan2(dy, dx) + Math.PI / 2; // relative to 12 o'clock
  if (angle < 0) angle += TWO_PI;
  return angle / TWO_PI;
}

/**
 * Calculates distance from point to center
 */
export function distanceToCenter(point, center = { x: 400, y: 400 }) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return Math.hypot(dx, dy);
}

/**
 * Computes all vertex metadata for an instrument polygon
 */
export function computePolygonVertices(instrument, center, baseMaxRadius, quantizeSubdivision = null) {
  const ratios = instrument.ratios || [1, 1, 1, 1];
  const total = sum(ratios);
  const eventPositions = calculateEventPositions(ratios);
  const phaseTurns = ((instrument.phase % 360) + 360) % 360 / 360;
  const radius = instrument.radius * baseMaxRadius;

  return eventPositions.map((pos, i) => {
    // effective time on timeline
    let effTime = (pos + phaseTurns) % 1;
    if (quantizeSubdivision) {
      effTime = quantizeTime(effTime, quantizeSubdivision);
    }
    const coords = phaseToCoordinates(effTime, radius, center);
    const velocity = (instrument.gain && instrument.gain[i] !== undefined) ? instrument.gain[i] : 0.8;
    const ratio = ratios[i];

    return {
      index: i,
      ratio,
      nominalPos: pos,
      effectiveTime: effTime,
      x: coords.x,
      y: coords.y,
      angle: coords.angle,
      velocity
    };
  });
}

/**
 * Adjust ratios when dragging a vertex along the circle.
 * Keeps sum(ratios) constant and recalculates the ratio split between adjacent neighbors.
 */
export function updateRatiosFromVertexDrag(ratios, vertexIndex, newPhaseTurns, instrumentPhaseDeg = 0) {
  const count = ratios.length;
  if (count <= 1) return ratios;

  const total = sum(ratios);
  const phaseTurns = ((instrumentPhaseDeg % 360) + 360) % 360 / 360;
  let targetTime = (newPhaseTurns - phaseTurns + 10) % 1;

  const positions = calculateEventPositions(ratios);
  const prevIndex = (vertexIndex - 1 + count) % count;
  const nextIndex = (vertexIndex + 1) % count;

  // Vertex 0 is fixed at local phase 0; dragging vertex 0 rotates the entire polygon phase!
  if (vertexIndex === 0) {
    return {
      ratios: [...ratios],
      phaseDelta: (newPhaseTurns - phaseTurns) * 360
    };
  }

  const prevPos = positions[prevIndex];
  // Calculate wrap-around bounds
  let nextPos = positions[nextIndex];
  if (nextIndex === 0) nextPos = 1.0;

  // Clamp target time between prev and next with a minimal gap
  const minGap = 0.02; // minimum distance between vertices
  const clampedTime = Math.max(prevPos + minGap, Math.min(nextPos - minGap, targetTime));

  const newRatios = [...ratios];
  // Duration before dragged vertex:
  const prevInterval = clampedTime - prevPos;
  // Duration after dragged vertex:
  const nextInterval = nextPos - clampedTime;

  // Map normalized intervals back to ratio units
  const combinedRatios = ratios[prevIndex] + ratios[vertexIndex];
  const combinedSpan = nextPos - prevPos;
  if (combinedSpan > 0.0001) {
    const fraction = prevInterval / combinedSpan;
    let r1 = Math.max(0.5, Math.round(combinedRatios * fraction * 10) / 10);
    let r2 = Math.max(0.5, Math.round((combinedRatios - r1) * 10) / 10);
    newRatios[prevIndex] = r1;
    newRatios[vertexIndex] = r2;
  }

  return { ratios: newRatios, phaseDelta: 0 };
}

/**
 * Euclidean rhythm generator (Björklund algorithm)
 * Distributes k pulses evenly across n steps.
 * Returns ratios between pulses!
 */
export function generateEuclideanRatios(pulses, steps) {
  pulses = Math.max(1, Math.min(pulses, steps));
  if (pulses >= steps) return new Array(steps).fill(1);

  let pattern = [];
  let counts = [];
  let remainders = [];
  let divisor = steps - pulses;
  remainders.push(pulses);
  let level = 0;

  while (true) {
    counts.push(Math.floor(divisor / remainders[level]));
    remainders.push(divisor % remainders[level]);
    divisor = remainders[level];
    level++;
    if (remainders[level] <= 1) {
      counts.push(divisor);
      break;
    }
  }

  function build(lvl) {
    if (lvl > level) return [0];
    if (lvl === level) return [1];
    let res = [];
    for (let i = 0; i < counts[lvl]; i++) {
      res = res.concat(build(lvl + 1));
    }
    if (remainders[lvl + 1] !== 0) {
      res = res.concat(build(lvl + 2));
    }
    return res;
  }

  // Simpler direct Bresenham / Björklund distribution
  const hits = [];
  for (let i = 0; i < steps; i++) {
    hits.push((i * pulses) % steps < pulses ? 1 : 0);
  }

  // Convert binary hits to ratios (distances between 1s)
  const ratios = [];
  let currentDist = 0;
  let firstHitFound = false;
  let leadingZeros = 0;

  for (let i = 0; i < steps; i++) {
    currentDist++;
    if (hits[i] === 1) {
      if (!firstHitFound) {
        firstHitFound = true;
        leadingZeros = currentDist - 1;
        currentDist = 0;
      } else {
        ratios.push(currentDist);
        currentDist = 0;
      }
    }
  }
  if (firstHitFound) {
    ratios.push(currentDist + leadingZeros);
  }

  return ratios.length > 0 ? ratios : [1, 1, 1, 1];
}
