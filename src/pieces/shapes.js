import { definePiece, plotPoints, rotX, rotY, rotZ, lambert, TAU, RAMP, hsl, Grid, project } from './kit.js';

/** Sample a parametric surface into lit points [x,y,z,lum]. */
function surface(fn, nu, nv, rot, light) {
  const pts = [];
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const u = (i / nu) * TAU, v = (j / nv) * TAU;
      const { p, n } = fn(u, v);
      pts.push([...rot(p), lambert(rot(n), light)]);
    }
  return pts;
}
const spin = (t, a = 1, b = 0.6, c = 0.2) => (p) => rotZ(rotY(rotX(p, t * a), t * b), t * c);

export const donut = definePiece({
  name: 'donut', category: 'shapes', fps: 20, cols: 60, rows: 26,
  frame({ g, t }) {
    const R = 1.1, r = 0.5;
    const rot = spin(t, 1, 0.7, 0);
    plotPoints(g, surface((u, v) => ({
      p: [(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v)],
      n: [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)],
    }), 160, 56, rot), { scale: 6.5 });
  },
});

export const cube = definePiece({
  name: 'cube', category: 'shapes', fps: 20, cols: 50, rows: 24, color: true,
  frame({ g, t }) {
    const rot = spin(t, 0.9, 1.1, 0);
    const V = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map((p) => rot(p.map((c) => c * 0.8)));
    const E = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    g.useDepth();
    E.forEach(([a, b], k) => {
      const col = hsl(k * 30 + t * 40, 0.8, 0.6);
      for (let s = 0; s <= 24; s++) {
        const f = s / 24;
        const p = [0, 1, 2].map((i) => V[a][i] + (V[b][i] - V[a][i]) * f);
        const [sx, sy, z] = project(p[0], p[1], p[2], g.cols, g.rows, 6);
        g.set(sx, sy, z > 1 ? '#' : '+', col, z);
      }
    });
    V.forEach((p) => { const [sx, sy, z] = project(...p, g.cols, g.rows, 6); g.set(sx, sy, '@', '#ffffff', z + 0.01); });
  },
});

export const dnaHelix = definePiece({
  name: 'dna-helix', category: 'shapes', fps: 16, cols: 40, rows: 26, color: true,
  frame({ g, t }) {
    for (let y = 0; y < g.rows; y++) {
      const a = y * 0.45 + t * 2;
      const x1 = g.cols / 2 + Math.sin(a) * 12, x2 = g.cols / 2 + Math.sin(a + Math.PI) * 12;
      const d1 = Math.cos(a) > 0, d2 = !d1;
      if (y % 2 === 0) {
        const lo = Math.min(x1, x2), hi = Math.max(x1, x2);
        for (let x = lo + 1; x < hi; x++) g.set(x, y, '-', x < (lo + hi) / 2 ? '#58a6ff' : '#f778ba');
      }
      g.set(x1, y, d1 ? '@' : 'o', d1 ? '#7ee787' : '#2ea043');
      g.set(x2, y, d2 ? '@' : 'o', d2 ? '#ffa657' : '#9e6a03');
    }
  },
});

export const heart = definePiece({
  name: 'heart', category: 'shapes', fps: 16, cols: 44, rows: 22, color: true,
  frame({ g, t }) {
    const beat = 1 + 0.08 * Math.max(0, Math.sin(t * 5)) ** 4;
    g.each((x, y) => {
      const nx = ((x - g.cols / 2) / (g.cols / 2)) * 1.4 / beat;
      const ny = -((y - g.rows / 2) / (g.rows / 2)) * 1.3 / beat;
      const v = (nx * nx + ny * ny - 1) ** 3 - nx * nx * ny ** 3;
      if (v > 0) return null;
      const depth = -v;
      return [depth > 0.3 ? '@' : depth > 0.08 ? '#' : '+', hsl(350, 0.9, 0.45 + Math.min(0.3, depth))];
    });
  },
});

