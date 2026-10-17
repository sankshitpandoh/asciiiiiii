/**
 * Compact, versioned JSON format for shipping finished art inside a web page
 * (as the body of an <ascii-art> element) without re-running the conversion.
 *
 * Colours are palette-indexed and run-length encoded per row:
 *   colors: [ [[paletteIdx, runLength], ...], ... ]
 */

import { artFromLines } from './asciify.js';

export const EMBED_VERSION = 1;

export function encodeArt(art, extra = {}) {
  const out = { v: EMBED_VERSION, charset: art.charset, lines: art.lines, ...extra };
  if (art.colors) {
    const palette = [];
    const index = new Map();
    out.colors = art.colors.map((row) => {
      const runs = [];
      let prev = null;
      for (const hex of row) {
        let i = index.get(hex);
        if (i === undefined) {
          i = palette.length;
          palette.push(hex);
          index.set(hex, i);
        }
        if (prev && prev[0] === i) prev[1]++;
        else runs.push((prev = [i, 1]));
      }
      return runs;
    });
    out.palette = palette;
  }
  return out;
}

export function decodeArt(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!data || !Array.isArray(data.lines)) throw new Error('decodeArt: invalid payload');
  let colors = null;
  if (data.colors && data.palette) {
    colors = data.colors.map((runs) => {
      const row = [];
      for (const [i, n] of runs) for (let k = 0; k < n; k++) row.push(data.palette[i]);
      return row;
    });
  }
  return artFromLines(data.lines, { charset: data.charset || 'standard', colors });
}
