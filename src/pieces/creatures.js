import { definePiece, hsl, mix, clamp, TAU, fbm } from './kit.js';

export const snake = definePiece({
  name: 'snake', category: 'creatures', fps: 10, cols: 40, rows: 20, color: true,
  init({ cols, rows, rnd }) { return { body: [[10, 10], [9, 10], [8, 10]], dir: [1, 0], food: [Math.floor(rnd() * (cols - 2)) + 1, Math.floor(rnd() * (rows - 2)) + 1], score: 0 }; },
  frame({ g, state, rnd }) {
    const [hx, hy] = state.body[0], [fx, fy] = state.food;
    let dir = state.dir;
    const want = Math.abs(fx - hx) > Math.abs(fy - hy) ? [Math.sign(fx - hx), 0] : [0, Math.sign(fy - hy)];
    if (want[0] !== -dir[0] || want[1] !== -dir[1]) dir = want;
    let nx = hx + dir[0], ny = hy + dir[1];
    if (nx <= 0 || ny <= 0 || nx >= g.cols - 1 || ny >= g.rows - 1 || state.body.some(([x, y]) => x === nx && y === ny)) { dir = [dir[1], -dir[0]]; nx = hx + dir[0]; ny = hy + dir[1]; }
    state.dir = dir; state.body.unshift([nx, ny]);
    if (nx === fx && ny === fy) { state.score++; state.food = [Math.floor(rnd() * (g.cols - 2)) + 1, Math.floor(rnd() * (g.rows - 2)) + 1]; } else state.body.pop();
    if (state.body.length > 40) state.body.length = 3;
    g.box(0, 0, g.cols, g.rows, '#4b5563');
    state.body.forEach(([x, y], k) => g.set(x, y, k === 0 ? '◉' : '█', k === 0 ? '#bbf7d0' : mix('#166534', '#4ade80', 1 - k / state.body.length)));
    g.set(fx, fy, '●', '#ff7b72'); g.text(2, 0, ` score ${state.score} `, '#e6edf3');
  },
});

export const jellyfish = definePiece({
  name: 'jellyfish', category: 'creatures', fps: 15, cols: 40, rows: 24, color: true,
  frame({ g, t }) {
    const cx = g.cols / 2 + Math.sin(t * 0.5) * 6, cy = 6 + Math.sin(t * 1.4) * 1.5, pulse = 1 + Math.sin(t * 2.8) * 0.2;
    for (let a = 0; a <= Math.PI; a += 0.12) g.set(cx + Math.cos(a) * 7 * pulse, cy - Math.sin(a) * 3.5 * pulse, '▓', hsl(280 + Math.sin(a) * 30, 0.7, 0.7));
    for (let x = -7; x <= 7; x++) g.set(cx + x * pulse, cy, '▀', '#c084fc');
    for (let k = -3; k <= 3; k++) for (let y = 1; y < 12; y++) g.set(cx + k * 2 + Math.sin(t * 3 + y * 0.6 + k) * 1.5, cy + y, y % 2 ? '╲' : '╱', mix('#c084fc', '#1e1b4b', y / 12));
    for (let k = 0; k < 8; k++) g.set((k * 11 + t * 2) % g.cols, (g.rows - ((t * 3 + k * 7) % g.rows)), '○', '#1e3a8a');
  },
});

export const aquarium = definePiece({
  name: 'aquarium', category: 'creatures', fps: 12, cols: 60, rows: 20, color: true,
  init({ rnd, cols, rows }) { return { fish: Array.from({ length: 6 }, (_, i) => ({ x: rnd() * cols, y: 2 + rnd() * (rows - 6), v: (0.5 + rnd()) * (i % 2 ? 1 : -1), c: hsl(i * 60, 0.8, 0.65) })), bub: [] }; },
  frame({ g, state, rnd, dt, t }) {
    for (let x = 0; x < g.cols; x++) g.set(x, 0, Math.sin(x * 0.4 + t * 3) > 0 ? '~' : '≈', '#38bdf8');
    for (const f of state.fish) { f.x += f.v * dt * 6; if (f.x < -6) f.x = g.cols + 5; if (f.x > g.cols + 6) f.x = -5; f.y += Math.sin(t + f.x * 0.1) * dt; g.text(f.x - 3, f.y, f.v > 0 ? '><(((º>' : '<º)))><', f.c); }
    if (rnd() < 0.3) state.bub.push({ x: 8 + rnd() * 44, y: g.rows - 2 });
    for (const b of state.bub) { b.y -= dt * 4; g.set(b.x + Math.sin(b.y) * 0.5, b.y, 'o', '#7dd3fc'); }
    state.bub = state.bub.filter((b) => b.y > 1);
    for (let x = 0; x < g.cols; x++) { g.set(x, g.rows - 1, '▓', '#ca8a04'); if (x % 9 === 0) for (let y = 0; y < 4; y++) g.set(x + Math.sin(t * 2 + y + x) * 0.8, g.rows - 2 - y, y % 2 ? ')' : '(', '#22c55e'); }
  },
});

