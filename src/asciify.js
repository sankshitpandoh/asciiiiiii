/**
 * asciiiii — core image → ASCII conversion.
 *
 * Pure functions only: no DOM, no canvas. Works in browsers, Node and workers.
 * Input is an RGBA pixel grid already sampled at the target resolution
 * (one pixel per character cell); see browser.js for the canvas sampling step.
 */

/** Built-in character ramps, ordered from least to most "ink". */
export const CHARSETS = {
  standard: ' .:-=+*#%@',
  detailed:
    ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$',
  blocks: ' ░▒▓█',
  minimal: ' .oO@',
  binary: ' 01',
  dots: ' ·∙•●',
  slashes: ' -/|\\#',
  letters: ' ilcovxzeasnmwbdpqhkgTBDEFGHKLMNPQRSUVWXYZ',
};

export const DEFAULTS = Object.freeze({
  cols: 80,
  /** Ramp name from CHARSETS or a custom string (least → most ink). */
  charset: 'standard',
  /** Character cell width / height. 0.5 fits most monospace fonts. */
  aspect: 0.5,
  /** Bright pixels → dense characters (dark background). Set true for light backgrounds. */
  invert: false,
  /** -1 … 1 */
  brightness: 0,
  /** -1 … 1 */
  contrast: 0,
  /** >0, 1 = linear */
  gamma: 1,
  /** Keep per-cell colour. */
  color: false,
  /** Colour saturation multiplier when color is on. */
  saturation: 1.15,
  /** Quantise colours to this many levels per channel (fewer = smaller embeds). */
  colorLevels: 32,
  /** Floyd–Steinberg dithering of the luminance → ramp mapping. */
  dither: false,
  /** Upper bound on rows (0 = none). */
  maxRows: 0,
});

/** @returns {string[]} the ramp as an array of glyphs (least → most ink). */
export function resolveCharset(charset) {
  if (!charset) return Array.from(CHARSETS.standard);
  if (Object.prototype.hasOwnProperty.call(CHARSETS, charset)) return Array.from(CHARSETS[charset]);
  // Custom ramp. Use Array.from so astral/multibyte glyphs count as one cell.
  const ramp = Array.from(String(charset));
  return ramp.length >= 2 ? ramp : Array.from(CHARSETS.standard);
}

/**
 * Work out how many rows a cols-wide rendition of a w×h image needs so the
 * result keeps the image's proportions once drawn in a monospace font.
 */
export function computeGrid(width, height, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const cols = Math.max(1, Math.round(o.cols));
  let rows = Math.max(1, Math.round((height / width) * cols * o.aspect));
  if (o.maxRows > 0 && rows > o.maxRows) {
    rows = o.maxRows;
  }
  return { cols, rows };
}

