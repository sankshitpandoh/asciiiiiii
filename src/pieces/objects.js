import { definePiece, hsl, mix, clamp, shade, TAU, fbm } from './kit.js';

export const analogClock = definePiece({
  name: 'analog-clock', category: 'objects', fps: 2, cols: 44, rows: 22, color: true,
  frame({ g }) {
    const d = new Date(), cx = g.cols / 2, cy = g.rows / 2, R = 9;
    g.ellipse(cx, cy, R * 2, R, '·', '#4b5563', 72);
    for (let h = 0; h < 12; h++) { const a = (h / 12) * TAU - Math.PI / 2; g.text(cx + Math.cos(a) * (R - 1) * 2 - (h === 0 ? 1 : 0), cy + Math.sin(a) * (R - 1), String(h || 12), '#8b98a8'); }
    const hand = (frac, len, ch, col) => { const a = frac * TAU - Math.PI / 2; g.line(cx, cy, cx + Math.cos(a) * len * 2, cy + Math.sin(a) * len, ch, col); };
    hand((d.getHours() % 12) / 12 + d.getMinutes() / 720, R * 0.5, '█', '#e6edf3'); hand(d.getMinutes() / 60, R * 0.75, '▓', '#e6edf3'); hand(d.getSeconds() / 60, R * 0.85, '·', '#ff7b72');
    g.set(cx, cy, '◉', '#ff7b72');
  },
});

export const hourglass = definePiece({
  name: 'hourglass', category: 'objects', fps: 10, cols: 30, rows: 22, color: true,
  frame({ g, t, rnd }) {
    const p = (t * 0.08) % 1, cx = g.cols / 2, H = 8;
    g.text(cx - 6, 1, '╔═══════════╗', '#8b98a8'); g.text(cx - 6, 20, '╚═══════════╝', '#8b98a8');
    for (let y = 0; y < H; y++) { const w = Math.round(5 * (1 - y / H)) + 1; g.set(cx - w - 1, 2 + y, '╲', '#8b98a8'); g.set(cx + w + 1, 2 + y, '╱', '#8b98a8'); g.set(cx - w - 1, 19 - y, '╱', '#8b98a8'); g.set(cx + w + 1, 19 - y, '╲', '#8b98a8'); }
    g.set(cx, 10, '│', '#8b98a8'); g.set(cx, 11, '│', '#8b98a8');
    for (let y = 0; y < H; y++) { const w = Math.round(5 * (1 - y / H)); const fillFrom = H * p; if (y >= fillFrom) for (let x = -w; x <= w; x++) g.set(cx + x, 2 + y, '▒', '#fbbf24'); }
    const pile = p * H;
    for (let y = 0; y < H; y++) { const w = Math.round(5 * (1 - y / H)); if (H - y <= pile) for (let x = -w; x <= w; x++) if (Math.abs(x) <= (pile - (H - y)) * 2 + 1) g.set(cx + x, 19 - y, '▒', '#fbbf24'); }
    if (p < 0.98) for (let y = 10; y < 19 - pile; y++) if (rnd() < 0.8) g.set(cx, y, ':', '#fde68a');
  },
});

export const candle = definePiece({
  name: 'candle', category: 'objects', fps: 12, cols: 24, rows: 18, color: true,
  frame({ g, t, rnd }) {
    const cx = g.cols / 2, fl = Math.sin(t * 7) * 0.6 + (rnd() - 0.5) * 0.6;
    const flame = ['(', ')', '(', ')'];
    for (let k = 0; k < 5; k++) g.set(cx + fl * (k / 5) + (k % 2 ? 0.4 : -0.4), 6 - k, k === 4 ? '.' : k > 2 ? flame[k % 2] : '█', mix('#fef08a', '#f97316', k / 5));
    g.set(cx, 7, '│', '#e6edf3');
    for (let y = 8; y < 16; y++) g.text(cx - 2, y, y === 8 ? '╭───╮' : '│   │', '#fde68a');
    g.text(cx - 2, 16, '╰───╯', '#fde68a'); g.text(cx - 5, 17, '═══════════', '#78350f');
    for (let y = 0; y < 17; y++) for (let x = 0; x < g.cols; x++) if (g.get(x, y) === ' ' && rnd() < 0.02 * (1 - y / 17)) g.set(x, y, '·', '#422006');
  },
});

