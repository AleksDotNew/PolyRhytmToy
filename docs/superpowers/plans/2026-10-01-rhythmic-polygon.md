# Rhythmic Polygon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully interactive, generative web application "Rhythmic Polygon" (HTML5 + CSS3 + Vanilla ES6 JavaScript) that models drum rhythms as nested, rotating irregular polygons and exports to Strudel code.

**Architecture:**
- Geometric model: Polygons whose vertices correspond to rhythmic events on a circular timeline normalized by cumulative ratios.
- Master Clock: High-precision Web Audio clock / `requestAnimationFrame` scheduler driving master phase, independent polygon rotations, and playhead detection.
- Audio Synthesis: Native Web Audio API zero-dependency percussion synthesizers (bd, sd, hh, oh, rim) with velocity sensitivity and visual trigger feedback.
- Interactive SVG/Canvas Renderer: Concentric irregular polygons, glowing nodes, circular beat/subdivision grid, playhead line, vertex drag for ratios, shift-drag for velocity, radius drag, phase rotation drag.
- Generative Engines: Static, Rotation, Phase Drift, Mutation, Controlled Random with seeded PRNG (xorshift128+ / mulberry32).
- Strudel Exporter: High-fidelity Strudel Tidal-style syntax exporter supporting both discrete mini-notation and weighted duration notation (`bd@3 sd@2...`) with dynamic gains.
- Save/Load: Project state JSON serialization & deserialization.

**Tech Stack:** HTML5, CSS3 (Modern dark-mode glassmorphic modular UI), Vanilla JavaScript (ES6+), Web Audio API, SVG 2.0 / Canvas.

**Spec:** `AGENTS.md`

## Global Constraints
- Strict adherence to AGENTS.md requirements.
- Zero external build dependencies; runs by opening `index.html` or via simple static HTTP server.
- Maximum 5 instruments (presets: Kick, Snare, Closed HH, Open HH, Perc).
- Non-quantized fractional events supported; Quantize toggle for discrete grids.
- Locked and Free cycle length modes (Polyrhythm vs Polymeter).

---

### Task 1: Mathematical Foundation & Core State (Geometry, Clock, PRNG)
**Files:**
- Create: `js/geometry.js`
- Create: `js/random.js`
- Create: `js/state.js`

**Interfaces:**
- `calculatePolygonVertices(ratios, phaseDeg, radius, center, quantizeStep)` -> returns array of `{ angle, x, y, timeNormalized, ratio, index }`
- `sumRatios(ratios)` -> number
- `updateRatioFromAngle(ratios, vertexIndex, newAngle, phaseDeg)` -> updated ratios array
- `SeededRandom(seed)` -> `{ next(), nextRange(min, max), choice(arr) }`
- `ProjectState` -> default state with 4 instruments (Kick, Snare, Hat, Perc)

- [ ] **Step 1: Implement seeded PRNG (js/random.js)**
- [ ] **Step 2: Implement geometric polygon & ratio timing calculations (js/geometry.js)**
- [ ] **Step 3: Define ProjectState schema and presets (js/state.js)**

---

### Task 2: Web Audio Synthesizer Engine & Master Clock
**Files:**
- Create: `js/audio.js`
- Create: `js/clock.js`

**Interfaces:**
- `AudioEngine.trigger(sampleName, velocity, time)` -> plays synthesized percussion (bd, sd, hh, oh, rim)
- `MasterClock.start()`, `MasterClock.stop()`, `MasterClock.setBpm(bpm)`
- Event callbacks on step / trigger crossing

- [ ] **Step 1: Implement Web Audio synthesizer drum voices (Kick pitch drop, Snare noise+tone, Hat bandpass noise, Rim resonant filter)**
- [ ] **Step 2: Implement MasterClock with high-precision scheduling and playhead phase tracking**

---

### Task 3: Interactive SVG / Canvas Renderer & Interaction Model
**Files:**
- Create: `js/renderer.js`

**Interfaces:**
- `Renderer.render(state, currentMasterPhase, hits)`
- Drag handlers:
  - Vertex angular drag -> timing/ratio change
  - Shift + Vertex drag -> velocity change
  - Polygon edge/body drag -> phase change
  - Ring drag -> radius change
  - Vertex click -> toggle active/mute

- [ ] **Step 1: Render concentric grid, subdivision rays, playhead, and nested polygons**
- [ ] **Step 2: Implement vertex event flashing and velocity-scaled circle sizes**
- [ ] **Step 3: Wire mouse/touch interaction (drag vertex, drag phase, drag radius)**

---

### Task 4: Generative Engines & Polymeter/Polyrhythm Modes
**Files:**
- Create: `js/engine.js`

**Interfaces:**
- `EngineManager.update(instruments, deltaTime, masterPhase, seed)`
- Handles: Static, Continuous Rotation, Phase Drift, Mutation, Controlled Random

- [ ] **Step 1: Implement Static, Rotation, Phase Drift mechanics**
- [ ] **Step 2: Implement Mutation & Seeded Controlled Random algorithms preserving ratio sum**
- [ ] **Step 3: Support LOCKED (equal cycle) vs FREE (polymetric independent cycle lengths)**

---

### Task 5: Strudel Exporter, Presets, and Project Save/Load
**Files:**
- Create: `js/strudel.js`

**Interfaces:**
- `StrudelExporter.export(state)` -> generates formatted Strudel `stack(...)` code
- Warning banner for fractional timings when quantize is OFF
- JSON Save/Export and Import/Load

- [ ] **Step 1: Implement Strudel mini-notation generator with `.gain(...)` and duration ratios**
- [ ] **Step 2: Add presets catalog (Square, Triangle, 3:3:2:4, Euclidean, etc.)**
- [ ] **Step 3: Add JSON project export/import and clipboard copy**

---

### Task 6: UI Assembly & Visual Polish (index.html, style.css, app.js)
**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/app.js`

**Interfaces:**
- 3-column + bottom drawer layout per AGENTS.md specs:
  - Left panel: Master Clock (BPM, Meter, Subdivision, Quantize) & Instrument list
  - Center: Large interactive polygon canvas
  - Right panel: Selected Instrument editor (Vertices, Ratios, Phase, Rotation, Engine, Velocity sliders)
  - Bottom panel: Strudel output with Copy, Download JS, Presets selector

- [ ] **Step 1: Build modern cyberpunk dark UI layout & typography**
- [ ] **Step 2: Connect all state events, inputs, sliders, and buttons**
- [ ] **Step 3: Verify single-file standalone capability (`index.html`) per AGENTS.md Section 36**

---

### Task 7: Comprehensive Verification & Browser Subagent Testing
- [ ] **Step 1: Start local server and test in browser subagent**
- [ ] **Step 2: Test audio playback, polygon dragging, engine mutation, presets, Strudel export**
- [ ] **Step 3: Verify all criteria from AGENTS.md Section 34**
