# Video export (Remotion)

Turns a lesson into an MP4: a title card, each step with a caption, and a credit card.

```bash
npm run build            # in the repo root: builds dist/
cd video && npm install
npm run video -- day-night                                    # -> out/day-night.mp4
npm run video -- haber-step --seconds 5 --size 1920x1080      # options: --seconds per step, --size, --capture-fps (15)
npm run studio                                                # preview the composition in Remotion Studio
```

How it works:

1. `scripts/capture.mjs` opens the built lesson in headless Chrome with the on-screen interface hidden, goes through every step and saves frames to `public/captures/<slug>/` with a `manifest.json` (titles, captions, timing). Frames are rendered on a virtual clock (`window.__lesson.renderAt` for primary lessons, `scripts/virtual-time.js` for the high school lessons), so the result is smooth and the same on every run, even on a slow machine. Without a GPU the high school lessons take a few seconds per frame; with one they are quick.
2. `scripts/render.mjs` bundles `src/` and renders the `Lesson` composition with the manifest as input props.

`scripts/covers.mjs <slug>` uses the same capture to make a primary lesson's `cover.webp` and `cover-480.webp`.

Remotion downloads a headless Chrome the first time. To use one you already have (offline, or a network that blocks the download), set `REMOTION_BROWSER=/path/to/chrome-headless-shell`.

## License

Remotion 4.0.539 (pinned in `package.json`) is source-available under the Remotion License: free for individuals, for-profit organizations with up to 3 employees, non-profits, and for evaluation. A for-profit organization with 4 or more employees needs a Company License from remotion.pro. Videos of the lessons are CC BY-NC 4.0 like the lessons: non-commercial use only, and keep the credit card at the end.
