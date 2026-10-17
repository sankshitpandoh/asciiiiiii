import {
  CHARSETS, DEFAULTS, imageToAscii, loadImage, toHTML, toSVG, toText, toCanvas, encodeArt,
} from '../src/index.js';

const CDN_SCRIPT = 'https://cdn.jsdelivr.net/gh/sankshitpandoh/asciiiii@main/dist/ascii-art.min.js';
const $ = (id) => document.getElementById(id);

const ui = {
  dropzone: $('dropzone'), file: $('file'), thumb: $('thumb'), url: $('url'), loadUrl: $('load-url'),
  cols: $('cols'), charset: $('charset'), customField: $('custom-field'), custom: $('custom'),
  color: $('color'), invert: $('invert'), dither: $('dither'),
  brightness: $('brightness'), contrast: $('contrast'), gamma: $('gamma'),
  fontSize: $('font-size'), animate: $('animate'), fps: $('fps'), fg: $('fg'), bg: $('bg'), reset: $('reset'),
  preview: $('preview'), empty: $('empty'), stats: $('stats'), export: $('export'),
  scriptSrc: $('script-src'),
};

const state = { source: null, sourceName: 'image', art: null };

// ───────────────────────── options ─────────────────────────
function readOptions() {
  const charset = ui.charset.value === 'custom' ? ui.custom.value || ' .oO@' : ui.charset.value;
  return {
    ...DEFAULTS,
    cols: Number(ui.cols.value),
    charset,
    color: ui.color.checked,
    invert: ui.invert.checked,
    dither: ui.dither.checked,
    brightness: Number(ui.brightness.value),
    contrast: Number(ui.contrast.value),
    gamma: Number(ui.gamma.value),
  };
}

function readLook() {
  return {
    fontSize: Number(ui.fontSize.value),
    animate: ui.animate.value,
    fps: Number(ui.fps.value),
    fg: ui.fg.value,
    bg: ui.bg.value,
  };
}

function syncOutputs() {
  $('cols-out').value = ui.cols.value;
  $('brightness-out').value = Number(ui.brightness.value).toFixed(2).replace(/\.?0+$/, '') || '0';
  $('contrast-out').value = Number(ui.contrast.value).toFixed(2).replace(/\.?0+$/, '') || '0';
  $('gamma-out').value = Number(ui.gamma.value).toFixed(2).replace(/\.?0+$/, '');
  $('font-size-out').value = ui.fontSize.value;
  $('fps-out').value = ui.fps.value;
  ui.customField.hidden = ui.charset.value !== 'custom';
}

// ───────────────────────── conversion ─────────────────────────
let pending = 0;
async function convert() {
  syncOutputs();
  applyLook();
  if (!state.source) return;
  const token = ++pending;
  try {
    const art = await imageToAscii(state.source, readOptions());
    if (token !== pending) return;
    state.art = art;
    ui.preview.setArt(art);
    ui.empty.hidden = true;
    ui.stats.hidden = false;
    ui.export.hidden = false;
    updateStats(art);
    updateExports();
  } catch (err) {
    toast(err.message || String(err), true);
  }
}

function applyLook() {
  const look = readLook();
  ui.preview.setAttribute('animate', look.animate);
  ui.preview.setAttribute('fps', String(look.fps));
  ui.preview.setAttribute('font-size', `${look.fontSize}px`);
  ui.preview.setAttribute('fg', look.fg);
  ui.preview.setAttribute('bg', look.bg);
  if (state.art) updateExports();
}

function updateStats(art) {
  $('stat-size').textContent = `${art.cols}×${art.rows}`;
  $('stat-chars').textContent = `${(art.cols * art.rows).toLocaleString()} chars`;
  const bytes = new Blob([embedJSON(art)]).size;
  $('stat-bytes').textContent = bytes > 1024 ? `${(bytes / 1024).toFixed(1)} kB` : `${bytes} B`;
}

// ───────────────────────── exports ─────────────────────────
function embedJSON(art) {
  // "<" is escaped so a stray "</script>" inside the art can't close the tag.
  return JSON.stringify(encodeArt(art)).replace(/</g, '\\u003c');
}

function scriptURL() {
  if (ui.scriptSrc.value === 'site') return new URL('dist/ascii-art.min.js', document.baseURI).href;
  return CDN_SCRIPT;
}

function lookAttrs(look, { includeAnimation = true } = {}) {
  const attrs = [`font-size="${look.fontSize}px"`, `fg="${look.fg}"`, `bg="${look.bg}"`];
  if (includeAnimation && look.animate !== 'none') {
    attrs.push(`animate="${look.animate}"`, `fps="${look.fps}"`);
  }
  return attrs.join(' ');
}

