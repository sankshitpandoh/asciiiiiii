---
version: alpha
name: asciiiii
description: A browser tool that turns photos, GIFs and videos into embeddable ASCII art, with a catalogue of animated pieces; it should feel like a printout from the machine era ASCII art comes from.
colors:
  paper: "#f5f8f1"      # dominant ground: the white band of green-bar fanfold paper
  bar: "#dfe9d8"        # the green band
  ink: "#1c261f"        # text: ribbon black, 14.9:1 on paper
  ink-muted: "#4f5c54"  # secondary text, 6.6:1 on paper
  signal: "#b6321f"     # one accent: the red half of a two-tone typewriter ribbon. Job: primary action and the active tab
  rule: "#a9bba6"       # perforations, sprocket holes, hairline guides
  screen: "#0f1512"     # surface the art itself renders on (a CRT pasted onto the printout)
  screen-ink: "#e4ecdf" # default glyph colour on screen
typography:
  display:
    fontFamily: IBM Plex Mono
    fontSize: 20px
    fontWeight: 500
    letterSpacing: 0
  body:
    fontFamily: IBM Plex Sans
    fontSize: 15px
    lineHeight: 1.5
rounded:
  sm: 2px
spacing:
  band: 48px   # one green bar, half an inch at 96 dpi; vertical rhythm snaps to it
  gutter: 20px
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: 7px 14px
  button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.ink}"
    rounded: "{rounded.sm}"
---

## Overview

asciiiii converts a person's own pictures and clips into ASCII art and ships a catalogue of
animated pieces, for people embedding something playful into a site. ASCII art's own printed
world is the line-printer era: fanfold green-bar paper, tractor-feed sprocket holes,
perforations between pages, typewriter ribbons in black and red, IBM machines. Every choice
below comes from that world. The art itself shows on dark "screen" tiles, the way a screen
dump is pasted onto a printout.

## Colors

- **Paper (#f5f8f1) and bar (#dfe9d8):** the two bands of green-bar paper, repeated down the
  page at one band per 48px. The page is light because printouts are.
- **Ink (#1c261f):** ribbon black with the paper's green cast. 14.9:1 on paper.
- **Ink muted (#4f5c54):** 6.6:1 on paper. Used for hints and captions only.
- **Signal (#b6321f):** ribbon red. One job: the primary button and the active tab underline.
  Never decoration, never a second accent.
- **Rule (#a9bba6):** sprocket-hole outlines, perforation dashes, soft borders.
- **Screen (#0f1512) / screen ink (#e4ecdf):** the only dark surface, reserved for `<ascii-art>`.

## Typography

IBM Plex Mono for headings, labels, buttons, code and data readouts: the medium is monospace
and IBM built the printers. IBM Plex Sans for running text so paragraphs stay readable. Both
load from Google Fonts. Sentence case everywhere. No tracked all-caps labels. The one loud
type moment is the masthead, where the product prints its own name through the `big-text`
piece in ink on paper.

## Layout

A single sheet, 1280px wide at most, between two tractor-feed strips with sprocket holes
(hidden under 1100px). Sections are separated by a dashed perforation line. The workbench
comes first because the converter is the product: controls on the left, the screen on the
right. The gallery is a grid of screens with mono captions beneath, no card chrome. The
embedding guide is a numbered procedure because it really is three ordered steps.

## Elevation & Depth

Nothing floats. No shadows. Surfaces are separated by the paper bands, by 1px ink borders,
or by being a screen.

## Shapes

2px radius on controls so they read as printed boxes, not pills. Screens are square-cornered.

## Components

Shared: `.btn` and `.btn-primary`, `.chip` (filters and samples), `.tab`, `.tear`
(perforation), `.card` (a screen plus caption), `.procedure`. Reuse these verbatim on any new
page; add a token here before using a new value.

## Do's and Don'ts

- Do keep the vertical rhythm on the 48px band.
- Do use the signal red only for the primary action and the active state.
- Don't change: IBM Plex Mono / IBM Plex Sans; the paper and ink values.
- Don't use: a near-black page ground with one neon accent (SD2), cream with terracotta (SD1),
  tracked all-caps eyebrows and middle-dot meta strings (SD4), an accented headline word (SD5),
  decorative numbering on unordered content (SD6), fake window chrome (SD7), arrows glued to
  labels (CP3), identical bordered cards (K2), shadows for decoration.
