Fonts embedded in the generated social preview images (`opengraph-image.tsx`).
next/og needs the font files themselves at render time, and the Docker image
has no network access to fetch them.

- Instrument Serif: © The Instrument Serif Project Authors, SIL Open Font License 1.1
- Geist: © Vercel, SIL Open Font License 1.1

Both via [Fontsource](https://fontsource.org).