export const icosahedron = definePiece({
  name: 'icosahedron', category: 'shapes', fps: 20, cols: 50, rows: 24,
  init() {
    const p = (1 + Math.sqrt(5)) / 2;
    const V = [[-1,p,0],[1,p,0],[-1,-p,0],[1,-p,0],[0,-1,p],[0,1,p],[0,-1,-p],[0,1,-p],[p,0,-1],[p,0,1],[-p,0,-1],[-p,0,1]]
      .map((v) => v.map((c) => c / Math.hypot(1, p)));
    const F = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
    const E = new Set();
    F.forEach((f) => f.forEach((a, i) => E.add([a, f[(i + 1) % 3]].sort().join(','))));
    return { V, E: [...E].map((e) => e.split(',').map(Number)) };
  },
  frame({ g, t, state }) {
    const rot = spin(t, 0.6, 0.9, 0.2);
    const V = state.V.map(rot);
    g.useDepth();
    for (const [a, b] of state.E)
      for (let s = 0; s <= 16; s++) {
        const f = s / 16;
        const p = [0, 1, 2].map((i) => V[a][i] + (V[b][i] - V[a][i]) * f);
        const [sx, sy, z] = project(...p, g.cols, g.rows, 6.5);
        g.set(sx, sy, z > 1 ? '#' : '.', null, z);
      }
  },
});

export const mobiusStrip = definePiece({
  name: 'mobius-strip', category: 'shapes', fps: 20, cols: 60, rows: 26,
  frame({ g, t }) {
    const rot = spin(t, 0.5, 0.8, 0.3);
    const pts = [];
    for (let i = 0; i < 160; i++) for (let j = -6; j <= 6; j++) {
      const u = (i / 160) * TAU, v = j / 12 * 0.8;
      const p = [(1 + v * Math.cos(u / 2)) * Math.cos(u), (1 + v * Math.cos(u / 2)) * Math.sin(u), v * Math.sin(u / 2)];
      const n = [Math.cos(u) * Math.sin(u / 2), Math.sin(u) * Math.sin(u / 2), -Math.cos(u / 2)];
      pts.push([...rot(p), lambert(rot(n))]);
    }
    plotPoints(g, pts, { scale: 7 });
  },
});

export const spring = definePiece({
  name: 'spring', category: 'shapes', fps: 20, cols: 56, rows: 24,
  frame({ g, t }) {
    const stretch = 1 + 0.35 * Math.sin(t * 2.2);
    const rot = (p) => rotX(rotY(p, 0.4), 0.9);
    const pts = [];
    for (let i = 0; i < 600; i++) {
      const u = (i / 600) * TAU * 8 + t;
      const p = [Math.cos(u) * 0.8, ((i / 600) - 0.5) * 2.4 * stretch, Math.sin(u) * 0.8];
      pts.push([...rot(p), 0.4 + 0.6 * ((Math.sin(u) + 1) / 2)]);
    }
    plotPoints(g, pts, { scale: 7 });
  },
});

