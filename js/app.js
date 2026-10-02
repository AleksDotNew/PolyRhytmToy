/**
 * Main Application Orchestrator for Rhythmic Polygon
 */

import { SeededRandom } from './random.js';
import { sum, computePolygonVertices, updateRatiosFromVertexDrag, generateEuclideanRatios } from './geometry.js';
import { PRESETS, SAMPLE_OPTIONS, createDefaultInstrument, createInitialState } from './state.js';
import { AudioEngine } from './audio.js';
import { MasterClock } from './clock.js';
import { EngineManager } from './engine.js';
import { PolygonRenderer } from './renderer.js';
import { StrudelExporter } from './strudel.js';

export class App {
  constructor() {
    this.state = createInitialState();
    this.audio = new AudioEngine();
    this.clock = new MasterClock({
      bpm: this.state.master.bpm,
      beats: this.state.master.beats,
      subdivision: this.state.master.subdivision
    });
    this.engineManager = new EngineManager(this.state.master.seed);

    // Track triggered events in current frame to avoid double triggers
    this.lastTriggeredEvents = new Set();

    this.initDOM();
    this.initRenderer();
    this.bindEvents();
    this.updateUI();
  }

  initDOM() {
    // Top bar elements
    this.btnPlay = document.getElementById('btn-play');
    this.inputBpm = document.getElementById('input-bpm');
    this.inputBeats = document.getElementById('input-beats');
    this.inputSubdivision = document.getElementById('input-subdivision');
    this.selectQuantize = document.getElementById('select-quantize');
    this.selectCycleMode = document.getElementById('select-cycle-mode');
    this.inputSeed = document.getElementById('input-seed');
    this.btnNewSeed = document.getElementById('btn-new-seed');
    this.btnSave = document.getElementById('btn-save');
    this.btnLoad = document.getElementById('btn-load');
    this.fileInputLoad = document.getElementById('file-input-load');

    // Panels
    this.instrumentListEl = document.getElementById('instrument-list');
    this.btnAddInstrument = document.getElementById('btn-add-instrument');

    // Center canvas & HUD
    this.svgElement = document.getElementById('polygon-svg');
    this.hudBpm = document.getElementById('hud-bpm');
    this.hudPhase = document.getElementById('hud-phase');
    this.hudCycle = document.getElementById('hud-cycle');

    // Right inspector
    this.inspectorEl = document.getElementById('inspector-panel');
    this.instNameInput = document.getElementById('inst-name');
    this.instSampleSelect = document.getElementById('inst-sample');
    this.instColorInput = document.getElementById('inst-color');
    this.instPhaseSlider = document.getElementById('inst-phase');
    this.instPhaseVal = document.getElementById('inst-phase-val');
    this.instRotationSlider = document.getElementById('inst-rotation');
    this.instRotationVal = document.getElementById('inst-rotation-val');
    this.instRadiusSlider = document.getElementById('inst-radius');
    this.instRadiusVal = document.getElementById('inst-radius-val');
    this.instEngineSelect = document.getElementById('inst-engine');
    this.engineParamsBox = document.getElementById('engine-params-box');
    this.ratiosChipsContainer = document.getElementById('ratios-chips');
    this.btnPresetPills = document.getElementById('preset-pills');
    this.velocityEditor = document.getElementById('velocity-editor');
    this.btnAddVertex = document.getElementById('btn-add-vertex');
    this.btnRemoveVertex = document.getElementById('btn-remove-vertex');

    // Bottom drawer
    this.drawerEl = document.getElementById('strudel-drawer');
    this.drawerToggle = document.getElementById('drawer-toggle');
    this.codeOutput = document.getElementById('strudel-code');
    this.btnCopyStrudel = document.getElementById('btn-copy-strudel');
    this.btnDownloadJs = document.getElementById('btn-download-js');
    this.warningBanner = document.getElementById('strudel-warning');
  }

