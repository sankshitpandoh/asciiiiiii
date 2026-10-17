/**
 * Renderers: Art → text / HTML / SVG / canvas, plus a compact JSON embed format.
 * Everything except toCanvas is DOM-free.
 */

export const RENDER_DEFAULTS = Object.freeze({
  fontSize: 10, // px
  lineHeight: 1, // multiplier
  fontFamily:
    'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace',
  fg: '#e6edf3',
  bg: '#0d1117',
  /** Approximate glyph width / font size for the monospace fonts above. */
  charAspect: 0.6,
});

export function escapeHTML(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function toText(art) {
  return art.lines.join('\n');
}

/** Group consecutive cells of the same colour into runs: [{text, color}]. */
export function rowRuns(line, rowColors) {
  const chars = Array.from(line);
  if (!rowColors) return [{ text: chars.join(''), color: null }];
  const runs = [];
  let cur = null;
  for (let x = 0; x < chars.length; x++) {
    const ch = chars[x];
    // Spaces carry no ink: merge them into the current run to keep markup small.
    const color = ch === ' ' && cur ? cur.color : rowColors[x];
    if (cur && cur.color === color) {
      cur.text += ch;
    } else {
      cur = { text: ch, color };
      runs.push(cur);
    }
  }
  return runs;
}

/**
 * Standalone <pre> markup. No JavaScript needed on the host page.
 */
export function toHTML(art, opts = {}) {
  const o = { ...RENDER_DEFAULTS, ...opts };
  const style = [
    `margin:0`,
    `padding:${Math.round(o.fontSize)}px`,
    `display:inline-block`,
    `background:${o.bg}`,
    `color:${o.fg}`,
    `font:${o.fontSize}px/${o.lineHeight} ${o.fontFamily}`,
    `white-space:pre`,
    `letter-spacing:0`,
    `overflow:auto`,
    `max-width:100%`,
  ].join(';');
  const body = art.lines
    .map((line, y) =>
      rowRuns(line, art.colors ? art.colors[y] : null)
        .map((run) =>
          run.color && run.text.trim()
            ? `<span style="color:${run.color}">${escapeHTML(run.text)}</span>`
            : escapeHTML(run.text)
        )
        .join('')
    )
    .join('\n');
  const cls = o.className ? ` class="${o.className}"` : '';
  return `<pre${cls} style="${style}" aria-label="ASCII art">${body}</pre>`;
}

/**
 * Scalable SVG. textLength pins each row to the same width so columns stay
 * aligned regardless of which monospace font the viewer has.
 */
export function toSVG(art, opts = {}) {
  const o = { ...RENDER_DEFAULTS, ...opts };
  const cw = o.fontSize * o.charAspect;
  const lh = o.fontSize * o.lineHeight;
  const pad = o.fontSize;
  const width = Math.ceil(art.cols * cw + pad * 2);
  const height = Math.ceil(art.rows * lh + pad * 2);
  const rows = art.lines
    .map((line, y) => {
      const yPos = (pad + y * lh + lh * 0.8).toFixed(2);
      const runs = rowRuns(line, art.colors ? art.colors[y] : null);
      const inner = runs
        .map((run) =>
          run.color && run.text.trim()
            ? `<tspan fill="${run.color}">${escapeHTML(run.text)}</tspan>`
            : escapeHTML(run.text)
        )
        .join('');
      return `<text x="${pad}" y="${yPos}" textLength="${(art.cols * cw).toFixed(2)}" lengthAdjust="spacingAndGlyphs" xml:space="preserve">${inner}</text>`;
    })
    .join('\n');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ` +
    `font-family='${o.fontFamily.replace(/'/g, '')}' font-size="${o.fontSize}" fill="${o.fg}" style="white-space:pre">\n` +
    `<rect width="100%" height="100%" fill="${o.bg}"/>\n${rows}\n</svg>`
  );
}

/**
 * Draw to a canvas (browser only). Returns the canvas; caller can toBlob/toDataURL.
 * @param {Art} art
 * @param {object} opts  RENDER_DEFAULTS + {scale}
 * @param {HTMLCanvasElement} [canvas]
 */
export function toCanvas(art, opts = {}, canvas) {
  const o = { scale: 2, ...RENDER_DEFAULTS, ...opts };
  const cw = o.fontSize * o.charAspect;
  const lh = o.fontSize * o.lineHeight;
  const pad = o.fontSize;
  const width = Math.ceil(art.cols * cw + pad * 2);
  const height = Math.ceil(art.rows * lh + pad * 2);
  const c = canvas || document.createElement('canvas');
  c.width = Math.round(width * o.scale);
  c.height = Math.round(height * o.scale);
  const ctx = c.getContext('2d');
  ctx.scale(o.scale, o.scale);
  ctx.fillStyle = o.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.font = `${o.fontSize}px ${o.fontFamily}`;
  ctx.textBaseline = 'alphabetic';
  // Measure the real glyph width and squeeze/stretch to match the SVG/HTML layout.
  const measured = ctx.measureText('M').width || cw;
  const sx = cw / measured;
  for (let y = 0; y < art.rows; y++) {
    const chars = Array.from(art.lines[y]);
    const colors = art.colors ? art.colors[y] : null;
    const yPos = pad + y * lh + lh * 0.8;
    for (let x = 0; x < chars.length; x++) {
      const ch = chars[x];
      if (ch === ' ') continue;
      ctx.fillStyle = colors ? colors[x] : o.fg;
      ctx.save();
      ctx.translate(pad + x * cw, yPos);
      ctx.scale(sx, 1);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
  }
  return c;
}
