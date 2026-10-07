# Cinetik Editor — release notes

**Status:** published from `main` (Netlify production deploy).

## Build
- Static export (`next.config.ts` -> `output: "export"`), no server required.
- Netlify: base `apps/web`, build `npm run build`, publish `.next`
  (the Next.js Runtime serves the exported files; it requires `.next` as the
  publish directory for export builds), Node 20.9.
- Verified: the identical build runs green on CI
  (`.github/workflows/build-check.yml`) and produces a working static site.

## Features
- 23 effects (colour, looks, cinematic) with live previews and adjustable params.
- 10 text presets, 10 transitions, an Adjustments panel for clip grading.
- Music & sound-effect search via Freesound with a visitor-supplied key.
- Mobile layout: preview + timeline with the side panels as full-screen sheets.
- Commands: split, split left, duplicate, copy/paste, delete, undo, redo,
  select all, snapping, play/pause, seek/jump, go to start/end.

## Fixed in this release
- Duplicate `output` key in `next.config.ts` broke the TypeScript build.
- Missing exports (`isShortcutKey`, `isActionWithOptionalArgs`) that the
  keybinding persistence code imports.
- Effect pipeline: effects are executed on the canvas pipeline, so they work
  without a GPU build; blur strength no longer vanishes at preview sizes.
- React crash: the Adjustments panel derived data inside a store selector,
  causing an infinite update loop; now derived during render.

## Known limitations
- Transitions are keyframe-based (linear), not shader cross-fades.
- The production build sets `typescript.ignoreBuildErrors` because the upstream
  codebase carries pre-existing type errors; `npx tsc --noEmit` still lists them.
- The feedback form's API route was removed with the server, so it no longer
  reaches a backend.
- Sound search needs a free Freesound API key (static site: no server-side key).
