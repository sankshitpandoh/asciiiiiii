import { definePiece, shade, hsl, mix, clamp, TAU, RAMP, fbm } from './kit.js';

export const plasma = definePiece({
  name: 'plasma', category: 'generative', fps: 20, cols: 70, rows: 28, color: true,
  frame({ g, t }) {
    g.each((x, y) => {
      const v = Math.sin(x * 0.12 + t) + Math.sin(y * 0.25 + t * 0.7) + Math.sin((x * 0.5 + y) * 0.1 + t * 1.3) + Math.sin(Math.hypot(x - 35, (y - 14) * 2) * 0.15 - t);
      const q = (v + 4) / 8;
      return [shade(q), hsl(q * 300 + t * 30, 0.8, 0.55)];
    });
  },
});

export const gliderGun = definePiece({
  name: 'glider-gun', category: 'generative', fps: 12, cols: 60, rows: 26,
  init({ cols, rows }) {
    const grid = new Uint8Array(cols * rows);
    const gun = [[1,5],[1,6],[2,5],[2,6],[11,5],[11,6],[11,7],[12,4],[12,8],[13,3],[13,9],[14,3],[14,9],[15,6],[16,4],[16,8],[17,5],[17,6],[17,7],[18,6],[21,3],[21,4],[21,5],[22,3],[22,4],[22,5],[23,2],[23,6],[25,1],[25,2],[25,6],[25,7],[35,3],[35,4],[36,3],[36,4]];
    gun.forEach(([x, y]) => (grid[(y + 1) * cols + x + 1] = 1));
    return { grid };
  },
  frame({ g, state, i }) {
    const W = g.cols, H = g.rows, cur = state.grid, next = new Uint8Array(W * H);
    if (i % 2 === 0) {
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) { const yy = y + dy, xx = x + dx; if (yy >= 0 && yy < H && xx >= 0 && xx < W) n += cur[yy * W + xx]; }
        const alive = cur[y * W + x];
        next[y * W + x] = alive ? (n === 2 || n === 3 ? 1 : 0) : n === 3 ? 1 : 0;
      }
      state.grid = next;
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (state.grid[y * W + x]) g.set(x, y, '█');
  },
});

export const mandelbrot = definePiece({
  name: 'mandelbrot', category: 'generative', fps: 10, cols: 70, rows: 28, color: true,
  frame({ g, t }) {
    const zoom = Math.exp((t % 14) * 0.45), cx = -0.743643887, cy = 0.131825904;
    const w = 3.5 / zoom, h = w * (g.rows / g.cols) * 2;
    g.each((px, py) => {
      let x = 0, y = 0, n = 0;
      const cr = cx + (px / g.cols - 0.5) * w, ci = cy + (py / g.rows - 0.5) * h;
      const max = 60;
      while (x * x + y * y < 4 && n < max) { const xt = x * x - y * y + cr; y = 2 * x * y + ci; x = xt; n++; }
      if (n === max) return null;
      const q = n / max;
      return [shade(Math.sqrt(q)), hsl(200 + q * 160 + t * 20, 0.8, 0.5)];
    });
  },
});

export const juliaSet = definePiece({
  name: 'julia-set', category: 'generative', fps: 12, cols: 70, rows: 28, color: true,
  frame({ g, t }) {
    const cr = 0.7885 * Math.cos(t * 0.3), ci = 0.7885 * Math.sin(t * 0.3);
    g.each((px, py) => {
      let x = (px / g.cols - 0.5) * 3.2, y = (py / g.rows - 0.5) * 2.6, n = 0;
      while (x * x + y * y < 4 && n < 40) { const xt = x * x - y * y + cr; y = 2 * x * y + ci; x = xt; n++; }
      if (n === 40) return ['@', '#111827'];
      const q = n / 40;
      return q < 0.08 ? null : [shade(q), hsl(280 + q * 120, 0.75, 0.55)];
    });
  },
});

