import { definePiece, shade, hsl, mix, clamp, TAU, RAMP } from './kit.js';

export const bouncingBalls = definePiece({
  name: 'bouncing-balls', category: 'physics', fps: 30, cols: 60, rows: 24, color: true,
  init({ rnd, cols }) {
    return { balls: Array.from({ length: 6 }, (_, i) => ({ x: 4 + rnd() * (cols - 8), y: 2 + rnd() * 6, vx: (rnd() - 0.5) * 24, vy: 0, c: hsl(i * 60, 0.8, 0.6) })) };
  },
  frame({ g, state, dt }) {
    for (const b of state.balls) {
      b.vy += 40 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y >= g.rows - 2) { b.y = g.rows - 2; b.vy = -Math.abs(b.vy) * 0.9; }
      if (b.x < 1 || b.x > g.cols - 2) { b.vx *= -1; b.x = clamp(b.x, 1, g.cols - 2); }
      g.set(b.x, b.y, '●', b.c); g.set(b.x - 1, b.y, '(', b.c); g.set(b.x + 1, b.y, ')', b.c);
    }
    for (let x = 0; x < g.cols; x++) g.set(x, g.rows - 1, '▀', '#3d4b5c');
  },
});

export const doublePendulum = definePiece({
  name: 'double-pendulum', category: 'physics', fps: 30, cols: 60, rows: 26, color: true,
  init() { return { a1: Math.PI / 2, a2: Math.PI / 2 + 0.3, w1: 0, w2: 0, trail: [] }; },
  frame({ g, state }) {
    const { l1, l2, m1, m2, gr } = { l1: 1, l2: 1, m1: 1, m2: 1, gr: 9.81 };
    for (let s = 0; s < 4; s++) {
      const dt = 1 / 120, { a1, a2, w1, w2 } = state;
      const d = a1 - a2, den = 2 * m1 + m2 - m2 * Math.cos(2 * d);
      const acc1 = (-gr * (2 * m1 + m2) * Math.sin(a1) - m2 * gr * Math.sin(a1 - 2 * a2) - 2 * Math.sin(d) * m2 * (w2 * w2 * l2 + w1 * w1 * l1 * Math.cos(d))) / (l1 * den);
      const acc2 = (2 * Math.sin(d) * (w1 * w1 * l1 * (m1 + m2) + gr * (m1 + m2) * Math.cos(a1) + w2 * w2 * l2 * m2 * Math.cos(d))) / (l2 * den);
      state.w1 += acc1 * dt; state.w2 += acc2 * dt; state.a1 += state.w1 * dt; state.a2 += state.w2 * dt;
    }
    const ox = g.cols / 2, oy = 6, L = 7;
    const x1 = ox + Math.sin(state.a1) * L * 2, y1 = oy + Math.cos(state.a1) * L;
    const x2 = x1 + Math.sin(state.a2) * L * 2, y2 = y1 + Math.cos(state.a2) * L;
    state.trail.push([x2, y2]); if (state.trail.length > 120) state.trail.shift();
    state.trail.forEach(([x, y], i) => g.set(x, y, i > 90 ? '*' : i > 50 ? '+' : '.', mix('#1f2937', '#f778ba', i / 120)));
    g.line(ox, oy, x1, y1, '·', '#8b98a8'); g.line(x1, y1, x2, y2, '·', '#8b98a8');
    g.set(ox, oy, '┬', '#8b98a8'); g.set(x1, y1, '●', '#58a6ff'); g.set(x2, y2, '●', '#f778ba');
  },
});

