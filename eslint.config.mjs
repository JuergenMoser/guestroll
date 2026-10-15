import next from "eslint-config-next";

export default [
  { ignores: [".next/**", "node_modules/**", "data/**", "drizzle/**", "next-env.d.ts"] },
  ...next,
];
