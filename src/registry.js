/**
 * Piece registry. The <ascii-art> element looks `piece="…"` names up here.
 * Built-ins are registered by src/pieces/index.js; the core bundle ships empty
 * and you register your own with registerPiece().
 */
import { definePiece } from './pieces/kit.js';

export const PIECES = Object.create(null);

/** Register a piece (see pieces/kit.js definePiece for the contract). */
export function registerPiece(piece) {
  if (!piece?.name || typeof piece.frame !== 'function') throw new Error('registerPiece: need {name, frame}');
  const full = definePiece(piece);
  PIECES[full.name] = full;
  return full;
}

export function getPiece(name) {
  return PIECES[String(name).toLowerCase()] || null;
}

export function listPieces(category) {
  const all = Object.values(PIECES);
  return category ? all.filter((p) => p.category === category) : all;
}
