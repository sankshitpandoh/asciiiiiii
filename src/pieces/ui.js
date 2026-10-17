import { definePiece, hsl, mix } from './kit.js';

export const spinners = definePiece({
  name: 'spinners', category: 'ui', fps: 10, cols: 48, rows: 14, color: true,
  frame({ g, i }) {
    const sets = [['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'], ['|', '/', '-', '\\'], ['◐', '◓', '◑', '◒'], ['▁', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃'], ['◜', '◠', '◝', '◞', '◡', '◟'], ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'], ['[    ]', '[=   ]', '[==  ]', '[=== ]', '[ ===]', '[  ==]', '[   =]'], ['.  ', '.. ', '...', '   ']];
    const names = ['dots', 'line', 'moon', 'bars', 'arc', 'braille', 'bounce', 'ellipsis'];
    sets.forEach((s, k) => {
      const x = (k % 2) * 24 + 2, y = Math.floor(k / 2) * 3 + 1;
      g.text(x, y, s[i % s.length], '#58a6ff'); g.text(x + 8, y, names[k], '#8b98a8');
    });
  },
});

export const progressBar = definePiece({
  name: 'progress-bar', category: 'ui', fps: 12, cols: 50, rows: 7, color: true,
  frame({ g, t }) {
    const p = (Math.sin(t * 0.6 - Math.PI / 2) + 1) / 2;
    const w = 36, filled = Math.round(p * w);
    g.text(2, 1, 'Downloading model weights…', '#e6edf3');
    g.text(2, 3, '[' + '█'.repeat(filled) + '░'.repeat(w - filled) + ']', '#7ee787');
    g.text(2 + w + 3, 3, `${Math.round(p * 100)}%`.padStart(4), '#e6edf3');
    g.text(2, 5, `${(p * 4.2).toFixed(1)} GB / 4.2 GB · ${p < 1 ? `${Math.max(0, Math.round((1 - p) * 42))}s left` : 'done'}`, '#8b98a8');
  },
});

export const bootLog = definePiece({
  name: 'boot-log', category: 'ui', fps: 8, cols: 56, rows: 16, color: true,
  frame({ g, i }) {
    const lines = ['Mounting /dev/sda1 on /', 'Starting udev Kernel Device Manager', 'Reached target Local File Systems', 'Starting Network Manager', 'Starting OpenSSH server daemon', 'Started Login Service', 'Reached target Network', 'Starting asciiiii renderer…', 'Loaded 240 pieces', 'Starting Hostname Service', 'Reached target Graphical Interface', 'Welcome to asciiiii 0.2 (tty1)'];
    const shown = Math.min(lines.length, Math.floor(i / 2) % (lines.length + 8));
    for (let k = 0; k < shown; k++) {
      const y = k - Math.max(0, shown - (g.rows - 1));
      if (y < 0) continue;
      const ok = k < shown - 1 || k === lines.length - 1;
      g.text(1, y, ok ? '[  OK  ]' : '[ .... ]', ok ? '#7ee787' : '#8b98a8');
      g.text(10, y, lines[k], k === lines.length - 1 ? '#58a6ff' : '#e6edf3');
    }
    if (shown < lines.length && i % 2) g.set(10 + lines[Math.max(0, shown - 1)].length, Math.min(shown - 1, g.rows - 2), '▌', '#e6edf3');
  },
});

export const digitalClock = definePiece({
  name: 'digital-clock', category: 'ui', fps: 2, cols: 46, rows: 7, color: true,
  frame({ g, i }) {
    const d = new Date();
    const F = { 0: ['█▀█', '█ █', '▀▀▀'], 1: ['▀█ ', ' █ ', '▀▀▀'], 2: ['▀▀█', '█▀▀', '▀▀▀'], 3: ['▀▀█', '▀▀█', '▀▀▀'], 4: ['█ █', '▀▀█', '  ▀'], 5: ['█▀▀', '▀▀█', '▀▀▀'], 6: ['█▀▀', '█▀█', '▀▀▀'], 7: ['▀▀█', '  █', '  ▀'], 8: ['█▀█', '█▀█', '▀▀▀'], 9: ['█▀█', '▀▀█', '▀▀▀'], ':': [' ', '▀', '▀'] };
    const s = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
    let x = 3;
    for (const ch of s) {
      const glyph = F[ch];
      if (ch === ':' && i % 2) { x += 2; continue; }
      glyph.forEach((row, r) => g.text(x, 2 + r, row, ch === ':' ? '#8b98a8' : '#7ee787'));
      x += glyph[0].length + 1;
    }
    g.text(3, 6, d.toDateString(), '#8b98a8');
  },
});

