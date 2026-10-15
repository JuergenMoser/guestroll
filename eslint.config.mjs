import next from "eslint-config-next";

const config = [
  { ignores: [".next/**", "node_modules/**", "data/**", "drizzle/**", "next-env.d.ts", "coverage/**", "playwright-report/**", "test-results/**", "brag-output*/**"] },
  ...next,
];

export default config;
