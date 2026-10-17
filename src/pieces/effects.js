import { definePiece, shade, hsl, mix, clamp, TAU, rng } from './kit.js';

export const doomFire = definePiece({
  name: 'doom-fire', category: 'effects', fps: 24, cols: 70, rows: 26, color: true,
  init({ cols, rows }) { const heat = new Uint8Array(cols * rows); heat.fill(30, (rows - 1) * cols); return { heat }; },
  frame({ g, state, rnd }) {
    const W = g.cols, H = g.rows, h = state.heat;
    for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
      const src = y * W + x, r = Math.floor(rnd() * 3);
      const dst = src - W - r + 1;
      const decay = (rnd() < 0.55 ? 1 : 0) + (rnd() < 0.55 ? 1 : 0) + (rnd() < 0.5 ? 1 : 0);
      if (dst >= 0) h[dst] = Math.max(0, h[src] - decay);
    }
    const palette = ['#070707', '#1f0707', '#2f0f07', '#470f07', '#571707', '#671f07', '#771f07', '#8f2707', '#9f2f07', '#af3f07', '#bf4707', '#c74707', '#df4f07', '#df5707', '#df5707', '#d75f07', '#d7670f', '#cf6f0f', '#cf770f', '#cf7f0f', '#cf8717', '#c78717', '#c78f17', '#c7971f', '#bf9f1f', '#bf9f1f', '#bfa727', '#bfa727', '#bfaf2f', '#b7af2f', '#b7b72f', '#b7b737', '#cfcf6f', '#dfdf9f', '#efefc7', '#ffffff', '#ffffff'];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = h[y * W + x]; if (v > 1) g.set(x, y, shade(v / 30, ' .:-=+*#%@'), palette[Math.min(36, v + 6)]); }
  },
});

export const matrixRain = definePiece({
  name: 'matrix-rain', category: 'effects', fps: 15, cols: 70, rows: 28, color: true,
  init({ cols, rnd }) { return { drops: Array.from({ length: cols }, () => ({ y: -rnd() * 40, speed: 0.5 + rnd(), len: 6 + Math.floor(rnd() * 14) })), glyphs: 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ0123456789Z:・.=*+-<>¦|' }; },
  frame({ g, state, rnd, i }) {
    const G = state.glyphs;
    state.drops.forEach((d, x) => {
      d.y += d.speed;
      if (d.y - d.len > g.rows) { d.y = -rnd() * 20; d.len = 6 + Math.floor(rnd() * 14); d.speed = 0.5 + rnd(); }
      for (let k = 0; k < d.len; k++) {
        const y = Math.floor(d.y) - k;
        if (y < 0 || y >= g.rows) continue;
        const ch = G[(x * 31 + y * 17 + ((i / 3) | 0) + (k === 0 ? i : 0)) % G.length];
        const f = 1 - k / d.len;
        g.set(x, y, ch, k === 0 ? '#d8ffe0' : mix('#0a2f14', '#3fd16a', f));
      }
    });
  },
});

export const tunnel = definePiece({
  name: 'tunnel', category: 'effects', fps: 24, cols: 70, rows: 28, color: true,
  frame({ g, t }) {
    const cx = g.cols / 2 + Math.sin(t) * 8, cy = g.rows / 2 + Math.cos(t * 0.7) * 4;
    g.each((x, y) => {
      const dx = (x - cx) / 2, dy = y - cy, d = Math.hypot(dx, dy) + 0.001, a = Math.atan2(dy, dx);
      const depth = 10 / d + t * 3, ang = (a / TAU) * 8 + t;
      const v = ((Math.floor(depth) + Math.floor(ang)) & 1) ? 0.9 : 0.4;
      const fade = clamp(d / 14, 0, 1);
      return [shade(v * fade), hsl(depth * 20, 0.7, 0.3 + fade * 0.35)];
    });
  },
});

export const tvStatic = definePiece({
  name: 'tv-static', category: 'effects', fps: 20, cols: 64, rows: 24,
  frame({ g, rnd, i }) {
    const band = (i * 2) % (g.rows + 6) - 3;
    g.each((x, y) => { const v = rnd() * (Math.abs(y - band) < 2 ? 1.6 : 1); return shade(Math.min(1, v), ' .:-=+*#%@'); });
    if (i % 90 < 8) g.center(g.rows / 2, ' NO SIGNAL ');
  },
});

export const rotozoomer = definePiece({
  name: 'rotozoomer', category: 'effects', fps: 24, cols: 70, rows: 28, color: true,
  frame({ g, t }) {
    const a = t * 0.6, s = 0.6 + 0.4 * Math.sin(t * 0.8), ca = Math.cos(a) * s, sa = Math.sin(a) * s;
    g.each((x, y) => {
      const u = (x - g.cols / 2) / 2, v = y - g.rows / 2;
      const rx = u * ca - v * sa + t * 4, ry = u * sa + v * ca;
      const check = (Math.floor(rx / 4) + Math.floor(ry / 4)) & 1;
      return [check ? '█' : '░', check ? hsl(t * 40 + rx * 4, 0.7, 0.55) : '#1f2937'];
    });
  },
});

export const fireworks = definePiece({
  name: 'fireworks', category: 'effects', fps: 30, cols: 70, rows: 28, color: true,
  init() { return { rockets: [], sparks: [] }; },
  frame({ g, state, rnd, dt }) {
    if (rnd() < 0.05) state.rockets.push({ x: 10 + rnd() * (g.cols - 20), y: g.rows - 1, vy: -(16 + rnd() * 8), hue: rnd() * 360 });
    for (const r of state.rockets) {
      r.y += r.vy * dt; r.vy += 12 * dt;
      g.set(r.x, r.y, '|', '#fde68a');
      if (r.vy > -4) { for (let k = 0; k < 60; k++) { const a = rnd() * TAU, sp = 4 + rnd() * 10; state.sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp * 2, vy: Math.sin(a) * sp, life: 1, hue: r.hue + rnd() * 30 }); } r.dead = true; }
    }
    state.rockets = state.rockets.filter((r) => !r.dead);
    for (const s of state.sparks) { s.life -= dt * 0.8; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 6 * dt; s.vx *= 0.98; g.set(s.x, s.y, s.life > 0.6 ? '*' : s.life > 0.3 ? '+' : '.', hsl(s.hue, 0.9, 0.4 + s.life * 0.4)); }
    state.sparks = state.sparks.filter((s) => s.life > 0 && s.y < g.rows);
  },
});

