/**
 * Piece kit — the tiny toolbox every built-in animation is written with.
 *
 * A piece is a plain object:
 *   { name, category, fps, cols, rows, color, options, init(ctx), frame(ctx) }
 * frame() draws into ctx.g (a Grid) each tick. ctx = { g, t, i, cols, rows, opts, state, rnd }.
 */

export const RAMP = ' .:-=+*#%@';
export const RAMP_FINE = ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
export const BLOCKS = ' ░▒▓█';

/** Deterministic PRNG (mulberry32) so pieces are reproducible and testable. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2;

/** Map 0…1 to a ramp glyph. */
export function shade(v, ramp = RAMP) {
  const r = typeof ramp === 'string' ? ramp : ramp.join('');
  const chars = Array.from(r);
  return chars[clamp(Math.round(v * (chars.length - 1)), 0, chars.length - 1)];
}

/** Cheap 2-D value noise, smooth and periodic enough for backgrounds. */
export function noise2(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}
export function smoothNoise(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const fx = x - x0, fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = noise2(x0, y0), b = noise2(x0 + 1, y0), c = noise2(x0, y0 + 1), d = noise2(x0 + 1, y0 + 1);
  return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
}
export function fbm(x, y, octaves = 4) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < octaves; i++) {
    v += smoothNoise(x * f, y * f) * amp;
    amp *= 0.5;
    f *= 2;
  }
  return v;
}

export function hsl(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
export function rgb(r, g, b) {
  const h = (v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}
/** Blend two hex colours. */
export function mix(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return rgb(lerp(pa[0], pb[0], t), lerp(pa[1], pb[1], t), lerp(pa[2], pb[2], t));
}

/** A character grid with optional per-cell colour and a depth buffer. */
export class Grid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Array(cols * rows).fill(' ');
    this.col = new Array(cols * rows).fill(null);
    this.z = null;
  }
  clear(ch = ' ') {
    this.cells.fill(ch);
    this.col.fill(null);
    if (this.z) this.z.fill(-Infinity);
  }
  useDepth() {
    if (!this.z) this.z = new Float32Array(this.cols * this.rows);
    this.z.fill(-Infinity);
  }
  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }
  set(x, y, ch, color = null, z = null) {
    x = Math.round(x);
    y = Math.round(y);
    if (!this.inside(x, y)) return;
    const i = y * this.cols + x;
    if (z !== null && this.z) {
      if (z < this.z[i]) return;
      this.z[i] = z;
    }
    this.cells[i] = ch;
    this.col[i] = color;
  }
  get(x, y) {
    return this.inside(x, y) ? this.cells[Math.round(y) * this.cols + Math.round(x)] : ' ';
  }
  text(x, y, str, color = null) {
    let cx = Math.round(x);
    for (const ch of Array.from(str)) {
      this.set(cx++, y, ch, color);
    }
  }
  /** Centre a string on a row. */
  center(y, str, color = null) {
    this.text(Math.floor((this.cols - Array.from(str).length) / 2), y, str, color);
  }
  rect(x, y, w, h, ch, color = null) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, ch, color);
  }
  /** Box-drawing frame. */
  box(x, y, w, h, color = null, style = 'single') {
    const s = style === 'double' ? '╔╗╚╝═║' : style === 'round' ? '╭╮╰╯─│' : '┌┐└┘─│';
    const [tl, tr, bl, br, hz, vt] = Array.from(s);
    for (let i = 1; i < w - 1; i++) {
      this.set(x + i, y, hz, color);
      this.set(x + i, y + h - 1, hz, color);
    }
    for (let j = 1; j < h - 1; j++) {
      this.set(x, y + j, vt, color);
      this.set(x + w - 1, y + j, vt, color);
    }
    this.set(x, y, tl, color);
    this.set(x + w - 1, y, tr, color);
    this.set(x, y + h - 1, bl, color);
    this.set(x + w - 1, y + h - 1, br, color);
  }
  line(x0, y0, x1, y1, ch, color = null) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 10000; n++) {
      this.set(x0, y0, ch, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  /** Ellipse outline, accounting for the 2:1 cell aspect via ry. */
  ellipse(cx, cy, rx, ry, ch, color = null, steps = 0) {
    const n = steps || Math.max(16, Math.round((rx + ry) * 2));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      this.set(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, ch, color);
    }
  }
  /** Paint every cell from a function (x, y) → glyph | [glyph, color] | null. */
  each(fn) {
    for (let y = 0; y < this.rows; y++)
      for (let x = 0; x < this.cols; x++) {
        const r = fn(x, y);
        if (r == null) continue;
        if (Array.isArray(r)) this.set(x, y, r[0], r[1]);
        else this.set(x, y, r);
      }
  }
  lines() {
    const out = new Array(this.rows);
    for (let y = 0; y < this.rows; y++) out[y] = this.cells.slice(y * this.cols, (y + 1) * this.cols).join('');
    return out;
  }
  colors() {
    if (!this.col.some(Boolean)) return null;
    const out = new Array(this.rows);
    for (let y = 0; y < this.rows; y++) {
      out[y] = this.col.slice(y * this.cols, (y + 1) * this.cols).map((c) => c || '#e6edf3');
    }
    return out;
  }
}

/** Project a 3-D point with simple perspective; returns [sx, sy, depth]. */
export function project(x, y, z, cols, rows, scale = 1, dist = 5) {
  const k = dist / (dist + z);
  return [cols / 2 + x * k * scale * 2, rows / 2 + y * k * scale, k];
}
export function rotX([x, y, z], a) { return [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)]; }
export function rotY([x, y, z], a) { return [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)]; }
export function rotZ([x, y, z], a) { return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z]; }

