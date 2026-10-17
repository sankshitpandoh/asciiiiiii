/**
 * Compact, versioned JSON format for shipping finished art inside a web page
 * (as the body of an <ascii-art> element) without re-running the conversion.
 *
 *   v1: a single frame   { v:1, charset, lines, palette?, colors? }
 *   v2: an animation     { v:2, fps, charset, palette?, frames:[{ lines, colors? }] }
 *
 * Colours are palette-indexed and run-length encoded per row:
 *   colors: [ [[paletteIdx, runLength], ...], ... ]
 */

import { artFromLines } from './asciify.js';

export const EMBED_VERSION = 2;

function makePalette() {
  const palette = [];
  const index = new Map();
  return {
    palette,
    encodeRows(colors) {
      return colors.map((row) => {
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
    },
  };
}

function decodeRows(runsRows, palette) {
  return runsRows.map((runs) => {
    const row = [];
    for (const [i, n] of runs) for (let k = 0; k < n; k++) row.push(palette[i]);
    return row;
  });
}

/** Encode a single Art frame (v1). */
export function encodeArt(art, extra = {}) {
  const out = { v: 1, charset: art.charset, lines: art.lines, ...extra };
  if (art.colors) {
    const p = makePalette();
    out.colors = p.encodeRows(art.colors);
    out.palette = p.palette;
  }
  return out;
}

/** Encode a sequence of Art frames as one animation (v2). */
export function encodeAnimation(frames, { fps = 12, ...extra } = {}) {
  if (!frames?.length) throw new Error('encodeAnimation: no frames');
  const p = makePalette();
  const out = {
    v: 2,
    fps,
    charset: frames[0].charset,
    frames: frames.map((f) => (f.colors ? { lines: f.lines, colors: p.encodeRows(f.colors) } : { lines: f.lines })),
    ...extra,
  };
  if (p.palette.length) out.palette = p.palette;
  return out;
}

/**
 * Decode either format.
 * @returns {{ art: Art } | { frames: Art[], fps: number }}
 */
export function decodeEmbed(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  if (!data || typeof data !== 'object') throw new Error('decodeEmbed: invalid payload');
  const charset = data.charset || 'standard';
  if (Array.isArray(data.frames)) {
    const frames = data.frames.map((f) =>
      artFromLines(f.lines, { charset, colors: f.colors && data.palette ? decodeRows(f.colors, data.palette) : null })
    );
    return { frames, fps: Number(data.fps) || 12 };
  }
  if (Array.isArray(data.lines)) {
    const colors = data.colors && data.palette ? decodeRows(data.colors, data.palette) : null;
    return { art: artFromLines(data.lines, { charset, colors }) };
  }
  throw new Error('decodeEmbed: invalid payload');
}

/** v1 convenience: decode a single frame (throws on animations). */
export function decodeArt(json) {
  const d = decodeEmbed(json);
  if (!d.art) throw new Error('decodeArt: payload is an animation, use decodeEmbed');
  return d.art;
}