export const lavaLamp = definePiece({
  name: 'lava-lamp', category: 'objects', fps: 15, cols: 24, rows: 24, color: true,
  frame({ g, t }) {
    const blobs = [[0.5, 0.3, 3], [0.4, 0.6, 2.5], [0.6, 0.8, 2.2], [0.5, 0.5, 1.5]];
    g.text(7, 0, '▄▄▄▄▄▄▄▄▄▄', '#6b7280'); g.text(7, 23, '▀▀▀▀▀▀▀▀▀▀', '#6b7280');
    for (let y = 1; y < 23; y++) for (let x = 6; x < 18; x++) {
      let f = 0;
      blobs.forEach(([bx, by, r], k) => { const px = 6 + bx * 12 + Math.sin(t * 0.7 + k) * 2, py = 1 + ((by + Math.sin(t * 0.3 + k * 2) * 0.25 + 1) % 1) * 22; f += (r * r) / (((x - px) / 2) ** 2 + (y - py) ** 2 + 0.01); });
      if (f > 1.2) g.set(x, y, f > 2.5 ? '█' : '▓', mix('#be185d', '#fb7185', clamp(f / 4, 0, 1)));
      else g.set(x, y, '░', '#3b0764');
    }
    for (let y = 1; y < 23; y++) { g.set(5, y, '║', '#6b7280'); g.set(18, y, '║', '#6b7280'); }
  },
});

export const windmill = definePiece({
  name: 'windmill', category: 'objects', fps: 15, cols: 40, rows: 22, color: true,
  frame({ g, t }) {
    const cx = 20, cy = 8;
    for (let k = 0; k < 4; k++) { const a = t * 1.5 + (k * Math.PI) / 2; g.line(cx, cy, cx + Math.cos(a) * 7 * 2, cy + Math.sin(a) * 7, '═', '#e6edf3'); for (let s = 2; s < 7; s++) g.set(cx + Math.cos(a) * s * 2 + Math.cos(a + 1.2) * 1.5, cy + Math.sin(a) * s + Math.sin(a + 1.2) * 0.8, '▒', '#cbd5e1'); }
    for (let y = 9; y < 21; y++) { const w = 2 + Math.floor((y - 9) / 4); g.text(cx - w, y, '█'.repeat(2 * w + 1), '#9a3412'); }
    g.set(cx, cy, '◉', '#1f2937'); g.text(cx - 1, 20, '▐▌', '#422006'); for (let x = 0; x < g.cols; x++) g.set(x, 21, '▀', '#365314');
    g.text(3, 2, '~~~', '#475569'); g.text(30, 4, '~~', '#475569');
  },
});

export const ferrisWheel = definePiece({
  name: 'ferris-wheel', category: 'objects', fps: 12, cols: 44, rows: 24, color: true,
  frame({ g, t }) {
    const cx = g.cols / 2, cy = 10, R = 8;
    g.ellipse(cx, cy, R * 2, R, '·', '#8b98a8', 64);
    for (let k = 0; k < 8; k++) { const a = t * 0.5 + (k * TAU) / 8; const x = cx + Math.cos(a) * R * 2, y = cy + Math.sin(a) * R; g.line(cx, cy, x, y, '·', '#4b5563'); g.text(x - 1, y + 1, '▐█▌', hsl(k * 45, 0.8, 0.6)); }
    g.line(cx, cy, cx - 6, 22, '╱', '#8b98a8'); g.line(cx, cy, cx + 6, 22, '╲', '#8b98a8'); g.set(cx, cy, '◉', '#e6edf3');
    for (let x = 0; x < g.cols; x++) g.set(x, 23, '▀', '#1f2937');
  },
});

export const train = definePiece({
  name: 'train', category: 'objects', fps: 15, cols: 70, rows: 14, color: true,
  frame({ g, i, rnd }) {
    const x0 = g.cols - ((i * 1.2) % (g.cols + 40));
    const car = ['┌────────┐', '│ ▯ ▯ ▯ ▯│', '└o──────o┘'];
    const loco = ['    ▄▄▄  ▄▄▄  ', '  ┌─┴─┴──┴─┴┐ ', '  │ ▯ ▯ ▯ ▯ ├▄', '  └o───oo───o┘'];
    loco.forEach((r, k) => g.text(x0, 7 + k, r, k === 0 ? '#9ca3af' : '#ef4444'));
    for (let c = 0; c < 2; c++) car.forEach((r, k) => g.text(x0 + 15 + c * 11, 8 + k, r, '#3b82f6'));
    for (let k = 0; k < 8; k++) g.set(x0 + 4 + k * 2 + (rnd() - 0.5) * 2, 6 - k * 0.7 + (rnd() - 0.5), k < 3 ? '@' : k < 6 ? 'o' : '.', mix('#9ca3af', '#1f2937', k / 8));
    for (let x = 0; x < g.cols; x++) g.set(x, 11, (x + Math.floor(i * 1.2)) % 3 ? '═' : '╪', '#8b98a8');
    g.text(2, 3, '☁', '#475569'); g.text(50, 2, '☁', '#475569');
  },
});

