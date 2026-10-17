/**
 * Browser helpers: load an image from anywhere, sample it to a character grid
 * with the canvas, and hand it to asciify().
 */

import { asciify, computeGrid, DEFAULTS } from './asciify.js';

/**
 * Accepts: URL string, File/Blob, HTMLImageElement, HTMLCanvasElement,
 * HTMLVideoElement, ImageBitmap or ImageData. Resolves to something drawImage accepts.
 */
export async function loadImage(source) {
  if (typeof ImageData !== 'undefined' && source instanceof ImageData) return source;
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) return source;
  if (
    (typeof HTMLImageElement !== 'undefined' && source instanceof HTMLImageElement) ||
    (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement) ||
    (typeof HTMLVideoElement !== 'undefined' && source instanceof HTMLVideoElement)
  ) {
    if (source instanceof HTMLImageElement && !source.complete) await source.decode();
    return source;
  }
  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(source);
      } catch {
        /* fall through to <img> (e.g. SVG blobs in some browsers) */
      }
    }
    const url = URL.createObjectURL(source);
    try {
      return await loadImageElement(url);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  if (typeof source === 'string') return loadImageElement(source);
  throw new TypeError('loadImage: unsupported source');
}

function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image: ${url}`));
    img.src = url;
  });
}

function dimensionsOf(src) {
  return {
    width: src.naturalWidth || src.videoWidth || src.width,
    height: src.naturalHeight || src.videoHeight || src.height,
  };
}

/**
 * Resample `source` to cols×rows and return ImageData.
 * Transparent areas composite over black (or white when `invert`).
 */
export function sampleImage(source, cols, rows, { invert = false } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (typeof ImageData !== 'undefined' && source instanceof ImageData) {
    const tmp = document.createElement('canvas');
    tmp.width = source.width;
    tmp.height = source.height;
    tmp.getContext('2d').putImageData(source, 0, 0);
    source = tmp;
  }
  // Two-step downscale for big images: avoids aliasing when shrinking >2x.
  const { width, height } = dimensionsOf(source);
  let cur = source;
  let cw = width;
  let ch = height;
  while (cw / 2 > cols && ch / 2 > rows) {
    const half = document.createElement('canvas');
    half.width = Math.ceil(cw / 2);
    half.height = Math.ceil(ch / 2);
    const hctx = half.getContext('2d');
    hctx.imageSmoothingQuality = 'high';
    hctx.drawImage(cur, 0, 0, half.width, half.height);
    cur = half;
    cw = half.width;
    ch = half.height;
  }
  ctx.fillStyle = invert ? '#fff' : '#000';
  ctx.fillRect(0, 0, cols, rows);
  ctx.drawImage(cur, 0, 0, cols, rows);
  return ctx.getImageData(0, 0, cols, rows);
}

/**
 * One-shot: anything image-like → Art.
 * @param {*} source   see loadImage
 * @param {Partial<typeof DEFAULTS>} [opts]
 */
export async function imageToAscii(source, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const img = await loadImage(source);
  const { width, height } = dimensionsOf(img);
  const { cols, rows } = computeGrid(width, height, o);
  const data = sampleImage(img, cols, rows, { invert: o.invert });
  return asciify(data, o);
}
