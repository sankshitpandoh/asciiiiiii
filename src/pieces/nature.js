import { definePiece, shade, hsl, mix, clamp, fbm, TAU } from './kit.js';

export const rain = definePiece({
  name: 'rain', category: 'nature', fps: 24, cols: 60, rows: 24, color: true,
  init({ rnd, cols, rows }) { return { d: Array.from({ length: 90 }, () => ({ x: rnd() * cols, y: rnd() * rows, v: 10 + rnd() * 14 })), splash: [] }; },
  frame({ g, state, rnd, dt }) {
    for (const d of state.d) { d.y += d.v * dt; d.x -= dt * 3; if (d.y > g.rows - 2) { state.splash.push({ x: d.x, y: g.rows - 2, t: 0 }); d.y = -1; d.x = rnd() * (g.cols + 6); } g.set(d.x, d.y, d.v > 18 ? '|' : '╵', d.v > 18 ? '#93c5fd' : '#3b82f6'); }
    for (const s of state.splash) { s.t += dt; g.set(s.x - 1, s.y, s.t < 0.1 ? '.' : 'o', '#60a5fa'); g.set(s.x + 1, s.y, s.t < 0.1 ? '.' : 'o', '#60a5fa'); }
    state.splash = state.splash.filter((s) => s.t < 0.2);
    for (let x = 0; x < g.cols; x++) g.set(x, g.rows - 1, '▀', '#1e293b');
  },
});

export const snowfall = definePiece({
  name: 'snowfall', category: 'nature', fps: 15, cols: 60, rows: 24, color: true,
  init({ rnd, cols, rows }) { return { f: Array.from({ length: 70 }, () => ({ x: rnd() * cols, y: rnd() * rows, s: 0.5 + rnd(), ph: rnd() * 6 })), pile: new Float32Array(cols) }; },
  frame({ g, state, rnd, dt, t }) {
    for (const f of state.f) {
      f.y += f.s * 4 * dt; f.x += Math.sin(t + f.ph) * dt * 2;
      const gx = Math.round((f.x + g.cols) % g.cols);
      if (f.y >= g.rows - 1 - state.pile[gx]) { state.pile[gx] = Math.min(6, state.pile[gx] + 0.15); f.y = -1; f.x = rnd() * g.cols; }
      g.set(f.x, f.y, f.s > 1.2 ? '❄' : f.s > 0.8 ? '*' : '·', f.s > 1.2 ? '#ffffff' : '#cbd5e1');
    }
    for (let x = 0; x < g.cols; x++) for (let k = 0; k <= state.pile[x]; k++) g.set(x, g.rows - 1 - k, k === Math.floor(state.pile[x]) && state.pile[x] % 1 > 0.5 ? '▄' : '█', '#e2e8f0');
    if (state.pile.every((p) => p > 5.5)) state.pile.fill(0);
  },
});

export const fireflies = definePiece({
  name: 'fireflies', category: 'nature', fps: 15, cols: 60, rows: 22, color: true,
  init({ rnd, cols, rows }) { return { f: Array.from({ length: 24 }, () => ({ x: rnd() * cols, y: rnd() * rows * 0.8, ph: rnd() * 6, sp: 0.5 + rnd() })) }; },
  frame({ g, state, t, dt }) {
    for (let x = 0; x < g.cols; x++) { const h = 2 + Math.round(fbm(x * 0.15, 0) * 4); for (let y = 0; y < h; y++) g.set(x, g.rows - 1 - y, y === h - 1 ? 'ʷ' : '▓', '#0f2d1a'); }
    for (const f of state.f) {
      f.x += Math.sin(t * f.sp + f.ph) * dt * 4; f.y += Math.cos(t * f.sp * 0.7 + f.ph) * dt * 2;
      const glow = Math.max(0, Math.sin(t * 2 + f.ph * 3)) ** 3;
      if (glow > 0.05) g.set(f.x, f.y, glow > 0.7 ? '✺' : glow > 0.3 ? '*' : '·', mix('#3f3f00', '#fef08a', glow));
    }
  },
});

