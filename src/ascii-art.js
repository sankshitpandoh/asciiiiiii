/**
 * <ascii-art> — a web component that shows and animates ASCII art.
 *
 * Sources (pick one):
 *   <ascii-art piece="donut"></ascii-art>                       — a built-in animated piece
 *   <ascii-art src="photo.jpg" cols="80" color></ascii-art>     — convert a still image in the browser
 *   <ascii-art src="clip.mp4" cols="80" fps="12"></ascii-art>   — convert a video (or .gif) frame by frame
 *   <ascii-art><script type="application/json">{…}</script></ascii-art> — prebuilt art or baked frames (embed.js)
 *   <ascii-art>  plain text art  </ascii-art>
 *
 * Attributes: piece, options (JSON), src, cols, rows, charset, color, mono, invert, brightness,
 *             contrast, gamma, dither, aspect, animate (none|typewriter|flicker|wave|scan),
 *             fps, speed, loop, font-size, fg, bg, alt, motion="always"
 */

import { DEFAULTS, artFromLines, resolveCharset, asciify, computeGrid } from './asciify.js';
import { decodeEmbed } from './embed.js';
import { imageToAscii, loadImage, sampleImage } from './browser.js';
import { openMedia, guessMediaKind } from './media.js';
import { toText, toSVG, toHTML, rowRuns, escapeHTML } from './render.js';
import { getPiece } from './registry.js';
import { createRunner } from './pieces/kit.js';

const EFFECTS = ['none', 'typewriter', 'flicker', 'wave', 'scan'];