  initRenderer() {
    this.renderer = new PolygonRenderer(this.svgElement, {
      width: 800,
      height: 800,
      maxRadius: 340
    });

    // Wire renderer direct manipulation callbacks
    this.renderer.onSelectInstrument = (instId) => {
      this.state.selectedInstrumentId = instId;
      this.updateUI();
    };

    this.renderer.onVertexDrag = (instId, vertexIdx, newPhaseTurns) => {
      const inst = this.getInstrument(instId);
      if (!inst) return;
      const res = updateRatiosFromVertexDrag(inst.ratios, vertexIdx, newPhaseTurns, inst.phase);
      if (res.phaseDelta) {
        inst.phase = (inst.phase + res.phaseDelta + 360) % 360;
      }
      inst.ratios = res.ratios;
      this.syncGainsWithRatios(inst);
      this.updateUI();
    };

    this.renderer.onVertexVelocityChange = (instId, vertexIdx, delta) => {
      const inst = this.getInstrument(instId);
      if (!inst || !inst.gain) return;
      const cur = inst.gain[vertexIdx] !== undefined ? inst.gain[vertexIdx] : 0.8;
      inst.gain[vertexIdx] = Math.max(0.05, Math.min(1.0, Math.round((cur + delta) * 20) / 20));
      this.updateUI();
    };

    this.renderer.onVertexClick = (instId, vertexIdx) => {
      // Toggle vertex hit / audition preview
      const inst = this.getInstrument(instId);
      if (!inst) return;
      const vel = inst.gain && inst.gain[vertexIdx] !== undefined ? inst.gain[vertexIdx] : 0.8;
      this.audio.trigger(inst.sample, vel);
      this.renderer.flashVertex(inst.id, vertexIdx, 0, 0, inst.color, vel);
    };

    this.renderer.onPolygonRotate = (instId, deltaAngle) => {
      const inst = this.getInstrument(instId);
      if (!inst) return;
      inst.phase = (inst.phase + deltaAngle + 360) % 360;
      this.updateUI();
    };

    this.renderer.onRadiusChange = (instId, newRadius) => {
      const inst = this.getInstrument(instId);
      if (!inst) return;
      inst.radius = Math.round(newRadius * 100) / 100;
      this.updateUI();
    };
  }

  getInstrument(id) {
    return this.state.instruments.find(inst => inst.id === id);
  }

  getSelectedInstrument() {
    return this.getInstrument(this.state.selectedInstrumentId) || this.state.instruments[0];
  }

  syncGainsWithRatios(inst) {
    if (!inst.gain) inst.gain = [];
    while (inst.gain.length < inst.ratios.length) {
      inst.gain.push(0.7);
    }
    if (inst.gain.length > inst.ratios.length) {
      inst.gain = inst.gain.slice(0, inst.ratios.length);
    }
  }

