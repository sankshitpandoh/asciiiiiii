# asciiiii

Turn any photo into ASCII art and drop it into any website with a single tag.

[ascii.rest](https://ascii.rest) lets you embed a catalogue of animated ASCII pieces.
**asciiiii** does the same thing for *your own pictures*: upload a photo, tune it, copy a
snippet. Everything runs in the browser, nothing is uploaded anywhere.

**Live demo:** https://sankshitpandoh.github.io/asciiiii/

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/sankshitpandoh/asciiiii@main/dist/ascii-art.min.js"></script>

<!-- convert an image on the fly -->
<ascii-art src="/me.jpg" cols="90" color animate="flicker"></ascii-art>
```

## Features

- **Upload anything** — drag & drop, file picker, clipboard paste, or an image URL.
- **Tune it live** — width, 8 character ramps plus custom ramps, colour, invert for light
  backgrounds, brightness / contrast / gamma, Floyd–Steinberg dithering.
- **Animate it** — flicker (shimmer), wave, scanline, typewriter. Pauses off-screen and
  respects `prefers-reduced-motion`.
- **Export it** — a self-contained `<ascii-art>` embed, a zero-JS `<pre>`, SVG, PNG, or
  plain text.
- **Tiny** — the whole web component is ~15 kB minified, no dependencies.

## The `<ascii-art>` element

Three ways to feed it:

```html
<!-- 1. From an image URL: converts in the visitor's browser (host must allow CORS) -->
<ascii-art src="https://example.com/photo.jpg" cols="80" charset="detailed" color></ascii-art>

<!-- 2. Prebuilt art from the demo's "Embed" tab: pixel-identical everywhere, no image request -->
<ascii-art animate="wave" fps="12">
  <script type="application/json">{"v":1,"charset":" .:-=+*#%@","lines":[...]}</script>
</ascii-art>

<!-- 3. Plain text -->
<ascii-art animate="typewriter" loop>
  (\_/)
  (o.o)
</ascii-art>
```

### Attributes

| Attribute | Default | Meaning |
| --- | --- | --- |
| `src` | – | Image URL to convert client-side |
| `cols` | `80` | Characters per row |
| `charset` | `standard` | `standard`, `detailed`, `blocks`, `minimal`, `binary`, `dots`, `slashes`, `letters`, or a custom ramp string (light → dark) |
| `color` | off | Keep per-cell colour |
| `invert` | off | For light backgrounds (dark pixels → dense glyphs) |
| `brightness`, `contrast` | `0` | −1 … 1 |
| `gamma` | `1` | >0 |
| `dither` | off | Error-diffusion dithering |
| `aspect` | `0.5` | Character cell width/height ratio |
| `animate` | `none` | `flicker`, `wave`, `scan`, `typewriter` |
| `fps` | `12` | Animation frame rate |
| `speed` | `1` | Animation speed multiplier |
| `loop` | off | Restart `typewriter` when finished |
| `motion="always"` | – | Animate even under `prefers-reduced-motion` |
| `font-size`, `fg`, `bg` | – | Shortcuts for the CSS variables below |
| `alt` | `ASCII art` | Accessible label |

### Styling

```css
ascii-art {
  --ascii-font-size: 8px;
  --ascii-line-height: 1;
  --ascii-fg: #7ee787;
  --ascii-bg: transparent;
  --ascii-padding: 0;
  --ascii-font: "JetBrains Mono", monospace;
}
```

### JavaScript API

```js
import { imageToAscii, toHTML, toSVG, toText, encodeArt, AsciiArtElement } from 'asciiiii';

const art = await imageToAscii(fileOrUrlOrCanvas, { cols: 100, color: true });
art.lines;            // string[]  one row per entry
art.colors;           // string[][] hex per cell (when color: true)
document.body.append(await AsciiArtElement.fromImage('/photo.jpg', { cols: 60 }));

// Pure, DOM-free core (Node/workers): hand it an RGBA grid at the target size.
import { asciify, computeGrid } from 'asciiiii/core';
```

Events: `ascii-ready` (`detail.art`) and `ascii-error` (`detail.error`).

## Development

```bash
npm install
npm run dev      # static server on http://localhost:5173
npm test         # node:test unit tests for the core + renderers
npm run build    # bundles src/ → dist/ascii-art.min.js (ESM) and dist/ascii-art.iife.js
```

`dist/` is committed so the jsDelivr embed URL works straight from the repo; CI fails if it
is out of date, so run `npm run build` before committing changes to `src/`.

The demo (`index.html`, `demo/`) is plain HTML/CSS/JS with no framework and is deployed to
GitHub Pages by `.github/workflows/pages.yml`.

## Project layout

```
src/asciify.js     pure conversion core (tone curve, ramps, dithering, colour)
src/render.js      Art → text / HTML / SVG / canvas
src/embed.js       compact JSON format for baked-in embeds
src/browser.js     image loading + canvas sampling
src/ascii-art.js   the <ascii-art> web component (+ animations)
src/index.js       entry point, auto-registers the element
demo/              the upload-and-tune web app
test/              unit tests (node --test)
```

## License

MIT