export const langtonsAnt = definePiece({
  name: "langtons-ant", category: 'generative', fps: 30, cols: 60, rows: 28, color: true,
  init({ cols, rows }) { return { grid: new Uint8Array(cols * rows), x: cols >> 1, y: rows >> 1, d: 0, steps: 0 }; },
  frame({ g, state }) {
    const W = g.cols, H = g.rows;
    for (let k = 0; k < 20; k++) {
      const i = state.y * W + state.x;
      state.d = (state.d + (state.grid[i] ? 3 : 1)) % 4;
      state.grid[i] ^= 1;
      state.x = (state.x + [0, 1, 0, -1][state.d] + W) % W; state.y = (state.y + [-1, 0, 1, 0][state.d] + H) % H;
      state.steps++;
    }
    if (state.steps > 12000) { state.grid.fill(0); state.steps = 0; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (state.grid[y * W + x]) g.set(x, y, '▓', '#7ee787');
    g.set(state.x, state.y, '●', '#ff7b72');
    g.text(1, 0, `${state.steps} steps`, '#8b98a8');
  },
});

export const rule30 = definePiece({
  name: 'rule-30', category: 'generative', fps: 10, cols: 70, rows: 28,
  init({ cols }) { const row = new Uint8Array(cols); row[cols >> 1] = 1; return { rows: [row] }; },
  frame({ g, state }) {
    const prev = state.rows[state.rows.length - 1], W = g.cols, next = new Uint8Array(W);
    for (let x = 0; x < W; x++) { const p = (prev[(x - 1 + W) % W] << 2) | (prev[x] << 1) | prev[(x + 1) % W]; next[x] = (30 >> p) & 1; }
    state.rows.push(next); if (state.rows.length > g.rows) state.rows.shift();
    state.rows.forEach((r, y) => { for (let x = 0; x < W; x++) if (r[x]) g.set(x, y, '█'); });
  },
});

export const sierpinski = definePiece({
  name: 'sierpinski', category: 'generative', fps: 6, cols: 64, rows: 28,
  frame({ g, i }) {
    const depth = 1 + (i % 6);
    // Pascal's triangle mod 2 is the Sierpinski gasket: cell (r, c) is filled when r & c === c.
    for (let r = 0; r < Math.min(g.rows - 1, 2 ** depth); r++) for (let c = 0; c <= r; c++) if ((r & c) === c) g.set(g.cols / 2 - r + c * 2, r + 1, '▲');
    g.text(1, 0, `depth ${depth}`);
  },
});

export const hilbertCurve = definePiece({
  name: 'hilbert-curve', category: 'generative', fps: 30, cols: 64, rows: 32, color: true,
  init() {
    const order = 4, n = 1 << order, pts = [];
    for (let d = 0; d < n * n; d++) {
      let rx, ry, s, t = d, x = 0, y = 0;
      for (s = 1; s < n; s *= 2) {
        rx = 1 & (t / 2); ry = 1 & (t ^ rx);
        if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } [x, y] = [y, x]; }
        x += s * rx; y += s * ry; t = Math.floor(t / 4);
      }
      pts.push([x, y]);
    }
    return { pts, n, k: 0 };
  },
  frame({ g, state }) {
    state.k = (state.k + 3) % (state.pts.length * 1.4);
    const sx = (g.cols - 2) / state.n, sy = (g.rows - 1) / state.n;
    for (let i = 1; i < Math.min(state.k, state.pts.length); i++) {
      const [ax, ay] = state.pts[i - 1], [bx, by] = state.pts[i];
      g.line(ax * sx + 1, ay * sy, bx * sx + 1, by * sy, ax === bx ? '│' : '─', hsl((i / state.pts.length) * 300, 0.8, 0.6));
    }
  },
});

export const maze = definePiece({
  name: 'maze', category: 'generative', fps: 30, cols: 61, rows: 27, color: true,
  init({ cols, rows, rnd }) {
    const W = (cols - 1) >> 1, H = (rows - 1) >> 1;
    const walls = new Uint8Array(cols * rows).fill(1), stack = [[0, 0]], seen = new Uint8Array(W * H);
    seen[0] = 1; walls[1 * cols + 1] = 0;
    return { W, H, walls, stack, seen, done: false, cols, rows };
  },
  frame({ g, state, rnd, i }) {
    const { W, H, walls, stack, seen, cols } = state;
    for (let k = 0; k < 3 && stack.length; k++) {
      const [cx, cy] = stack[stack.length - 1];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [cx + dx, cy + dy]).filter(([x, y]) => x >= 0 && y >= 0 && x < W && y < H && !seen[y * W + x]);
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny] = nb[Math.floor(rnd() * nb.length)];
      seen[ny * W + nx] = 1;
      walls[(2 * ny + 1) * cols + 2 * nx + 1] = 0; walls[(cy + ny + 1) * cols + cx + nx + 1] = 0;
      stack.push([nx, ny]);
    }
    if (!stack.length && i % 90 === 0) { walls.fill(1); seen.fill(0); seen[0] = 1; walls[cols + 1] = 0; stack.push([0, 0]); }
    for (let y = 0; y < g.rows; y++) for (let x = 0; x < cols; x++) if (walls[y * cols + x]) g.set(x, y, '█', '#4b5563');
    const head = stack[stack.length - 1]; if (head) g.set(head[0] * 2 + 1, head[1] * 2 + 1, '●', '#7ee787');
  },
});

export const voronoi = definePiece({
  name: 'voronoi', category: 'generative', fps: 15, cols: 70, rows: 28, color: true,
  init({ rnd }) { return { seeds: Array.from({ length: 12 }, (_, i) => ({ x: rnd(), y: rnd(), vx: (rnd() - 0.5) * 0.08, vy: (rnd() - 0.5) * 0.08, c: hsl(i * 30, 0.6, 0.5) })) }; },
  frame({ g, state, dt }) {
    for (const s of state.seeds) { s.x += s.vx * dt; s.y += s.vy * dt; if (s.x < 0 || s.x > 1) s.vx *= -1; if (s.y < 0 || s.y > 1) s.vy *= -1; }
    g.each((x, y) => {
      let best = 0, d1 = Infinity, d2 = Infinity;
      state.seeds.forEach((s, i) => { const d = Math.hypot((x / g.cols - s.x) * 2, y / g.rows - s.y); if (d < d1) { d2 = d1; d1 = d; best = i; } else if (d < d2) d2 = d; });
      const edge = d2 - d1 < 0.03;
      return edge ? ['#', '#e6edf3'] : [d1 < 0.02 ? '●' : '.', state.seeds[best].c];
    });
  },
});