export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Perceived luminance, 0…1, from 0…255 channels. */
export function luminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function rgbToHex(r, g, b) {
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

/** Build a 256-entry lookup applying brightness, contrast and gamma. */
export function buildToneCurve({ brightness = 0, contrast = 0, gamma = 1 } = {}) {
  const lut = new Float32Array(256);
  const k = Math.max(-1, Math.min(0.99, contrast));
  const c = Math.tan(((k + 1) * Math.PI) / 4); // 0 at -1, 1 at 0, steep at +1
  const g = gamma > 0 ? 1 / gamma : 1;
  for (let i = 0; i < 256; i++) {
    let v = i / 255;
    v = (v - 0.5) * c + 0.5; // contrast around mid grey
    v += brightness;
    v = clamp01(v);
    v = Math.pow(v, g);
    lut[i] = v;
  }
  return lut;
}

function saturate(r, g, b, amount) {
  if (amount === 1) return [r, g, b];
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const f = (ch) => Math.max(0, Math.min(255, Math.round(l + (ch - l) * amount)));
  return [f(r), f(g), f(b)];
}

/**
 * Convert an RGBA grid to ASCII art.
 *
 * @param {{width:number,height:number,data:Uint8ClampedArray|Uint8Array|number[]}} image
 *   One pixel per output cell. Alpha is composited over black (or white when inverted).
 * @param {Partial<typeof DEFAULTS>} [opts]
 * @returns {Art}
 *
 * @typedef {Object} Art
 * @property {number} cols
 * @property {number} rows
 * @property {string[]} lines         One string per row.
 * @property {number[][]} levels      Ramp index per cell (handy for animation).
 * @property {string[][]|null} colors Hex colour per cell, or null when color is off.
 * @property {string} charset         The ramp actually used, joined as a string.
 */
export function asciify(image, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const ramp = resolveCharset(o.charset);
  const { width: cols, height: rows, data } = image;
  if (!cols || !rows || !data || data.length < cols * rows * 4) {
    throw new Error('asciify: image must be {width, height, data(RGBA)} with data.length >= w*h*4');
  }

  const tone = buildToneCurve(o);
  const maxIdx = ramp.length - 1;
  const bgChannel = o.invert ? 255 : 0;
  const q = Math.max(2, Math.min(256, Math.round(o.colorLevels)));
  const step = 255 / (q - 1);

  const lines = new Array(rows);
  const levels = new Array(rows);
  const colors = o.color ? new Array(rows) : null;

  // Luminance pass (with alpha compositing + tone curve), optional dithering.
  const lum = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const a = data[i + 3] / 255;
      const r = data[i] * a + bgChannel * (1 - a);
      const g = data[i + 1] * a + bgChannel * (1 - a);
      const b = data[i + 2] * a + bgChannel * (1 - a);
      let v = tone[Math.round(clamp01(luminance(r, g, b)) * 255)];
      if (o.invert) v = 1 - v;
      lum[y * cols + x] = v;
    }
  }

  for (let y = 0; y < rows; y++) {
    const rowChars = new Array(cols);
    const rowLevels = new Array(cols);
    const rowColors = colors ? new Array(cols) : null;
    for (let x = 0; x < cols; x++) {
      const p = y * cols + x;
      const v = lum[p];
      let idx = Math.round(clamp01(v) * maxIdx);
      if (o.dither) {
        const quant = idx / maxIdx;
        const err = v - quant;
        // Floyd–Steinberg error diffusion.
        if (x + 1 < cols) lum[p + 1] += err * (7 / 16);
        if (y + 1 < rows) {
          if (x > 0) lum[p + cols - 1] += err * (3 / 16);
          lum[p + cols] += err * (5 / 16);
          if (x + 1 < cols) lum[p + cols + 1] += err * (1 / 16);
        }
      }
      rowChars[x] = ramp[idx];
      rowLevels[x] = idx;
      if (rowColors) {
        const i = p * 4;
        const a = data[i + 3] / 255;
        let r = data[i] * a + bgChannel * (1 - a);
        let g = data[i + 1] * a + bgChannel * (1 - a);
        let b = data[i + 2] * a + bgChannel * (1 - a);
        [r, g, b] = saturate(r, g, b, o.saturation);
        r = Math.round(Math.round(r / step) * step);
        g = Math.round(Math.round(g / step) * step);
        b = Math.round(Math.round(b / step) * step);
        rowColors[x] = rgbToHex(r, g, b);
      }
    }
    lines[y] = rowChars.join('');
    levels[y] = rowLevels;
    if (colors) colors[y] = rowColors;
  }

  return { cols, rows, lines, levels, colors, charset: ramp.join('') };
}

/**
 * Rebuild an Art object from plain text (and optional colours), e.g. when a
 * web component is given inline text instead of JSON.
 */
export function artFromLines(lines, { charset = 'standard', colors = null } = {}) {
  const ramp = resolveCharset(charset);
  const rows = lines.length;
  const cols = lines.reduce((m, l) => Math.max(m, Array.from(l).length), 0);
  const padded = lines.map((l) => {
    const arr = Array.from(l);
    while (arr.length < cols) arr.push(' ');
    return arr.join('');
  });
  const levels = padded.map((l) =>
    Array.from(l).map((ch) => {
      const i = ramp.indexOf(ch);
      return i < 0 ? 0 : i;
    })
  );
  return { cols, rows, lines: padded, levels, colors, charset: ramp.join('') };
}
