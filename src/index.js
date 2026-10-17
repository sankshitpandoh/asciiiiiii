/**
 * asciiiii — public entry point.
 *
 *   <script type="module" src="https://cdn.jsdelivr.net/gh/sankshitpandoh/asciiiii@main/dist/ascii-art.min.js"></script>
 *   <ascii-art src="photo.jpg" cols="80" color animate="flicker"></ascii-art>
 */

export * from './asciify.js';
export * from './render.js';
export * from './embed.js';
export * from './browser.js';
export { AsciiArtElement, define } from './ascii-art.js';

import { define } from './ascii-art.js';

// Auto-register when loaded in a browser.
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  define();
}
