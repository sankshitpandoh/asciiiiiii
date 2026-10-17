/**
 * <ascii-art> — a web component that shows (and optionally animates) ASCII art.
 *
 * Three ways to feed it:
 *   1. <ascii-art src="photo.jpg" cols="80" color></ascii-art>          — converts in the browser
 *   2. <ascii-art><script type="application/json">{…}</script></ascii-art> — prebuilt art (see embed.js)
 *   3. <ascii-art>  plain text art  </ascii-art>
 *
 * Attributes: src, cols, charset, color, invert, brightness, contrast, gamma, dither,
 *             aspect, animate (none|typewriter|flicker|wave|scan), fps, speed, loop,
 *             font-size, fg, bg, motion="always" (ignore prefers-reduced-motion)
 */

import { DEFAULTS, artFromLines, resolveCharset } from './asciify.js';
import { decodeArt } from './embed.js';
import { imageToAscii } from './browser.js';
import { toText, toSVG, toHTML, rowRuns, escapeHTML } from './render.js';

const ANIMATIONS = ['none', 'typewriter', 'flicker', 'wave', 'scan'];

const STYLE = `
:host { display: inline-block; max-width: 100%; box-sizing: border-box;
  --ascii-fg: #e6edf3; --ascii-bg: #0d1117; --ascii-font-size: 10px; --ascii-line-height: 1;
  --ascii-font: ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace; }
:host([hidden]) { display: none; }
pre { margin: 0; padding: var(--ascii-padding, 1em); overflow: auto; max-width: 100%;
  background: var(--ascii-bg); color: var(--ascii-fg);
  font: var(--ascii-font-size)/var(--ascii-line-height) var(--ascii-font);
  white-space: pre; letter-spacing: 0; tab-size: 1; -webkit-font-smoothing: antialiased; }
.row { display: block; height: calc(var(--ascii-font-size) * var(--ascii-line-height)); }
`;

const numAttr = (el, name, fallback) => {
  const v = el.getAttribute(name);
  if (v === null || v === '') return fallback;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};
const boolAttr = (el, name) => {
  const v = el.getAttribute(name);
  return v !== null && v !== 'false' && v !== '0';
};

export class AsciiArtElement extends HTMLElement {
  static get observedAttributes() {
    return [
      'src', 'cols', 'charset', 'color', 'invert', 'brightness', 'contrast', 'gamma',
      'dither', 'aspect', 'animate', 'fps', 'speed', 'loop', 'font-size', 'fg', 'bg', 'motion',
    ];
  }

  /** Convert an image and return a ready element. */
  static async fromImage(source, opts = {}) {
    const el = document.createElement('ascii-art');
    const art = await imageToAscii(source, opts);
    el.setArt(art);
    return el;
  }

  #art = null;
  #pre;
  #raf = 0;
  #timer = 0;
  #frame = 0;
  #visible = true;
  #rows = [];
  #loadToken = 0;
  #observer = null;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    this.#pre = document.createElement('pre');
    this.#pre.setAttribute('role', 'img');
    this.#pre.setAttribute('aria-label', this.getAttribute('alt') || 'ASCII art');
    root.append(style, this.#pre);
  }