export const kite = definePiece({
  name: 'kite', category: 'objects', fps: 15, cols: 50, rows: 24, color: true,
  frame({ g, t }) {
    const kx = 30 + Math.sin(t * 0.8) * 8, ky = 5 + Math.sin(t * 1.3) * 2.5;
    g.set(kx, ky - 2, '▲', '#ef4444'); g.text(kx - 2, ky - 1, '◢█◣', '#f97316'); g.text(kx - 4, ky, '◢█████◣', '#ef4444'); g.text(kx - 2, ky + 1, '◥█◤', '#f97316'); g.set(kx, ky + 2, '▼', '#ef4444');
    for (let k = 1; k < 8; k++) g.set(kx + Math.sin(t * 5 + k) * 1.5, ky + 2 + k, k % 2 ? '╲' : '╱', '#fbbf24');
    const hx = 8, hy = 21;
    for (let s = 0; s <= 40; s++) { const f = s / 40; g.set(hx + (kx - hx) * f, hy + (ky + 2 - hy) * f + Math.sin(f * Math.PI) * 3, '·', '#8b98a8'); }
    g.text(hx - 1, hy - 1, ' o ', '#e6edf3'); g.text(hx - 1, hy, '/|\\', '#e6edf3'); g.text(hx - 1, hy + 1, '/ \\', '#e6edf3');
    for (let x = 0; x < g.cols; x++) g.set(x, 23, '▀', '#365314');
  },
});

export const vinyl = definePiece({
  name: 'vinyl', category: 'objects', fps: 15, cols: 44, rows: 22, color: true,
  frame({ g, t }) {
    const cx = g.cols / 2, cy = g.rows / 2;
    g.each((x, y) => {
      const dx = (x - cx) / 2, dy = y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (d > 10) return null;
      if (d < 1) return ['●', '#111827'];
      if (d < 3.5) return [Math.abs(a - ((t * 2) % TAU) + Math.PI) % TAU < 0.6 ? '▓' : '█', hsl(0, 0.7, 0.45)];
      const groove = Math.floor(d * 2) % 2 === 0;
      const shine = Math.abs(((a + t * 2 + Math.PI) % TAU) - Math.PI) < 0.5;
      return [groove ? '-' : '~', shine ? '#6b7280' : '#1f2937'];
    });
    g.line(g.cols - 6, 2, cx + 7, cy - 4, '│', '#9ca3af'); g.set(g.cols - 6, 2, '◉', '#9ca3af'); g.text(cx + 6, cy - 4, '▼', '#e6edf3');
  },
});

export const coffee = definePiece({
  name: 'coffee', category: 'objects', fps: 10, cols: 24, rows: 14, color: true,
  frame({ g, t, rnd }) {
    for (let k = 0; k < 3; k++) { const x = 8 + k * 3 + Math.sin(t * 2 + k) * 1; for (let y = 0; y < 4; y++) g.set(x + Math.sin(t * 3 + y + k) * 0.8, 4 - y - ((t * 2 + k) % 1), y === 0 ? ')' : '(', mix('#e5e7eb', '#1f2937', y / 4)); }
    g.text(5, 5, '╭──────────╮', '#e5e7eb'); g.text(5, 6, '│░░░░░░░░░░│──╮', '#e5e7eb'); g.text(5, 7, '│░░░░░░░░░░│  │', '#e5e7eb'); g.text(5, 8, '│░░░░░░░░░░│──╯', '#e5e7eb'); g.text(5, 9, '╰──────────╯', '#e5e7eb'); g.text(4, 10, '══════════════', '#78350f');
    for (let y = 6; y <= 8; y++) for (let x = 6; x < 16; x++) g.set(x, y, '▒', '#5b3a29');
    g.text(7, 12, 'brb, coffee', '#8b98a8'); void rnd;
  },
});

