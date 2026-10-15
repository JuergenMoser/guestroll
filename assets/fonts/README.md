Fonts embedded in the generated social preview images (`opengraph-image.tsx`).
next/og needs the font files themselves at render time, and the Docker image
has no network access to fetch them.

- Bricolage Grotesque (WOFF, and a TTF generated with scripts/brand/woff-to-ttf.py for sharp): © The Bricolage Grotesque Project Authors, SIL Open Font License 1.1, via [Fontsource](https://fontsource.org)
