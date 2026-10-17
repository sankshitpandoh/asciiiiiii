# asciiiii

Turn any photo, GIF or video into ASCII art and drop it into any website with one tag.
Plus 129 built-in animated pieces, ascii.rest style.

[ascii.rest](https://ascii.rest) gives you a catalogue of animated ASCII pieces to embed.
**asciiiii** does that *and* works on your own media: upload a picture or a clip, tune it,
copy a snippet. Everything runs in the browser, nothing is uploaded anywhere.

**Live demo:** https://sankshitpandoh.github.io/asciiiii/

```html
<script type="module" src="https://cdn.jsdelivr.net/gh/sankshitpandoh/asciiiii@main/dist/ascii-art.min.js"></script>

<ascii-art piece="donut"></ascii-art>                               <!-- a built-in piece -->
<ascii-art src="/me.jpg" cols="90" color animate="flicker"></ascii-art>   <!-- your photo -->
<ascii-art src="/clip.mp4" cols="90" color fps="12"></ascii-art>          <!-- your video -->
```

Works in plain HTML, React, Vue, Svelte, Astro… it is a standard custom element.

## Features

- **Any media** — drag & drop, file picker, clipboard paste or URL. Photos, animated GIFs
  and videos (converted frame by frame, live).
- **Tune it** — width, 8 character ramps plus custom ramps, colour, invert for light
  backgrounds, brightness / contrast / gamma, Floyd–Steinberg dithering.
- **129 built-in pieces** across 11 categories: shapes (donut, cube, tesseract…), space
  (black hole, galaxy…), physics (double pendulum, Lorenz…), generative (Mandelbrot, maze,
  Game of Life…), effects (doom fire, matrix rain…), UI (spinners, terminal, progress…),
  data (charts, radar, heartbeat…), type (glitch, split-flap…), nature (aurora, rain,
  fractal tree…), objects (clock, lighthouse, train…) and creatures (snake, jellyfish, cat…).
- **Animate stills** — flicker, wave, scanline, typewriter effects for photos.
- **Export** — a self-contained `<ascii-art>` embed (stills *or* baked animation frames),
  a zero-JS `<pre>`, SVG, PNG or plain text.
- **Light** — ~30 kB core bundle, ~100 kB with every piece. No dependencies. Animations
  pause off-screen and respect `prefers-reduced-motion`.

## The `<ascii-art>` element

```html
<!-- 1. Built-in piece (see the gallery for all 129) -->
<ascii-art piece="matrix-rain" fps="15"></ascii-art>
<ascii-art piece="typewriter" options='{"text":"hello there"}'></ascii-art>
<ascii-art piece="planet" mono></ascii-art>                     <!-- colour piece in one ink -->

<!-- 2. Image, GIF or video URL: converts live in the visitor's browser (host must allow CORS) -->
<ascii-art src="https://example.com/photo.jpg" cols="80" charset="detailed" color></ascii-art>
<ascii-art src="https://example.com/loop.gif" cols="60" color></ascii-art>
<ascii-art src="https://example.com/clip.webm" cols="80" fps="10"></ascii-art>

<!-- 3. Prebuilt art from the demo's "Embed" tab: identical everywhere, no media request.
        For GIF/video the demo bakes N frames into the JSON. -->
<ascii-art animate="wave">
  <script type="application/json">{"v":1,"charset":" .:-=+*#%@","lines":[...]}</script>
</ascii-art>

<!-- 4. Plain text -->
<ascii-art animate="typewriter" loop>
  (\_/)
  (o.o)
</ascii-art>
```

### Attributes

| Attribute | Default | Meaning |
| --- | --- | --- |
| `piece` | – | Name of a built-in or registered piece |
| `options` | – | JSON overrides for the piece's options, e.g. `'{"text":"hi"}'` |
| `src` | – | Image / GIF / video URL to convert client-side |
| `cols` | `80` (or the piece's) | Characters per row |
| `rows` | – | Max rows (pieces: exact rows) |
| `charset` | `standard` | `standard`, `detailed`, `blocks`, `minimal`, `binary`, `dots`, `slashes`, `letters`, or a custom ramp (light → dark) |
| `color` | off | Keep per-cell colour when converting media |
| `mono` | off | Draw a colour piece / embed in the text colour only |
| `invert` | off | For light backgrounds (dark pixels → dense glyphs) |
| `brightness`, `contrast` | `0` | −1 … 1 |
| `gamma` | `1` | >0 |
| `dither` | off | Error-diffusion dithering |
| `aspect` | `0.5` | Character cell width/height ratio |
| `animate` | `none` | Still-image effects: `flicker`, `wave`, `scan`, `typewriter` |
| `fps` | piece default / `12` | Frame rate for pieces, video, GIF (GIF uses its own timing unless set) and baked frames |
| `speed` | `1` | Effect speed multiplier |
| `loop` | off | Restart `typewriter` when finished |
| `motion="always"` | – | Animate even under `prefers-reduced-motion` (otherwise the first frame is shown) |
| `font-size`, `fg`, `bg` | – | Shortcuts for the CSS variables below |
| `alt` | piece name / `ASCII art` | Accessible label |

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

### React, Vue, Svelte, Astro

The element is framework-agnostic. Load the script once (tag or `import 'asciiiii'`) and use
the tag:

```jsx
export function Hero() {
  return <ascii-art piece="black-hole" fps="20" style={{ '--ascii-font-size': '8px' }} />;
}
```

React 19 passes attributes straight through. On React 18 pass booleans as strings
(`color="true"`). Pieces render nothing on the server and start on mount, so they are safe
in Next.js / Astro client islands.

### JavaScript API

```js
import {
  imageToAscii, toHTML, toSVG, toText, encodeArt, encodeAnimation, decodeEmbed,
  AsciiArtElement, listPieces, getPiece, registerPiece, definePiece, createRunner,
} from 'asciiiii';

const art = await imageToAscii(fileOrUrlOrCanvas, { cols: 100, color: true });
art.lines;   // string[]   one row per entry
art.colors;  // string[][] hex per cell (when color: true)

const el = document.querySelector('ascii-art');
await el.setMedia(videoFile);                 // play a video / GIF as ASCII
const { frames, fps } = await el.bake({ fps: 12, maxFrames: 48 });
const json = encodeAnimation(frames, { fps }); // → put in <script type="application/json">
el.setFrames(frames, fps);                     // or play them directly
el.setPiece('donut');                          // or a piece

// Run a piece headlessly (Node, workers, SSR, terminal):
const run = createRunner(getPiece('donut'));
console.log(run.tick().lines.join('\n'));

// Pure, DOM-free conversion core: hand it an RGBA grid at the target size.
import { asciify, computeGrid } from 'asciiiii/asciify';
```

Events: `ascii-ready` (`detail.art`, `detail.mode`) and `ascii-error` (`detail.error`).

### Writing your own piece

A piece draws into a character grid every frame. Register it and use it like a built-in:

```js
import { registerPiece } from 'asciiiii';

registerPiece({
  name: 'pulse',
  fps: 12,
  cols: 30,
  rows: 9,
  color: true,
  options: { text: 'hi' },
  init: ({ rnd }) => ({ phase: rnd() * 6 }),            // per-instance state (seeded PRNG)
  frame({ g, t, state, opts }) {                         // g = Grid, t = seconds
    const r = 3 + Math.sin(t * 3 + state.phase) * 2;
    g.ellipse(15, 4, r * 2, r, '*', '#f778ba');
    g.center(4, opts.text, '#ffffff');
  },
});
```

```html
<ascii-art piece="pulse" options='{"text":"hey"}'></ascii-art>
```

`Grid` has `set`, `text`, `center`, `line`, `rect`, `box`, `ellipse`, `each`, a depth buffer
(`useDepth`) for 3-D, and the kit exports noise, colour (`hsl`, `mix`), 3-D rotation /
projection helpers and a block font (`bigText`). See `src/pieces/*.js` for 129 examples.

## Bundles

| File | Size | Contents |
| --- | --- | --- |
| `dist/ascii-art.min.js` | ~100 kB | ESM, element + all 129 pieces |
| `dist/ascii-art.iife.js` | ~100 kB | Same, classic `<script>` (global `asciiiii`) |
| `dist/ascii-art.core.min.js` | ~30 kB | ESM, element + converters, no built-in pieces |

## Development

```bash
npm install
npm run dev      # static server on http://localhost:5173
npm test         # node:test unit tests (core, renderers, embed format, every piece)
npm run build    # bundles src/ → dist/
```

`dist/` is committed so the jsDelivr embed URL works straight from the repo; CI fails if it
is out of date, so run `npm run build` before committing changes to `src/`.

## Project layout

```
src/asciify.js      pure conversion core (tone curve, ramps, dithering, colour)
src/render.js       Art → text / HTML / SVG / canvas
src/embed.js        compact JSON format: single frames (v1) and baked animations (v2)
src/browser.js      image loading + canvas sampling
src/media.js        video and GIF frame sources (WebCodecs ImageDecoder for GIFs)
src/ascii-art.js    the <ascii-art> web component
src/registry.js     piece registry
src/pieces/kit.js   Grid, PRNG, noise, 3-D helpers, block font — the piece toolbox
src/pieces/*.js     the built-in catalogue, one file per category
demo/               the upload-and-tune web app + gallery
test/               unit tests (node --test)
```

Scope note: ascii.rest also ships language, company and Linux-distro logos (trademarked
marks drawn from icon sets) and hand-painted scenes. Those are intentionally not recreated
here; convert your own logo image instead.

## License

MIT