export const sparks = definePiece({
  name: 'sparks', category: 'effects', fps: 30, cols: 60, rows: 24, color: true,
  init() { return { p: [] }; },
  frame({ g, state, rnd, dt }) {
    for (let k = 0; k < 5; k++) state.p.push({ x: g.cols / 2, y: g.rows - 3, vx: (rnd() - 0.5) * 40, vy: -(8 + rnd() * 14), life: 0.6 + rnd() * 0.8 });
    for (const p of state.p) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 25 * dt; g.set(p.x, p.y, p.life > 0.6 ? '✦' : p.life > 0.3 ? '*' : '·', mix('#7c2d12', '#fef08a', clamp(p.life, 0, 1))); }
    state.p = state.p.filter((p) => p.life > 0 && p.y < g.rows);
    g.text(g.cols / 2 - 3, g.rows - 2, '╲▓▓▓╱', '#6b7280'); g.text(g.cols / 2 - 2, g.rows - 1, '▀▀▀', '#374151');
  },
});

export const synthwave = definePiece({
  name: 'synthwave', category: 'effects', fps: 24, cols: 70, rows: 28, color: true,
  frame({ g, t }) {
    const horizon = g.rows * 0.55, cx = g.cols / 2;
    for (let y = 0; y < horizon; y++) {
      const sunR = 9, dy = (y - horizon + 2) ;
      const w = Math.sqrt(Math.max(0, sunR * sunR - dy * dy)) * 2;
      if (w > 0 && (y % 3 !== 0 || y < horizon - 6)) for (let x = cx - w; x <= cx + w; x++) g.set(x, y, '█', mix('#ff7b72', '#f59e0b', (y / horizon)));
      for (let x = 0; x < g.cols; x += 1) if (((x * 7 + y * 13) % 29) === 0) g.set(x, y, '.', '#6d28d9');
    }
    for (let y = horizon; y < g.rows; y++) {
      const depth = (y - horizon) / (g.rows - horizon);
      const z = 1 / (depth + 0.08);
      const rowOn = (((t * 3 + z) % 1.5) < 0.25);
      for (let x = 0; x < g.cols; x++) {
        const u = (x - cx) * z * 0.12;
        const vert = Math.abs((u % 1 + 1) % 1 - 0.5) < 0.08 / (depth + 0.3);
        if (rowOn || vert) g.set(x, y, rowOn ? '─' : '│', mix('#4c1d95', '#f0abfc', depth));
      }
    }
    for (let x = 0; x < g.cols; x++) g.set(x, horizon, '━', '#f0abfc');
  },
});

export const pieces = [doomFire, matrixRain, tunnel, tvStatic, rotozoomer, fireworks, sparks, synthwave];
