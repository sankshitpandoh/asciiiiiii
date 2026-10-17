/**
 * Built-in piece catalogue: importing this module registers every piece.
 */
import { pieces as shapes } from './shapes.js';
import { pieces as space } from './space.js';
import { pieces as physics } from './physics.js';
import { pieces as generative } from './generative.js';
import { pieces as effects } from './effects.js';
import { pieces as ui } from './ui.js';
import { pieces as data } from './data.js';
import { pieces as type } from './type.js';
import { pieces as nature } from './nature.js';
import { pieces as objects } from './objects.js';
import { pieces as creatures } from './creatures.js';
import { PIECES, registerPiece } from '../registry.js';

export * from './kit.js';
export { PIECES, registerPiece, getPiece, listPieces } from '../registry.js';

export const CATEGORIES = ['shapes', 'space', 'physics', 'generative', 'effects', 'ui', 'data', 'type', 'nature', 'objects', 'creatures'];

for (const list of [shapes, space, physics, generative, effects, ui, data, type, nature, objects, creatures]) {
  for (const p of list) {
    if (PIECES[p.name]) throw new Error(`duplicate piece name: ${p.name}`);
    registerPiece(p);
  }
}
