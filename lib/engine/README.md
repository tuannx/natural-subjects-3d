# Lesson engine

Shared code for the primary and middle school lessons (grades 1–9). A lesson is a folder `courses/<subject>/<slug>/` with:

| File | What it holds |
|---|---|
| `lesson.json` | Catalog entry and all lesson text: steps and quiz |
| `scene.js` | The 3D world: `export default function setup(k)` |
| `cover.webp`, `cover-480.webp` | Cover images: `node scripts/covers.mjs <slug>` in `video/` renders them from the lesson (at step `coverStep` from lesson.json, default 0) |

`npm run build` bundles every `scene.js` with this engine and three.js. Shared code (three.js, engine) lands in one content-hashed chunk under `/assets/`, so it downloads once for all engine lessons and is cached for a year.

A scene may import helpers from its subject's `courses/<subject>/_shared/` folder (`import { cell } from '../_shared/cell.js'`), never from another subject, so each subject can change its helpers without touching the others.

## lesson.json

```json
{
  "slug": "day-night", "order": 1, "level": "primary", "ages": "6-9", "grades": [1, 2],
  "title": "…", "type": "Earth & Space", "question": "One guiding question a child would ask",
  "steps": ["Step 1 title", "…"],
  "content": {
    "steps": [{ "title": "…", "text": "…", "try": "Try it: …", "see": "What did you notice: …" }],
    "quiz": [{ "q": "…", "options": ["…", "…", "…"], "answer": 1, "why": "…" }]
  },
  "source": "original"
}
```

The subject comes from the folder (`physics`, `chemistry`, `biology`, `earth-space`); do not put it in lesson.json. `level` is `primary` (grades 1–5) or `middle` (grades 6–9), and `grades` is `[from, to]` inside it; pick both from [docs/curriculum-map.md](../../docs/curriculum-map.md). `order` sorts lessons within a grade. `steps` repeats the step titles for the catalog. The quiz becomes the last step automatically.

## Writing for each level

- **Primary (grades 1–5)**: short sentences and everyday words, one idea per step, 5–7 steps, 3 quiz questions. Hands-on controls (buttons, a slider, a toggle) and things children know (toys, food, weather).
- **Middle (grades 6–9)**: proper science words, introduced with a plain explanation the first time. Measurements with units, simple formulas when the topic has one (speed = distance ÷ time), a readout that updates as the learner changes a slider, 6–8 steps, 4 quiz questions.

## scene.js

```js
export default function setup(k) {
  // k.THREE, k.scene, k.camera, k.controls (OrbitControls), k.renderer
  // k.kit: mesh(), mat(), stage(), lights(), ease(), clamp(), lerp(), follow()
  // k.label(text, object3DOrVector3, { cls: 'big' | 'warm' | 'cool' }) -> { text, show(bool) }
  // k.view({ radius, yaw, pitch, target: [x, y, z] }, instant?) frames a sphere of `radius`
  //   around `target` in the part of the screen the lesson card does not cover
  //   add `width` (half the scene's width) for wide, flat scenes so they also fit a narrow phone screen
  // k.ui.slider({ label, min, max, step, value, unit, format, onInput }) -> input; input.set(v) moves it from code
  // k.ui.toggle({ label, value, onChange }), k.ui.buttons([{ label, onClick, on }]) -> row; row.select(i) marks one from code
  // k.ui.readout(html)
  // k.invalidate() asks for a redraw when nothing is animating (any input in the lesson card already does)
  // k.freeRect() -> { l, r, t, b }: screen area not covered by the lesson card (e.g. to place an inset view)
  return {
    step(i, { isQuiz, instant }) { /* set up step i: camera view, widgets, state */ },
    update(dt, t) { /* advance animation; return true while something moves */ },
  };
}
```

Widgets are cleared on every step change, so `step()` adds the ones that step needs. Use only `dt`/`t` for animation (never `Date.now()` or `performance.now()`), and seeded randomness, so the video exporter renders the same frames every time.

`window.__lesson` (`goto(i)`, `renderAt(seconds)`, `steps`) lets the video exporter and tests drive a lesson frame by frame.
