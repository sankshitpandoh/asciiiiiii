import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PIECES, CATEGORIES, listPieces, getPiece, registerPiece, createRunner, Grid, bigText, rng, hsl, mix } from '../src/pieces/index.js';

test('registry has many pieces across every category', () => {
  const all = listPieces();
  assert.ok(all.length >= 120, `expected ≥120 pieces, got ${all.length}`);
  for (const c of CATEGORIES) assert.ok(listPieces(c).length >= 8, `category ${c} has ${listPieces(c).length}`);
  for (const p of all) assert.equal(PIECES[p.name], p);
  assert.equal(getPiece('DONUT'), PIECES.donut);
  assert.equal(getPiece('nope'), null);
});

test('every piece renders 20 well-formed, non-blank frames', () => {
  for (const p of listPieces()) {
    const r = createRunner(p, {});
    let ink = 0;
    for (let i = 0; i < 20; i++) {
      const f = r.tick();
      assert.equal(f.lines.length, p.rows, `${p.name}: rows`);
      for (const line of f.lines) assert.equal(Array.from(line).length, p.cols, `${p.name}: cols in "${line}"`);
      if (f.colors) {
        assert.equal(f.colors.length, p.rows, `${p.name}: colour rows`);
        for (const row of f.colors) for (const c of row) assert.match(c, /^#[0-9a-f]{6}$/i, `${p.name}: colour ${c}`);
      }
      ink += f.lines.join('').replace(/ /g, '').length;
    }
    assert.ok(ink > 0, `${p.name}: blank`);
  }
});

test('pieces are deterministic for a given seed', () => {
  for (const name of ['starfield', 'matrix-rain', 'doom-fire', 'maze']) {
    const a = createRunner(PIECES[name], { seed: 3 }), b = createRunner(PIECES[name], { seed: 3 });
    for (let i = 0; i < 5; i++) assert.deepEqual(a.tick().lines, b.tick().lines, name);
  }
});

test('pieces honour cols/rows and options overrides', () => {
  const f = createRunner(PIECES.plasma, { cols: 30, rows: 10 }).tick();
  assert.equal(f.lines.length, 10);
  assert.equal(f.lines[0].length, 30);
  const tw = createRunner(PIECES.typewriter, { options: { text: 'hi' } });
  for (let i = 0; i < 3; i++) tw.tick();
  assert.ok(tw.tick().lines.join('').includes('hi'));
});

test('registerPiece adds a custom piece', () => {
  const p = registerPiece({ name: 'test-dot', fps: 1, cols: 3, rows: 1, frame({ g }) { g.set(1, 0, '•'); } });
  assert.equal(getPiece('test-dot'), p);
  assert.deepEqual(createRunner(p).tick().lines, [' • ']);
  assert.throws(() => registerPiece({ name: 'x' }));
});

test('Grid primitives', () => {
  const g = new Grid(6, 3);
  g.box(0, 0, 6, 3);
  assert.deepEqual(g.lines(), ['┌────┐', '│    │', '└────┘']);
  g.text(1, 1, 'hi', '#ff0000');
  assert.equal(g.colors()[1][1], '#ff0000');
  assert.equal(g.colors()[0][0], '#e6edf3', 'uncoloured cells fall back to default ink');
  g.useDepth();
  g.set(0, 0, 'a', null, 1);
  g.set(0, 0, 'b', null, 0); // further away: ignored
  assert.equal(g.get(0, 0), 'a');
  g.set(99, 99, 'x'); // out of bounds: ignored
  assert.equal(bigText('A')[0].length, 5);
});

test('kit helpers: rng, hsl, mix', () => {
  const r1 = rng(42), r2 = rng(42);
  assert.equal(r1(), r2());
  const v = r1();
  assert.ok(v >= 0 && v < 1);
  assert.equal(hsl(0, 1, 0.5), '#ff0000');
  assert.equal(hsl(120, 1, 0.5), '#00ff00');
  assert.equal(mix('#000000', '#ffffff', 0.5), '#808080');
});