export const butterfly = definePiece({
  name: 'butterfly', category: 'creatures', fps: 12, cols: 40, rows: 18, color: true,
  frame({ g, t }) {
    const cx = g.cols / 2 + Math.sin(t * 0.7) * 8, cy = g.rows / 2 + Math.sin(t * 1.9) * 3, flap = Math.abs(Math.sin(t * 6));
    const wings = [['▄▀▀▀▄', '█▓▒░█', '▀▄▄▄▀'], ['▄▀▀▄', '█▓▒█', '▀▄▄▀'], ['▄▀▄', '█▒█', '▀▄▀']];
    const w = wings[flap > 0.66 ? 0 : flap > 0.33 ? 1 : 2];
    w.forEach((r, k) => { g.text(cx - r.length - 1, cy - 1 + k, r, hsl(30 + k * 20, 0.9, 0.6)); g.text(cx + 2, cy - 1 + k, r.split('').reverse().join(''), hsl(30 + k * 20, 0.9, 0.6)); });
    g.set(cx, cy - 1, '╿', '#1f2937'); g.set(cx, cy, '█', '#1f2937'); g.set(cx, cy + 1, '╽', '#1f2937'); g.set(cx - 1, cy - 2, '╲', '#1f2937'); g.set(cx + 1, cy - 2, '╱', '#1f2937');
    for (let x = 0; x < g.cols; x += 3) g.set(x + Math.sin(t + x) * 0.5, g.rows - 1, '✿', hsl(x * 9, 0.6, 0.7));
  },
});