export const terminal = definePiece({
  name: 'terminal', category: 'ui', fps: 12, cols: 56, rows: 14, color: true,
  frame({ g, i }) {
    g.box(0, 0, g.cols, g.rows, '#4b5563', 'round');
    g.text(2, 0, ' ● ● ● ', '#8b98a8'); g.center(0, ' zsh — asciiiii ', '#8b98a8');
    const script = [['$ npm i asciiiii', '#e6edf3'], ['added 1 package in 0.4s', '#8b98a8'], ['$ cat hello.html', '#e6edf3'], ['<ascii-art piece="donut"></ascii-art>', '#7ee787'], ['$ npx serve .', '#e6edf3'], ['Serving on http://localhost:3000', '#58a6ff'], ['$ ', '#e6edf3']];
    const total = script.reduce((n, [s]) => n + s.length + 6, 0);
    let budget = (i * 2) % (total + 40);
    let y = 2;
    for (const [s, col] of script) {
      if (budget <= 0) break;
      const n = Math.min(s.length, budget);
      g.text(2, y, s.slice(0, n), col);
      if (n === s.length && budget < s.length + 6 && i % 2) g.set(2 + n, y, '▌', '#e6edf3');
      budget -= s.length + 6; y++;
    }
    if (budget > 0 && i % 2) g.set(4, y - 1, '▌', '#e6edf3');
  },
});

export const calendar = definePiece({
  name: 'calendar', category: 'ui', fps: 1, cols: 30, rows: 12, color: true,
  frame({ g }) {
    const d = new Date(), y = d.getFullYear(), m = d.getMonth();
    const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    g.box(0, 0, 29, 11, '#4b5563', 'round');
    g.center(1, d.toLocaleString('en', { month: 'long', year: 'numeric' }), '#e6edf3');
    g.text(2, 3, 'Su Mo Tu We Th Fr Sa', '#8b98a8');
    for (let i = 0; i < days; i++) {
      const col = (first + i) % 7, row = Math.floor((first + i) / 7);
      const today = i + 1 === d.getDate();
      g.text(2 + col * 3, 4 + row, String(i + 1).padStart(2), today ? '#0b0f14' : col === 0 || col === 6 ? '#8b98a8' : '#e6edf3');
      if (today) { g.set(1 + col * 3, 4 + row, '[', '#7ee787'); g.set(4 + col * 3, 4 + row, ']', '#7ee787'); }
    }
  },
});

export const fileTree = definePiece({
  name: 'file-tree', category: 'ui', fps: 6, cols: 40, rows: 14, color: true,
  frame({ g, i }) {
    const tree = [['asciiiii/', 0, true], ['├── src/', 0, true], ['│   ├── asciify.js', 1], ['│   ├── ascii-art.js', 1], ['│   └── pieces/', 1, true], ['│       ├── donut.js', 2], ['│       └── kit.js', 2], ['├── demo/', 0, true], ['│   └── app.js', 1], ['├── index.html', 0], ['├── package.json', 0], ['└── README.md', 0]];
    const open = Math.floor(i / 3) % (tree.length + 6);
    tree.slice(0, Math.min(tree.length, open)).forEach(([s, , dir], k) => g.text(1, k + 1, s, dir ? '#58a6ff' : k === open - 1 ? '#7ee787' : '#e6edf3'));
  },
});

