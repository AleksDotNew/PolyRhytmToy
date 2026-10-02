/**
 * Project State and Presets Definitions
 */

export const PRESETS = {
  'Square': [1, 1, 1, 1],
  'Triangle': [1, 1, 1],
  'Pentagon': [1, 1, 1, 1, 1],
  'Hexagon': [1, 1, 1, 1, 1, 1],
  '3:2': [3, 2],
  '3:3:2': [3, 3, 2],
  '3:2:3:2': [3, 2, 3, 2],
  '3:3:2:4': [3, 3, 2, 4],
  '5:2:3:2': [5, 2, 3, 2],
  '5:7': [5, 7],
  'Euclidean (3, 8)': [3, 3, 2],
  'Euclidean (5, 8)': [2, 1, 2, 1, 2],
  'Euclidean (5, 12)': [3, 2, 3, 2, 2],
  'Euclidean (7, 16)': [2, 3, 2, 2, 3, 2, 2],
  'Prime': [2, 3, 5, 7]
};

export const SAMPLE_OPTIONS = [
  { id: 'bd', label: 'Kick (bd)', color: '#ff2d55' },
  { id: 'sd', label: 'Snare (sd)', color: '#00e5ff' },
  { id: 'hh', label: 'Closed HH (hh)', color: '#ffea00' },
  { id: 'oh', label: 'Open HH (oh)', color: '#00e676' },
  { id: 'rim', label: 'Perc (rim)', color: '#b388ff' }
];

export function createDefaultInstrument(id, name, sample, ratios, radius, color, rotation = 1.0) {
  return {
    id: id || 'inst_' + Math.random().toString(36).substr(2, 9),
    name: name || 'Drum',
    sample: sample || 'bd',
    ratios: [...ratios],
    phase: 0, // degrees: 0..360
    rotation: rotation, // speed factor: e.g. 1.0, 1.25, 0.5
    engine: 'static', // 'static' | 'rotation' | 'drift' | 'mutation' | 'random'
    engineParams: {
      speed: rotation,
      drift: 0.15,
      mutationProb: 0.25,
      mutationAmount: 1,
      cycleLength: 4
    },
    gain: ratios.map((_, i) => (i === 0 ? 1.0 : 0.7)),
    radius: radius, // normalized 0..1
    color: color || '#ff2d55',
    muted: false,
    solo: false,
    cycleMode: 'locked' // 'locked' | 'free'
  };
}

export function createInitialState() {
  return {
    master: {
      beats: 4,
      subdivision: 16,
      bpm: 120,
      quantize: 'off', // 'off' | '1/4' | '1/8' | '1/16' | '1/32'
      cycleMode: 'locked', // 'locked' | 'free'
      seed: 48372,
      isPlaying: false
    },
    selectedInstrumentId: 'inst_kick',
    instruments: [
      {
        id: 'inst_kick',
        name: 'Kick',
        sample: 'bd',
        ratios: [3, 3, 2, 4],
        phase: 0,
        rotation: 1.0,
        engine: 'static',
        engineParams: { speed: 1.0, drift: 0.1, mutationProb: 0.2, mutationAmount: 1, cycleLength: 4 },
        gain: [1.0, 0.5, 0.8, 0.6],
        radius: 0.28,
        color: '#ff2d55',
        muted: false,
        solo: false,
        cycleMode: 'locked'
      },
      {
        id: 'inst_snare',
        name: 'Snare',
        sample: 'sd',
        ratios: [5, 2, 3, 2],
        phase: 0,
        rotation: 1.0,
        engine: 'static',
        engineParams: { speed: 1.0, drift: 0.1, mutationProb: 0.2, mutationAmount: 1, cycleLength: 4 },
        gain: [0.9, 0.5, 0.8, 0.6],
        radius: 0.48,
        color: '#00e5ff',
        muted: false,
        solo: false,
        cycleMode: 'locked'
      },
      {
        id: 'inst_hat',
        name: 'Closed HH',
        sample: 'hh',
        ratios: [1, 2, 1, 3, 1, 2, 2],
        phase: 0,
        rotation: 1.25, // 5/4 phase rotation
        engine: 'static',
        engineParams: { speed: 1.25, drift: 0.15, mutationProb: 0.3, mutationAmount: 1, cycleLength: 4 },
        gain: [0.7, 0.4, 0.6, 0.5, 0.7, 0.4, 0.6],
        radius: 0.68,
        color: '#ffea00',
        muted: false,
        solo: false,
        cycleMode: 'locked'
      },
      {
        id: 'inst_perc',
        name: 'Perc',
        sample: 'rim',
        ratios: [2, 3, 2, 3, 2],
        phase: 0,
        rotation: 1.75, // 7/4 phase rotation
        engine: 'static',
        engineParams: { speed: 1.75, drift: 0.2, mutationProb: 0.2, mutationAmount: 1, cycleLength: 4 },
        gain: [0.8, 0.6, 0.7, 0.5, 0.8],
        radius: 0.88,
        color: '#b388ff',
        muted: false,
        solo: false,
        cycleMode: 'locked'
      }
    ]
  };
}
