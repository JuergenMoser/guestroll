/** Black or white, whichever reads better on `hex` (WCAG relative luminance). */
export function readableInk(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contrast with #1a1b1d (L≈0.011) vs with white (L=1): pick the larger.
  return (luminance + 0.05) / 0.061 >= 1.05 / (luminance + 0.05) ? "#1a1b1d" : "#ffffff";
}
