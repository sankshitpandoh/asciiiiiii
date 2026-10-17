/**
 * asciiiii — public entry point (core + all built-in pieces).
 *
 *   <script type="module" src="https://cdn.jsdelivr.net/gh/sankshitpandoh/asciiiii@main/dist/ascii-art.min.js"></script>
 *   <ascii-art piece="donut"></ascii-art>
 *   <ascii-art src="photo.jpg" cols="80" color animate="flicker"></ascii-art>
 *   <ascii-art src="clip.mp4" cols="80" fps="12"></ascii-art>
 *
 * Need a smaller bundle? dist/ascii-art.core.min.js has everything but the pieces.
 */

// Register the catalogue BEFORE core.js defines the element, so <ascii-art piece="…">
// tags already in the document resolve on upgrade.
import './pieces/index.js';

export * from './core.js';
export { CATEGORIES } from './pieces/index.js';
