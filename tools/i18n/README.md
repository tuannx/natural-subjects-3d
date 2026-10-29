# Lesson translation tools

How the lessons were translated from Chinese to English, so new or updated upstream lessons can be translated the same way.

Each lesson is one HTML file with a single minified `<script type="module">`. The Chinese text lives in its JavaScript string literals, template literals and `"a" + x + "b"` chains (as `\uXXXX` escapes).

| File | Role |
|---|---|
| `units.js` | Parses the script with acorn and finds every string unit containing Chinese; template/concat units get `{0}`, `{1}` placeholders for their expressions |
| `seg.js` | Splits very long units (CSS blocks) into per-line segments |
| `extract.js` | `node extract.js <coursesDir> <outDir>`: writes the unique segments per lesson |
| `BRIEF.md` | Translation rules and glossary given to the translators |
| `check.js` | Validates a translation file (placeholders, tags, no Chinese left) |
| `dictionary.json` | Chinese → English for every segment translated so far |
| `punct.js` | Converts full-width punctuation in strings that have no Chinese words |
| `shim.js` | Small script added to each lesson that shrinks canvas text that would overflow (English is longer) |
| `apply.js` | `node apply.js <srcCoursesDir> <outDir> [slug…]`: rewrites the units with English, sets `lang="en"`, translates `<title>`, adds the shim, and re-parses the output to make sure it is valid JavaScript |

Setup: run `npm install` in this folder (acorn is only needed here, not by the site).

For a new upstream lesson: run `extract.js`, translate the segments missing from `dictionary.json` following `BRIEF.md`, add them to the dictionary, then run `apply.js` on the original Chinese file. `apply.js` lists any segment it could not find.