export const lorenzAttractor = definePiece({
  name: 'lorenz-attractor', category: 'physics', fps: 30, cols: 64, rows: 28, color: true,
  init() { return { p: [0.1, 0, 0], pts: [] }; },
  frame({ g, state, t }) {
    for (let s = 0; s < 8; s++) {
      const [x, y, z] = state.p, dt = 0.005;
      state.p = [x + 10 * (y - x) * dt, y + (x * (28 - z) - y) * dt, z + (x * y - (8 / 3) * z) * dt];
      state.pts.push(state.p);
    }
    if (state.pts.length > 1500) state.pts.splice(0, state.pts.length - 1500);
    const a = t * 0.3;
    state.pts.forEach((p, i) => {
      const x = p[0] * Math.cos(a) - p[1] * Math.sin(a);
      const y = p[2] - 27;
      const age = i / state.pts.length;
      g.set(g.cols / 2 + x * 1.3, g.rows / 2 + y * 0.45, age > 0.95 ? '@' : age > 0.7 ? '*' : '.', hsl(200 + age * 120, 0.8, 0.4 + age * 0.3));
    });
  },
});

export const pendulumWave = definePiece({
  name: 'pendulum-wave', category: 'physics', fps: 30, cols: 60, rows: 24, color: true,
  frame({ g, t }) {
    const n = 15;
    for (let i = 0; i < n; i++) {
      const x = 4 + i * ((g.cols - 8) / (n - 1));
      const period = 20 / (30 + i);
      const a = Math.sin(t * TAU / period * 0.5) * 0.9;
      const L = 14;
      const bx = x + Math.sin(a) * 3, by = 2 + Math.cos(a) * L;
      g.line(x, 1, bx, by, '·', '#374151');
      g.set(bx, by, '●', hsl(i * 24, 0.8, 0.6));
    }
    for (let x = 0; x < g.cols; x++) g.set(x, 0, '═', '#8b98a8');
  },
});

export const waveInterference = definePiece({
  name: 'wave-interference', category: 'physics', fps: 20, cols: 70, rows: 28,
  frame({ g, t }) {
    const s1 = [g.cols * 0.3, g.rows / 2], s2 = [g.cols * 0.7, g.rows / 2];
    g.each((x, y) => {
      const d1 = Math.hypot((x - s1[0]) / 2, y - s1[1]), d2 = Math.hypot((x - s2[0]) / 2, y - s2[1]);
      const v = (Math.sin(d1 * 0.9 - t * 4) + Math.sin(d2 * 0.9 - t * 4)) / 2;
      return shade((v + 1) / 2);
    });
  },
});

export const fallingSand = definePiece({
  name: 'falling-sand', category: 'physics', fps: 30, cols: 50, rows: 26, color: true,
  init({ cols, rows }) { return { grid: new Uint8Array(cols * rows), hue: 30 }; },
  frame({ g, state, rnd, i }) {
    const { grid } = state, W = g.cols, H = g.rows;
    const drop = Math.round(W / 2 + Math.sin(i * 0.05) * W * 0.3 + (rnd() - 0.5) * 4);
    if (grid[drop] === 0) grid[drop] = 1 + ((i / 40) % 6 | 0);
    for (let y = H - 2; y >= 0; y--) for (let x = 0; x < W; x++) {
      const v = grid[y * W + x]; if (!v) continue;
      const below = (y + 1) * W + x;
      if (!grid[below]) { grid[below] = v; grid[y * W + x] = 0; continue; }
      const dir = rnd() < 0.5 ? -1 : 1;
      for (const d of [dir, -dir]) {
        const nx = x + d;
        if (nx >= 0 && nx < W && !grid[below + d]) { grid[below + d] = v; grid[y * W + x] = 0; break; }
      }
    }
    if (grid.slice((H - 1) * W).every(Boolean) && i % 60 === 0) grid.fill(0);
    let filled = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = grid[y * W + x]; if (v) { filled++; g.set(x, y, '▒', hsl(20 + v * 25, 0.7, 0.6)); } }
    if (filled > W * H * 0.8) grid.fill(0);
  },
});

