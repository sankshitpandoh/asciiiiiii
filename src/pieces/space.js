import { definePiece, shade, fbm, hsl, TAU, rotY, rotX, project, lambert, plotPoints, clamp, mix } from './kit.js';

export const starfield = definePiece({
  name: 'starfield', category: 'space', fps: 24, cols: 70, rows: 26,
  init({ rnd }) {
    return { stars: Array.from({ length: 160 }, () => ({ x: rnd() * 2 - 1, y: rnd() * 2 - 1, z: rnd() })) };
  },
  frame({ g, state, rnd, dt }) {
    for (const s of state.stars) {
      s.z -= dt * 0.35;
      if (s.z <= 0.02) { s.x = rnd() * 2 - 1; s.y = rnd() * 2 - 1; s.z = 1; }
      const k = 0.4 / s.z;
      const x = g.cols / 2 + s.x * k * g.cols / 2, y = g.rows / 2 + s.y * k * g.rows / 2;
      g.set(x, y, s.z < 0.2 ? '@' : s.z < 0.4 ? '*' : s.z < 0.7 ? '+' : '.');
    }
  },
});

function sphere(g, t, radius, texture, { tilt = 0.3, light = [0.6, -0.4, -0.7], color = null } = {}) {
  g.useDepth();
  for (let i = 0; i < 160; i++) for (let j = 1; j < 60; j++) {
    const u = (i / 160) * TAU, v = (j / 60) * Math.PI;
    const n0 = [Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u)];
    const n = rotX(rotY(n0, t), tilt);
    if (n[2] > 0) continue; // back face
    const lum = lambert(n, light);
    const tex = texture(u, v);
    const [sx, sy, z] = project(n[0] * radius, n[1] * radius, n[2] * radius, g.cols, g.rows, 1, 100);
    const val = clamp(lum * tex.v, 0, 1);
    g.set(sx, sy, shade(val), color ? color(tex, val) : null, -n[2]);
  }
}

export const planet = definePiece({
  name: 'planet', category: 'space', fps: 16, cols: 60, rows: 26, color: true,
  frame({ g, t }) {
    sphere(g, t * 0.4, 0.95 * g.rows / 2, (u, v) => ({ v: 0.5 + fbm(u * 1.5, v * 6) * 0.9, band: Math.sin(v * 9 + fbm(u, v) * 2) }), {
      color: (tex, val) => mix(hsl(28, 0.7, 0.35), hsl(42, 0.9, 0.7), tex.band * 0.5 + 0.5 - (1 - val) * 0.4),
    });
    for (let i = 0; i < 300; i++) {
      const a = (i / 300) * TAU;
      const x = g.cols / 2 + Math.cos(a) * g.rows * 1.15, y = g.rows / 2 + Math.sin(a) * g.rows * 0.22;
      if (Math.sin(a) < 0 && Math.hypot((x - g.cols / 2) / 2, y - g.rows / 2) < g.rows / 2 * 0.9) continue;
      g.set(x, y, i % 3 ? '-' : '=', '#c9b48c');
    }
  },
});

export const earth = definePiece({
  name: 'earth', category: 'space', fps: 16, cols: 56, rows: 26, color: true,
  frame({ g, t }) {
    sphere(g, t * 0.35, 0.95 * g.rows / 2, (u, v) => {
      const land = fbm(u * 1.2 + 3, v * 2.4 + 1, 5) > 0.52;
      const ice = Math.abs(Math.cos(v)) > 0.92;
      return { v: land ? 0.9 : 0.55, land, ice };
    }, { tilt: 0.4, color: (tex, val) => tex.ice ? '#e6f7ff' : tex.land ? mix('#1f5a1f', '#7ee787', val) : mix('#0b2a5a', '#3b82f6', val) });
  },
});

export const moonPhases = definePiece({
  name: 'moon-phases', category: 'space', fps: 12, cols: 44, rows: 22,
  frame({ g, t }) {
    const phase = (t * 0.25) % 1; // 0 new → 0.5 full → 1 new
    const r = g.rows / 2 - 1;
    g.each((x, y) => {
      const nx = (x - g.cols / 2) / 2 / r, ny = (y - g.rows / 2) / r;
      const d = nx * nx + ny * ny;
      if (d > 1) return null;
      const z = Math.sqrt(1 - d);
      const lightDir = Math.cos(phase * TAU);
      const lx = -Math.sin(phase * TAU);
      const lit = nx * lx + z * -lightDir > 0;
      const crater = fbm(nx * 4 + 7, ny * 4 + 3) > 0.6;
      return lit ? (crater ? 'o' : '@') : (d > 0.95 ? '.' : ' ');
    });
    const names = ['new', 'waxing crescent', 'first quarter', 'waxing gibbous', 'full', 'waning gibbous', 'last quarter', 'waning crescent'];
    g.center(g.rows - 1, names[Math.floor(phase * 8) % 8]);
  },
});

