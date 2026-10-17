import { definePiece, hsl, mix, clamp, shade, fbm } from './kit.js';

export const barChart = definePiece({
  name: 'bar-chart', category: 'data', fps: 12, cols: 50, rows: 16, color: true,
  frame({ g, t }) {
    const n = 8, H = g.rows - 4;
    for (let k = 0; k < n; k++) {
      const v = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.8 + k * 1.3));
      const h = Math.round(v * H), x = 3 + k * 6;
      for (let y = 0; y < h; y++) for (let w = 0; w < 4; w++) g.set(x + w, g.rows - 3 - y, y === h - 1 ? '▀' : '█', hsl(200 + k * 18, 0.7, 0.55));
      g.text(x, g.rows - 2, `Q${k + 1}`.padStart(3), '#8b98a8');
      g.text(x, g.rows - 4 - h, `${Math.round(v * 100)}`.padStart(3), '#e6edf3');
    }
    for (let x = 2; x < g.cols - 1; x++) g.set(x, g.rows - 3, '─', '#4b5563');
  },
});

export const sparkline = definePiece({
  name: 'sparkline', category: 'data', fps: 10, cols: 48, rows: 6, color: true,
  init({ cols }) { return { v: Array.from({ length: cols - 12 }, (_, i) => 0.5 + Math.sin(i / 4) * 0.3) }; },
  frame({ g, state, rnd }) {
    state.v.push(clamp(state.v[state.v.length - 1] + (rnd() - 0.5) * 0.25, 0.05, 0.95)); state.v.shift();
    const bars = '▁▂▃▄▅▆▇█';
    g.text(1, 1, 'requests/s', '#8b98a8');
    g.text(1, 3, state.v.map((v) => bars[Math.round(v * 7)]).join(''), '#58a6ff');
    const last = state.v[state.v.length - 1], prev = state.v[state.v.length - 2];
    g.text(g.cols - 10, 3, `${Math.round(last * 1200)}`.padStart(5) + (last >= prev ? ' ▲' : ' ▼'), last >= prev ? '#7ee787' : '#ff7b72');
  },
});

export const equalizer = definePiece({
  name: 'equalizer', category: 'data', fps: 20, cols: 50, rows: 14, color: true,
  init() { return { peaks: new Array(16).fill(0) }; },
  frame({ g, t, state }) {
    for (let k = 0; k < 16; k++) {
      const v = clamp(0.2 + 0.8 * Math.abs(Math.sin(t * (2 + k * 0.37) + k) * Math.sin(t * 0.5 + k * 0.2)), 0, 1);
      const h = Math.round(v * (g.rows - 2));
      state.peaks[k] = Math.max(h, state.peaks[k] - 0.3);
      for (let y = 0; y < h; y++) g.set(2 + k * 3, g.rows - 2 - y, '█', mix('#7ee787', '#ff7b72', y / (g.rows - 2)));
      for (let y = 0; y < h; y++) g.set(3 + k * 3, g.rows - 2 - y, '█', mix('#7ee787', '#ff7b72', y / (g.rows - 2)));
      g.text(2 + k * 3, g.rows - 2 - Math.round(state.peaks[k]), '▀▀', '#e6edf3');
    }
  },
});

export const gauge = definePiece({
  name: 'gauge', category: 'data', fps: 15, cols: 40, rows: 14, color: true,
  frame({ g, t }) {
    const v = (Math.sin(t * 0.7) + 1) / 2, cx = g.cols / 2, cy = g.rows - 3, R = 9;
    for (let a = Math.PI; a <= 2 * Math.PI + 0.01; a += 0.06) {
      const f = (a - Math.PI) / Math.PI;
      g.set(cx + Math.cos(a) * R * 2, cy + Math.sin(a) * R, f <= v ? '█' : '░', hsl(120 - f * 120, 0.8, 0.5));
    }
    const na = Math.PI + v * Math.PI;
    g.line(cx, cy, cx + Math.cos(na) * (R - 2) * 2, cy + Math.sin(na) * (R - 2), '●', '#e6edf3');
    g.center(cy - 3, `${Math.round(v * 100)}`, '#e6edf3'); g.center(cy - 2, 'rpm ×100', '#8b98a8');
    g.text(cx - R * 2 - 2, cy + 1, '0', '#8b98a8'); g.text(cx + R * 2 - 1, cy + 1, '100', '#8b98a8');
  },
});