export const lighthouse = definePiece({
  name: 'lighthouse', category: 'objects', fps: 12, cols: 60, rows: 24, color: true,
  frame({ g, t }) {
    const lx = 14, ly = 5, a = t * 1.2;
    const dir = Math.cos(a);
    if (dir > 0) for (let d = 1; d < 46; d++) for (let s = -1; s <= 1; s++) g.set(lx + d, ly + s * d * 0.08 + Math.sin(a) * d * 0.3, '░', mix('#fef3c7', '#0b0f14', d / 46));
    for (let y = 6; y < 19; y++) g.text(lx - 2, y, Math.floor(y / 2) % 2 ? '█████' : '▒▒▒▒▒', Math.floor(y / 2) % 2 ? '#ef4444' : '#f3f4f6');
    g.text(lx - 3, 5, '╔═════╗', '#9ca3af'); g.text(lx - 3, 4, ' ▐███▌ ', dir > 0 ? '#fef08a' : '#4b5563'); g.text(lx - 2, 3, '▀▀▀▀▀', '#9ca3af');
    for (let y = 19; y < g.rows; y++) for (let x = 0; x < g.cols; x++) g.set(x, y, Math.sin(x * 0.3 - t * 2 + y) > 0.5 ? '~' : '≈', mix('#0c4a6e', '#1e40af', (y - 19) / 5));
    for (let k = 0; k < 20; k++) g.set((k * 17) % g.cols, (k * 5) % 3, '.', '#334155');
  },
});

export const skyline = definePiece({
  name: 'skyline', category: 'objects', fps: 6, cols: 70, rows: 22, color: true,
  init({ rnd }) { return { b: Array.from({ length: 14 }, (_, i) => ({ x: i * 5, w: 3 + Math.floor(rnd() * 3), h: 5 + Math.floor(rnd() * 12) })) }; },
  frame({ g, state, rnd, i }) {
    for (let k = 0; k < 30; k++) g.set((k * 13) % g.cols, (k * 7) % 4, '.', '#334155');
    g.set(60, 2, '☾', '#fef3c7');
    for (const b of state.b) for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) { const lit = ((b.x * 7 + x * 3 + y * 5 + Math.floor(i / 12)) % 7) < 3; g.set(b.x + x, g.rows - 2 - y, lit ? '▪' : '█', lit ? '#fde68a' : '#1e293b'); }
    for (let x = 0; x < g.cols; x++) g.set(x, g.rows - 1, '▀', '#0f172a'); void rnd;
  },
});

export const sundial = definePiece({
  name: 'sundial', category: 'objects', fps: 4, cols: 44, rows: 18, color: true,
  frame({ g, t }) {
    const cx = g.cols / 2, cy = 11, h = (t * 0.3) % 12, a = (h / 12) * Math.PI + Math.PI;
    g.ellipse(cx, cy, 16, 6, '·', '#a8a29e', 48);
    for (let k = 0; k <= 12; k++) { const aa = (k / 12) * Math.PI + Math.PI; g.text(cx + Math.cos(aa) * 14 - 1, cy + Math.sin(aa) * 5 - 0.5, ['VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'I', 'II', 'III', 'IV', 'V', 'VI'][k], '#78716c'); }
    g.line(cx, cy, cx + Math.cos(a) * 12, cy + Math.sin(a) * 4.5 + 2, '▓', '#292524');
    g.set(cx, cy, '▲', '#e7e5e4'); g.set(cx, cy - 1, '│', '#e7e5e4');
    g.set(cx - Math.cos(a) * 18, 1 + Math.abs(Math.sin(a)) * 2, '☀', '#fde047');
  },
});

export const hawaMahal = definePiece({
  name: 'hawa-mahal', category: 'objects', fps: 6, cols: 60, rows: 22, color: true,
  frame({ g, i }) {
    const pink = '#f472b6', dark = '#9d174d', win = '#fde68a';
    for (let tier = 0; tier < 5; tier++) {
      const y = 20 - tier * 4, w = 56 - tier * 10, x0 = (g.cols - w) / 2;
      for (let x = 0; x < w; x++) { g.set(x0 + x, y - 3, (x % 4 === 0) ? '╥' : '▀', dark); for (let k = -2; k <= 0; k++) g.set(x0 + x, y + k, (x % 4 === 2 && k === -1) ? (((x + tier * 3 + Math.floor(i / 6)) % 5) ? '▯' : '▮') : '█', (x % 4 === 2 && k === -1) ? win : pink); }
      for (let x = 2; x < w; x += 4) g.set(x0 + x, y - 4, '∩', dark);
    }
    g.center(0, '☀  हवा महल · Jaipur', '#fbbf24'); void i;
  },
});

export const pieces = [analogClock, hourglass, candle, lavaLamp, windmill, ferrisWheel, train, kite, vinyl, coffee, lighthouse, skyline, sundial, hawaMahal];
