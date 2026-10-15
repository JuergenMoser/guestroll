// Prints one version's section of CHANGELOG.md, for the release notes.
// Usage: node scripts/changelog-section.mjs 0.3.0
import fs from "node:fs";

const version = process.argv[2]?.replace(/^v/, "");
if (!version) {
  console.error("usage: changelog-section.mjs <version>");
  process.exit(2);
}
const text = fs.readFileSync(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const start = text.search(new RegExp(`^## \\[${version.replace(/\./g, "\\.")}\\]`, "m"));
if (start === -1) {
  console.error(`CHANGELOG.md has no section for ${version}`);
  process.exit(1);
}
const rest = text.slice(start);
const end = rest.slice(3).search(/^## \[|^\[Unreleased\]:/m);
const section = (end === -1 ? rest : rest.slice(0, end + 3)).split("\n").slice(1).join("\n").trim();
process.stdout.write(section + "\n");