export const blackHole = definePiece({
  name: 'black-hole', category: 'space', fps: 20, cols: 70, rows: 28, color: true,
  frame({ g, t }) {
    const cx = g.cols / 2, cy = g.rows / 2;
    g.each((x, y) => {
      const dx = (x - cx) / 2, dy = y - cy;
      const d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (d < 3.2) return null;
      const disk = Math.exp(-((Math.abs(dy) - d * 0.12) ** 2) / 1.6) * (d < 13 ? 1 : Math.exp(-(d - 13) / 3));
      const swirl = 0.5 + 0.5 * Math.sin(a * 3 - t * 4 + d * 0.8);
      const v = disk * (0.4 + 0.6 * swirl) * clamp(1.4 - d / 14, 0, 1);
      if (v < 0.08) return d > 12 && fbm(x * 0.3, y * 0.3) > 0.68 ? '.' : null;
      const doppler = Math.cos(a) * 0.5 + 0.5;
      return [shade(v), mix('#7a1b00', '#fff1c1', clamp(v * 0.7 + doppler * 0.4, 0, 1))];
    });
    g.ellipse(cx, cy, 6.6, 3.3, '·', '#ffd27a');
  },
});

export const solarSystem = definePiece({
  name: 'solar-system', category: 'space', fps: 16, cols: 70, rows: 28, color: true,
  frame({ g, t }) {
    const cx = g.cols / 2, cy = g.rows / 2;
    const planets = [[4, 'o', '#9e9e9e', 4.1], [6, 'o', '#f5c16c', 1.6], [8.5, 'O', '#58a6ff', 1], [11, 'o', '#ff7b72', 0.53], [15, '@', '#d9a066', 0.084], [19, 'O', '#e3d7a3', 0.034], [23, 'o', '#9be4ef', 0.012], [27, 'o', '#4169e1', 0.006]];
    for (const [r] of planets) g.ellipse(cx, cy, r * 1.25, r * 0.5, '·', '#2d3a4a', r * 10);
    g.set(cx, cy, '☀', '#ffd27a'); g.set(cx - 1, cy, '(', '#ffa657'); g.set(cx + 1, cy, ')', '#ffa657');
    for (const [r, ch, col, speed] of planets) {
      const a = t * speed * 0.6 + r;
      g.set(cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 0.5, ch, col);
      if (r === 15) for (let k = 0; k < 6; k++) g.set(cx + Math.cos(a) * r * 1.25 + Math.cos(k) * 2 - 1, cy + Math.sin(a) * r * 0.5, '-', '#c9b48c');
    }
  },
});

export const galaxy = definePiece({
  name: 'galaxy', category: 'space', fps: 16, cols: 70, rows: 28, color: true,
  init({ rnd }) {
    return { stars: Array.from({ length: 700 }, (_, i) => ({ r: Math.pow(rnd(), 0.7) * 1.1, a: rnd() * TAU, arm: i % 2, j: (rnd() - 0.5) * 0.35 })) };
  },
  frame({ g, t, state }) {
    const cx = g.cols / 2, cy = g.rows / 2;
    for (const s of state.stars) {
      const ang = s.a + t * 0.15 / (s.r + 0.1) + s.r * 3.2 + s.arm * Math.PI;
      const x = cx + Math.cos(ang) * (s.r + s.j) * g.cols * 0.45, y = cy + Math.sin(ang) * (s.r + s.j) * g.rows * 0.42;
      const core = s.r < 0.25;
      g.set(x, y, core ? '@' : s.r < 0.6 ? '*' : '.', core ? '#fff4d6' : mix('#58a6ff', '#f0abfc', s.r));
    }
  },
});

export const eclipse = definePiece({
  name: 'eclipse', category: 'space', fps: 12, cols: 50, rows: 24, color: true,
  frame({ g, t }) {
    const cx = g.cols / 2, cy = g.rows / 2, r = 7;
    const off = Math.sin(t * 0.3) * 12;
    g.each((x, y) => {
      const dx = (x - cx) / 2, dy = y - cy;
      const d = Math.hypot(dx, dy), dm = Math.hypot(dx - off / 2, dy);
      if (dm <= r) return null;
      if (d <= r) return ['@', '#ffd27a'];
      const corona = Math.exp(-(d - r) / (2 + Math.sin(Math.atan2(dy, dx) * 6 + t) * 0.8));
      if (Math.abs(off) < 3 && corona > 0.25) return [shade(corona), mix('#9e6a03', '#fff7e0', corona)];
      return null;
    });
  },
});