export const campfire = definePiece({
  name: 'campfire', category: 'nature', fps: 15, cols: 40, rows: 20, color: true,
  frame({ g, t, rnd }) {
    const cx = g.cols / 2;
    for (let y = 0; y < g.rows - 3; y++) for (let x = 0; x < g.cols; x++) {
      const dx = (x - cx) / 2, h = (g.rows - 3 - y) / (g.rows - 3);
      const flicker = fbm(x * 0.2 + t * 0.5, y * 0.3 - t * 3);
      const v = (1 - h) * (1 - Math.abs(dx) / (5 + flicker * 4 * (1 - h))) - h * 0.4 + flicker * 0.5;
      if (v > 0.35) g.set(x, y, shade(v, ' .:^*#%@'), mix('#7c2d12', '#fef08a', clamp(v - 0.3, 0, 1)));
      else if (v > 0.25 && rnd() < 0.3) g.set(x, y, '·', '#f97316');
    }
    g.text(cx - 6, g.rows - 3, '\\\\__|__//', '#78350f'); g.text(cx - 5, g.rows - 2, '╲╲═══╱╱', '#92400e'); g.text(cx - 7, g.rows - 1, '~~~~~~~~~~~~~', '#44403c');
  },
});

export const aurora = definePiece({
  name: 'aurora', category: 'nature', fps: 15, cols: 70, rows: 26, color: true,
  frame({ g, t }) {
    g.each((x, y) => {
      const base = 6 + fbm(x * 0.05 + t * 0.1, 0) * 8;
      const band = Math.exp(-((y - base) ** 2) / (12 + Math.sin(x * 0.1 + t) * 4));
      const curtain = (fbm(x * 0.08 + t * 0.3, y * 0.1) + 0.2) * band;
      if (curtain > 0.2 && y < g.rows - 4) return [shade(curtain, ' .:|║▓'), mix('#065f46', hsl(160 + x * 0.8 + t * 10, 0.8, 0.6), curtain)];
      if (y < g.rows - 4 && ((x * 7 + y * 11) % 31) === 0) return ['.', '#475569'];
      if (y >= g.rows - 4) { const h = fbm(x * 0.1, 1) * 3; return y - (g.rows - 4) >= 3 - h ? ['▲', '#0f172a'] : null; }
      return null;
    });
  },
});

export const lightning = definePiece({
  name: 'lightning', category: 'nature', fps: 20, cols: 60, rows: 24, color: true,
  init() { return { bolt: null, flash: 0 }; },
  frame({ g, state, rnd, i }) {
    if (rnd() < 0.03 || (i < 3)) { const pts = [[g.cols / 2 + (rnd() - 0.5) * 30, 0]]; while (pts[pts.length - 1][1] < g.rows - 3) { const [x, y] = pts[pts.length - 1]; pts.push([x + (rnd() - 0.5) * 6, y + 1 + rnd() * 2]); } state.bolt = pts; state.flash = 1; }
    for (let x = 0; x < g.cols; x++) for (let y = 0; y < 5; y++) if (fbm(x * 0.1, y * 0.4 + i * 0.01) > 0.45) g.set(x, y, '▓', mix('#1e293b', '#64748b', state.flash));
    if (state.flash > 0.02) {
      const b = state.bolt;
      for (let k = 1; k < b.length; k++) g.line(b[k - 1][0], b[k - 1][1], b[k][0], b[k][1], state.flash > 0.5 ? '█' : '│', mix('#60a5fa', '#ffffff', state.flash));
      if (state.flash > 0.4 && b.length > 6) { const [fx, fy] = b[Math.floor(b.length / 2)]; g.line(fx, fy, fx + 8, fy + 6, '╲', '#93c5fd'); }
      state.flash *= 0.75;
    }
    for (let x = 0; x < g.cols; x++) g.set(x, g.rows - 1, '▀', mix('#0f172a', '#334155', state.flash));
  },
});

