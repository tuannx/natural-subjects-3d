# Changes from the original

This repository adapts [Tongjiang Lab](https://lab.tongjiang.app) (CC BY-NC 4.0, https://github.com/smithjohn78390/tongjiang-lab). Changes made:

- Renamed the project to **Natural Subjects 3D** (`natural-subjects-3d`).
- Translated all Chinese text in the 54 lessons into English: interface, step text, explanations, 3D labels, readouts, tests, page titles, code comments and developer error messages. Set the page language to English.
- Added a small script to each lesson that shrinks canvas text which would otherwise run past the canvas edge, because English labels are longer than the Chinese ones.
- Translated `catalog.json` into English.
- Rewrote the README in English and removed the Simplified Chinese README.
- Added a home page, a build script, Cloudflare Workers config and a manual deploy workflow.
- Added the translation tooling and dictionary under `tools/i18n/`.

The 3D scenes, simulations, data and cover images are unchanged.
