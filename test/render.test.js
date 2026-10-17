import { test } from 'node:test';
import assert from 'node:assert/strict';
import { asciify, artFromLines } from '../src/asciify.js';
import { toText, toHTML, toSVG, rowRuns } from '../src/render.js';
import { encodeArt, decodeArt } from '../src/embed.js';

const art = artFromLines(['@@  ..', '<&>   '], {
  colors: [
    ['#ff0000', '#ff0000', '#000000', '#000000', '#00ff00', '#00ff00'],
    ['#0000ff', '#0000ff', '#0000ff', '#000000', '#000000', '#000000'],
  ],
});

test('toText joins rows', () => {
  assert.equal(toText(art), '@@  ..\n<&>   ');
});

test('rowRuns merges same-colour cells and folds spaces into runs', () => {
  const runs = rowRuns(art.lines[0], art.colors[0]);
  assert.deepEqual(runs, [
    { text: '@@  ', color: '#ff0000' },
    { text: '..', color: '#00ff00' },
  ]);
  assert.deepEqual(rowRuns('ab', null), [{ text: 'ab', color: null }]);
});

test('toHTML escapes markup and emits colour spans', () => {
  const html = toHTML(art, { fontSize: 12, bg: '#000', fg: '#fff' });
  assert.ok(html.startsWith('<pre'));
  assert.ok(html.includes('&lt;&amp;&gt;'), 'angle brackets and ampersands escaped');
  assert.ok(html.includes('<span style="color:#ff0000">@@  </span>'));
  assert.ok(html.includes('font:12px/1'));
  assert.ok(!html.includes('<&>'));
});

test('toHTML without colours has no spans', () => {
  const mono = artFromLines(['ab', 'cd']);
  const html = toHTML(mono);
  assert.ok(!html.includes('<span'));
  assert.ok(html.includes('ab\ncd'));
});

test('toSVG is well-formed and sized from the grid', () => {
  const svg = toSVG(art, { fontSize: 10, charAspect: 0.6, lineHeight: 1 });
  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(svg.includes('width="56"'), 'cols*6 + 2*pad');
  assert.ok(svg.includes('height="40"'), 'rows*10 + 2*pad');
  assert.equal((svg.match(/<text /g) || []).length, 2);
  assert.ok(svg.includes('<tspan fill="#0000ff">&lt;&amp;&gt;'));
  assert.ok(svg.trim().endsWith('</svg>'));
});

test('embed JSON round-trips including colours, and is compact', () => {
  const img = { width: 6, height: 3, data: new Uint8ClampedArray(6 * 3 * 4) };
  for (let i = 0; i < 18; i++) img.data.set([i * 14, 255 - i * 14, 128, 255], i * 4);
  const original = asciify(img, { color: true, charset: 'detailed' });
  const encoded = encodeArt(original);
  assert.equal(encoded.v, 1);
  assert.ok(encoded.palette.length <= 18);
  const decoded = decodeArt(JSON.stringify(encoded));
  assert.deepEqual(decoded.lines, original.lines);
  assert.deepEqual(decoded.colors, original.colors);
  assert.deepEqual(decoded.levels, original.levels);
  assert.equal(decoded.charset, original.charset);
});

test('encodeArt without colours omits palette; decodeArt validates', () => {
  const mono = artFromLines(['ab']);
  const enc = encodeArt(mono);
  assert.equal(enc.colors, undefined);
  assert.equal(enc.palette, undefined);
  assert.equal(decodeArt(enc).colors, null);
  assert.throws(() => decodeArt('{"nope":1}'));
});
