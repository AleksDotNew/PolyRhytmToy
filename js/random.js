/**
 * Seeded PRNG using Mulberry32 algorithm
 * Provides deterministic pseudorandom numbers for generative rhythm engines.
 */
export class SeededRandom {
  constructor(seed = Date.now()) {
    this.setSeed(seed);
  }

  setSeed(seed) {
    if (typeof seed === 'string') {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
      }
      this.seed = h >>> 0;
    } else {
      this.seed = Math.floor(Math.abs(seed)) >>> 0;
    }
    this.initialSeed = this.seed;
  }

  /**
   * Returns a float between [0, 1)
   */
  next() {
    let t = (this.seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Float between [min, max)
   */
  range(min, max) {
    return min + this.next() * (max - min);
  }

  /**
   * Integer between [min, max] inclusive
   */
  rangeInt(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  /**
   * Pick random item from array
   */
  choice(array) {
    if (!array || array.length === 0) return null;
    return array[this.rangeInt(0, array.length - 1)];
  }

  /**
   * Shuffle array in-place (Fisher-Yates)
   */
  shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
