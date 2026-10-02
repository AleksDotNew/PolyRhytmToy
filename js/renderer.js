/**
 * Interactive SVG Renderer for Rhythmic Polygon
 * Supports HiDPI rendering, glow effects, direct manipulation, and trigger animations.
 */

import { computePolygonVertices, coordinatesToPhase, distanceToCenter, TWO_PI } from './geometry.js';

export class PolygonRenderer {
  constructor(svgElement, options = {}) {
    this.svg = svgElement;
    this.width = options.width || 800;
    this.height = options.height || 800;
    this.center = { x: this.width / 2, y: this.height / 2 };
    this.baseMaxRadius = options.maxRadius || 340;

    // Callbacks
    this.onVertexDrag = null;
    this.onVertexVelocityChange = null;
    this.onVertexClick = null;
    this.onPolygonRotate = null;
    this.onRadiusChange = null;
    this.onSelectInstrument = null;

    // Interaction state
    this.dragState = null;
    this.hitAnimations = new Map(); // key -> { startTime, color, x, y }

    this.initDefs();
    this.bindEvents();
  }

  initDefs() {
    this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);
    this.svg.innerHTML = `
      <defs>
        <!-- Neon Glow Filters -->
        <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-subtle" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00e5ff" stop-opacity="0.35" />
          <stop offset="60%" stop-color="#00e5ff" stop-opacity="0.05" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="bg-radial" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#121526" />
          <stop offset="85%" stop-color="#090a12" />
          <stop offset="100%" stop-color="#050609" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg-radial)" />
      <g id="grid-layer"></g>
      <g id="polygons-layer"></g>
      <g id="playhead-layer"></g>
      <g id="fx-layer"></g>
      <g id="labels-layer"></g>
    `;

