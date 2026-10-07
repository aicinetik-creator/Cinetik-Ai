# Cinetik Editor — feature summary

Everything below is implemented in this build and verified either by a production
build on CI or by rendering the built site in a real browser.

## Effects — 23 total

All effects run on the canvas pipeline, so they work on any machine and in export
without a GPU build.

**Colour:** Brightness, Contrast, Saturation, Black & White, Sepia, Invert, Hue Shift
**Looks:** Blur, Vignette, Pixelate, Warm / Cool, Fade, Cinematic
**Cinematic:** Film Grain, Duotone, Glow, Chromatic (RGB split), Mirror, Posterize,
Sharpen, CRT (scanlines), Colour Tint, VHS (multi-pass)

Each has adjustable parameters, is animatable, and shows a live preview thumbnail in
the Effects panel. Adding another effect is a definition file plus one case in the
canvas engine — no rebuild of the wasm package needed.

## Text — 10 presets

Title, Subtitle, Statement, Lower third, Caption, Quote, Tag, Highlight, Big number,
Sign-off. Click a preset to drop a styled text element on the timeline; every value
stays editable afterwards in Properties.

## Transitions — 10

Fade in, Fade out, Fade in + out, Zoom in, Zoom out, Slide from left, Slide from right,
Rise up, Pop, Spin in. Select a clip, then click a transition: it writes real keyframes
on the clip's opacity/transform channels, so it is fully editable in the keyframe editor
afterwards.

## Adjustments

A dedicated panel for grading the selected clip: one-tap Brightness, Contrast,
Saturation, Warm/Cool, Colour Tint, Vignette, Sharpen and Glow, each with a slider,
an on/off toggle and a remove button.

## Music & sound effects

The sounds panel searches Freesound **directly from the browser** using the visitor's
own free API key (stored in localStorage only) — the app is a static site with no
server, so there is no shared key to leak. The panel explains this and links to the
free key page. Importing your own audio and video files needs no key at all and works
entirely on the device.

## Platform

- Static build (`output: "export"`), so it can be hosted anywhere.
- Mobile layout: the editor opens on phones with preview + timeline and the side panels
  as full-screen sheets.
- All editing happens in the browser; media never leaves the device.

## Known trade-offs

- Transitions are keyframe-based (linear interpolation) rather than GPU shader
  cross-fades.
- The production build runs with `typescript.ignoreBuildErrors` because the upstream
  codebase carries pre-existing type errors; `npx tsc --noEmit` still reports them.
- The feedback form posts to an API route that was removed with the server, so it no
  longer reaches a backend.