export const flowField = definePiece({
  name: 'flow-field', category: 'generative', fps: 24, cols: 70, rows: 28, color: true,
  init({ rnd, cols, rows }) { return { p: Array.from({ length: 220 }, () => ({ x: rnd() * cols, y: rnd() * rows, h: rnd() * 360 })) }; },
  frame({ g, state, t, dt, rnd }) {
    for (const p of state.p) {
      const a = fbm(p.x * 0.05, p.y * 0.1 + t * 0.1) * TAU * 2;
      p.x += Math.cos(a) * 14 * dt; p.y += Math.sin(a) * 7 * dt;
      if (p.x < 0 || p.x >= g.cols || p.y < 0 || p.y >= g.rows) { p.x = rnd() * g.cols; p.y = rnd() * g.rows; }
      const dir = ((a % TAU) + TAU) % TAU;
      g.set(p.x, p.y, dir < 0.4 || dir > 5.9 ? '─' : dir < 1.2 ? '╲' : dir < 2 ? '│' : dir < 2.8 ? '╱' : dir < 3.5 ? '─' : dir < 4.3 ? '╲' : dir < 5.1 ? '│' : '╱', hsl(p.h + t * 20, 0.7, 0.6));
    }
  },
});

export const epicycles = definePiece({
  name: 'epicycles', category: 'generative', fps: 30, cols: 64, rows: 28, color: true,
  init() { return { trail: [] }; },
  frame({ g, state, t }) {
    let x = g.cols * 0.3, y = g.rows / 2;
    const n = 5;
    for (let k = 0; k < n; k++) {
      const m = 2 * k + 1, r = (10 / m) * (4 / Math.PI);
      const px = x, py = y;
      x += Math.cos(m * t * 1.5) * r * 2; y += Math.sin(m * t * 1.5) * r;
      g.ellipse(px, py, r * 2, r, '·', '#374151'); g.line(px, py, x, y, '-', '#6b7280');
    }
    g.set(x, y, '●', '#f778ba');
    state.trail.unshift(y); if (state.trail.length > g.cols * 0.6) state.trail.pop();
    g.line(x, y, g.cols * 0.4, state.trail[0], '·', '#374151');
    state.trail.forEach((ty, i) => g.set(g.cols * 0.4 + i, ty, '•', mix('#f778ba', '#1f2937', i / state.trail.length)));
  },
});

export const reactionDiffusion = definePiece({
  name: 'reaction-diffusion', category: 'generative', fps: 20, cols: 60, rows: 28, color: true,
  init({ cols, rows, rnd }) {
    const n = cols * rows, A = new Float32Array(n).fill(1), B = new Float32Array(n);
    for (let k = 0; k < 6; k++) { const cx = Math.floor(rnd() * cols), cy = Math.floor(rnd() * rows); for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) B[((cy + y + rows) % rows) * cols + (cx + x + cols) % cols] = 1; }
    return { A, B, A2: new Float32Array(n), B2: new Float32Array(n) };
  },
  frame({ g, state }) {
    const W = g.cols, H = g.rows, f = 0.055, k = 0.062, dA = 1, dB = 0.5;
    for (let s = 0; s < 6; s++) {
      const { A, B, A2, B2 } = state;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, l = y * W + (x - 1 + W) % W, r = y * W + (x + 1) % W, u = ((y - 1 + H) % H) * W + x, d = ((y + 1) % H) * W + x;
        const lapA = (A[l] + A[r]) * 0.2 + (A[u] + A[d]) * 0.2 * 2 - A[i] * 1.2 + (A[l] + A[r] + A[u] + A[d]) * 0;
        const lapB = (B[l] + B[r]) * 0.2 + (B[u] + B[d]) * 0.4 - B[i] * 1.2;
        const abb = A[i] * B[i] * B[i];
        A2[i] = clamp(A[i] + dA * lapA - abb + f * (1 - A[i]), 0, 1);
        B2[i] = clamp(B[i] + dB * lapB + abb - (k + f) * B[i], 0, 1);
      }
      state.A = A2; state.B = B2; state.A2 = A; state.B2 = B;
    }
    g.each((x, y) => { const v = state.B[y * W + x]; return v < 0.1 ? null : [shade(v), mix('#1e3a8a', '#7ee787', v)]; });
  },
});

export const pieces = [plasma, gliderGun, mandelbrot, juliaSet, langtonsAnt, rule30, sierpinski, hilbertCurve, maze, voronoi, flowField, epicycles, reactionDiffusion];