export const fractalTree = definePiece({
  name: 'fractal-tree', category: 'nature', fps: 12, cols: 60, rows: 28, color: true,
  frame({ g, t }) {
    const branch = (x, y, len, a, d) => {
      if (d === 0 || len < 1) { g.set(x, y, '✿', hsl(330 + Math.sin(t) * 20, 0.7, 0.7)); return; }
      const nx = x + Math.cos(a) * len * 2, ny = y - Math.sin(a) * len;
      g.line(x, y, nx, ny, d > 5 ? '║' : d > 3 ? '│' : '╵', d > 3 ? '#7c4a1e' : '#4ade80');
      const sway = Math.sin(t * 1.5 + d) * 0.08;
      branch(nx, ny, len * 0.72, a + 0.45 + sway, d - 1); branch(nx, ny, len * 0.72, a - 0.4 + sway, d - 1);
    };
    branch(g.cols / 2, g.rows - 1, 6.5, Math.PI / 2, 8);
    for (let x = 0; x < g.cols; x++) g.set(x, g.rows - 1, '▀', '#3f6212');
  },
});

export const seaSwell = definePiece({
  name: 'sea-swell', category: 'nature', fps: 15, cols: 70, rows: 22, color: true,
  frame({ g, t }) {
    for (let y = 8; y < g.rows; y++) {
      const depth = (y - 8) / (g.rows - 8);
      for (let x = 0; x < g.cols; x++) {
        const w = Math.sin(x * 0.15 - t * 2 + y * 0.4) + Math.sin(x * 0.07 + t * 1.3) * 0.6;
        const v = (w + 1.6) / 3.2;
        g.set(x, y, shade(v * (0.5 + depth * 0.5), ' .~-=≈~'), mix('#0c4a6e', '#38bdf8', v * (1 - depth * 0.6)));
      }
    }
    const mx = g.cols / 2 + Math.sin(t * 0.3) * 20, my = 8 + Math.sin(mx * 0.15 - t * 2 + 3) * 0.8;
    g.text(mx - 2, my - 2, '  |  ', '#e6edf3'); g.text(mx - 2, my - 1, ' /|▶ ', '#e6edf3'); g.text(mx - 3, my, '\\_____/', '#fbbf24');
    g.set(8, 2, '☾', '#fef3c7'); for (let k = 0; k < 20; k++) g.set((k * 17) % g.cols, (k * 5) % 7, '.', '#334155');
  },
});

export const wind = definePiece({
  name: 'wind', category: 'nature', fps: 20, cols: 70, rows: 20, color: true,
  init({ rnd, cols, rows }) { return { s: Array.from({ length: 50 }, () => ({ x: rnd() * cols, y: rnd() * rows, v: 10 + rnd() * 20, len: 3 + Math.floor(rnd() * 8) })) }; },
  frame({ g, state, dt, t, rnd }) {
    for (const s of state.s) { s.x += s.v * dt; s.y += Math.sin(t * 2 + s.x * 0.1) * dt * 2; if (s.x > g.cols + 10) { s.x = -s.len - rnd() * 10; s.y = rnd() * g.rows; } for (let k = 0; k < s.len; k++) g.set(s.x - k, s.y, k === 0 ? '~' : k < s.len / 2 ? '─' : '╌', mix('#334155', '#cbd5e1', 1 - k / s.len)); }
    for (let x = 0; x < g.cols; x++) { const lean = Math.round(Math.sin(t * 3 + x * 0.3) * 1.5 + 1); g.set(x + lean, g.rows - 1, lean > 1 ? '╱' : lean < 1 ? '│' : '╱', '#4ade80'); }
  },
});

