/**
 * Strudel Exporter
 * Generates idiomatic Strudel Tidal code from Rhythmic Polygon states.
 */

import { sum, calculateEventPositions, quantizeTime } from './geometry.js';

export class StrudelExporter {
  /**
   * Generates Strudel code string from project state
   * @param {Object} state - full application state
   * @returns {{ code: string, hasFractionalWarning: boolean }}
   */
  static export(state) {
    const { master, instruments } = state;
    const bpm = master.bpm || 120;
    const beats = master.beats || 4;
    const subdivision = master.subdivision || 16;
    const quantize = master.quantize; // 'off' | '1/4' | '1/8' | '1/16' | '1/32'

    let hasFractionalWarning = false;
    const activeInstruments = instruments.filter(inst => !inst.muted);

    if (activeInstruments.length === 0) {
      return {
        code: `// All instruments muted\nstack()`,
        hasFractionalWarning: false
      };
    }

    const lines = [];
    lines.push(`// Rhythmic Polygon -> Strudel Export`);
    lines.push(`// Meter: ${beats}/4 | BPM: ${bpm} | Subdivision: ${subdivision}`);
    lines.push(`setcps(${bpm} / 60 / ${beats});\n`);

    const stackItems = activeInstruments.map((inst) => {
      const sample = inst.sample || 'bd';
      const ratios = inst.ratios || [1, 1, 1, 1];
      const gains = inst.gain || ratios.map(() => 0.8);
      const totalRatios = sum(ratios);

      // Check if we can represent as discrete steps or weighted durations
      let patternStr = '';
      let gainStr = gains.map(g => Number(g).toFixed(2).replace(/\.?0+$/, '')).join(' ');

      // Check if quantize is enabled or if ratios match integer step subdivisions
      let canUseStepGrid = false;
      let gridSteps = subdivision;
      if (quantize && quantize !== 'off') {
        const parts = quantize.split('/');
        if (parts.length === 2) {
          gridSteps = parseInt(parts[1], 10);
        }
      }

      // If total ratios evenly divides gridSteps or matches integer grid
      if (gridSteps % totalRatios === 0) {
        const factor = gridSteps / totalRatios;
        const stepsArr = new Array(gridSteps).fill('~');
        let cur = 0;
        ratios.forEach((r, idx) => {
          stepsArr[cur] = sample;
          cur += Math.round(r * factor);
        });
        patternStr = StrudelExporter.simplifyPattern(stepsArr);
        canUseStepGrid = true;
      }

      if (!canUseStepGrid) {
        // Check for fractional warning
        if (quantize === 'off') {
          hasFractionalWarning = true;
        }

        // Mini-notation with duration weights: e.g. "bd@3 bd@3 bd@2 bd@4"
        const weightedEvents = ratios.map((r) => {
          const formattedRatio = Number(r.toFixed(2)).toString();
          return `${sample}@${formattedRatio}`;
        });
        patternStr = weightedEvents.join(' ');
      }

      let itemCode = `  s("${patternStr}")\n    .gain("${gainStr}")`;

      // If instrument has phase offset
      if (inst.phase && Math.abs(inst.phase % 360) > 0.5) {
        const phaseFraction = (((inst.phase % 360) + 360) % 360 / 360).toFixed(3);
        itemCode += `\n    .early(${phaseFraction})`;
      }

      return itemCode;
    });

    let code = lines.join('\n');
    if (hasFractionalWarning) {
      code += `// Note: Some events require fractional timing. Mini-notation duration weights (@) used.\n\n`;
    }

    code += `stack(\n${stackItems.join(',\n\n')}\n)`;
    return { code, hasFractionalWarning };
  }

  /**
   * Simplifies repeated consecutive tokens in pattern: "hh hh hh hh" -> "hh*4"
   */
  static simplifyPattern(tokens) {
    if (!tokens || tokens.length === 0) return '';
    const result = [];
    let i = 0;
    while (i < tokens.length) {
      const cur = tokens[i];
      let run = 1;
      while (i + run < tokens.length && tokens[i + run] === cur) {
        run++;
      }
      if (run >= 3 && cur !== '~') {
        result.push(`${cur}*${run}`);
        i += run;
      } else {
        result.push(cur);
        i++;
      }
    }
    return result.join(' ');
  }
}
