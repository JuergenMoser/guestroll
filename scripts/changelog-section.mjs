// Prints one version's section of CHANGELOG.md, for the release notes.
// Usage: node scripts/changelog-section.mjs 0.3.0
import fs from "node:fs";

const version = process.argv[2]?.replace(/^v/, "");
if (!version) {
  console.error("usage: changelog-section.mjs <version>");
  process.exit(2);
}
const lines = fs.readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8").split("\n");
// Plain string comparison, no regex built from the argument: nothing in it to escape.
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
if (start === -1) {
  console.error(`CHANGELOG.md has no section for ${version}`);
  process.exit(1);
}
const end = lines.findIndex((line, i) => i > start && (line.startsWith("## [") || line.startsWith("[Unreleased]:")));
const section = lines.slice(start + 1, end === -1 ? undefined : end).join("\n").trim();
process.stdout.write(section + "\n");