export const newtonsCradle = definePiece({
  name: 'newtons-cradle', category: 'physics', fps: 30, cols: 50, rows: 22, color: true,
  frame({ g, t }) {
    const n = 5, cx = g.cols / 2, top = 2, L = 12;
    const phase = Math.sin(t * 3.2);
    for (let i = 0; i < n; i++) {
      let a = 0;
      if (i === 0 && phase > 0) a = -phase * 0.8;
      if (i === n - 1 && phase < 0) a = -phase * 0.8;
      const px = cx + (i - (n - 1) / 2) * 4;
      const bx = px + Math.sin(a) * L * 2, by = top + Math.cos(a) * L;
      g.line(px, top, bx, by, '·', '#4b5563');
      g.set(bx, by, '●', '#d1d5db'); g.set(bx - 1, by, '(', '#9ca3af'); g.set(bx + 1, by, ')', '#9ca3af');
    }
    for (let x = cx - 14; x <= cx + 14; x++) g.set(x, top, '═', '#8b98a8');
  },
});

export const fountain = definePiece({
  name: 'fountain', category: 'physics', fps: 30, cols: 50, rows: 26, color: true,
  init() { return { p: [] }; },
  frame({ g, state, rnd, dt }) {
    for (let k = 0; k < 4; k++) state.p.push({ x: g.cols / 2, y: g.rows - 2, vx: (rnd() - 0.5) * 16, vy: -22 - rnd() * 8, life: 1 });
    state.p = state.p.filter((p) => p.y < g.rows - 1 || p.vy < 0);
    for (const p of state.p) {
      p.vy += 30 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const up = p.vy < 0;
      g.set(p.x, p.y, up ? '|' : Math.abs(p.vx) > 6 ? '.' : ':', up ? '#bae6fd' : '#38bdf8');
    }
    for (let x = g.cols / 2 - 10; x < g.cols / 2 + 11; x++) g.set(x, g.rows - 1, '~', '#0ea5e9');
    g.text(g.cols / 2 - 1, g.rows - 2, '╨╨╨', '#6b7280');
  },
});

export const harmonograph = definePiece({
  name: 'harmonograph', category: 'physics', fps: 24, cols: 60, rows: 28, keep: true,
  init() { return { s: 0 }; },
  frame({ g, state, i }) {
    if (i % 600 === 0) { g.clear(); state.s = 0; }
    for (let k = 0; k < 30; k++) {
      const s = state.s += 0.03, d = Math.exp(-s * 0.012);
      const x = Math.sin(3 * s + 1.1) * d + Math.sin(2 * s + 0.4) * d;
      const y = Math.sin(3.02 * s) * d + Math.sin(1.98 * s + 2.1) * d;
      g.set(g.cols / 2 + x * 13, g.rows / 2 + y * 6, d > 0.6 ? '*' : '.');
    }
  },
});

export const chladniPlate = definePiece({
  name: 'chladni-plate', category: 'physics', fps: 12, cols: 60, rows: 28,
  frame({ g, t }) {
    const m = 3 + Math.floor((t / 4) % 4), n = 2 + Math.floor((t / 7) % 5);
    g.each((x, y) => {
      const u = (x / g.cols) * Math.PI, v = (y / g.rows) * Math.PI;
      const z = Math.cos(n * u) * Math.cos(m * v) - Math.cos(m * u) * Math.cos(n * v);
      return Math.abs(z) < 0.08 ? '·' : Math.abs(z) < 0.16 ? '.' : null;
    });
    g.text(1, g.rows - 1, `m=${m} n=${n}`);
  },
});

