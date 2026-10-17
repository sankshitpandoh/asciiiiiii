import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  asciify, computeGrid, resolveCharset, buildToneCurve, artFromLines, CHARSETS,
} from '../src/asciify.js';

function solid(w, h, [r, g, b, a = 255]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([r, g, b, a], i * 4);
  return { width: w, height: h, data };
}

function gradient(w, h) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const v = Math.round((x / (w - 1)) * 255);
      data.set([v, v, v, 255], (y * w + x) * 4);
    }
  return { width: w, height: h, data };
}

test('computeGrid keeps proportions using the character aspect', () => {
  assert.deepEqual(computeGrid(200, 100, { cols: 80, aspect: 0.5 }), { cols: 80, rows: 20 });
  assert.deepEqual(computeGrid(100, 100, { cols: 40, aspect: 0.5 }), { cols: 40, rows: 20 });
  assert.deepEqual(computeGrid(100, 1000, { cols: 40, maxRows: 50 }), { cols: 40, rows: 50 });
});

test('resolveCharset accepts names and custom ramps', () => {
  assert.equal(resolveCharset('blocks').join(''), CHARSETS.blocks);
  assert.deepEqual(resolveCharset(' .x'), [' ', '.', 'x']);
  assert.equal(resolveCharset('x').join(''), CHARSETS.standard, 'too-short ramp falls back');
  assert.equal(resolveCharset(' 🌑🌓🌕').length, 4, 'astral glyphs count once');
});

test('black maps to the lightest glyph and white to the densest', () => {
  const black = asciify(solid(3, 1, [0, 0, 0]));
  const white = asciify(solid(3, 1, [255, 255, 255]));
  assert.equal(black.lines[0], '   ');
  assert.equal(white.lines[0], '@@@');
});

test('invert swaps the mapping for light backgrounds', () => {
  const white = asciify(solid(2, 1, [255, 255, 255]), { invert: true });
  const black = asciify(solid(2, 1, [0, 0, 0]), { invert: true });
  assert.equal(white.lines[0], '  ');
  assert.equal(black.lines[0], '@@');
});

test('transparent pixels composite over the background', () => {
  const clear = asciify(solid(1, 1, [255, 255, 255, 0]));
  assert.equal(clear.lines[0], ' ');
  const clearInv = asciify(solid(1, 1, [0, 0, 0, 0]), { invert: true });
  assert.equal(clearInv.lines[0], ' ');
});

test('a horizontal gradient is monotonic through the ramp', () => {
  const art = asciify(gradient(40, 2));
  const ramp = CHARSETS.standard;
  let prev = -1;
  for (const ch of art.lines[0]) {
    const i = ramp.indexOf(ch);
    assert.ok(i >= prev, `ramp index should not decrease (${prev} → ${i})`);
    prev = i;
  }
  assert.equal(art.lines[0][0], ' ');
  assert.equal(art.lines[0].at(-1), '@');
  assert.deepEqual(art.lines[0], art.lines[1]);
});

test('output shape matches input and exposes levels', () => {
  const art = asciify(gradient(10, 4), { charset: 'blocks' });
  assert.equal(art.cols, 10);
  assert.equal(art.rows, 4);
  assert.equal(art.lines.length, 4);
  assert.equal(art.levels.length, 4);
  assert.equal(art.levels[0].length, 10);
  assert.equal(art.charset, CHARSETS.blocks);
  assert.equal(art.colors, null);
});

test('color mode returns quantised hex colours', () => {
  const art = asciify(solid(2, 2, [200, 30, 90]), { color: true, saturation: 1, colorLevels: 256 });
  assert.equal(art.colors.length, 2);
  assert.match(art.colors[0][0], /^#[0-9a-f]{6}$/);
  assert.equal(art.colors[0][0], '#c81e5a');
  const coarse = asciify(solid(1, 1, [201, 30, 90]), { color: true, saturation: 1, colorLevels: 2 });
  assert.equal(coarse.colors[0][0], '#ff0000');
});

test('brightness/contrast/gamma tone curve is monotonic and bounded', () => {
  for (const o of [{}, { brightness: 0.5 }, { contrast: 0.8 }, { gamma: 2.2 }, { contrast: -0.9 }]) {
    const lut = buildToneCurve(o);
    for (let i = 1; i < 256; i++) {
      assert.ok(lut[i] >= lut[i - 1] - 1e-9, `monotonic for ${JSON.stringify(o)}`);
      assert.ok(lut[i] >= 0 && lut[i] <= 1);
    }
  }
  const bright = asciify(solid(1, 1, [60, 60, 60]), { brightness: 1 });
  assert.equal(bright.lines[0], '@');
});

test('dithering produces a mix of glyphs on a mid grey instead of a flat fill', () => {
  const flat = asciify(solid(20, 4, [100, 100, 100]), { charset: ' .@' });
  const dithered = asciify(solid(20, 4, [100, 100, 100]), { charset: ' .@', dither: true });
  assert.equal(new Set(flat.lines.join('')).size, 1);
  assert.ok(new Set(dithered.lines.join('')).size > 1);
});

test('asciify rejects malformed input', () => {
  assert.throws(() => asciify({ width: 2, height: 2, data: new Uint8ClampedArray(4) }));
});

test('artFromLines pads rows and recovers ramp levels', () => {
  const art = artFromLines(['@.', ' '], { charset: 'standard' });
  assert.equal(art.cols, 2);
  assert.deepEqual(art.lines, ['@.', '  ']);
  assert.deepEqual(art.levels, [[9, 1], [0, 0]]);
});
