# Natural Subjects 3D

**Free, interactive 3D science lessons in English for grades 1–12, in four subjects: Physics, Chemistry, Biology, and Earth & Space. Works on phones, tablets, laptops and classroom boards.**

This is an English adaptation of [Tongjiang Lab](https://lab.tongjiang.app) by Tongjiang ([upstream repo](https://github.com/smithjohn78390/tongjiang-lab)). Every lesson's interface, explanations, labels, step text and catalog were translated from Chinese into English.

There are two kinds of lessons:

- **High school (54 lessons)**, adapted from Tongjiang Lab. Each one is a **single self-contained HTML file** of about 1 MB: double-click to open it, and it works offline, on a projector or on an interactive whiteboard. Every lesson is one 3D world with a live control console, a guiding question and a step-by-step path a teacher can follow from start to finish.
- **Primary school (grades 1–5) and middle school (grades 6–9)**, original to this project: short, touch-first lessons built on a shared engine (`lib/engine/`). Each has a few steps with something to try, and a quick quiz. They share one copy of three.js and run from the built site. [docs/curriculum-map.md](docs/curriculum-map.md) maps the topics each grade needs (NGSS, cross-checked with Vietnam's GDPT 2018) and which are built.

The high school lessons follow the Chinese national curriculum standards for senior high school and the People's Education Press (PEP) 2019 textbooks; [`catalog.json`](catalog.json) lists each lesson with its textbook location and steps.

## Use

- **Offline** (high school lessons): download `courses/<subject>/<slug>/index.html` and open it in Chrome or Edge.
- **Online**: deploy the site (below) and open `https://<your-host>/<slug>/`, e.g. `/haber-step/` or `/day-night/`. Each subject has its own page: `/subjects/physics/`, `/subjects/chemistry/`, `/subjects/biology/`, `/subjects/earth-space/`.
- **Video**: export any lesson to MP4 (see [Video export](#video-export)).
- **Embed**: `<iframe src="https://<your-host>/<slug>" width="100%" style="aspect-ratio:16/9;border:0" allow="fullscreen"></iframe>`

## Layout

| Path | What it is |
|---|---|
| `courses/<subject>/` | One folder per subject (`subject.json`, its lesson list, optional `_shared/` helpers), see [courses/README.md](courses/README.md) |
| `courses/<subject>/<slug>/` | One folder per lesson: `lesson.json` (catalog entry, level, grades), `cover.webp` + `cover-480.webp`, and either `index.html` (high school lesson) or `scene.js` (engine lesson) |
| `lib/engine/` | Shared engine for the primary and middle school lessons (see its README) |
| `docs/curriculum-map.md` | Topics per grade and subject, and which lesson covers each (`npm run coverage` refreshes it) |
| `site/` | Build script, home and subject pages, and the runtime added to every high school lesson (`site/runtime/`) |
| `video/` | Remotion project that exports a lesson to MP4 (own `package.json`) |
| `tools/i18n/` | Scripts and dictionary used to translate the lessons (see its README) |
| `tools/media/` | Cover thumbnail script |
| `wrangler.jsonc` | Cloudflare Workers static-assets config |
| `.github/workflows/deploy.yml` | Deploys on every push to `main` |

`catalog.json` is generated into `dist/` by the build from the `lesson.json` files.

## Performance and phones

- **Phones**: every high school lesson gets a small runtime at build time. On screens under 760 px wide the two side panels become one bottom sheet at a time, picked from a dock (step · 3D · console), and the lesson's camera frames the scene in the area above the sheet. The top bar and step bar are compacted for touch.
- **Render resolution**: on phones the 3D canvas renders at up to 1.5x (1.25x on 4-core or 4 GB devices) instead of the device's 3x. When a lesson's own frame-rate watchdog flags a slow device, the canvas drops to 1x. Add `?quality=high` or `?quality=low` to a lesson URL to override.
- **Downloads**: engine lessons share one content-hashed bundle of three.js and the engine under `/assets/`, cached for a year (`site/_headers`). The home page uses 480 px cover thumbnails and prefetches a lesson when you hover or touch its card.

## Build and deploy

```bash
npm install
npm run build        # writes dist/: index.html, /subjects/<subject>/, /<slug>/, /assets/, catalog.json
npm run coverage     # curriculum map: what is built and what is missing
npm run readme       # refresh the lesson lists in courses/
LESSONS=day-night,haber-step npm run build   # build only some lessons (quick checks)
npx wrangler dev     # local preview
```

Push to `main` deploys through the **Deploy to Cloudflare** GitHub Action. You can also run it by hand (Actions → Deploy to Cloudflare → Run workflow). It needs two repository secrets:

- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token with the *Edit Cloudflare Workers* template permissions
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID

The site is published as the Worker `natural-subjects-3d` at https://natural-subjects-3d.tuannx87.workers.dev.

## Add a lesson

See [courses/README.md](courses/README.md): a new lesson is one folder under its subject, written against [`lib/engine/README.md`](lib/engine/README.md). `cd video && node scripts/check.mjs <slug>` walks every step on a phone and a desktop screen and fails on any page error; `node scripts/covers.mjs <slug>` makes its covers.

## Video export

`video/` turns a lesson into an MP4 with [Remotion](https://www.remotion.dev): a title card, each step with its caption, and a closing credit card with the license credit.

```bash
npm run build                         # in the repo root
cd video && npm install
npm run video -- day-night            # capture + render -> video/out/day-night.mp4
npm run video -- haber-step --seconds 5 --size 1920x1080
npm run studio                        # preview and tweak the composition
```

Capture renders each step frame by frame on a virtual clock, so the video is smooth even on a slow machine; a GPU makes it much faster for the high school lessons. Remotion downloads its own headless Chrome on first use; set `REMOTION_BROWSER=/path/to/chrome-headless-shell` to use one you already have.

Remotion license: free for individuals, for-profit organizations with up to 3 employees, non-profits, and for evaluation; for-profit organizations with 4 or more employees need a Company License (see [remotion.dev/license](https://www.remotion.dev/license)). Videos made from these lessons are CC BY-NC 4.0 too: non-commercial use only, keep the credit.

## License

- High school lessons, their covers and catalog entries are licensed under **[CC BY-NC 4.0](LICENSE)** by Tongjiang Lab (https://lab.tongjiang.app). This adaptation keeps the same license: **non-commercial use only**, with credit to “Tongjiang Lab (https://lab.tongjiang.app)”. Changes are listed in [CHANGES.md](CHANGES.md). The primary and middle school lessons and the engine are original to Natural Subjects 3D and shared under the same license.
- Third-party code bundled in the lessons (three.js, MIT) keeps its own license. Remotion (used only by `video/`, not shipped on the site) has its own license, summarized above. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Not affiliated with Tongjiang Lab or People's Education Press. Translation errors are ours; please open an issue.