function optionAttrs(opts) {
  const attrs = [`cols="${opts.cols}"`];
  if (opts.charset !== 'standard') attrs.push(`charset="${opts.charset.replace(/"/g, '&quot;')}"`);
  if (opts.color) attrs.push('color');
  if (opts.invert) attrs.push('invert');
  if (opts.dither) attrs.push('dither');
  if (opts.brightness) attrs.push(`brightness="${opts.brightness}"`);
  if (opts.contrast) attrs.push(`contrast="${opts.contrast}"`);
  if (opts.gamma !== 1) attrs.push(`gamma="${opts.gamma}"`);
  return attrs.join(' ');
}

function updateExports() {
  const art = state.art;
  if (!art) return;
  const look = readLook();
  const opts = readOptions();
  const script = `<script type="module" src="${scriptURL()}"></script>`;

  $('code-embed').value =
    `${script}\n<ascii-art ${lookAttrs(look)} alt="ASCII art">\n` +
    `  <script type="application/json">${embedJSON(art)}</script>\n</ascii-art>`;

  $('code-html').value = toHTML(art, { fontSize: look.fontSize, fg: look.fg, bg: look.bg });

  $('code-url').value =
    `${script}\n<ascii-art src="https://example.com/your-image.jpg" ${optionAttrs(opts)} ${lookAttrs(look)}></ascii-art>`;

  $('code-svg').value = toSVG(art, { fontSize: look.fontSize, fg: look.fg, bg: look.bg });
  $('code-text').value = toText(art);
}

// ───────────────────────── sources ─────────────────────────
async function setSource(source, name = 'image') {
  try {
    const img = await loadImage(source);
    state.source = img;
    state.sourceName = name.replace(/\.[^.]+$/, '') || 'image';
    showThumb(img);
    await convert();
  } catch (err) {
    toast(err.message || 'Could not load that image', true);
  }
}

function showThumb(img) {
  const c = document.createElement('canvas');
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const scale = Math.min(1, 320 / Math.max(w, h));
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  ui.thumb.src = c.toDataURL('image/png');
  ui.thumb.hidden = false;
  ui.dropzone.classList.add('has-image');
}

ui.dropzone.addEventListener('click', () => ui.file.click());
ui.dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    ui.file.click();
  }
});
ui.file.addEventListener('change', () => {
  const f = ui.file.files?.[0];
  if (f) setSource(f, f.name);
  ui.file.value = '';
});
for (const evt of ['dragenter', 'dragover']) {
  ui.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    ui.dropzone.classList.add('is-over');
  });
}
for (const evt of ['dragleave', 'drop']) {
  ui.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    ui.dropzone.classList.remove('is-over');
  });
}
ui.dropzone.addEventListener('drop', (e) => {
  const f = [...(e.dataTransfer?.files || [])].find((x) => x.type.startsWith('image/'));
  if (f) setSource(f, f.name);
  else {
    const url = e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain');
    if (url) setSource(url.trim(), 'image');
  }
});
document.addEventListener('paste', (e) => {
  if (e.target.closest?.('input, textarea')) return;
  const item = [...(e.clipboardData?.items || [])].find((x) => x.type.startsWith('image/'));
  if (item) setSource(item.getAsFile(), 'pasted');
});
ui.loadUrl.addEventListener('click', () => ui.url.value && setSource(ui.url.value.trim(), 'image'));
ui.url.addEventListener('keydown', (e) => e.key === 'Enter' && ui.loadUrl.click());

