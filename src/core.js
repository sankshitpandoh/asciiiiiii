/**
 * asciiiii core — everything except the built-in piece catalogue (~15 kB vs ~100 kB).
 * `piece="…"` only works for pieces you register yourself with registerPiece().
 */
export * from './asciify.js';
export * from './render.js';
export * from './embed.js';
export * from './browser.js';
export * from './media.js';
export * from './pieces/kit.js';
export { PIECES, getPiece, listPieces, registerPiece } from './registry.js';
export { AsciiArtElement, define } from './ascii-art.js';

import { define } from './ascii-art.js';

if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  define();
}