export const sunrise = definePiece({
  name: 'sunrise', category: 'nature', fps: 10, cols: 60, rows: 22, color: true,
  frame({ g, t }) {
    const p = (Math.sin(t * 0.25 - Math.PI / 2) + 1) / 2, horizon = g.rows - 5, sunY = horizon + 4 - p * 14, cx = g.cols / 2;
    g.each((x, y) => {
      if (y >= horizon) return y === horizon ? ['▀', mix('#1e293b', '#365314', p)] : [x % 3 === 0 ? 'ʷ' : ' ', mix('#0f172a', '#3f6212', p)];
      const dy = (y - sunY) / 1, dx = (x - cx) / 2, d = Math.hypot(dx, dy);
      if (d < 3.2) return ['█', mix('#fb923c', '#fef08a', p)];
      const sky = clamp(1 - y / horizon, 0, 1) * 0.5 + p * 0.5;
      const glow = Math.exp(-d / 8) * p;
      if (glow > 0.15) return [shade(glow * 0.6, ' .:-='), mix('#7c2d12', '#fdba74', glow)];
      return ((x * 13 + y * 7) % 29 === 0 && p < 0.5) ? ['.', mix('#cbd5e1', '#1e293b', p * 2)] : sky > 0.75 ? [' ', null] : null;
    });
  },
});

export const cherryBlossom = definePiece({
  name: 'cherry-blossom', category: 'nature', fps: 15, cols: 60, rows: 24, color: true,
  init({ rnd, cols, rows }) { return { p: Array.from({ length: 50 }, () => ({ x: rnd() * cols, y: rnd() * rows, ph: rnd() * 6 })) }; },
  frame({ g, state, t, dt, rnd }) {
    g.line(8, g.rows - 1, 16, 8, '║', '#5b3a29'); g.line(16, 8, 24, 3, '╲', '#5b3a29'); g.line(16, 10, 30, 6, '─', '#5b3a29'); g.line(14, 12, 6, 6, '╱', '#5b3a29');
    for (let k = 0; k < 90; k++) { const a = k * 2.4, r = Math.sqrt(k) * 1.7; g.set(20 + Math.cos(a) * r * 1.6, 6 + Math.sin(a) * r * 0.6, k % 3 ? '✿' : '❀', hsl(335 + (k % 5) * 5, 0.8, 0.75 + (k % 3) * 0.05)); }
    for (const p of state.p) { p.y += dt * 2; p.x += Math.sin(t * 2 + p.ph) * dt * 4 + dt * 3; if (p.y > g.rows || p.x > g.cols) { p.y = -1; p.x = rnd() * 35; } g.set(p.x, p.y, '❀', '#fbcfe8'); }
    for (let x = 0; x < g.cols; x++) g.set(x, g.rows - 1, '▀', '#365314');
  },
});

export const fern = definePiece({
  name: 'fern', category: 'nature', fps: 20, cols: 50, rows: 28, color: true, keep: true,
  init() { return { x: 0, y: 0, n: 0 }; },
  frame({ g, state, rnd, i }) {
    if (i % 400 === 0) { g.clear(); state.x = 0; state.y = 0; state.n = 0; }
    for (let k = 0; k < 150; k++) {
      const r = rnd(), { x, y } = state;
      let nx, ny;
      if (r < 0.01) { nx = 0; ny = 0.16 * y; } else if (r < 0.86) { nx = 0.85 * x + 0.04 * y; ny = -0.04 * x + 0.85 * y + 1.6; } else if (r < 0.93) { nx = 0.2 * x - 0.26 * y; ny = 0.23 * x + 0.22 * y + 1.6; } else { nx = -0.15 * x + 0.28 * y; ny = 0.26 * x + 0.24 * y + 0.44; }
      state.x = nx; state.y = ny; state.n++;
      g.set(g.cols / 2 + nx * 4.4, g.rows - 1 - ny * 2.7, state.n % 7 === 0 ? '✦' : '·', mix('#166534', '#86efac', clamp(ny / 10, 0, 1)));
    }
  },
});