/** Shade a surface point by its normal against a fixed light. */
export function lambert(n, light = [0, -0.6, -0.8]) {
  const l = Math.hypot(...light);
  const d = (n[0] * light[0] + n[1] * light[1] + n[2] * light[2]) / (l || 1);
  return clamp((d + 1) / 2, 0, 1);
}

/** Plot a cloud of lit 3-D points (with depth test) onto the grid. */
export function plotPoints(g, points, { ramp = RAMP, color = null, scale = 1, dist = 5 } = {}) {
  g.useDepth();
  for (const p of points) {
    const [sx, sy, k] = project(p[0], p[1], p[2], g.cols, g.rows, scale, dist);
    const lum = p.length > 3 ? p[3] : 0.7;
    const col = typeof color === 'function' ? color(p, lum) : color;
    g.set(sx, sy, shade(lum, ramp), col, k);
  }
}

/** Big 5-row block font for banner text (A-Z 0-9 and a few symbols). */
const FONT = {
  A: ['▄▀▀▄', '█▄▄█', '█  █'], B: ['█▀▀▄', '█▀▀▄', '█▄▄▀'], C: ['▄▀▀▀', '█   ', '▀▄▄▄'], D: ['█▀▀▄', '█  █', '█▄▄▀'],
  E: ['█▀▀▀', '█▀▀ ', '█▄▄▄'], F: ['█▀▀▀', '█▀▀ ', '█   '], G: ['▄▀▀▀', '█ ▀█', '▀▄▄▀'], H: ['█  █', '█▀▀█', '█  █'],
  I: ['▀█▀', ' █ ', '▄█▄'], J: ['  ▀█', '   █', '▀▄▄▀'], K: ['█ ▄▀', '█▀▄ ', '█  █'], L: ['█   ', '█   ', '█▄▄▄'],
  M: ['█▄ ▄█', '█ ▀ █', '█   █'], N: ['█▄  █', '█ ▀▄█', '█   █'], O: ['▄▀▀▄', '█  █', '▀▄▄▀'], P: ['█▀▀▄', '█▄▄▀', '█   '],
  Q: ['▄▀▀▄', '█  █', '▀▄▄▀▄'], R: ['█▀▀▄', '█▀▀▄', '█  █'], S: ['▄▀▀▀', '▀▀▀▄', '▄▄▄▀'], T: ['▀▀█▀▀', '  █  ', '  █  '],
  U: ['█  █', '█  █', '▀▄▄▀'], V: ['█   █', '▀▄ ▄▀', '  ▀  '], W: ['█   █', '█ ▄ █', '▀▄▀▄▀'], X: ['▀▄ ▄▀', ' ▄▀▄ ', '▀   ▀'],
  Y: ['▀▄ ▄▀', '  █  ', '  █  '], Z: ['▀▀▀█', ' ▄▀ ', '█▄▄▄'], '0': ['▄▀▀▄', '█ ▄█', '▀▄▄▀'], '1': ['▄█ ', ' █ ', '▄█▄'],
  '2': ['▀▀▀▄', '▄▄▄▀', '█▄▄▄'], '3': ['▀▀▀▄', ' ▀▀▄', '▄▄▄▀'], '4': ['█  █', '▀▀▀█', '   █'], '5': ['█▀▀▀', '▀▀▀▄', '▄▄▄▀'],
  '6': ['▄▀▀▀', '█▀▀▄', '▀▄▄▀'], '7': ['▀▀▀█', '  ▄▀', ' █  '], '8': ['▄▀▀▄', '▄▀▀▄', '▀▄▄▀'], '9': ['▄▀▀▄', '▀▄▄█', '▄▄▄▀'],
  ' ': ['  ', '  ', '  '], '.': [' ', ' ', '▄'], '!': ['█', '█', '▄'], '-': ['   ', '▀▀▀', '   '], ':': [' ', '▀', '▄'],
  '?': ['▀▀▄', ' ▄▀', ' ▄ '],
};
export function bigText(str) {
  const rows = ['', '', ''];
  for (const ch of str.toUpperCase()) {
    const glyph = FONT[ch] || FONT['?'];
    for (let r = 0; r < 3; r++) rows[r] += glyph[r] + ' ';
  }
  return rows;
}

/** Define a piece with defaults filled in. */
export function definePiece(def) {
  return {
    fps: 12,
    cols: 60,
    rows: 24,
    color: false,
    options: {},
    init: () => ({}),
    ...def,
  };
}

/** Create a runner for a piece: call .tick(dt) to advance and get {lines, colors}. */
export function createRunner(piece, { cols, rows, options = {}, seed = 7 } = {}) {
  const c = cols || piece.cols;
  const r = rows || piece.rows;
  const g = new Grid(c, r);
  const opts = { ...piece.options, ...options };
  const rnd = rng(seed);
  const ctx = { g, t: 0, i: 0, cols: c, rows: r, opts, rnd, state: null, dt: 0 };
  ctx.state = (piece.init ? piece.init(ctx) : null) || {};
  return {
    piece,
    ctx,
    tick(dt = 1 / (piece.fps || 12)) {
      ctx.dt = dt;
      if (!piece.keep) g.clear();
      piece.frame(ctx);
      ctx.t += dt;
      ctx.i++;
      return { cols: c, rows: r, lines: g.lines(), colors: piece.color ? g.colors() : null };
    },
  };
}