export const rocket = definePiece({
  name: 'rocket', category: 'space', fps: 16, cols: 40, rows: 26, color: true,
  frame({ g, t, rnd }) {
    const ship = ['   /\\   ', '  |==|  ', '  |  |  ', '  |[]|  ', ' /|  |\\ ', '/_|__|_\\', '  /\\/\\  '];
    const y0 = 6 + Math.sin(t * 2) * 1.2, x0 = g.cols / 2 - 4;
    ship.forEach((row, i) => g.text(x0, y0 + i, row, i === 3 ? '#58a6ff' : '#e6edf3'));
    for (let i = 0; i < 40; i++) {
      const fx = x0 + 3 + (rnd() - 0.5) * 3 * (1 + i / 20), fy = y0 + 7 + i * 0.35;
      g.set(fx, fy, i < 8 ? '@' : i < 20 ? '*' : '.', mix('#fff7e0', '#ff7b72', clamp(i / 25, 0, 1)));
    }
    for (let i = 0; i < 30; i++) g.set((i * 7919) % g.cols, ((i * 104729) / 7 + t * 10) % g.rows, '.', '#4b5563');
  },
});

export const threeBody = definePiece({
  name: 'three-body', category: 'space', fps: 30, cols: 64, rows: 28, color: true,
  init() {
    return { b: [{ p: [-1, 0], v: [0.347, 0.533] }, { p: [1, 0], v: [0.347, 0.533] }, { p: [0, 0], v: [-0.694, -1.066] }], trail: [] };
  },
  frame({ g, state }) {
    for (let step = 0; step < 6; step++) {
      const dt = 0.004;
      for (const a of state.b) {
        let ax = 0, ay = 0;
        for (const b of state.b) if (a !== b) {
          const dx = b.p[0] - a.p[0], dy = b.p[1] - a.p[1], d = Math.hypot(dx, dy) + 0.05;
          ax += dx / d ** 3; ay += dy / d ** 3;
        }
        a.v[0] += ax * dt; a.v[1] += ay * dt;
      }
      for (const a of state.b) { a.p[0] += a.v[0] * dt; a.p[1] += a.v[1] * dt; }
    }
    state.trail.push(state.b.map((b) => [...b.p]));
    if (state.trail.length > 90) state.trail.shift();
    const cols = ['#ff7b72', '#7ee787', '#58a6ff'];
    state.trail.forEach((pts, k) => pts.forEach((p, i) => g.set(g.cols / 2 + p[0] * 14, g.rows / 2 + p[1] * 7, k > 70 ? '*' : k > 40 ? '+' : '.', cols[i])));
    state.b.forEach((b, i) => g.set(g.cols / 2 + b.p[0] * 14, g.rows / 2 + b.p[1] * 7, '@', cols[i]));
  },
});

export const saptarishi = definePiece({
  name: 'saptarishi', category: 'space', fps: 8, cols: 56, rows: 24, color: true,
  frame({ g, t, rnd }) {
    const stars = [[6, 6, 'Dubhe'], [9, 11, 'Merak'], [18, 10, 'Phecda'], [20, 6, 'Megrez'], [30, 7, 'Alioth'], [38, 9, 'Mizar'], [47, 12, 'Alkaid']];
    const links = [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]];
    for (let i = 0; i < 50; i++) g.set((i * 37) % g.cols, (i * 53) % g.rows, rnd() > 0.1 ? '.' : ' ', '#3d4b5c');
    for (const [a, b] of links) g.line(stars[a][0], stars[a][1], stars[b][0], stars[b][1], '·', '#2d3a4a');
    stars.forEach(([x, y, n], i) => {
      const tw = 0.6 + 0.4 * Math.sin(t * 3 + i * 1.7);
      g.set(x, y, tw > 0.9 ? '✦' : '*', mix('#9ca3af', '#ffffff', tw));
      g.text(x + 1, y + 1, n, '#6b7280');
    });
    g.center(g.rows - 2, 'सप्तर्षि · the seven sages', '#8b98a8');
  },
});

export const pieces = [starfield, planet, earth, moonPhases, blackHole, solarSystem, galaxy, eclipse, rocket, threeBody, saptarishi];