export const heartbeat = definePiece({
  name: 'heartbeat', category: 'data', fps: 30, cols: 60, rows: 12, color: true,
  init() { return { buf: new Array(60).fill(0), ph: 0 }; },
  frame({ g, state, dt }) {
    state.ph = (state.ph + dt * 1.3) % 1;
    const p = state.ph;
    const v = p < 0.1 ? 0.1 * Math.sin(p * 31) : p < 0.15 ? -0.15 : p < 0.2 ? 1 : p < 0.25 ? -0.4 : p < 0.45 ? 0.2 * Math.sin((p - 0.25) * 15) : 0;
    state.buf.push(v); state.buf.shift();
    const mid = g.rows / 2;
    state.buf.forEach((y, x) => { if (x > 0) g.line(x - 1, mid - state.buf[x - 1] * 4, x, mid - y * 4, '•', x > 50 ? '#7ee787' : mix('#14532d', '#7ee787', x / 60)); });
    g.text(1, 0, '♥ 72 bpm', '#ff7b72'); g.text(g.cols - 8, 0, 'SpO₂ 98%', '#58a6ff');
  },
});

export const cpuMeters = definePiece({
  name: 'cpu-meters', category: 'data', fps: 6, cols: 44, rows: 10, color: true,
  frame({ g, t, rnd }) {
    for (let k = 0; k < 8; k++) {
      const v = clamp(0.3 + 0.6 * Math.abs(Math.sin(t * 0.5 + k * 1.1)) + (rnd() - 0.5) * 0.1, 0, 1);
      const w = 24, f = Math.round(v * w);
      g.text(1, k + 1, `cpu${k}`, '#8b98a8');
      g.text(7, k + 1, '[' + '|'.repeat(f) + ' '.repeat(w - f) + ']', v > 0.8 ? '#ff7b72' : v > 0.5 ? '#f59e0b' : '#7ee787');
      g.text(34, k + 1, `${Math.round(v * 100)}%`.padStart(4), '#e6edf3');
    }
  },
});

export const heatmap = definePiece({
  name: 'heatmap', category: 'data', fps: 8, cols: 56, rows: 12, color: true,
  frame({ g, t }) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    days.forEach((d, y) => {
      g.text(0, y + 2, d, '#8b98a8');
      for (let x = 0; x < 52; x++) { const v = fbm(x * 0.2 + t * 0.15, y * 0.5); g.set(4 + x, y + 2, '■', mix('#161b22', '#39d353', clamp((v - 0.3) * 1.8, 0, 1))); }
    });
    g.text(4, 0, 'contributions in the last year', '#e6edf3');
    g.text(4, 10, 'less ■', '#161b22'); g.text(11, 10, '■', '#0e4429'); g.text(13, 10, '■', '#006d32'); g.text(15, 10, '■', '#26a641'); g.text(17, 10, '■ more', '#39d353');
  },
});

