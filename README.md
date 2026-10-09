# Cinetik AI

India's AI creator platform — a browser-based video editor with an AI Video studio built in.

**Live editor:** https://aicinetik-creator.github.io/Cinetik-Ai/
**AI Video studio:** https://aicinetik-creator.github.io/Cinetik-Ai/editor?ai=1

## What this is

Cinetik AI is a video editor that runs entirely in the browser. You can import your own
clips, images and audio, cut them on a multi-track timeline, add text, effects and
transitions, and export the result — all without installing anything.

Built on top of the OpenCut codebase (see Credits below), rebranded and extended with
the AI Video studio.

## AI Video

The AI Video studio takes a plain-language brief and produces a finished rough cut:

1. **Brief** — describe the video you want.
2. **Script** — a real, scene-by-scene script with narration, visuals, camera angles and
   practical shooting tips.
3. **Scenes** — a generated frame per scene.
4. **Audio** — a real spoken voiceover, generated with Google TTS.
5. **Timeline** — the scenes and voiceover land on the timeline as ordinary, fully
   editable clips.

Everything the studio produces is a normal project. Nothing is locked — you can trim,
reorder, restyle or delete any of it by hand.

## Providers

The studio talks to model providers directly from your browser. Your API key is stored
only in your own browser's local storage and is never sent anywhere except the provider
you chose. No key is ever committed to this repository.

| Step | Google Gemini (default) | OpenRouter |
| --- | --- | --- |
| Script | `gemini-3.8-flash` | `google/gemini-2.5-flash` |
| Scene frames | `gemini-3.1-flash-lite-image` | `google/gemini-2.5-flash-image` |
| Voiceover | `gemini-2.5-flash-preview-tts` | — |

Script generation sweeps several current Flash models and retries, so a transient
provider error does not interrupt a session. If every attempt fails, the studio says so
plainly rather than passing off sample text as real output.

Google's free tier covers scripts and voiceover. Scene frames require billing enabled on
the Google Cloud project.

## Running it locally

Prerequisites: [Bun](https://bun.sh) and Node 20+.

```bash
bun install
bun dev:web
```

The app is then available at http://localhost:3000.

## Deployment

This site is published with GitHub Pages from the `pages` workflow on every push to
`main`. The build exports the Next.js app statically and serves it under the
`/Cinetik-Ai/` path.

## Contributing

Contributions are welcome. Open an issue or send a pull request against `main`.

## Credits and licence

Cinetik AI is built on the [OpenCut](https://github.com/opencut-app/opencut) codebase,
used under the MIT Licence. The original copyright notice is retained. Cinetik AI adds
its own branding, the AI Video studio, and its own deployment pipeline on top.

Released under the **MIT Licence** — see [LICENSE](LICENSE).