export const pluckedString = definePiece({
  name: 'plucked-string', category: 'physics', fps: 30, cols: 64, rows: 20, color: true,
  init({ cols }) { return { y: new Float32Array(cols), v: new Float32Array(cols), pluckAt: 0 }; },
  frame({ g, state, t, dt }) {
    const n = g.cols;
    if (t - state.pluckAt > 3) { state.pluckAt = t; for (let i = 0; i < n; i++) state.y[i] = Math.sin((i / n) * Math.PI) * 7 * (i < n / 3 ? i / (n / 3) : 1) ; state.v.fill(0); }
    for (let s = 0; s < 3; s++) for (let i = 1; i < n - 1; i++) state.v[i] += ((state.y[i - 1] + state.y[i + 1]) / 2 - state.y[i]) * 2.5 - state.v[i] * 0.005;
    for (let i = 1; i < n - 1; i++) state.y[i] += state.v[i] * dt * 4;
    for (let i = 0; i < n; i++) g.set(i, g.rows / 2 + state.y[i], Math.abs(state.v[i]) > 1 ? '•' : '─', mix('#8b98a8', '#ffa657', clamp(Math.abs(state.y[i]) / 6, 0, 1)));
    g.set(0, g.rows / 2, '╟'); g.set(n - 1, g.rows / 2, '╢');
  },
});

export const pondRipples = definePiece({
  name: 'pond-ripples', category: 'physics', fps: 20, cols: 70, rows: 28,
  init() { return { drops: [] }; },
  frame({ g, state, t, rnd }) {
    if (rnd() < 0.06) state.drops.push({ x: rnd() * g.cols, y: rnd() * g.rows, t0: t });
    state.drops = state.drops.filter((d) => t - d.t0 < 6);
    g.each((x, y) => {
      let v = 0;
      for (const d of state.drops) {
        const dist = Math.hypot((x - d.x) / 2, y - d.y), age = t - d.t0;
        v += Math.sin(dist * 1.2 - age * 5) * Math.exp(-age * 0.5) * Math.exp(-Math.abs(dist - age * 4) * 0.4);
      }
      const q = clamp(0.3 + v * 0.7, 0, 1);
      return q < 0.26 || q > 0.34 ? shade(q, ' .:~=+*#') : null;
    });
  },
});

export const smoke = definePiece({
  name: 'smoke', category: 'physics', fps: 20, cols: 50, rows: 28,
  init() { return { p: [] }; },
  frame({ g, state, rnd, dt, t }) {
    for (let k = 0; k < 3; k++) state.p.push({ x: g.cols / 2 + (rnd() - 0.5) * 2, y: g.rows - 2, age: 0, seed: rnd() * 10 });
    state.p = state.p.filter((p) => p.age < 1);
    for (const p of state.p) {
      p.age += dt * 0.25; p.y -= dt * 7; p.x += Math.sin(t * 1.5 + p.seed + p.y * 0.2) * dt * 6 + (rnd() - 0.5) * 0.6;
      const v = 1 - p.age;
      g.set(p.x + (rnd() - 0.5) * p.age * 6, p.y, shade(v * 0.8, ' .:-=+*#'));
    }
    g.text(g.cols / 2 - 1, g.rows - 1, '▓▓▓');
  },
});

export const flag = definePiece({
  name: 'flag', category: 'physics', fps: 20, cols: 60, rows: 24, color: true,
  frame({ g, t }) {
    const W = 36, H = 16, x0 = 6, y0 = 3;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const wave = Math.sin(x * 0.25 - t * 5 + y * 0.1) * (x / W) * 2.2;
      const light = 0.5 + 0.5 * Math.cos(x * 0.25 - t * 5 + y * 0.1);
      const stripe = Math.floor((y / H) * 3);
      const col = ['#ff9933', '#f8f8f8', '#138808'][stripe];
      g.set(x0 + x, y0 + y + wave, light > 0.6 ? '█' : light > 0.3 ? '▓' : '▒', col);
    }
    for (let y = 0; y < g.rows; y++) g.set(x0 - 1, y, '║', '#8b98a8');
  },
});

export const pieces = [bouncingBalls, doublePendulum, lorenzAttractor, pendulumWave, waveInterference, fallingSand, newtonsCradle, fountain, harmonograph, chladniPlate, pluckedString, pondRipples, smoke, flag];