  connectedCallback() {
    this.#applyStyleAttrs();
    if (this.hasAttribute('src')) {
      this.#loadFromSrc();
    } else if (!this.#art) {
      // Light DOM children may still be parsing when a sync script upgrades us.
      if (document.readyState === 'loading' && !this.firstChild) {
        document.addEventListener('DOMContentLoaded', () => this.#loadFromChildren(), { once: true });
      } else {
        this.#loadFromChildren();
      }
    }
    if (typeof IntersectionObserver === 'function') {
      this.#observer = new IntersectionObserver(([entry]) => {
        this.#visible = entry.isIntersecting;
        this.#visible ? this.#startAnimation() : this.#stopAnimation();
      });
      this.#observer.observe(this);
    }
  }

  disconnectedCallback() {
    this.#stopAnimation();
    this.#observer?.disconnect();
    this.#observer = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) return;
    if (['font-size', 'fg', 'bg'].includes(name)) return this.#applyStyleAttrs();
    if (['animate', 'fps', 'speed', 'loop', 'motion'].includes(name)) {
      this.#frame = 0;
      this.#render();
      return this.#startAnimation();
    }
    if (this.hasAttribute('src')) this.#loadFromSrc();
  }

  /** The current Art object (see asciify.js). */
  get art() {
    return this.#art;
  }
  set art(value) {
    this.setArt(value);
  }

  setArt(art) {
    this.#art = art;
    this.#frame = 0;
    this.#render(true);
    this.#startAnimation();
    this.dispatchEvent(new CustomEvent('ascii-ready', { detail: { art }, bubbles: true }));
  }

  /** Conversion options read from attributes. */
  get options() {
    return {
      ...DEFAULTS,
      cols: numAttr(this, 'cols', DEFAULTS.cols),
      charset: this.getAttribute('charset') || DEFAULTS.charset,
      color: boolAttr(this, 'color'),
      invert: boolAttr(this, 'invert'),
      brightness: numAttr(this, 'brightness', 0),
      contrast: numAttr(this, 'contrast', 0),
      gamma: numAttr(this, 'gamma', 1),
      dither: boolAttr(this, 'dither'),
      aspect: numAttr(this, 'aspect', DEFAULTS.aspect),
    };
  }

  toText() {
    return this.#art ? toText(this.#art) : '';
  }
  toSVG(opts) {
    return this.#art ? toSVG(this.#art, { ...this.#renderOpts(), ...opts }) : '';
  }
  toHTML(opts) {
    return this.#art ? toHTML(this.#art, { ...this.#renderOpts(), ...opts }) : '';
  }

  #renderOpts() {
    const cs = getComputedStyle(this);
    return {
      fontSize: Number.parseFloat(cs.getPropertyValue('--ascii-font-size')) || 10,
      fg: cs.getPropertyValue('--ascii-fg').trim() || '#e6edf3',
      bg: cs.getPropertyValue('--ascii-bg').trim() || '#0d1117',
    };
  }

  #applyStyleAttrs() {
    const fs = this.getAttribute('font-size');
    if (fs) this.style.setProperty('--ascii-font-size', /^\d+(\.\d+)?$/.test(fs) ? `${fs}px` : fs);
    const fg = this.getAttribute('fg');
    if (fg) this.style.setProperty('--ascii-fg', fg);
    const bg = this.getAttribute('bg');
    if (bg) this.style.setProperty('--ascii-bg', bg);
    if (this.hasAttribute('alt')) this.#pre.setAttribute('aria-label', this.getAttribute('alt'));
  }

  async #loadFromSrc() {
    const token = ++this.#loadToken;
    const src = this.getAttribute('src');
    try {
      const art = await imageToAscii(src, this.options);
      if (token !== this.#loadToken) return; // superseded
      this.setArt(art);
    } catch (err) {
      this.#pre.textContent = '';
      this.dispatchEvent(new CustomEvent('ascii-error', { detail: { error: err }, bubbles: true }));
    }
  }

  #loadFromChildren() {
    const json = this.querySelector('script[type="application/json"]');
    try {
      if (json) {
        this.setArt(decodeArt(json.textContent));
        return;
      }
      const tpl = this.querySelector('template');
      let text = tpl ? tpl.content.textContent : this.textContent;
      text = text.replace(/^\s*\n/, '').replace(/\s+$/, '');
      if (!text) return;
      // Drop common leading indentation so authors can indent the markup.
      const lines = text.split('\n');
      const indent = Math.min(
        ...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length)
      );
      this.setArt(
        artFromLines(lines.map((l) => l.slice(indent)), {
          charset: this.getAttribute('charset') || 'standard',
        })
      );
    } catch (err) {
      this.dispatchEvent(new CustomEvent('ascii-error', { detail: { error: err }, bubbles: true }));
    }
  }

  // ---------- rendering & animation ----------

  get #animation() {
    const a = (this.getAttribute('animate') || 'none').toLowerCase();
    if (!ANIMATIONS.includes(a) || a === 'none') return 'none';
    const reduce =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return reduce && this.getAttribute('motion') !== 'always' ? 'none' : a;
  }

  #render(rebuild = false) {
    const art = this.#art;
    if (!art) return;
    if (rebuild || this.#rows.length !== art.rows) {
      this.#pre.textContent = '';
      this.#rows = art.lines.map(() => {
        const span = document.createElement('span');
        span.className = 'row';
        this.#pre.appendChild(span);
        return span;
      });
    }
    const frameLines = this.#frameLines(art, this.#animation, this.#frame);
    for (let y = 0; y < art.rows; y++) {
      const line = frameLines[y];
      const colors = art.colors ? art.colors[y] : null;
      if (!colors) {
        if (this.#rows[y].textContent !== line) this.#rows[y].textContent = line;
      } else {
        this.#rows[y].innerHTML = rowRuns(line, colors)
          .map((run) =>
            run.text.trim()
              ? `<span style="color:${run.color}">${escapeHTML(run.text)}</span>`
              : escapeHTML(run.text)
          )
          .join('');
      }
    }
  }

  /** Compute the characters for one animation frame. */
  #frameLines(art, kind, frame) {
    if (kind === 'none') return art.lines;
    const ramp = Array.from(resolveCharset(art.charset));
    const max = ramp.length - 1;
    const speed = numAttr(this, 'speed', 1);
    const total = art.cols * art.rows;

    if (kind === 'typewriter') {
      const perFrame = Math.max(1, Math.round((total / 120) * speed));
      let budget = frame * perFrame;
      const done = budget >= total;
      if (done && this.#loopWanted()) this.#frame = 0;
      return art.lines.map((line) => {
        if (budget <= 0) return ' '.repeat(art.cols);
        const chars = Array.from(line);
        if (budget >= chars.length) {
          budget -= chars.length;
          return line;
        }
        const out = chars.slice(0, budget).join('') + '▌' + ' '.repeat(Math.max(0, chars.length - budget - 1));
        budget = 0;
        return out;
      });
    }

    if (kind === 'flicker') {
      const rate = 0.04 * speed;
      return art.levels.map((row, y) => {
        const chars = Array.from(art.lines[y]);
        for (let x = 0; x < row.length; x++) {
          if (row[x] > 0 && Math.random() < rate) {
            const d = Math.random() < 0.5 ? -1 : 1;
            chars[x] = ramp[Math.min(max, Math.max(1, row[x] + d))];
          }
        }
        return chars.join('');
      });
    }

    if (kind === 'wave') {
      const t = frame * 0.15 * speed;
      return art.levels.map((row, y) =>
        row
          .map((lvl, x) => {
            if (lvl === 0) return ' ';
            const shift = Math.round(Math.sin(t + x * 0.12 + y * 0.25) * Math.max(1, max * 0.12));
            return ramp[Math.min(max, Math.max(1, lvl + shift))];
          })
          .join('')
      );
    }

    if (kind === 'scan') {
      const period = art.rows + 8;
      const pos = ((frame * 0.6 * speed) % period) - 4;
      return art.levels.map((row, y) => {
        const dist = Math.abs(y - pos);
        if (dist > 2) return art.lines[y];
        const boost = dist < 1 ? 3 : 1;
        return row.map((lvl) => (lvl === 0 ? ' ' : ramp[Math.min(max, lvl + boost)])).join('');
      });
    }
    return art.lines;
  }

  #loopWanted() {
    return this.hasAttribute('loop') && this.getAttribute('loop') !== 'false';
  }

  #startAnimation() {
    this.#stopAnimation();
    if (!this.#art || !this.#visible || this.#animation === 'none') return;
    const fps = Math.min(60, Math.max(1, numAttr(this, 'fps', 12)));
    const tick = () => {
      this.#frame++;
      this.#render();
      this.#timer = setTimeout(() => {
        this.#raf = requestAnimationFrame(tick);
      }, 1000 / fps);
    };
    this.#raf = requestAnimationFrame(tick);
  }

  #stopAnimation() {
    cancelAnimationFrame(this.#raf);
    clearTimeout(this.#timer);
    this.#raf = 0;
    this.#timer = 0;
  }
}

export function define(tag = 'ascii-art') {
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) {
    customElements.define(tag, AsciiArtElement);
  }
}