    this.gridLayer = this.svg.querySelector('#grid-layer');
    this.polygonsLayer = this.svg.querySelector('#polygons-layer');
    this.playheadLayer = this.svg.querySelector('#playhead-layer');
    this.fxLayer = this.svg.querySelector('#fx-layer');
    this.labelsLayer = this.svg.querySelector('#labels-layer');
  }

  /**
   * Triggers a visual flash and pulse on a hit vertex
   */
  flashVertex(instrumentId, vertexIndex, x, y, color, velocity) {
    const key = `${instrumentId}_${vertexIndex}`;
    this.hitAnimations.set(key, {
      startTime: performance.now(),
      duration: 380,
      x,
      y,
      color,
      velocity: velocity || 0.8
    });
  }

  /**
   * Main render call
   */
  render(state, currentMasterPhase) {
    const { master, instruments, selectedInstrumentId } = state;
    const quantizeSub = master.quantize !== 'off' ? parseInt(master.quantize.split('/')[1] || 16, 10) : null;

    this.renderGrid(master.beats, master.subdivision);
    this.renderInstruments(instruments, selectedInstrumentId, quantizeSub);
    this.renderPlayhead(currentMasterPhase);
    this.renderHitAnimations();
  }

  renderGrid(beats = 4, subdivision = 16) {
    let html = '';
    const cx = this.center.x;
    const cy = this.center.y;
    const maxR = this.baseMaxRadius;

    // Ambient center glow
    html += `<circle cx="${cx}" cy="${cy}" r="${maxR * 0.95}" fill="url(#center-glow)" />`;

    // Outer boundary ring
    html += `<circle cx="${cx}" cy="${cy}" r="${maxR}" fill="none" stroke="rgba(255, 255, 255, 0.12)" stroke-width="1.5" />`;
    html += `<circle cx="${cx}" cy="${cy}" r="${maxR + 10}" fill="none" stroke="rgba(255, 255, 255, 0.05)" stroke-width="1" stroke-dasharray="2, 6" />`;

    // Radial spokes for subdivisions
    const totalSub = Math.max(1, subdivision);
    for (let i = 0; i < totalSub; i++) {
      const angle = (i / totalSub) * TWO_PI - Math.PI / 2;
      const isBeat = (i % (totalSub / beats)) === 0;
      const x1 = cx + (isBeat ? 20 : maxR * 0.18) * Math.cos(angle);
      const y1 = cy + (isBeat ? 20 : maxR * 0.18) * Math.sin(angle);
      const x2 = cx + (maxR + (isBeat ? 8 : 0)) * Math.cos(angle);
      const y2 = cy + (maxR + (isBeat ? 8 : 0)) * Math.sin(angle);

      const strokeColor = isBeat ? 'rgba(0, 229, 255, 0.28)' : 'rgba(255, 255, 255, 0.06)';
      const strokeWidth = isBeat ? '1.5' : '0.8';
      const dash = isBeat ? '' : 'stroke-dasharray="2, 4"';

      html += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${dash} />`;

      // Beat number label around rim
      if (isBeat) {
        const beatNum = Math.floor(i / (totalSub / beats)) + 1;
        const lx = cx + (maxR + 24) * Math.cos(angle);
        const ly = cy + (maxR + 24) * Math.sin(angle) + 4;
        html += `<text x="${lx}" y="${ly}" fill="rgba(0, 229, 255, 0.6)" font-size="11" font-weight="700" text-anchor="middle" font-family="'JetBrains Mono', monospace">${beatNum}</text>`;
      }
    }

    // Concentric division rings
    for (let r = 0.25; r <= 0.75; r += 0.25) {
      html += `<circle cx="${cx}" cy="${cy}" r="${maxR * r}" fill="none" stroke="rgba(255, 255, 255, 0.04)" stroke-width="1" stroke-dasharray="3, 5" />`;
    }

    // Center pivot
    html += `<circle cx="${cx}" cy="${cy}" r="4" fill="#00e5ff" opacity="0.8" />`;
    this.gridLayer.innerHTML = html;
  }

  renderInstruments(instruments, selectedInstrumentId, quantizeSub) {
    let polyHtml = '';
    const cx = this.center.x;
    const cy = this.center.y;
    const maxR = this.baseMaxRadius;

    instruments.forEach((inst) => {
      const isSelected = inst.id === selectedInstrumentId;
      const isMuted = inst.muted;
      const color = inst.color || '#ff2d55';
      const radius = inst.radius * maxR;

      const vertices = computePolygonVertices(inst, this.center, maxR, quantizeSub);

      // Instrument orbit guideline
      polyHtml += `
        <circle cx="${cx}" cy="${cy}" r="${radius}" 
          fill="none" 
          stroke="${color}" 
          stroke-opacity="${isSelected ? 0.35 : 0.12}" 
          stroke-width="${isSelected ? 1.8 : 1}" 
          stroke-dasharray="4, 6" 
        />
      `;

      // Radius resize handle (at 3 o'clock position on the orbit)
      if (isSelected && !isMuted) {
        const rx = cx + radius;
        const ry = cy;
        polyHtml += `
          <g class="radius-handle" data-inst-id="${inst.id}" style="cursor: ew-resize;">
            <circle cx="${rx}" cy="${ry}" r="7" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="1.5" />
            <circle cx="${rx}" cy="${ry}" r="2.5" fill="#ffffff" />
          </g>
        `;
      }

      if (vertices.length >= 2) {
        // Construct SVG polygon path points
        const pointsStr = vertices.map(v => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' ');

        // Polygon fill and glowing stroke
        polyHtml += `
          <polygon points="${pointsStr}" 
            data-inst-id="${inst.id}"
            class="poly-body"
            fill="${color}" 
            fill-opacity="${isMuted ? 0.03 : (isSelected ? 0.2 : 0.1)}" 
            stroke="${color}" 
            stroke-width="${isSelected ? 2.5 : 1.5}" 
            stroke-opacity="${isMuted ? 0.25 : 0.9}"
            filter="url(#glow-subtle)"
            style="cursor: grab;"
          />
        `;
      }

      // Render vertices
      vertices.forEach((v) => {
        const vel = v.velocity !== undefined ? v.velocity : 0.8;
        const nodeRadius = 5 + vel * 8; // Size scales with velocity (5px to 13px)
        const opacity = isMuted ? 0.3 : 1.0;

        polyHtml += `
          <g class="vertex-node" 
             data-inst-id="${inst.id}" 
             data-vertex-idx="${v.index}"
             style="cursor: pointer;"
             transform="translate(${v.x.toFixed(1)}, ${v.y.toFixed(1)})">
            
            <!-- Glow background -->
            <circle cx="0" cy="0" r="${nodeRadius + 4}" fill="${color}" fill-opacity="${isSelected ? 0.25 : 0.12}" filter="url(#glow-subtle)" />
            
            <!-- Outer velocity circle -->
            <circle cx="0" cy="0" r="${nodeRadius}" 
              fill="${color}" 
              fill-opacity="${opacity * 0.85}" 
              stroke="#ffffff" 
              stroke-width="${isSelected ? 1.5 : 1}" 
              stroke-opacity="${isSelected ? 0.9 : 0.5}" 
            />

            <!-- Core highlight dot -->
            <circle cx="0" cy="0" r="${Math.max(2, nodeRadius * 0.35)}" fill="#ffffff" opacity="${opacity}" />

            <!-- Ratio indicator label -->
            <text x="0" y="${-nodeRadius - 5}" 
              fill="${color}" 
              font-size="9" 
              font-weight="700" 
              text-anchor="middle" 
              font-family="'JetBrains Mono', monospace"
              opacity="${isSelected ? 0.9 : 0.5}">
              ${v.ratio}
            </text>
          </g>
        `;
      });
    });

    this.polygonsLayer.innerHTML = polyHtml;
  }

  renderPlayhead(phase = 0) {
    const cx = this.center.x;
    const cy = this.center.y;
    const maxR = this.baseMaxRadius;
    const angle = phase * TWO_PI - Math.PI / 2;

    const px = cx + (maxR + 15) * Math.cos(angle);
    const py = cy + (maxR + 15) * Math.sin(angle);

    let html = `
      <!-- Rotating playhead ray -->
      <line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" 
        stroke="#00e5ff" 
        stroke-width="2" 
        stroke-opacity="0.85" 
        filter="url(#glow-strong)"
      />
      <!-- Playhead glowing tip -->
      <circle cx="${px}" cy="${py}" r="5" fill="#00e5ff" filter="url(#glow-strong)" />
      <circle cx="${px}" cy="${py}" r="2" fill="#ffffff" />
      
      <!-- Top fixed 12 o'clock indicator -->
      <polygon points="${cx},${cy - maxR - 18} ${cx - 7},${cy - maxR - 32} ${cx + 7},${cy - maxR - 32}" 
        fill="#00e5ff" 
        opacity="0.75" 
      />
    `;
    this.playheadLayer.innerHTML = html;
  }

  renderHitAnimations() {
    const now = performance.now();
    let fxHtml = '';

    for (const [key, hit] of this.hitAnimations.entries()) {
      const elapsed = now - hit.startTime;
      if (elapsed > hit.duration) {
        this.hitAnimations.delete(key);
        continue;
      }
      const progress = elapsed / hit.duration;
      const r = 10 + progress * 35 * hit.velocity;
      const opacity = (1 - progress) * 0.9;

      fxHtml += `
        <circle cx="${hit.x}" cy="${hit.y}" r="${r}" 
          fill="none" 
          stroke="${hit.color}" 
          stroke-width="${2.5 * (1 - progress)}" 
          stroke-opacity="${opacity}" 
          filter="url(#glow-strong)" 
        />
        <circle cx="${hit.x}" cy="${hit.y}" r="${r * 0.5}" 
          fill="${hit.color}" 
          fill-opacity="${opacity * 0.4}" 
        />
      `;
    }
    this.fxLayer.innerHTML = fxHtml;
  }

  bindEvents() {
    const getSvgCoords = (e) => {
      const rect = this.svg.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      const scaleY = this.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    };

    this.svg.addEventListener('pointerdown', (e) => {
      const target = e.target;
      const pt = getSvgCoords(e);

      // 1. Clicked or dragging a vertex
      const vertexEl = target.closest('.vertex-node');
      if (vertexEl) {
        e.preventDefault();
        const instId = vertexEl.getAttribute('data-inst-id');
        const vIdx = parseInt(vertexEl.getAttribute('data-vertex-idx'), 10);
        this.dragState = {
          type: e.shiftKey ? 'vertex-velocity' : 'vertex-angle',
          instrumentId: instId,
          vertexIndex: vIdx,
          startX: pt.x,
          startY: pt.y,
          hasMoved: false
        };
        if (this.onSelectInstrument) this.onSelectInstrument(instId);
        return;
      }

      // 2. Dragging radius handle
      const radiusHandle = target.closest('.radius-handle');
      if (radiusHandle) {
        e.preventDefault();
        const instId = radiusHandle.getAttribute('data-inst-id');
        this.dragState = {
          type: 'radius',
          instrumentId: instId,
          startX: pt.x,
          startY: pt.y
        };
        return;
      }

      // 3. Dragging polygon body (rotates phase)
      const polyBody = target.closest('.poly-body');
      if (polyBody) {
        e.preventDefault();
        const instId = polyBody.getAttribute('data-inst-id');
        const initialAngle = coordinatesToPhase(pt, this.center) * 360;
        this.dragState = {
          type: 'polygon-rotate',
          instrumentId: instId,
          startAngle: initialAngle
        };
        if (this.onSelectInstrument) this.onSelectInstrument(instId);
        return;
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.dragState) return;
      const pt = getSvgCoords(e);
      const ds = this.dragState;

      const dx = pt.x - ds.startX;
      const dy = pt.y - ds.startY;
      if (Math.hypot(dx, dy) > 3) ds.hasMoved = true;

      if (ds.type === 'vertex-angle') {
        const phaseTurns = coordinatesToPhase(pt, this.center);
        if (this.onVertexDrag) {
          this.onVertexDrag(ds.instrumentId, ds.vertexIndex, phaseTurns);
        }
      } else if (ds.type === 'vertex-velocity') {
        // Vertical dragging shifts velocity
        const delta = -dy / 100;
        if (this.onVertexVelocityChange) {
          this.onVertexVelocityChange(ds.instrumentId, ds.vertexIndex, delta);
        }
      } else if (ds.type === 'polygon-rotate') {
        const currentAngle = coordinatesToPhase(pt, this.center) * 360;
        const deltaAngle = currentAngle - ds.startAngle;
        ds.startAngle = currentAngle;
        if (this.onPolygonRotate) {
          this.onPolygonRotate(ds.instrumentId, deltaAngle);
        }
      } else if (ds.type === 'radius') {
        const dist = distanceToCenter(pt, this.center);
        const normalizedR = Math.max(0.15, Math.min(0.95, dist / this.baseMaxRadius));
        if (this.onRadiusChange) {
          this.onRadiusChange(ds.instrumentId, normalizedR);
        }
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (!this.dragState) return;
      const ds = this.dragState;

      // Handle click if pointer didn't move significantly
      if (!ds.hasMoved && ds.type === 'vertex-angle') {
        if (this.onVertexClick) {
          this.onVertexClick(ds.instrumentId, ds.vertexIndex);
        }
      }

      this.dragState = null;
    });
  }
}