export const radar = definePiece({
  name: 'radar', category: 'data', fps: 24, cols: 50, rows: 24, color: true,
  init({ rnd }) { return { blips: Array.from({ length: 6 }, () => ({ a: rnd() * Math.PI * 2, r: 0.3 + rnd() * 0.6, seen: -10 })) }; },
  frame({ g, t, state }) {
    const cx = g.cols / 2, cy = g.rows / 2, R = g.rows / 2 - 1, sweep = (t * 1.5) % (Math.PI * 2);
    for (const r of [0.33, 0.66, 1]) g.ellipse(cx, cy, R * r * 2, R * r, '·', '#14532d');
    g.line(cx - R * 2, cy, cx + R * 2, cy, '·', '#14532d'); g.line(cx, cy - R, cx, cy + R, '·', '#14532d');
    for (let k = 0; k < 30; k++) { const a = sweep - k * 0.03; for (let r = 0; r < R; r += 0.5) g.set(cx + Math.cos(a) * r * 2, cy + Math.sin(a) * r, k === 0 ? '█' : '▒', mix('#052e16', '#4ade80', 1 - k / 30)); }
    for (const b of state.blips) {
      const diff = ((sweep - b.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      if (diff < 0.1) b.seen = t;
      const age = t - b.seen;
      if (age < 3) g.set(cx + Math.cos(b.a) * b.r * R * 2, cy + Math.sin(b.a) * b.r * R, age < 1 ? '●' : 'o', mix('#bbf7d0', '#052e16', age / 3));
    }
  },
});

export const candlesticks = definePiece({
  name: 'candlesticks', category: 'data', fps: 4, cols: 56, rows: 18, color: true,
  init({ rnd }) { let p = 50; return { c: Array.from({ length: 26 }, () => { const o = p; p = clamp(p + (rnd() - 0.48) * 8, 20, 80); return { o, c: p, h: Math.max(o, p) + rnd() * 4, l: Math.min(o, p) - rnd() * 4 }; }) }; },
  frame({ g, state, rnd }) {
    const last = state.c[state.c.length - 1];
    const np = clamp(last.c + (rnd() - 0.48) * 8, 20, 80);
    state.c.push({ o: last.c, c: np, h: Math.max(last.c, np) + rnd() * 4, l: Math.min(last.c, np) - rnd() * 4 }); state.c.shift();
    const Y = (v) => g.rows - 2 - ((v - 10) / 80) * (g.rows - 3);
    state.c.forEach((k, i) => {
      const x = 2 + i * 2, up = k.c >= k.o, col = up ? '#7ee787' : '#ff7b72';
      g.line(x, Y(k.h), x, Y(k.l), '│', col);
      const a = Y(Math.max(k.o, k.c)), b = Y(Math.min(k.o, k.c));
      for (let y = a; y <= b; y++) g.set(x, y, up ? '█' : '▒', col);
    });
    g.text(1, 0, `ASCII/USD  ${np.toFixed(2)}`, '#e6edf3'); g.text(20, 0, `${np >= last.c ? '▲' : '▼'} ${Math.abs(np - last.c).toFixed(2)}`, np >= last.c ? '#7ee787' : '#ff7b72');
  },
});

export const uptimeBar = definePiece({
  name: 'uptime-bar', category: 'data', fps: 2, cols: 56, rows: 8, color: true,
  frame({ g, i, rnd }) {
    const services = ['api.example.com', 'cdn', 'auth', 'db-primary'];
    services.forEach((s, k) => {
      g.text(1, k + 2, s.padEnd(16), '#e6edf3');
      let up = 0;
      for (let d = 0; d < 36; d++) { const h = (d * 7 + k * 13 + Math.floor(i / 10)) % 23; const st = h === 0 ? 2 : h === 5 && k === 1 ? 1 : 0; up += st === 0 ? 1 : 0.5; g.set(18 + d, k + 2, '▮', ['#3fb950', '#d29922', '#f85149'][st]); }
      g.text(19 + 36, k + 2, `${((up / 36) * 100).toFixed(1)}%`, '#8b98a8');
    });
    g.text(1, 0, 'status · all systems operational', '#7ee787'); g.text(18, 7, '90 days ago' + ' '.repeat(18) + 'today', '#6b7280');
    void rnd;
  },
});

export const pieces = [barChart, sparkline, equalizer, gauge, heartbeat, cpuMeters, heatmap, radar, candlesticks, uptimeBar];