export const starlings = definePiece({
  name: 'starlings', category: 'creatures', fps: 20, cols: 70, rows: 26, color: true,
  init({ rnd, cols, rows }) { return { b: Array.from({ length: 120 }, () => ({ x: rnd() * cols, y: rnd() * rows, vx: (rnd() - 0.5) * 4, vy: (rnd() - 0.5) * 2 })) }; },
  frame({ g, state, t, dt }) {
    const tx = g.cols / 2 + Math.sin(t * 0.4) * 20, ty = g.rows / 2 + Math.cos(t * 0.6) * 7;
    for (const b of state.b) {
      let ax = (tx - b.x) * 0.3, ay = (ty - b.y) * 0.3, sx = 0, sy = 0;
      for (const o of state.b) { const dx = o.x - b.x, dy = (o.y - b.y) * 2, d2 = dx * dx + dy * dy; if (d2 < 9 && d2 > 0) { sx -= dx / d2; sy -= dy / d2; } }
      ax += sx * 6; ay += sy * 3;
      b.vx += ax * dt; b.vy += ay * dt; const sp = Math.hypot(b.vx, b.vy * 2); if (sp > 12) { b.vx *= 12 / sp; b.vy *= 12 / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      g.set(b.x, b.y, Math.abs(b.vx) > Math.abs(b.vy) * 2 ? '-' : b.vy < 0 ? '^' : 'v', '#1f2937');
    }
    g.each((x, y) => (g.get(x, y) !== ' ' ? null : y < 4 && (x * 7 + y) % 13 === 0 ? ['·', '#f59e0b'] : null));
  },
});

export const spider = definePiece({
  name: 'spider', category: 'creatures', fps: 10, cols: 40, rows: 20, color: true,
  frame({ g, t }) {
    const cx = 20, cy = 1;
    for (let k = 0; k < 7; k++) { const a = Math.PI / 8 + (k / 6) * (Math.PI * 0.75); g.line(cx, cy, cx + Math.cos(a) * 24, cy + Math.sin(a) * 14, '·', '#4b5563'); }
    for (let r = 3; r < 15; r += 3) for (let a = Math.PI / 8; a <= Math.PI * 0.875; a += 0.08) g.set(cx + Math.cos(a) * r * 1.7, cy + Math.sin(a) * r, '·', '#4b5563');
    const sy = 7 + Math.sin(t * 1.2) * 4, sx = cx + Math.sin(t * 0.3) * 2;
    g.line(sx, 1, sx, sy - 2, '│', '#6b7280');
    g.text(sx - 3, sy - 1, '╲ ╱╲ ╱', '#111827'); g.text(sx - 2, sy, '(●●)', '#111827'); g.text(sx - 3, sy + 1, '╱ ╲╱ ╲', '#111827');
    g.set(sx - 1, sy, '●', '#ef4444'); g.set(sx, sy, '●', '#ef4444');
  },
});

function sprite(g, x, y, rows, color) { rows.forEach((r, k) => g.text(x, y + k, r, color)); }

export const cat = definePiece({
  name: 'cat', category: 'creatures', fps: 6, cols: 30, rows: 12, color: true,
  frame({ g, i }) {
    const blink = i % 20 === 0, tail = ['╯', '╮', '╯', '╭'][Math.floor(i / 2) % 4];
    sprite(g, 8, 3, [' /\\_/\\ ', blink ? '( -.- )' : '( o.o )', ' > ^ <  ', '/|   |\\', '(_|_|_)' + tail], '#f59e0b');
    g.text(6, 9, i % 12 < 6 ? 'meow' : '    ', '#8b98a8');
  },
});

export const fox = definePiece({
  name: 'fox', category: 'creatures', fps: 6, cols: 30, rows: 12, color: true,
  frame({ g, i }) {
    const ears = i % 16 < 8 ? ' /\\   /\\ ' : ' /\\   /\\ ', eyes = i % 24 === 0 ? '( -   - )' : '( •   • )';
    sprite(g, 8, 3, [ears, '/  \\ /  \\', eyes, ' \\  ∀  / ', '  `---´  '], '#f97316');
    g.text(18, 7, ['~', ' ~', '  ~'][Math.floor(i / 2) % 3], '#fde68a');
  },
});

export const owl = definePiece({
  name: 'owl', category: 'creatures', fps: 4, cols: 30, rows: 12, color: true,
  frame({ g, i }) {
    const eyes = i % 12 === 0 ? '{ -   - }' : i % 7 === 0 ? '{ o   O }' : '{ O   O }';
    sprite(g, 9, 2, [' /\\   /\\ ', eyes, ' {  V  } ', ' { / \\ } ', '  `===´  ', '   ╜ ╙   '], '#a16207');
    g.text(20, 2, i % 10 < 5 ? 'hoo' : '   ', '#8b98a8'); g.text(2, 9, '┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈', '#4b5563');
  },
});

export const whale = definePiece({
  name: 'whale', category: 'creatures', fps: 8, cols: 50, rows: 16, color: true,
  frame({ g, i, t }) {
    const x = 10 + Math.sin(t * 0.4) * 6, y = 7 + Math.sin(t) * 0.8, spout = i % 24 < 10 ? i % 24 : 0;
    for (let k = 0; k < spout / 2; k++) { g.set(x + 8 - k * 0.5, y - 1 - k, '(', '#bae6fd'); g.set(x + 9 + k * 0.5, y - 1 - k, ')', '#bae6fd'); }
    sprite(g, x, y, ['       .--.____', '  ____/  o     `-.____', ' `-.___            ___`-.', '   _____`--.__.--´  _____/', '  /                  \\'], '#3b82f6');
    for (let xx = 0; xx < g.cols; xx++) g.set(xx, 13 + (Math.sin(xx * 0.3 + t * 2) > 0.3 ? 0 : 1), '~', '#0ea5e9');
    for (let xx = 0; xx < g.cols; xx++) g.set(xx, 15, '≈', '#0c4a6e');
  },
});

export const pieces = [snake, jellyfish, aquarium, butterfly, starlings, spider, cat, fox, owl, whale];
