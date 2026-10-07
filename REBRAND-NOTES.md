# Cinetik Editor — Rebrand Notes

This is OpenCut Classic (https://github.com/OpenCut-app/opencut-classic), rebranded for
Cinetik AI Private Limited. Base version: the repo as of 26 Sep 2026.

## What was changed

**Identity & text**
- `apps/web/src/site/brand.ts` — site is now "Cinetik Editor" at `https://edit.cinetik.in`
- `apps/web/src/site/social.ts` — social links point to cinetik.in; GitHub link kept on
  the upstream OpenCut repo for license attribution
- `apps/web/src/components/landing/hero.tsx` — hero now reads "AI video editing / for Bharat",
  tagline about privacy-first editing, button says "Start editing"
- `apps/web/src/components/header.tsx` — nav simplified, GitHub "40k+ stars" badge removed
- `apps/web/src/components/footer.tsx` — Cinetik link columns, copyright line,
  "Editor source (OpenCut, MIT)" attribution kept
- Editor strings: onboarding, mobile gate, storage dialog, auth app name, Chrome hint
  (`src/components/editor/`, `src/auth/server.ts`, etc.)

**Theme (from cinetik.in, index_4_2.html)**
- Primary purple `#7E22CE` (light mode) and `#A855F7` (dark mode) — see `--primary`
  in `apps/web/src/app/globals.css`
- Dark background is Cinetik ink `#0B0B12`; secondary tints are the purple family
- Signature cyan-to-violet gradient `#00D2FF -> #B026FF` applied to:
  - the hero "Start editing" button (`.cinetik-gradient-btn` in globals.css)
  - the highlighted "for Bharat" box handles and pills (`.cinetik-gradient`)
  - the app icon, favicon, and social-share image
- Font: Inter — already the app's default, matching cinetik.in
- To reuse the gradient anywhere else, add the `cinetik-gradient` or
  `cinetik-gradient-btn` class to any element

**Pages**
- Deleted OpenCut marketing routes: `/blog`, `/brand`, `/changelog`, `/contributors`,
  `/roadmap`, `/sponsors`, `/rss.xml`
- `apps/web/src/app/sitemap.ts` rewritten for the remaining pages
- `/privacy` and `/terms` — text swapped OpenCut → Cinetik AI. **These are DRAFTS.**
  Have your lawyer write real policies before going live.
- Changelog notification popup disabled (`src/changelog/components/changelog-notification.tsx`)

**Assets**
- New logo (C-ring + play mark) in `apps/web/public/logos/opencut/` — same filenames, so
  no code changes were needed
- New favicon.ico, all PNG app icons, PWA manifest name, and a 1200x630 social-share image

## Effects: bug fix + new effects (this version)

**The bug.** In the upstream code the effect pipeline was GPU-only: effects were
resolved into shader passes and handed to the Rust/wgpu compositor, which implements
exactly one shader (`gaussian-blur`). Everything else silently did nothing, and when
the GPU renderer was unavailable `gpuRenderer.applyEffect()` returned the untouched
source with only a console warning. On top of that, blur's strength was scaled by
`resolution / 1920`, so at preview sizes it was barely visible.

**The fix.** A Canvas2D effect engine (`apps/web/src/effects/canvas-effects.ts`) now
executes effects that the GPU cannot:

- `canvas-*` passes (all new effects) are applied with Canvas2D filters / compositing.
- `gaussian-blur` still runs on the GPU when available, and falls back to a canvas
  `blur()` when it is not.
- Consumed passes are removed before the frame reaches the compositor, so the
  wasm side never sees a shader it does not implement.
- Wiring: `frame-descriptor.ts` bakes the plan into the affected layer's texture
  (an effect dropped on the effect track is distributed over the layers beneath it);
  `effect-preview.ts` applies it to the panel thumbnails, so every effect card now
  previews correctly.
- Blur strength doubled (divisor 5 -> 2.5) and its default raised to 30 so the
  effect is actually visible in the preview.

**New effects** (all work without a GPU build):

| Effect | Type | Params |
|---|---|---|
| Brightness | `brightness` | amount -100..100 |
| Contrast | `contrast` | amount -100..100 |
| Saturation | `saturation` | amount -100..100 |
| Black & White | `grayscale` | amount 0..100 |
| Sepia | `sepia` | amount 0..100 |
| Invert | `invert` | amount 0..100 |
| Hue Shift | `hue-rotate` | degrees -180..180 |
| Vignette | `vignette` | strength 0..100 |
| Pixelate | `pixelate` | block size 2..64 |
| Warm / Cool | `warmth` | amount -100..100 |
| Fade | `fade` | amount 0..100 |
| Cinematic | `cinematic` | amount 0..100 |

Plus the original Blur. Adding another canvas effect is a ~30 line definition file
plus a case in `canvasPlanForPass` — no Rust rebuild needed.

**Note:** the new effects are executed on the CPU canvas path. If you later want them
on the GPU (for very high-resolution export performance), the shaders would need to be
added to `rust/crates/effects` and the wasm package rebuilt (`bun run build:wasm`),
which requires the Rust toolchain.

## What YOU still need to do

1. ~~Brand color~~ — DONE: the palette now matches cinetik.in (`#7E22CE` purple,
   `#00D2FF -> #B026FF` gradient, `#0B0B12` ink). All in `apps/web/src/app/globals.css`.
2. ~~Logo~~ — DONE (see above).
3. **Legal pages** — replace the draft privacy/terms text.
4. **Deploy** — see Cinetik-OpenCut-selfhost-guide.md (Vercel: Root Directory = apps/web,
   set env vars, add CNAME for edit.cinetik.in).
5. **Test** — run `npm install && npm run dev` inside `apps/web` and click through:
   landing page, editor, import/export video.

## License (important)

OpenCut is MIT licensed. Keep the `LICENSE` file and copyright notices in this codebase
(do not remove them) when you deploy, fork further, or publish modifications. The footer
attribution link to the upstream repo satisfies good practice; the LICENSE file is the
legal requirement.

## Known limitations

- The app is English-only. Cinetik's 22-language positioning would need i18n work.
- Mobile/iPad editing is gated with a warning (upstream behavior) — relevant for your
  mobile-first audience; test on real devices.
- `apps/api` and other workspace packages were left untouched; only the web app was
  rebranded.
- This fork will drift from upstream OpenCut over time; merging upstream updates is
  manual work.

## Build fix: npm install layout (this version)

`next build` was failing with:

```
Module not found: Can't resolve ... (from @better-auth/drizzle-adapter/dist/schema-check-*.mjs)
Import trace: src/app/api/auth/[...all]/route.ts -> src/auth/server.ts -> better-auth -> @better-auth/drizzle-adapter
```

Cause: the repo shipped `install-strategy="nested"` and `node-linker=isolated` in the root
`.npmrc` (bun/pnpm-oriented settings). With npm's "nested" strategy there is no hoisting, so
`drizzle-orm` (a direct dependency of apps/web) was unreachable from the adapter's nested
location. Removed both settings so npm uses its default hoisted layout; `legacy-peer-deps`
stays on. If you have an existing checkout, delete `node_modules` (root and `apps/web`) and
reinstall before building.