const STYLE = `
:host { display: inline-block; max-width: 100%; box-sizing: border-box;
  --ascii-fg: #e6edf3; --ascii-bg: #0d1117; --ascii-font-size: 10px; --ascii-line-height: 1;
  --ascii-font: ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", "DejaVu Sans Mono", monospace; }
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
      'piece', 'options', 'src', 'cols', 'rows', 'charset', 'color', 'mono', 'invert', 'brightness',
      'contrast', 'gamma', 'dither', 'aspect', 'animate', 'fps', 'speed', 'loop', 'font-size', 'fg', 'bg',
      'motion', 'alt',
    ];
  }

  /** Convert an image and return a ready element. */
  static async fromImage(source, opts = {}) {
    const el = document.createElement('ascii-art');
    el.setArt(await imageToAscii(source, opts));
    return el;
  }

  #art = null;
  #pre;
  #rows = [];
  #visible = true;
  #observer = null;
  #loadToken = 0;
  // animation
  #timer = 0;
  #raf = 0;
  #frame = 0;
  #mode = 'still'; // still | piece | media | frames
  #runner = null;
  #media = null;
  #frames = null;
  #frameIndex = 0;
  #busy = false;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    this.#pre = document.createElement('pre');
    this.#pre.setAttribute('role', 'img');
    root.append(style, this.#pre);
  }

  connectedCallback() {
    this.#applyStyleAttrs();
    if (this.hasAttribute('piece')) this.#loadPiece();
    else if (this.hasAttribute('src')) this.#loadFromSrc();
    else if (!this.#art && this.#mode === 'still') {
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
        this.#visible ? this.#start() : this.#stop();
      });
      this.#observer.observe(this);
    }
    this.#start();
  }

  disconnectedCallback() {
    this.#stop();
    this.#observer?.disconnect();
    this.#observer = null;
    this.#media?.destroy();
    this.#media = null;
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) return;
    if (['font-size', 'fg', 'bg', 'alt'].includes(name)) return this.#applyStyleAttrs();
    if (['animate', 'fps', 'speed', 'loop', 'motion'].includes(name)) {
      this.#frame = 0;
      this.#render();
      return this.#start();
    }
    if (name === 'mono' && this.#mode !== 'media') {
      return this.#render(true);
    }
    if (this.hasAttribute('piece')) return this.#loadPiece();
    if (this.hasAttribute('src')) return this.#loadFromSrc();
  }

  // ---------- public API ----------

  /** The current Art object (see asciify.js). */
  get art() {
    return this.#art;
  }
  set art(value) {
    this.setArt(value);
  }

  /** 'still' | 'piece' | 'media' | 'frames' */
  get mode() {
    return this.#mode;
  }

  /** Show a single Art frame. */
  setArt(art) {
    this.#teardownSource();
    this.#mode = 'still';
    this.#art = art;
    this.#frame = 0;
    this.#render(true);
    this.#start();
    this.#emitReady();
  }

  /** Play a baked sequence of Art frames. */
  setFrames(frames, fps) {
    if (!frames?.length) throw new Error('setFrames: empty');
    this.#teardownSource();
    this.#mode = 'frames';
    this.#frames = frames;
    if (fps && !this.hasAttribute('fps')) this.dataset.fps = String(fps);
    this.#frameIndex = 0;
    this.#art = frames[0];
    this.#render(true);
    this.#start();
    this.#emitReady();
  }

  /** Play a built-in or registered piece by name or definition. */
  setPiece(pieceOrName, { options } = {}) {
    const piece = typeof pieceOrName === 'string' ? getPiece(pieceOrName) : pieceOrName;
    if (!piece) throw new Error(`Unknown piece: ${pieceOrName}`);
    this.#teardownSource();
    this.#mode = 'piece';
    const attrOpts = this.#jsonAttr('options');
    this.#runner = createRunner(piece, {
      cols: numAttr(this, 'cols', 0) || undefined,
      rows: numAttr(this, 'rows', 0) || undefined,
      options: { ...attrOpts, ...options },
    });
    this.#tickPiece();
    this.#render(true);
    this.#start();
    this.#emitReady();
  }

  /** Convert a video / GIF (File, Blob, URL or <video>) frame by frame. */
  async setMedia(source) {
    const token = ++this.#loadToken;
    const media = await openMedia(source);
    if (token !== this.#loadToken) return media?.destroy();
    if (!media) return this.setArt(await imageToAscii(source, this.options));
    this.#teardownSource();
    this.#mode = 'media';
    this.#media = media;
    await this.#tickMedia();
    this.#render(true);
    this.#start();
    this.#emitReady();
  }

  /**
   * Capture the current media (video/GIF) or piece as a fixed list of frames,
   * ready for encodeAnimation(). Pauses playback while capturing.
   */
  async bake({ fps = this.fps, maxFrames = 48, maxSeconds = 6 } = {}) {
    const opts = this.options;
    if (this.#mode === 'piece' && this.#runner) {
      const runner = createRunner(this.#runner.piece, {
        cols: this.#runner.ctx.cols, rows: this.#runner.ctx.rows, options: this.#runner.ctx.opts,
      });
      const frames = [];
      for (let i = 0; i < maxFrames; i++) frames.push(this.#pieceArt(runner.tick(1 / fps)));
      return { frames, fps };
    }
    if (this.#mode === 'frames') return { frames: this.#frames, fps: this.fps };
    if (this.#mode !== 'media' || !this.#media) return { frames: [this.#art].filter(Boolean), fps };
    const m = this.#media;
    const wasPlaying = this.#timer || this.#raf;
    this.#stop();
    m.pause();
    const frames = [];
    const { cols, rows } = computeGrid(m.width, m.height, opts);
    if (m.kind === 'video') {
      const video = m.element;
      const duration = Number.isFinite(video.duration) ? video.duration : maxSeconds;
      const seconds = Math.min(maxSeconds, duration);
      const n = Math.min(maxFrames, Math.max(1, Math.floor(seconds * fps)));
      const seekable = video.seekable?.length > 0 && video.seekable.end(video.seekable.length - 1) >= Math.min(seconds, duration) - 0.05;
      if (seekable) {
        const resume = video.currentTime;
        for (let i = 0; i < n; i++) {
          await m.seek(i / fps);
          frames.push(asciify(sampleImage(video, cols, rows, opts), opts));
        }
        await m.seek(resume);
      } else {
        // Streams without an index (e.g. MediaRecorder output) can't seek: play through and
        // grab frames in real time instead.
        video.currentTime = 0;
        await video.play().catch(() => {});
        const t0 = performance.now();
        for (let i = 0; i < n && !video.ended; i++) {
          const due = t0 + (i * 1000) / fps;
          const wait = due - performance.now();
          if (wait > 0) await new Promise((r) => setTimeout(r, wait));
          frames.push(asciify(sampleImage(video, cols, rows, opts), opts));
        }
        video.pause();
      }
    } else {
      // GIF: walk the decoder's own frames.
      const n = Math.min(maxFrames, m.frameCount || maxFrames);
      m.play();
      for (let i = 0; i < n; i++) {
        const f = await m.next();
        if (!f) break;
        frames.push(asciify(sampleImage(f.image, cols, rows, opts), opts));
      }
      m.pause();
    }
    if (wasPlaying) {
      m.play();
      this.#start();
    }
    return { frames, fps };
  }

  /** Conversion options read from attributes. */
  get options() {
    return {
      ...DEFAULTS,
      cols: numAttr(this, 'cols', DEFAULTS.cols),
      charset: this.getAttribute('charset') || DEFAULTS.charset,
      color: boolAttr(this, 'color') && !boolAttr(this, 'mono'),
      invert: boolAttr(this, 'invert'),
      brightness: numAttr(this, 'brightness', 0),
      contrast: numAttr(this, 'contrast', 0),
      gamma: numAttr(this, 'gamma', 1),
      dither: boolAttr(this, 'dither'),
      aspect: numAttr(this, 'aspect', DEFAULTS.aspect),
      maxRows: numAttr(this, 'rows', 0),
    };
  }

  /** Effective frame rate. */
  get fps() {
    const attr = numAttr(this, 'fps', 0);
    if (attr) return Math.min(60, Math.max(1, attr));
    if (this.#mode === 'piece' && this.#runner) return this.#runner.piece.fps || 12;
    if (this.#mode === 'frames' && this.dataset.fps) return Number(this.dataset.fps) || 12;
    return 12;
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

  // ---------- loading ----------

  #jsonAttr(name) {
    const raw = this.getAttribute(name);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  #emitReady() {
    this.dispatchEvent(new CustomEvent('ascii-ready', { detail: { art: this.#art, mode: this.#mode }, bubbles: true }));
  }
  #emitError(error) {
    this.#pre.textContent = '';
    this.dispatchEvent(new CustomEvent('ascii-error', { detail: { error }, bubbles: true }));
  }

  #teardownSource() {
    this.#stop();
    this.#media?.destroy();
    this.#media = null;
    this.#runner = null;
    this.#frames = null;
    delete this.dataset.fps;
  }

  #loadPiece() {
    try {
      this.setPiece(this.getAttribute('piece'));
    } catch (err) {
      this.#emitError(err);
    }
  }

  async #loadFromSrc() {
    const token = ++this.#loadToken;
    const src = this.getAttribute('src');
    try {
      if (guessMediaKind(src) !== 'image') {
        const media = await openMedia(src);
        if (token !== this.#loadToken) return media?.destroy();
        this.#teardownSource();
        this.#mode = 'media';
        this.#media = media;
        await this.#tickMedia();
        this.#render(true);
        this.#start();
        this.#emitReady();
        return;
      }
      const art = await imageToAscii(src, this.options);
      if (token !== this.#loadToken) return;
      this.setArt(art);
    } catch (err) {
      this.#emitError(err);
    }
  }

  #loadFromChildren() {
    const json = this.querySelector('script[type="application/json"]');
    try {
      if (json) {
        const decoded = decodeEmbed(json.textContent);
        if (decoded.frames) this.setFrames(decoded.frames, decoded.fps);
        else this.setArt(decoded.art);
        return;
      }
      const tpl = this.querySelector('template');
      let text = tpl ? tpl.content.textContent : this.textContent;
      text = text.replace(/^\s*\n/, '').replace(/\s+$/, '');
      if (!text) return;
      const lines = text.split('\n');
      const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^ */)[0].length));
      this.setArt(artFromLines(lines.map((l) => l.slice(indent)), { charset: this.getAttribute('charset') || 'standard' }));
    } catch (err) {
      this.#emitError(err);
    }
  }

  // ---------- per-mode ticks ----------

  #pieceArt(frame) {
    const mono = boolAttr(this, 'mono');
    return { ...frame, colors: mono ? null : frame.colors, levels: null, charset: resolveCharset('standard').join('') };
  }

  #tickPiece() {
    if (!this.#runner) return;
    this.#art = this.#pieceArt(this.#runner.tick(1 / this.fps));
  }

  async #tickMedia() {
    if (!this.#media || this.#busy) return;
    this.#busy = true;
    try {
      const f = await this.#media.next();
      if (!f || !this.#media) return;
      const opts = this.options;
      const { cols, rows } = computeGrid(this.#media.width, this.#media.height, opts);
      this.#art = asciify(sampleImage(f.image, cols, rows, opts), opts);
      return f.duration;
    } finally {
      this.#busy = false;
    }
  }

  #tickFrames() {
    if (!this.#frames) return;
    this.#frameIndex = (this.#frameIndex + 1) % this.#frames.length;
    this.#art = this.#frames[this.#frameIndex];
  }

  // ---------- rendering ----------

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
    this.#pre.setAttribute('aria-label', this.getAttribute('alt') || this.getAttribute('piece') || 'ASCII art');
  }

  get #effect() {
    if (this.#mode !== 'still') return 'none';
    const a = (this.getAttribute('animate') || 'none').toLowerCase();
    if (!EFFECTS.includes(a) || a === 'none') return 'none';
    return this.#motionAllowed() ? a : 'none';
  }

  #motionAllowed() {
    const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return !reduce || this.getAttribute('motion') === 'always';
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
    const mono = boolAttr(this, 'mono');
    const frameLines = this.#frameLines(art, this.#effect, this.#frame);
    for (let y = 0; y < art.rows; y++) {
      const line = frameLines[y];
      const colors = !mono && art.colors ? art.colors[y] : null;
      if (!colors) {
        if (this.#rows[y].textContent !== line) this.#rows[y].textContent = line;
      } else {
        this.#rows[y].innerHTML = rowRuns(line, colors)
          .map((run) => (run.text.trim() ? `<span style="color:${run.color}">${escapeHTML(run.text)}</span>` : escapeHTML(run.text)))
          .join('');
      }
    }
  }

  /** Characters for one effect-animation frame (still images only). */
  #frameLines(art, kind, frame) {
    if (kind === 'none' || !art.levels) return art.lines;
    const ramp = resolveCharset(art.charset);
    const max = ramp.length - 1;
    const speed = numAttr(this, 'speed', 1);
    const total = art.cols * art.rows;

    if (kind === 'typewriter') {
      const perFrame = Math.max(1, Math.round((total / 120) * speed));
      let budget = frame * perFrame;
      if (budget >= total && this.#loopWanted()) this.#frame = 0;
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
        row.map((lvl, x) => {
          if (lvl === 0) return ' ';
          const shift = Math.round(Math.sin(t + x * 0.12 + y * 0.25) * Math.max(1, max * 0.12));
          return ramp[Math.min(max, Math.max(1, lvl + shift))];
        }).join('')
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

  // ---------- the loop ----------

  #start() {
    this.#stop();
    if (!this.#visible || !this.isConnected) return;
    const animated = this.#mode !== 'still' || this.#effect !== 'none';
    if (!animated) return;
    if (this.#mode !== 'still' && !this.#motionAllowed()) return; // first frame only
    if (this.#mode === 'media') this.#media?.play();
    const tick = async () => {
      let wait = 1000 / this.fps;
      this.#frame++;
      if (this.#mode === 'piece') this.#tickPiece();
      else if (this.#mode === 'frames') this.#tickFrames();
      else if (this.#mode === 'media') {
        const d = await this.#tickMedia();
        if (this.#media?.kind === 'gif' && !this.hasAttribute('fps') && d) wait = d;
      }
      this.#render();
      this.#timer = setTimeout(() => {
        this.#raf = requestAnimationFrame(tick);
      }, wait);
    };
    this.#raf = requestAnimationFrame(tick);
  }

  #stop() {
    cancelAnimationFrame(this.#raf);
    clearTimeout(this.#timer);
    this.#raf = 0;
    this.#timer = 0;
    if (this.#mode === 'media') this.#media?.pause();
  }
}

export function define(tag = 'ascii-art') {
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) {
    customElements.define(tag, AsciiArtElement);
  }
}
