import { definePiece, bigText, hsl, mix, shade } from './kit.js';

export const typewriter = definePiece({
  name: 'typewriter', category: 'type', fps: 12, cols: 50, rows: 5, options: { text: 'Hello, world. This is asciiiii.' },
  frame({ g, i, opts }) {
    const n = i % (opts.text.length + 16);
    g.text(2, 2, opts.text.slice(0, n) + (i % 2 ? '▌' : ' '));
  },
});

export const glitch = definePiece({
  name: 'glitch', category: 'type', fps: 15, cols: 50, rows: 7, color: true, options: { text: 'SYSTEM FAILURE' },
  frame({ g, i, rnd, opts }) {
    const rows = bigText(opts.text), x0 = Math.floor((g.cols - rows[0].length) / 2);
    const bad = i % 24 < 4;
    rows.forEach((r, k) => {
      const dx = bad ? Math.round((rnd() - 0.5) * 6) : 0;
      if (bad) { g.text(x0 + dx - 1, 2 + k, r, '#ff7b72'); g.text(x0 + dx + 1, 2 + k, r, '#58a6ff'); }
      g.text(x0 + dx, 2 + k, bad ? r.replace(/[▀▄█]/g, (c) => (rnd() < 0.2 ? '▒' : c)) : r, '#e6edf3');
    });
    if (bad) for (let k = 0; k < 3; k++) { const y = Math.floor(rnd() * g.rows); for (let x = 0; x < g.cols; x++) if (rnd() < 0.3) g.set(x, y, '▬', '#374151'); }
  },
});

export const marquee = definePiece({
  name: 'marquee', category: 'type', fps: 20, cols: 50, rows: 3, options: { text: '★ NOW SHOWING ★ asciiiii — any photo, any website ★ ' },
  frame({ g, i, opts }) {
    const s = opts.text, off = i % s.length;
    let out = '';
    for (let x = 0; x < g.cols; x++) out += s[(x + off) % s.length];
    g.text(0, 1, out);
  },
});

export const scramble = definePiece({
  name: 'scramble', category: 'type', fps: 15, cols: 50, rows: 5, color: true, options: { text: 'DECRYPTING MESSAGE' },
  frame({ g, i, rnd, opts }) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&@';
    const cycle = opts.text.length * 2 + 20, k = i % cycle;
    let out = '';
    for (let x = 0; x < opts.text.length; x++) {
      const settled = k > x * 2 + 4;
      out += settled || opts.text[x] === ' ' ? opts.text[x] : chars[Math.floor(rnd() * chars.length)];
    }
    const x0 = Math.floor((g.cols - out.length) / 2);
    for (let x = 0; x < out.length; x++) g.set(x0 + x, 2, out[x], k > x * 2 + 4 ? '#7ee787' : '#8b98a8');
  },
});

export const waveText = definePiece({
  name: 'wave-text', category: 'type', fps: 24, cols: 50, rows: 7, color: true, options: { text: 'making waves' },
  frame({ g, t, opts }) {
    const x0 = Math.floor((g.cols - opts.text.length * 2) / 2);
    for (let k = 0; k < opts.text.length; k++) g.set(x0 + k * 2, 3 + Math.sin(t * 4 + k * 0.5) * 2.4, opts.text[k], hsl(k * 15 + t * 60, 0.8, 0.65));
  },
});

export const bigTextPiece = definePiece({
  name: 'big-text', category: 'type', fps: 10, cols: 50, rows: 5, color: true, options: { text: 'ASCIIIII' },
  frame({ g, t, opts }) {
    const rows = bigText(opts.text), x0 = Math.floor((g.cols - rows[0].length) / 2);
    rows.forEach((r, k) => { for (let x = 0; x < r.length; x++) if (r[x] !== ' ') g.set(x0 + x, 1 + k, r[x], hsl(x * 8 + t * 50, 0.8, 0.6)); });
  },
});

export const dissolve = definePiece({
  name: 'dissolve', category: 'type', fps: 15, cols: 50, rows: 5, options: { text: 'everything fades' },
  init({ rnd, opts }) { return { order: Array.from({ length: opts.text.length }, () => rnd()) }; },
  frame({ g, i, state, opts }) {
    const p = (Math.sin(i * 0.08) + 1) / 2, x0 = Math.floor((g.cols - opts.text.length) / 2);
    for (let k = 0; k < opts.text.length; k++) { const th = state.order[k]; g.set(x0 + k, 2, th < p ? opts.text[k] : th < p + 0.15 ? shade(1 - (th - p) / 0.15, ' .:+') : ' '); }
  },
});

export const splitFlap = definePiece({
  name: 'split-flap', category: 'type', fps: 15, cols: 50, rows: 5, color: true, options: { text: 'DEPARTURES 09:45 TOKYO' },
  init() { return { cur: '' }; },
  frame({ g, i, opts, state }) {
    const A = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:';
    const target = opts.text.toUpperCase(), cycle = 60 + target.length * 2;
    const k = i % cycle;
    let out = '';
    for (let x = 0; x < target.length; x++) {
      const idx = A.indexOf(target[x]);
      const steps = Math.max(0, Math.min(idx < 0 ? 0 : idx, k - x * 2));
      out += idx < 0 ? target[x] : A[steps];
    }
    state.cur = out;
    const x0 = Math.floor((g.cols - out.length * 2) / 2);
    for (let x = 0; x < out.length; x++) { g.set(x0 + x * 2, 1, '▁', '#374151'); g.set(x0 + x * 2, 2, out[x], out[x] === target[x] || target[x] === ' ' ? '#fde68a' : '#9ca3af'); g.set(x0 + x * 2, 3, '▔', '#374151'); }
  },
});

export const morse = definePiece({
  name: 'morse', category: 'type', fps: 8, cols: 50, rows: 5, color: true, options: { text: 'SOS ASCII' },
  frame({ g, i, opts }) {
    const M = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..', ' ': '/' };
    const code = opts.text.toUpperCase().split('').map((c) => M[c] || '?').join(' ');
    const n = i % (code.length + 10);
    g.text(2, 1, opts.text, '#8b98a8');
    g.text(2, 2, code.slice(0, n).replace(/\./g, '•').replace(/-/g, '━'), '#fde68a');
    const cur = code[n - 1];
    g.set(g.cols - 3, 2, cur === '.' || cur === '-' ? '◉' : '○', cur === '.' || cur === '-' ? '#fde68a' : '#374151');
  },
});

export const pieces = [typewriter, glitch, marquee, scramble, waveText, bigTextPiece, dissolve, splitFlap, morse];
