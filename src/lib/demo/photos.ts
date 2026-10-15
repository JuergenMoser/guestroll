import "server-only";
import sharp from "sharp";

// Out-of-focus party lights: believable as event photos without showing anyone.
// Same scenes as scripts/demo-photos.mjs, which makes the README screenshots.
const SCENES = [
  { sky: ["#2a1608", "#0d0603"], lights: ["#ffcf6b", "#ff9a3c", "#fff1c9"] },
  { sky: ["#1b0d24", "#07030b"], lights: ["#ff7ab6", "#c58bff", "#ffd0f0"] },
  { sky: ["#091a2a", "#03080d"], lights: ["#7cc9ff", "#ffe08a", "#b9f0ff"] },
  { sky: ["#2a0d0d", "#0b0303"], lights: ["#ff6b4a", "#ffb35c", "#ffe2b8"] },
  { sky: ["#0e1f14", "#030805"], lights: ["#b8ff8a", "#ffe08a", "#e9ffd6"] },
  { sky: ["#241a05", "#0a0702"], lights: ["#ffe27a", "#ffffff", "#ffb84d"] },
];

function rand(seed: number) {
  let x = seed * 9301 + 49297;
  return () => (x = (x * 9301 + 49297) % 233280) / 233280;
}

export function demoPhoto(i: number): Promise<Buffer> {
  const scene = SCENES[i % SCENES.length];
  const r = rand(i + 1);
  const portrait = i % 3 === 1;
  const [w, h] = portrait ? [1200, 1600] : [1600, 1200];
  const bokeh = Array.from({ length: 46 }, (_, k) => {
    const color = scene.lights[k % scene.lights.length];
    const radius = 18 + r() * (k < 10 ? 140 : 60);
    return `<circle cx="${(r() * w).toFixed(0)}" cy="${(h * 0.15 + r() * h * 0.6).toFixed(0)}" r="${radius.toFixed(0)}" fill="${color}" opacity="${(0.12 + r() * 0.5).toFixed(2)}"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${scene.sky[0]}"/><stop offset="1" stop-color="${scene.sky[1]}"/></linearGradient>
      <filter id="b"><feGaussianBlur stdDeviation="${(6 + r() * 10).toFixed(1)}"/></filter>
      <radialGradient id="v" cx="50%" cy="45%" r="75%"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <g filter="url(#b)">${bokeh}</g>
    <rect width="100%" height="100%" fill="url(#v)"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 86 }).toBuffer();
}