// ───────────────────────── samples (drawn procedurally, no assets) ─────────────────────────
const samples = {
  portrait(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1b2a4a');
    g.addColorStop(1, '#070a12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // head
    const face = ctx.createRadialGradient(w * 0.42, h * 0.4, 10, w * 0.5, h * 0.45, w * 0.32);
    face.addColorStop(0, '#f6d7b0');
    face.addColorStop(1, '#a86f45');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.45, w * 0.22, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    // hair
    ctx.fillStyle = '#2b1a12';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.27, w * 0.25, h * 0.17, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // eyes
    ctx.fillStyle = '#1a1a1a';
    for (const x of [0.42, 0.58]) {
      ctx.beginPath();
      ctx.ellipse(w * x, h * 0.43, w * 0.025, h * 0.02, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // mouth
    ctx.strokeStyle = '#7a3b2e';
    ctx.lineWidth = w * 0.012;
    ctx.beginPath();
    ctx.arc(w * 0.5, h * 0.55, w * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    // shoulders
    ctx.fillStyle = '#3a5a8a';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 1.05, w * 0.45, h * 0.35, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  },
  planet(ctx, w, h) {
    ctx.fillStyle = '#02030a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.9})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    const r = Math.min(w, h) * 0.26;
    const cx = w * 0.5;
    const cy = h * 0.5;
    ctx.strokeStyle = 'rgba(220,200,160,0.7)';
    ctx.lineWidth = r * 0.22;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.9, r * 0.45, -0.35, Math.PI * 0.95, Math.PI * 2.05);
    ctx.stroke();
    const g = ctx.createRadialGradient(cx - r * 0.5, cy - r * 0.5, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#ffd27a');
    g.addColorStop(0.6, '#c97b3a');
    g.addColorStop(1, '#2a1208');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,200,160,0.9)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.9, r * 0.45, -0.35, -0.05 * Math.PI, Math.PI * 0.95);
    ctx.stroke();
  },
  waves(ctx, w, h) {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const v =
          Math.sin(x / 28 + Math.sin(y / 40) * 2) * 0.5 + Math.cos(y / 22 + x / 90) * 0.5;
        const t = (v + 1) / 2;
        const i = (y * w + x) * 4;
        img.data[i] = 20 + t * 60;
        img.data[i + 1] = 60 + t * 160;
        img.data[i + 2] = 120 + t * 135;
        img.data[i + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  },
  logo(ctx, w, h) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(h * 0.42)}px ${getComputedStyle(document.body).fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ASCII', w / 2, h / 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = h * 0.03;
    ctx.strokeRect(w * 0.08, h * 0.15, w * 0.84, h * 0.7);
  },
};

for (const btn of document.querySelectorAll('[data-sample]')) {
  btn.addEventListener('click', () => {
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 480;
    samples[btn.dataset.sample](c.getContext('2d'), c.width, c.height);
    if (btn.dataset.sample === 'planet' || btn.dataset.sample === 'waves') ui.color.checked = true;
    setSource(c, btn.dataset.sample);
  });
}

// ───────────────────────── controls ─────────────────────────
let debounce = 0;
const schedule = () => {
  clearTimeout(debounce);
  debounce = setTimeout(convert, 40);
};
for (const el of [ui.cols, ui.charset, ui.custom, ui.color, ui.invert, ui.dither, ui.brightness, ui.contrast, ui.gamma]) {
  el.addEventListener('input', schedule);
  el.addEventListener('change', schedule);
}
for (const el of [ui.fontSize, ui.animate, ui.fps, ui.fg, ui.bg]) {
  el.addEventListener('input', () => {
    syncOutputs();
    applyLook();
  });
}
ui.scriptSrc.addEventListener('change', updateExports);
ui.reset.addEventListener('click', () => {
  ui.cols.value = 80; ui.charset.value = 'standard'; ui.custom.value = ' .oO@';
  ui.color.checked = false; ui.invert.checked = false; ui.dither.checked = false;
  ui.brightness.value = 0; ui.contrast.value = 0; ui.gamma.value = 1;
  ui.fontSize.value = 10; ui.animate.value = 'none'; ui.fps.value = 12;
  ui.fg.value = '#e6edf3'; ui.bg.value = '#0d1117';
  convert();
});
ui.invert.addEventListener('change', () => {
  // Swap the palette so a light-background rendition reads correctly in the preview.
  if (ui.invert.checked && ui.bg.value === '#0d1117') {
    ui.bg.value = '#ffffff';
    ui.fg.value = '#111111';
  } else if (!ui.invert.checked && ui.bg.value === '#ffffff') {
    ui.bg.value = '#0d1117';
    ui.fg.value = '#e6edf3';
  }
  applyLook();
});

// tabs
for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('is-active', t === tab));
    document.querySelectorAll('.tabpanel').forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab));
  });
}

// copy & download
for (const btn of document.querySelectorAll('[data-copy]')) {
  btn.addEventListener('click', async () => {
    const text = $(btn.dataset.copy).value;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = $(btn.dataset.copy);
      ta.select();
      document.execCommand('copy');
    }
    const label = btn.textContent;
    btn.textContent = 'Copied ✓';
    btn.classList.add('is-done');
    setTimeout(() => {
      btn.textContent = label;
      btn.classList.remove('is-done');
    }, 1400);
  });
}

function download(name, blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$('dl-svg').addEventListener('click', () =>
  download(`${state.sourceName}.ascii.svg`, new Blob([$('code-svg').value], { type: 'image/svg+xml' }))
);
$('dl-txt').addEventListener('click', () =>
  download(`${state.sourceName}.ascii.txt`, new Blob([$('code-text').value], { type: 'text/plain' }))
);
$('dl-png').addEventListener('click', () => {
  if (!state.art) return;
  const look = readLook();
  const canvas = toCanvas(state.art, { fontSize: look.fontSize, fg: look.fg, bg: look.bg, scale: 2 });
  canvas.toBlob((blob) => blob && download(`${state.sourceName}.ascii.png`, blob), 'image/png');
});

// toast
let toastTimer = 0;
function toast(msg, isError = false) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.toggle('is-error', isError);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3500);
}

// Populate custom ramp placeholder from built-ins for discoverability.
ui.custom.placeholder = CHARSETS.standard;
syncOutputs();
applyLook();
// Start with a sample so the page never looks empty.
document.querySelector('[data-sample="portrait"]').click();