export const tesseract = definePiece({
  name: 'tesseract', category: 'shapes', fps: 20, cols: 56, rows: 26, color: true,
  frame({ g, t }) {
    const V4 = [];
    for (let i = 0; i < 16; i++) V4.push([(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1, (i & 8) ? 1 : -1]);
    const a = t * 0.7, b = t * 0.45;
    const V = V4.map(([x, y, z, w]) => {
      const x1 = x * Math.cos(a) - w * Math.sin(a), w1 = x * Math.sin(a) + w * Math.cos(a);
      const y1 = y * Math.cos(b) - z * Math.sin(b), z1 = y * Math.sin(b) + z * Math.cos(b);
      const k = 1.6 / (2.4 - w1);
      return rotY([x1 * k, y1 * k, z1 * k], t * 0.3);
    });
    g.useDepth();
    for (let i = 0; i < 16; i++) for (let bit = 0; bit < 4; bit++) {
      const j = i ^ (1 << bit);
      if (j < i) continue;
      const col = hsl(bit * 80 + 200, 0.8, 0.65);
      for (let s = 0; s <= 14; s++) {
        const f = s / 14;
        const p = [0, 1, 2].map((k) => V[i][k] + (V[j][k] - V[i][k]) * f);
        const [sx, sy, z] = project(...p, g.cols, g.rows, 7);
        g.set(sx, sy, z > 1 ? '#' : '+', col, z);
      }
    }
  },
});

export const torusKnot = definePiece({
  name: 'torus-knot', category: 'shapes', fps: 20, cols: 60, rows: 26, color: true,
  frame({ g, t }) {
    const rot = spin(t, 0.6, 0.8, 0);
    const pts = [];
    for (let i = 0; i < 900; i++) {
      const u = (i / 900) * TAU;
      const r = 1 + 0.5 * Math.cos(3 * u);
      const p = [r * Math.cos(2 * u) * 0.8, r * Math.sin(2 * u) * 0.8, 0.5 * Math.sin(3 * u)];
      pts.push([...rot(p), 0.5 + 0.5 * Math.sin(u * 3 + t * 3)]);
    }
    plotPoints(g, pts, { scale: 7, color: (p, l) => hsl(180 + l * 120, 0.8, 0.6) });
  },
});

export const twistedRing = definePiece({
  name: 'twisted-ring', category: 'shapes', fps: 20, cols: 60, rows: 26,
  frame({ g, t }) {
    const rot = spin(t, 0.4, 0.9, 0);
    plotPoints(g, surface((u, v) => {
      const w = 0.35 * Math.cos(v), h = 0.35 * Math.sin(v);
      const tw = u * 1.5 + t;
      const ox = w * Math.cos(tw) - h * Math.sin(tw) * 0.3, oz = w * Math.sin(tw) + h * Math.cos(tw);
      return {
        p: [(1.1 + ox) * Math.cos(u), (1.1 + ox) * Math.sin(u), oz],
        n: [Math.cos(v) * Math.cos(u), Math.cos(v) * Math.sin(u), Math.sin(v)],
      };
    }, 100, 24, rot), { scale: 7 });
  },
});

export const gyroscope = definePiece({
  name: 'gyroscope', category: 'shapes', fps: 20, cols: 56, rows: 26, color: true,
  frame({ g, t }) {
    g.useDepth();
    const rings = [[1.2, (p) => rotX(p, t * 1.5), '#58a6ff'], [1.0, (p) => rotY(rotX(p, t * 1.5), t * 1.1), '#7ee787'], [0.8, (p) => rotZ(rotY(rotX(p, t * 1.5), t * 1.1), t * 2), '#ffa657']];
    for (const [r, rot, col] of rings)
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * TAU;
        const [sx, sy, z] = project(...rot([Math.cos(a) * r, Math.sin(a) * r, 0]), g.cols, g.rows, 7);
        g.set(sx, sy, z > 1 ? 'O' : 'o', col, z);
      }
    g.set(g.cols / 2, g.rows / 2, '@', '#ffffff', 5);
  },
});

export const glxgears = definePiece({
  name: 'glxgears', category: 'shapes', fps: 20, cols: 60, rows: 26, color: true,
  frame({ g, t }) {
    const gear = (cx, cy, r, teeth, phase, col, dir) => {
      for (let i = 0; i < 360; i += 2) {
        const a = (i / 180) * Math.PI;
        const tooth = Math.sin((a + phase * dir) * teeth) > 0.3 ? 1.25 : 1;
        g.set(cx + Math.cos(a) * r * tooth * 2, cy + Math.sin(a) * r * tooth, tooth > 1 ? '#' : '*', col);
      }
      g.ellipse(cx, cy, r * 0.6, r * 0.3, '.', col);
    };
    gear(20, 11, 5, 10, t, '#ff7b72', 1);
    gear(37, 8, 3.3, 7, -t * 1.43 + 0.2, '#7ee787', 1);
    gear(34, 18, 3.3, 7, -t * 1.43 + 0.5, '#58a6ff', 1);
  },
});

export const pieces = [donut, cube, dnaHelix, heart, icosahedron, mobiusStrip, spring, tesseract, torusKnot, twistedRing, gyroscope, glxgears];