export const skeleton = definePiece({
  name: 'skeleton', category: 'ui', fps: 15, cols: 44, rows: 10, color: true,
  frame({ g, t }) {
    const shimmer = (x) => mix('#2d3a4a', '#4b5f78', (Math.sin(x * 0.3 - t * 6) + 1) / 2);
    const bar = (x, y, w) => { for (let k = 0; k < w; k++) g.set(x + k, y, '▓', shimmer(x + k)); };
    for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) g.set(2 + k, 1 + j, '▓', shimmer(k + j));
    bar(7, 1, 20); bar(7, 2, 14);
    bar(2, 5, 40); bar(2, 6, 36); bar(2, 7, 28);
    g.text(2, 9, 'loading…', '#6b7280');
  },
});

export const boxFrames = definePiece({
  name: 'box-frames', category: 'ui', fps: 4, cols: 54, rows: 12, color: true,
  frame({ g, i }) {
    const styles = ['single', 'double', 'round'];
    styles.forEach((s, k) => { const hl = i % 3 === k; g.box(1 + k * 18, 1, 16, 7, hl ? '#58a6ff' : '#4b5563', s); g.center(4, '', null); g.text(3 + k * 18, 4, s.padEnd(12), hl ? '#e6edf3' : '#8b98a8'); });
    g.text(1, 9, '┌─┬─┐  ╔═╦═╗  ╭─┬─╮  ▛▀▜  ╒═╤═╕', '#8b98a8');
    g.text(1, 10, '└─┴─┘  ╚═╩═╝  ╰─┴─╯  ▙▄▟  ╘═╧═╛', '#8b98a8');
  },
});

export const dividers = definePiece({
  name: 'dividers', category: 'ui', fps: 6, cols: 50, rows: 9,
  frame({ g, i }) {
    const pats = ['─', '═', '━', '┈', '╌', '·', '~', '◆'];
    pats.forEach((p, k) => { const off = (i + k * 3) % 4; let s = ''; for (let x = 0; x < g.cols - 2; x++) s += (x + off) % 4 === 0 && (k === 5 || k === 7) ? p : k === 5 || k === 7 ? ' ' : p; g.text(1, k + 1, s); });
    g.center(4, ' ✦ asciiiii ✦ ');
  },
});

export const notFound = definePiece({
  name: 'not-found', category: 'ui', fps: 8, cols: 44, rows: 11, color: true,
  frame({ g, i, rnd }) {
    const big = ['█ █ █▀█ █ █', '▀▀█ █ █ ▀▀█', '  █ ▀▀▀   █'];
    const glitch = i % 20 < 2;
    big.forEach((row, r) => g.text(g.cols / 2 - 6 + (glitch ? Math.round((rnd() - 0.5) * 4) : 0), 2 + r, row, glitch ? '#ff7b72' : '#e6edf3'));
    g.center(6, 'page not found', '#8b98a8');
    g.center(8, i % 10 < 5 ? '> go home_' : '> go home ', '#58a6ff');
  },
});

export const formControls = definePiece({
  name: 'form-controls', category: 'ui', fps: 4, cols: 44, rows: 11, color: true,
  frame({ g, i }) {
    const on = i % 4 < 2;
    g.text(2, 1, `[${on ? 'x' : ' '}] Remember me`, '#e6edf3');
    g.text(2, 2, `(${on ? '●' : ' '}) Dark theme    (${on ? ' ' : '●'}) Light theme`, '#e6edf3');
    g.text(2, 4, `Volume  ├${'━'.repeat(8 + (i % 6))}●${'─'.repeat(10 - (i % 6))}┤`, '#58a6ff');
    g.text(2, 6, `Toggle  ${on ? '[●━━]' : '[━━○]'}  ${on ? 'on ' : 'off'}`, on ? '#7ee787' : '#8b98a8');
    g.box(2, 8, 24, 3, '#4b5563', 'round'); g.text(4, 9, 'search…'.slice(0, i % 10) + (i % 2 ? '▌' : ' '), '#e6edf3');
    g.box(28, 8, 12, 3, on ? '#58a6ff' : '#4b5563', 'round'); g.text(31, 9, 'Submit', on ? '#58a6ff' : '#8b98a8');
  },
});

export const pieces = [spinners, progressBar, bootLog, digitalClock, terminal, calendar, fileTree, skeleton, boxFrames, dividers, notFound, formControls];
