# Natural Subjects 3D

**Free, interactive 3D science lessons for high school: physics, chemistry, biology and geography, fully in English.**

This is an English adaptation of [Tongjiang Lab](https://lab.tongjiang.app) by Tongjiang ([upstream repo](https://github.com/smithjohn78390/tongjiang-lab)). Every lesson's interface, explanations, labels, step text and catalog were translated from Chinese into English.

There are 54 lessons. Each one is a **single self-contained HTML file** of about 1 MB: double-click to open it, and it works offline, on a projector or on an interactive whiteboard. Every lesson is one 3D world with a live control console, a guiding question and a step-by-step path a teacher can follow from start to finish.

The lessons follow the Chinese national curriculum standards for senior high school and the People's Education Press (PEP) 2019 textbooks; [`catalog.json`](catalog.json) lists each lesson with its textbook location and steps.

## Use

- **Offline**: download a file from [`courses/`](courses) and open it in Chrome or Edge.
- **Online**: deploy the site (below) and open `https://<your-host>/<slug>`, e.g. `/haber-step`.
- **Embed**: `<iframe src="https://<your-host>/<slug>" width="100%" style="aspect-ratio:16/9;border:0" allow="fullscreen"></iframe>`

## Layout

| Path | What it is |
|---|---|
| `courses/<slug>.html` | The 54 lessons (English) |
| `covers/<slug>.webp` | Cover images |
| `catalog.json` | Lesson list: title, type, guiding question, textbook location, steps |
| `site/` | Home page renderer and build script (`npm run build` → `dist/`) |
| `tools/i18n/` | Scripts and dictionary used to translate the lessons (see its README) |
| `wrangler.jsonc` | Cloudflare Workers static-assets config |
| `.github/workflows/deploy.yml` | Manual deploy workflow (runs only when started by hand) |

## Build and deploy

```bash
npm install
npm run build        # writes dist/: index.html, /<slug>.html, covers, catalog.json
npx wrangler dev     # local preview
```

Deploys go through the **Deploy to Cloudflare** workflow (Actions → Deploy to Cloudflare → Run workflow). It needs two repository secrets:

- `CLOUDFLARE_API_TOKEN`: a Cloudflare API token with the *Edit Cloudflare Workers* template permissions
- `CLOUDFLARE_ACCOUNT_ID`: the Cloudflare account ID

The site is published as the Worker `natural-subjects-3d` on its default `workers.dev` address.

## License

- Lessons, covers and catalog are licensed under **[CC BY-NC 4.0](LICENSE)** by Tongjiang Lab (https://lab.tongjiang.app). This adaptation keeps the same license: **non-commercial use only**, with credit to “Tongjiang Lab (https://lab.tongjiang.app)”. Changes are listed in [CHANGES.md](CHANGES.md).
- Third-party code bundled in the lessons (three.js, MIT) keeps its own license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
- Not affiliated with Tongjiang Lab or People's Education Press. Translation errors are ours; please open an issue.