export const contourMap = definePiece({
  name: 'contour-map', category: 'nature', fps: 10, cols: 70, rows: 26, color: true,
  frame({ g, t }) {
    g.each((x, y) => {
      const h = fbm(x * 0.06 + t * 0.05, y * 0.12 + t * 0.03, 4);
      const level = Math.floor(h * 10), frac = (h * 10) % 1;
      if (frac < 0.12) return [level % 2 ? '─' : '·', mix('#1e3a8a', '#a16207', clamp(h * 1.4 - 0.2, 0, 1))];
      if (frac > 0.5 && frac < 0.55 && level > 6) return ['▲', '#d6d3d1'];
      return null;
    });
    g.text(1, g.rows - 1, '▲ 1240 m', '#8b98a8');
  },
});

export const landscape = definePiece({
  name: 'landscape', category: 'nature', fps: 12, cols: 70, rows: 26, color: true,
  frame({ g, t }) {
    const layers = [[0.03, 8, '#1e293b', '▲'], [0.06, 12, '#334155', '▲'], [0.1, 16, '#166534', '♠'], [0.18, 21, '#14532d', '╿']];
    for (let x = 0; x < g.cols; x++) {
      g.set(x, 2 + Math.round(Math.sin(x * 0.2 + t * 0.2) * 0.5), ((x * 7) % 11) === 0 ? '.' : ' ', '#475569');
      layers.forEach(([f, base, col, ch], L) => { const h = base - fbm((x + t * (L + 1) * 2) * f, L) * 8; for (let y = Math.round(h); y < g.rows; y++) g.set(x, y, y === Math.round(h) ? ch : L === 3 ? '▓' : '█', col); });
    }
    g.set(60, 3, '☾', '#fef3c7');
  },
});

export const bonsai = definePiece({
  name: 'bonsai', category: 'nature', fps: 8, cols: 44, rows: 22, color: true,
  frame({ g, t, rnd }) {
    g.text(14, 18, '╭────────────────╮', '#78350f'); g.text(14, 19, '╰────────────────╯', '#78350f'); g.text(18, 17, '▓▓▓▓▓▓▓▓', '#5b3a29');
    g.line(22, 17, 20, 12, '║', '#7c4a1e'); g.line(20, 12, 24, 8, '╱', '#7c4a1e'); g.line(20, 12, 14, 9, '╲', '#7c4a1e'); g.line(24, 8, 28, 6, '─', '#7c4a1e');
    const pads = [[14, 8, 7], [24, 6, 8], [29, 5, 6], [19, 11, 5]];
    pads.forEach(([x, y, w], k) => { for (let i = -w; i <= w; i++) for (let j = -1; j <= 0; j++) if (rnd() > 0.15) g.set(x + i, y + j + Math.round(Math.sin(t + k + i * 0.5) * 0.3), j ? '&' : '#', mix('#14532d', '#4ade80', (i + w) / (2 * w))); });
  },
});

export const ruledMountains = definePiece({
  name: 'ruled-mountains', category: 'nature', fps: 12, cols: 70, rows: 26,
  frame({ g, t }) {
    for (let L = 0; L < 12; L++) {
      const y0 = 4 + L * 1.8;
      for (let x = 0; x < g.cols; x++) {
        const h = fbm((x + t * 3 * (L / 12 + 0.2)) * 0.08, L * 0.7) * (6 + L * 0.5);
        const y = y0 - h + 6;
        g.set(x, y, L < 4 ? '·' : L < 8 ? '-' : '=');
      }
    }
  },
});

export const pieces = [rain, snowfall, fireflies, campfire, aurora, lightning, fractalTree, seaSwell, wind, sunrise, cherryBlossom, fern, contourMap, landscape, bonsai, ruledMountains];