  bindEvents() {
    // Play / Stop
    this.btnPlay.addEventListener('click', () => {
      this.audio.init();
      if (this.clock.isPlaying) {
        this.clock.stop();
        this.state.master.isPlaying = false;
        this.btnPlay.innerHTML = `<span>▶</span> PLAY`;
        this.btnPlay.classList.remove('playing');
      } else {
        this.clock.start();
        this.state.master.isPlaying = true;
        this.btnPlay.innerHTML = `<span>■</span> STOP`;
        this.btnPlay.classList.add('playing');
      }
    });

    // Clock Master Controls
    this.inputBpm.addEventListener('input', (e) => {
      const bpm = parseInt(e.target.value, 10) || 120;
      this.state.master.bpm = bpm;
      this.clock.setBpm(bpm);
      this.updateStrudel();
    });

    this.inputBeats.addEventListener('change', (e) => {
      const beats = parseInt(e.target.value, 10) || 4;
      this.state.master.beats = beats;
      this.clock.setMeter(beats, this.state.master.subdivision);
      this.updateStrudel();
    });

    this.inputSubdivision.addEventListener('change', (e) => {
      const sub = parseInt(e.target.value, 10) || 16;
      this.state.master.subdivision = sub;
      this.clock.setMeter(this.state.master.beats, sub);
      this.updateStrudel();
    });

    this.selectQuantize.addEventListener('change', (e) => {
      this.state.master.quantize = e.target.value;
      this.updateStrudel();
    });

    this.selectCycleMode.addEventListener('change', (e) => {
      this.state.master.cycleMode = e.target.value;
      this.updateStrudel();
    });

    // Seed
    this.inputSeed.addEventListener('change', (e) => {
      const seed = parseInt(e.target.value, 10) || 12345;
      this.state.master.seed = seed;
      this.engineManager.setSeed(seed);
    });

    this.btnNewSeed.addEventListener('click', () => {
      const newSeed = Math.floor(Math.random() * 900000) + 100000;
      this.state.master.seed = newSeed;
      this.inputSeed.value = newSeed;
      this.engineManager.setSeed(newSeed);
    });

    // Add Instrument
    this.btnAddInstrument.addEventListener('click', () => {
      if (this.state.instruments.length >= 5) {
        alert('Maximum 5 instruments allowed');
        return;
      }
      const existingCount = this.state.instruments.length;
      const defaultSamples = ['bd', 'sd', 'hh', 'oh', 'rim'];
      const defaultNames = ['Kick', 'Snare', 'Closed HH', 'Open HH', 'Perc'];
      const defaultColors = ['#ff2d55', '#00e5ff', '#ffea00', '#00e676', '#b388ff'];
      const sample = defaultSamples[existingCount % defaultSamples.length];
      const name = defaultNames[existingCount % defaultNames.length];
      const color = defaultColors[existingCount % defaultColors.length];
      const radius = 0.25 + existingCount * 0.16;

      const newInst = createDefaultInstrument(null, name, sample, [3, 3, 2], radius, color);
      this.state.instruments.push(newInst);
      this.state.selectedInstrumentId = newInst.id;
      this.updateUI();
    });

    // Inspector Inputs
    this.instNameInput.addEventListener('input', (e) => {
      const inst = this.getSelectedInstrument();
      if (!inst) return;
      inst.name = e.target.value;
      this.renderInstrumentList();
    });

    this.instSampleSelect.addEventListener('change', (e) => {
      const inst = this.getSelectedInstrument();
      if (!inst) return;
      inst.sample = e.target.value;
      this.updateStrudel();
    });

    this.instColorInput.addEventListener('input', (e) => {
      const inst = this.getSelectedInstrument();
      if (!inst) return;
      inst.color = e.target.value;
      this.renderInstrumentList();
    });

    this.instPhaseSlider.addEventListener('input', (e) => {
      const inst = this.getSelectedInstrument();
      if (!inst) return;
      inst.phase = parseInt(e.target.value, 10);
      this.instPhaseVal.textContent = `${inst.phase}°`;
      this.updateStrudel();
    });

    this.instRotationSlider.addEventListener('input', (e) => {
      const inst = this.getSelectedInstrument();
      if (!inst) return;
      const rot = parseFloat(e.target.value);
      inst.rotation = rot;
      if (!inst.engineParams) inst.engineParams = {};
      inst.engineParams.speed = rot;
      this.instRotationVal.textContent = `${rot.toFixed(2)}x`;
    });

    this.instRadiusSlider.addEventListener('input', (e) => {
      const inst = this.getSelectedInstrument();
      if (!inst) return;
      const r = parseFloat(e.target.value);
      inst.radius = r;
      this.instRadiusVal.textContent = `${Math.round(r * 100)}%`;
    });

    this.instEngineSelect.addEventListener('change', (e) => {
      const inst = this.getSelectedInstrument();
      if (!inst) return;
      inst.engine = e.target.value;
      this.renderEngineParams(inst);
    });

    // Add / Remove Vertex
    this.btnAddVertex.addEventListener('click', () => {
      const inst = this.getSelectedInstrument();
      if (!inst || inst.ratios.length >= 16) return;
      inst.ratios.push(2);
      this.syncGainsWithRatios(inst);
      this.updateUI();
    });

    this.btnRemoveVertex.addEventListener('click', () => {
      const inst = this.getSelectedInstrument();
      if (!inst || inst.ratios.length <= 2) return;
      inst.ratios.pop();
      this.syncGainsWithRatios(inst);
      this.updateUI();
    });

    // Bottom Drawer Collapsible
    this.drawerToggle.addEventListener('click', () => {
      this.drawerEl.classList.toggle('collapsed');
    });

    // Copy Strudel Code
    this.btnCopyStrudel.addEventListener('click', () => {
      const code = this.codeOutput.textContent;
      navigator.clipboard.writeText(code).then(() => {
        const orig = this.btnCopyStrudel.textContent;
        this.btnCopyStrudel.textContent = '✓ Copied!';
        setTimeout(() => (this.btnCopyStrudel.textContent = orig), 1500);
      });
    });

    // Download JS
    this.btnDownloadJs.addEventListener('click', () => {
      const code = this.codeOutput.textContent;
      const blob = new Blob([code], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rhythmic-polygon-${Date.now()}.js`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Save Project JSON
    this.btnSave.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.state, null, 2));
      const a = document.createElement('a');
      a.href = dataStr;
      a.download = 'rhythmic-polygon-project.json';
      a.click();
    });

    // Load Project JSON
    this.btnLoad.addEventListener('click', () => {
      this.fileInputLoad.click();
    });

    this.fileInputLoad.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const loaded = JSON.parse(event.target.result);
          if (loaded.instruments && loaded.master) {
            this.state = loaded;
            this.clock.setBpm(this.state.master.bpm);
            this.clock.setMeter(this.state.master.beats, this.state.master.subdivision);
            this.engineManager.setSeed(this.state.master.seed);
            this.inputBpm.value = this.state.master.bpm;
            this.inputBeats.value = this.state.master.beats;
            this.inputSubdivision.value = this.state.master.subdivision;
            this.inputSeed.value = this.state.master.seed;
            this.updateUI();
          }
        } catch (err) {
          alert('Invalid project JSON file');
        }
      };
      reader.readAsText(file);
    });

    // Presets catalog rendering
    this.renderPresetsPills();

    // Master Clock Tick & Trigger Scheduler
    this.clock.onTick((tickInfo) => {
      // 1. Advance generative engines
      this.engineManager.update(this.state.instruments, tickInfo);

      // 2. Playhead & Event Detection
      this.checkEventTriggers(tickInfo);

      // 3. Render frame
      this.renderer.render(this.state, tickInfo.currPhase);

      // 4. Update HUD
      this.hudBpm.textContent = `${tickInfo.bpm} BPM`;
      this.hudPhase.textContent = `${Math.round(tickInfo.currPhase * 360)}°`;
      this.hudCycle.textContent = `Cycle #${tickInfo.cycleCount + 1}`;
    });

    // Request initial render frame
    requestAnimationFrame(() => {
      this.renderer.render(this.state, 0);
    });
  }

  checkEventTriggers(tickInfo) {
    const { prevPhase, currPhase, wrapped, dt } = tickInfo;
    const quantizeSub = this.state.master.quantize !== 'off' ? parseInt(this.state.master.quantize.split('/')[1] || 16, 10) : null;
    const maxR = this.renderer.baseMaxRadius;

    // Clear triggered events cache on cycle wrap
    if (wrapped) {
      this.lastTriggeredEvents.clear();
    }

    const anySolo = this.state.instruments.some(i => i.solo);

    this.state.instruments.forEach((inst) => {
      if (inst.muted) return;
      if (anySolo && !inst.solo) return;

      const vertices = computePolygonVertices(inst, this.renderer.center, maxR, quantizeSub);

      vertices.forEach((v) => {
        // Effective event time in [0, 1)
        const eventTime = v.effectiveTime;
        const eventKey = `${inst.id}_${v.index}_${tickInfo.cycleCount}`;

        // Check if event time falls in [prevPhase, currPhase)
        let isHit = false;
        if (!wrapped) {
          if (eventTime >= prevPhase && eventTime < currPhase) {
            isHit = true;
          }
        } else {
          // Wrapped around 1.0 -> 0.0
          if (eventTime >= prevPhase || eventTime < currPhase) {
            isHit = true;
          }
        }

        if (isHit && !this.lastTriggeredEvents.has(eventKey)) {
          this.lastTriggeredEvents.add(eventKey);

          // Audio preview
          this.audio.trigger(inst.sample, v.velocity);

          // Visual flash
          this.renderer.flashVertex(inst.id, v.index, v.x, v.y, inst.color, v.velocity);
        }
      });
    });
  }

  renderPresetsPills() {
    this.btnPresetPills.innerHTML = '';
    Object.keys(PRESETS).forEach((name) => {
      const pill = document.createElement('button');
      pill.className = 'preset-pill';
      pill.textContent = name;
      pill.addEventListener('click', () => {
        const inst = this.getSelectedInstrument();
        if (!inst) return;
        inst.ratios = [...PRESETS[name]];
        this.syncGainsWithRatios(inst);
        this.updateUI();
      });
      this.btnPresetPills.appendChild(pill);
    });

    // Special Euclidean generator pill
    const eucBtn = document.createElement('button');
    eucBtn.className = 'preset-pill';
    eucBtn.textContent = 'Euclidean E(5,8)';
    eucBtn.addEventListener('click', () => {
      const inst = this.getSelectedInstrument();
      if (!inst) return;
      inst.ratios = generateEuclideanRatios(5, 8);
      this.syncGainsWithRatios(inst);
      this.updateUI();
    });
    this.btnPresetPills.appendChild(eucBtn);

    // Random generator pill
    const rndBtn = document.createElement('button');
    rndBtn.className = 'preset-pill';
    rndBtn.textContent = 'Random Form';
    rndBtn.addEventListener('click', () => {
      const inst = this.getSelectedInstrument();
      if (!inst) return;
      const count = Math.floor(Math.random() * 4) + 3;
      const ratios = [];
      for (let i = 0; i < count; i++) {
        ratios.push(Math.floor(Math.random() * 4) + 1);
      }
      inst.ratios = ratios;
      this.syncGainsWithRatios(inst);
      this.updateUI();
    });
    this.btnPresetPills.appendChild(rndBtn);
  }

  renderInstrumentList() {
    this.instrumentListEl.innerHTML = '';
    const anySolo = this.state.instruments.some(i => i.solo);

    this.state.instruments.forEach((inst) => {
      const isSelected = inst.id === this.state.selectedInstrumentId;
      const card = document.createElement('div');
      card.className = `instrument-card ${isSelected ? 'selected' : ''}`;
      card.style.setProperty('--inst-color', inst.color);

      card.innerHTML = `
        <div class="inst-info">
          <div class="inst-dot" style="background: ${inst.color};"></div>
          <div>
            <div class="inst-name">${inst.name} <span style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">(${inst.sample})</span></div>
            <div class="inst-ratios-summary">[${inst.ratios.join(', ')}]</div>
          </div>
        </div>
        <div class="inst-actions">
          <button class="btn-icon btn-solo ${inst.solo ? 'active' : ''}" title="Solo">S</button>
          <button class="btn-icon btn-mute ${inst.muted ? 'active' : ''}" title="Mute">M</button>
          <button class="btn-icon btn-delete" title="Delete">✕</button>
        </div>
      `;

      // Select instrument
      card.addEventListener('click', (e) => {
        if (e.target.closest('.inst-actions')) return;
        this.state.selectedInstrumentId = inst.id;
        this.updateUI();
      });

      // Solo button
      card.querySelector('.btn-solo').addEventListener('click', (e) => {
        e.stopPropagation();
        inst.solo = !inst.solo;
        this.updateUI();
      });

      // Mute button
      card.querySelector('.btn-mute').addEventListener('click', (e) => {
        e.stopPropagation();
        inst.muted = !inst.muted;
        this.updateUI();
      });

      // Delete button
      card.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.state.instruments.length <= 1) {
          alert('Must keep at least 1 instrument');
          return;
        }
        this.state.instruments = this.state.instruments.filter(i => i.id !== inst.id);
        if (this.state.selectedInstrumentId === inst.id) {
          this.state.selectedInstrumentId = this.state.instruments[0].id;
        }
        this.updateUI();
      });

      this.instrumentListEl.appendChild(card);
    });
  }

  renderInspector() {
    const inst = this.getSelectedInstrument();
    if (!inst) return;

    this.inspectorEl.style.setProperty('--inst-color', inst.color);
    this.instNameInput.value = inst.name;
    this.instSampleSelect.value = inst.sample;
    this.instColorInput.value = inst.color;
    this.instPhaseSlider.value = Math.round(inst.phase % 360);
    this.instPhaseVal.textContent = `${Math.round(inst.phase % 360)}°`;
    this.instRotationSlider.value = inst.rotation || 1.0;
    this.instRotationVal.textContent = `${(inst.rotation || 1.0).toFixed(2)}x`;
    this.instRadiusSlider.value = inst.radius;
    this.instRadiusVal.textContent = `${Math.round(inst.radius * 100)}%`;
    this.instEngineSelect.value = inst.engine || 'static';

    this.renderEngineParams(inst);
    this.renderRatiosChips(inst);
    this.renderVelocityEditor(inst);
  }

  renderEngineParams(inst) {
    if (!inst.engineParams) {
      inst.engineParams = { speed: inst.rotation || 1.0, drift: 0.15, mutationProb: 0.3, mutationAmount: 1, cycleLength: 4 };
    }
    const params = inst.engineParams;
    let html = '';

    switch (inst.engine) {
      case 'static':
        html = `<div style="font-size: 11px; color: var(--text-muted); font-style: italic;">Polygon orientation remains fixed relative to master clock.</div>`;
        break;
      case 'rotation':
        html = `
          <div class="form-row">
            <label>Speed Multiplier: <span>${(params.speed || 1.0).toFixed(2)}x</span></label>
            <input type="range" min="-4" max="4" step="0.25" value="${params.speed || 1.0}" id="param-speed">
          </div>
        `;
        break;
      case 'drift':
        html = `
          <div class="form-row">
            <label>Phase Drift Rate: <span>${(params.drift || 0.15).toFixed(2)}</span></label>
            <input type="range" min="0.01" max="1.0" step="0.01" value="${params.drift || 0.15}" id="param-drift">
          </div>
        `;
        break;
      case 'mutation':
      case 'random':
        html = `
          <div class="form-row">
            <label>Cycle Interval: <span>Every ${params.cycleLength || 4} cycles</span></label>
            <input type="range" min="1" max="16" step="1" value="${params.cycleLength || 4}" id="param-cycle-len">
          </div>
          <div class="form-row">
            <label>Mutation Probability: <span>${Math.round((params.mutationProb || 0.3) * 100)}%</span></label>
            <input type="range" min="0.1" max="1.0" step="0.05" value="${params.mutationProb || 0.3}" id="param-mut-prob">
          </div>
        `;
        break;
    }

    this.engineParamsBox.innerHTML = html;

    // Attach param listeners
    const speedInput = this.engineParamsBox.querySelector('#param-speed');
    if (speedInput) {
      speedInput.addEventListener('input', (e) => {
        params.speed = parseFloat(e.target.value);
        inst.rotation = params.speed;
        this.instRotationSlider.value = params.speed;
        this.instRotationVal.textContent = `${params.speed.toFixed(2)}x`;
        this.renderEngineParams(inst);
      });
    }

    const driftInput = this.engineParamsBox.querySelector('#param-drift');
    if (driftInput) {
      driftInput.addEventListener('input', (e) => {
        params.drift = parseFloat(e.target.value);
        this.renderEngineParams(inst);
      });
    }

    const cycleLenInput = this.engineParamsBox.querySelector('#param-cycle-len');
    if (cycleLenInput) {
      cycleLenInput.addEventListener('input', (e) => {
        params.cycleLength = parseInt(e.target.value, 10);
        this.renderEngineParams(inst);
      });
    }

    const probInput = this.engineParamsBox.querySelector('#param-mut-prob');
    if (probInput) {
      probInput.addEventListener('input', (e) => {
        params.mutationProb = parseFloat(e.target.value);
        this.renderEngineParams(inst);
      });
    }
  }

  renderRatiosChips(inst) {
    this.ratiosChipsContainer.innerHTML = '';
    inst.ratios.forEach((ratio, idx) => {
      const chip = document.createElement('div');
      chip.className = 'ratio-chip';
      chip.innerHTML = `
        <span style="color: var(--text-dim); font-size: 10px;">#${idx + 1}</span>
        <input type="number" min="0.5" max="32" step="0.5" value="${ratio}">
      `;
      const input = chip.querySelector('input');
      input.addEventListener('change', (e) => {
        const val = Math.max(0.5, Math.min(32, parseFloat(e.target.value) || 1));
        inst.ratios[idx] = val;
        this.updateUI();
      });
      this.ratiosChipsContainer.appendChild(chip);
    });
  }

  renderVelocityEditor(inst) {
    this.velocityEditor.innerHTML = '';
    this.velocityEditor.style.setProperty('--inst-color', inst.color);

    inst.ratios.forEach((_, idx) => {
      const col = document.createElement('div');
      col.className = 'vel-column';
      const vel = inst.gain && inst.gain[idx] !== undefined ? inst.gain[idx] : 0.8;
      const heightPct = Math.round(vel * 100);

      col.innerHTML = `
        <div class="vel-bar-track">
          <div class="vel-bar-fill" style="height: ${heightPct}%; background: ${inst.color};"></div>
        </div>
        <div class="vel-label">${Math.round(vel * 10)}</div>
      `;

      const track = col.querySelector('.vel-bar-track');
      let isDragging = false;

      const updateFromPointer = (e) => {
        const rect = track.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const normalized = 1.0 - Math.max(0, Math.min(1, y / rect.height));
        inst.gain[idx] = Math.round(normalized * 20) / 20;
        this.updateUI();
      };

      track.addEventListener('pointerdown', (e) => {
        isDragging = true;
        track.setPointerCapture(e.pointerId);
        updateFromPointer(e);
      });
      track.addEventListener('pointermove', (e) => {
        if (isDragging) updateFromPointer(e);
      });
      track.addEventListener('pointerup', (e) => {
        isDragging = false;
      });

      this.velocityEditor.appendChild(col);
    });
  }

  updateStrudel() {
    const { code, hasFractionalWarning } = StrudelExporter.export(this.state);
    this.codeOutput.textContent = code;

    if (hasFractionalWarning) {
      this.warningBanner.classList.add('visible');
    } else {
      this.warningBanner.classList.remove('visible');
    }
  }

  updateUI() {
    this.renderInstrumentList();
    this.renderInspector();
    this.updateStrudel();
    if (!this.clock.isPlaying) {
      this.renderer.render(this.state, this.clock.phase);
    }
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.rhythmicPolygonApp = new App();
});
