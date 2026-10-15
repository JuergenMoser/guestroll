import next from "eslint-config-next";

const config = [
  { ignores: [".next/**", ".next-e2e/**", "node_modules/**", "data/**", "drizzle/**", "next-env.d.ts", "coverage/**", "playwright-report/**", "test-results/**", "brag-output*/**", "docs/**"] },
  ...next,
];

export default config;
